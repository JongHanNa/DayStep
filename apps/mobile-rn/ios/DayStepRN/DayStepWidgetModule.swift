import Foundation
import WidgetKit

@objc(DayStepWidgetModule)
class DayStepWidgetModule: NSObject {

  private let appGroupID = "group.com.daystep.app"
  private let userDefaultsKey = "daystep_widget_calendar"

  /// RN에서 호출: 월간 데이터 JSON을 UserDefaults(App Group)에 저장 후 위젯 갱신
  @objc(updateWidgetData:withResolver:withRejecter:)
  func updateWidgetData(
    _ jsonString: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      reject("ERR_APP_GROUP", "App Group not found: \(appGroupID)", nil)
      return
    }
    defaults.set(jsonString, forKey: userDefaultsKey)
    defaults.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    resolve(nil)
  }

  /// 앱 포그라운드 복귀 시 위젯 타임라인 강제 갱신
  @objc(reloadWidgetTimelines:withRejecter:)
  func reloadWidgetTimelines(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    resolve(nil)
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}

