import Foundation
import CallKit
import UserNotifications

/// 통화 종료 감지 네이티브 모듈
/// CXCallObserver로 통화 상태 변화를 감지
/// 통화 종료 시 로컬 알림 + App Group 플래그 저장
@objc(CallDetectorModule)
class CallDetectorModule: NSObject {

  private let callObserver = CXCallObserver()
  private var hasActiveCall = false
  private var isListening = false
  private let appGroupID = "group.com.daystep.app"
  private let callEndedKey = "call_ended_pending"

  /// JS에서 리스닝 시작
  @objc(startListening:withRejecter:)
  func startListening(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !isListening else {
      resolve(nil)
      return
    }
    isListening = true
    callObserver.setDelegate(self, queue: DispatchQueue.main)
    resolve(nil)
  }

  /// JS에서 리스닝 중지
  @objc(stopListening:withRejecter:)
  func stopListening(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    isListening = false
    resolve(nil)
  }

  /// JS에서 call-ended 플래그 읽고 삭제
  @objc(getPendingCallEnded:withRejecter:)
  func getPendingCallEnded(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      resolve(false)
      return
    }
    let pending = defaults.bool(forKey: callEndedKey)
    if pending {
      defaults.removeObject(forKey: callEndedKey)
      defaults.synchronize()
    }
    resolve(pending)
  }

  private func onCallEnded() {
    // 1. App Group 플래그 저장
    if let defaults = UserDefaults(suiteName: appGroupID) {
      defaults.set(true, forKey: callEndedKey)
      defaults.synchronize()
    }

    // 2. 5초 후 로컬 알림
    let content = UNMutableNotificationContent()
    content.title = "방금 약속 잡으셨나요?"
    content.body = "탭해서 빠르게 등록하세요"
    content.sound = .default
    content.userInfo = ["type": "call-reminder"]

    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
    let request = UNNotificationRequest(
      identifier: "daystep-call-reminder-\(Date().timeIntervalSince1970)",
      content: content,
      trigger: trigger
    )
    UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}

// MARK: - CXCallObserverDelegate
extension CallDetectorModule: CXCallObserverDelegate {
  func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
    guard isListening else { return }

    if call.hasConnected && !call.hasEnded {
      hasActiveCall = true
    } else if hasActiveCall && call.hasEnded {
      hasActiveCall = false
      onCallEnded()
    }
  }
}
