import Foundation

/// Share Extension용 경량 Supabase REST 클라이언트
/// App Group UserDefaults에서 인증 정보를 읽어서 직접 REST API 호출
/// access_token 만료 시 refresh_token으로 자동 갱신
struct SupabaseClient {
  private let appGroupID = "group.com.daystep.app"

  /// 만료 임박으로 간주하는 여유 시간 (초)
  private let expiryBufferSeconds: TimeInterval = 60

  struct AuthInfo {
    let userId: String
    var accessToken: String
    var refreshToken: String
    var expiresAt: TimeInterval
    let supabaseUrl: String
    let supabaseKey: String
  }

  /// App Group UserDefaults에서 인증 정보 읽기
  func getAuth() -> AuthInfo? {
    guard let defaults = UserDefaults(suiteName: appGroupID) else { return nil }
    guard let userId = defaults.string(forKey: "extension_user_id"),
          let accessToken = defaults.string(forKey: "extension_access_token"),
          let supabaseUrl = defaults.string(forKey: "extension_supabase_url"),
          let supabaseKey = defaults.string(forKey: "extension_supabase_key"),
          !userId.isEmpty, !accessToken.isEmpty, !supabaseUrl.isEmpty
    else { return nil }
    let refreshToken = defaults.string(forKey: "extension_refresh_token") ?? ""
    let expiresAt = defaults.double(forKey: "extension_expires_at")
    return AuthInfo(
      userId: userId,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      supabaseUrl: supabaseUrl,
      supabaseKey: supabaseKey
    )
  }

  /// 갱신된 토큰을 App Group에 다시 저장 (다음 호출 재사용)
  private func saveTokens(accessToken: String, refreshToken: String, expiresAt: TimeInterval) {
    guard let defaults = UserDefaults(suiteName: appGroupID) else { return }
    defaults.set(accessToken, forKey: "extension_access_token")
    defaults.set(refreshToken, forKey: "extension_refresh_token")
    defaults.set(expiresAt, forKey: "extension_expires_at")
    defaults.synchronize()
  }

