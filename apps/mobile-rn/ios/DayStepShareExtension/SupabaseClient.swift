import Foundation

/// Share Extension용 경량 Supabase REST 클라이언트
/// App Group UserDefaults에서 인증 정보를 읽어서 직접 REST API 호출
struct SupabaseClient {
  private let appGroupID = "group.com.daystep.app"

  struct AuthInfo {
    let userId: String
    let accessToken: String
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
    return AuthInfo(userId: userId, accessToken: accessToken, supabaseUrl: supabaseUrl, supabaseKey: supabaseKey)
  }

  /// 할일 생성
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
      if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 {
        completion(.success(()))
      } else {
        let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
        completion(.failure(NSError(domain: "SupabaseClient", code: statusCode, userInfo: [NSLocalizedDescriptionKey: "서버 오류 (\(statusCode))"])))
      }
    }.resume()
  }
}
