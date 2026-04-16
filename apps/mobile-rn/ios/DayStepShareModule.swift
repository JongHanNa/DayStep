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

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