  /// access_token이 만료 임박 또는 강제 갱신 요청 시 refresh_token으로 새 토큰 획득
  private func refreshTokenIfNeeded(
    _ auth: AuthInfo,
    force: Bool = false,
    completion: @escaping (Result<AuthInfo, Error>) -> Void
  ) {
    let now = Date().timeIntervalSince1970
    let needsRefresh = force || (auth.expiresAt > 0 && auth.expiresAt - now < expiryBufferSeconds)

    guard needsRefresh else {
      completion(.success(auth))
      return
    }

    guard !auth.refreshToken.isEmpty else {
      // refresh_token이 없으면 갱신 불가 — 기존 토큰으로 시도 (강제 갱신이면 실패)
      if force {
        completion(.failure(NSError(domain: "SupabaseClient", code: 401, userInfo: [NSLocalizedDescriptionKey: "세션이 만료되었습니다. 앱을 한 번 열어주세요."])))
      } else {
        completion(.success(auth))
      }
      return
    }

    let urlString = "\(auth.supabaseUrl)/auth/v1/token?grant_type=refresh_token"
    guard let url = URL(string: urlString) else {
      completion(.failure(NSError(domain: "SupabaseClient", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid auth URL"])))
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(auth.supabaseKey, forHTTPHeaderField: "apikey")

    let body: [String: Any] = ["refresh_token": auth.refreshToken]
    do {
      request.httpBody = try JSONSerialization.data(withJSONObject: body)
    } catch {
      completion(.failure(error))
      return
    }

    URLSession.shared.dataTask(with: request) { data, response, error in
      if let error = error {
        completion(.failure(error))
        return
      }
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
      guard statusCode >= 200, statusCode < 300,
            let data = data,
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let newAccessToken = json["access_token"] as? String,
            let newRefreshToken = json["refresh_token"] as? String
      else {
        completion(.failure(NSError(domain: "SupabaseClient", code: statusCode, userInfo: [NSLocalizedDescriptionKey: "토큰 갱신 실패 (\(statusCode))"])))
        return
      }

      let newExpiresAt: TimeInterval
      if let expiresAt = json["expires_at"] as? TimeInterval {
        newExpiresAt = expiresAt
      } else if let expiresIn = json["expires_in"] as? TimeInterval {
        newExpiresAt = Date().timeIntervalSince1970 + expiresIn
      } else {
        newExpiresAt = 0
      }

      self.saveTokens(accessToken: newAccessToken, refreshToken: newRefreshToken, expiresAt: newExpiresAt)

      var newAuth = auth
      newAuth.accessToken = newAccessToken
      newAuth.refreshToken = newRefreshToken
      newAuth.expiresAt = newExpiresAt
      completion(.success(newAuth))
    }.resume()
  }

  /// 할일 생성 (만료 시 자동 갱신, 401 시 강제 갱신 후 1회 재시도)
  func insertTodo(
    title: String,
    content: String?,
    scheduleType: String,
    startTime: Date?,
    completion: @escaping (Result<Void, Error>) -> Void
  ) {
    guard let auth = getAuth() else {
      completion(.failure(NSError(domain: "SupabaseClient", code: 401, userInfo: [NSLocalizedDescriptionKey: "인증 정보가 없습니다. 앱을 한 번 열어주세요."])))
      return
    }

    refreshTokenIfNeeded(auth) { refreshResult in
      switch refreshResult {
      case .failure(let error):
        completion(.failure(error))
      case .success(let validAuth):
        self.performInsertTodo(
          auth: validAuth,
          title: title,
          content: content,
          scheduleType: scheduleType,
          startTime: startTime,
          didRetry: false,
          completion: completion
        )
      }
    }
  }

  private func performInsertTodo(
    auth: AuthInfo,
    title: String,
    content: String?,
    scheduleType: String,
    startTime: Date?,
    didRetry: Bool,
    completion: @escaping (Result<Void, Error>) -> Void
  ) {
    let urlString = "\(auth.supabaseUrl)/rest/v1/todos"
    guard let url = URL(string: urlString) else {
      completion(.failure(NSError(domain: "SupabaseClient", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(auth.supabaseKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(auth.accessToken)", forHTTPHeaderField: "Authorization")
    request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

    var body: [String: Any] = [
      "user_id": auth.userId,
      "title": title,
      "schedule_type": scheduleType,
      "completed": false,
      "order_index": 0,
      "recurrence_pattern": "none",
    ]

    if let content = content, !content.isEmpty {
      body["content"] = content
    }

    if let startTime = startTime {
      let formatter = ISO8601DateFormatter()
      formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      body["start_time"] = formatter.string(from: startTime)
    }

    do {
      request.httpBody = try JSONSerialization.data(withJSONObject: body)
    } catch {
      completion(.failure(error))
      return
    }

    URLSession.shared.dataTask(with: request) { _, response, error in
      if let error = error {
        completion(.failure(error))
        return
      }
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
      if statusCode >= 200, statusCode < 300 {
        completion(.success(()))
        return
      }

      // 401: 토큰 만료 — 강제 갱신 후 1회 재시도
      if statusCode == 401, !didRetry {
        self.refreshTokenIfNeeded(auth, force: true) { refreshResult in
          switch refreshResult {
          case .failure(let err):
            completion(.failure(err))
          case .success(let newAuth):
            self.performInsertTodo(
              auth: newAuth,
              title: title,
              content: content,
              scheduleType: scheduleType,
              startTime: startTime,
              didRetry: true,
              completion: completion
            )
          }
        }
        return
      }

      completion(.failure(NSError(domain: "SupabaseClient", code: statusCode, userInfo: [NSLocalizedDescriptionKey: "서버 오류 (\(statusCode))"])))
    }.resume()
  }
}
