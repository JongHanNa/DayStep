import Foundation
import Capacitor
import WidgetKit
import UserNotifications

/**
 * DayStep 위젯 및 알림 관리 플러그인
 */
@objc(DayStepWidgetPlugin)
public class DayStepWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DayStepWidgetPlugin"
    public let jsName = "DayStepWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateTodoData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateAllWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleNotification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestNotificationPermission", returnType: CAPPluginReturnPromise)
    ]
    
    private let appGroupId = "group.com.daystep.app"
    
    @objc func updateTodoData(_ call: CAPPluginCall) {
        guard let todosData = call.getArray("todos", [String: Any].self) else {
            call.reject("Invalid todos data")
            return
        }
        
        // App Group UserDefaults에 할일 데이터 저장
        let sharedDefaults = UserDefaults(suiteName: appGroupId)
        sharedDefaults?.set(todosData, forKey: "widget_todos")
        
        // 위젯 새로고침 요청
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        
        call.resolve(["success": true])
    }
    
    
    @objc func refreshWidget(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["success": true])
    }
    
    @objc func updateAllWidgetData(_ call: CAPPluginCall) {
        guard let todosData = call.getArray("todos", [String: Any].self),
              let todayProgress = call.getFloat("todayProgress") else {
            call.reject("Invalid widget data")
            return
        }
        
        let sharedDefaults = UserDefaults(suiteName: appGroupId)
        sharedDefaults?.set(todosData, forKey: "widget_todos")
        sharedDefaults?.set(todayProgress, forKey: "widget_today_progress")
        sharedDefaults?.set(Date(), forKey: "widget_last_updated")
        
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        
        call.resolve(["success": true])
    }
    
    @objc func scheduleNotification(_ call: CAPPluginCall) {
        guard let title = call.getString("title"),
              let body = call.getString("body"),
              let scheduledTimeString = call.getString("scheduledTime") else {
            call.reject("Missing notification parameters")
            return
        }
        
        // ISO 문자열을 Date로 변환
        let formatter = ISO8601DateFormatter()
        guard let scheduledDate = formatter.date(from: scheduledTimeString) else {
            call.reject("Invalid scheduled time format")
            return
        }
        
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        // 사용자 정보 추가
        var userInfo: [String: Any] = [:]
        if let todoId = call.getString("todoId") {
            userInfo["todoId"] = todoId
        }
        if let type = call.getString("type") {
            userInfo["type"] = type
        }
        content.userInfo = userInfo
        
        // 시간 기반 트리거 생성
        let triggerDate = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: scheduledDate)
        let trigger = UNCalendarNotificationTrigger(dateMatching: triggerDate, repeats: false)
        
        let identifier = UUID().uuidString
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Failed to schedule notification: \(error.localizedDescription)")
                } else {
                    call.resolve(["success": true])
                }
            }
        }
    }
    
    @objc func requestNotificationPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject("Failed to request notification permission: \(error.localizedDescription)")
                } else {
                    call.resolve(["granted": granted])
                }
            }
        }
    }
}