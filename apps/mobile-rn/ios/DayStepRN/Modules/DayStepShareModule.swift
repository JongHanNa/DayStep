import Foundation

@objc(DayStepShareModule)
class DayStepShareModule: NSObject {

  private let appGroupID = "group.com.daystep.app"
  private let sharedTextKey = "shared_text_pending"
  private let siriTextKey = "siri_todo_pending"

  /// Share Extension 또는 다른 소스에서 저장한 공유 텍스트를 읽고 삭제
  @objc(getPendingSharedText:withRejecter:)
  func getPendingSharedText(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      resolve(nil)
      return
    }
    let text = defaults.string(forKey: sharedTextKey)
    if text != nil {
      defaults.removeObject(forKey: sharedTextKey)
      defaults.synchronize()
    }
    resolve(text)
  }

  /// Siri Shortcuts에서 저장한 텍스트를 읽고 삭제
  @objc(getSiriPendingText:withRejecter:)
  func getSiriPendingText(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      resolve(nil)
      return
    }
    let text = defaults.string(forKey: siriTextKey)
    if text != nil {
      defaults.removeObject(forKey: siriTextKey)
      defaults.synchronize()
    }
    resolve(text)
  }

  /// 인증 정보를 App Group UserDefaults에 저장 (Share Extension에서 사용)
  @objc(setAuthForExtension:accessToken:refreshToken:expiresAt:supabaseUrl:supabaseKey:withResolver:withRejecter:)
  func setAuthForExtension(
    _ userId: String,
    accessToken: String,
    refreshToken: String,
    expiresAt: NSNumber,
    supabaseUrl: String,
    supabaseKey: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      reject("ERR_APP_GROUP", "App Group not found", nil)
      return
    }
    defaults.set(userId, forKey: "extension_user_id")
    defaults.set(accessToken, forKey: "extension_access_token")
    defaults.set(refreshToken, forKey: "extension_refresh_token")
    defaults.set(expiresAt.doubleValue, forKey: "extension_expires_at")
    defaults.set(supabaseUrl, forKey: "extension_supabase_url")
    defaults.set(supabaseKey, forKey: "extension_supabase_key")
    defaults.synchronize()
    resolve(nil)
  }

  /// 로그아웃 시 Extension 인증 정보 삭제
  @objc(clearAuthForExtension:withRejecter:)
  func clearAuthForExtension(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      resolve(nil)
      return
    }
    defaults.removeObject(forKey: "extension_user_id")
    defaults.removeObject(forKey: "extension_access_token")
    defaults.removeObject(forKey: "extension_refresh_token")
    defaults.removeObject(forKey: "extension_expires_at")
    defaults.synchronize()
    resolve(nil)
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
