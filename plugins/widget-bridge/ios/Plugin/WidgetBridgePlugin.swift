import Foundation
import Capacitor
import WidgetKit

/**
 * iOS Widget Bridge Plugin
 * 웹앱과 iOS Widget 간의 데이터 동기화를 담당
 */
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin {
    
    // MARK: - Constants
    private let appGroupId = "group.com.daystep.app"
    private let todosKey = "widget_todos"
    private let statusKey = "widget_status"
    private let widgetKind = "DayStepWidget"
    
    // MARK: - Properties
    private var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupId)
    }
    
    // MARK: - Plugin Methods
    
    /**
     * 할일 데이터를 Widget과 동기화
     */
    @objc func syncTodos(_ call: CAPPluginCall) {
        guard let todosArray = call.getArray("todos", JSObject.self) else {
            CAPLog.print("🔴 [WidgetBridge] Missing or invalid todos parameter")
            call.reject("Missing or invalid todos parameter")
            return
        }
        
        let maxItems = call.getInt("maxItems") ?? 100
        let force = call.getBool("force") ?? false
        
        CAPLog.print("🔵 [WidgetBridge] Received \(todosArray.count) todos for sync (maxItems: \(maxItems), force: \(force))")
        
        // 최대 항목 수 제한
        let limitedTodos = Array(todosArray.prefix(maxItems))
        
        // 각 할일 정보를 자세히 로그
        for (index, todo) in limitedTodos.enumerated() {
            let title = todo["title"] as? String ?? "Unknown"
            let completed = todo["completed"] as? Bool ?? false
            let dueDate = todo["dueDate"] as? String ?? "No due date"
            let priority = todo["priority"] as? String ?? "medium"
            let id = todo["id"] as? String ?? "no-id"
            
            CAPLog.print("🟡 [WidgetBridge] Todo \(index): '\(title)'")
            CAPLog.print("    📅 Due: \(dueDate), Priority: \(priority)")
            CAPLog.print("    ✅ Completed: \(completed), ID: \(id)")
        }
        
        do {
            // JSON 데이터로 직렬화
            let jsonData = try JSONSerialization.data(withJSONObject: limitedTodos)
            
            // App Groups UserDefaults에 저장
            guard let defaults = sharedDefaults else {
                CAPLog.print("🔴 [WidgetBridge] Failed to access shared UserDefaults")
                call.reject("Failed to access shared UserDefaults")
                return
            }
            
            defaults.set(jsonData, forKey: todosKey)
            let syncResult = defaults.synchronize()
            
            CAPLog.print("🟢 [WidgetBridge] UserDefaults sync result: \(syncResult)")
            CAPLog.print("🟢 [WidgetBridge] Stored \(jsonData.count) bytes to key '\(todosKey)'")
            
            // 저장된 데이터 즉시 검증
            if let savedData = defaults.data(forKey: todosKey),
               let savedTodos = try? JSONSerialization.jsonObject(with: savedData) as? [Any] {
                CAPLog.print("🟢 [WidgetBridge] Verification: \(savedTodos.count) todos saved successfully")
            } else {
                CAPLog.print("🔴 [WidgetBridge] Verification FAILED: Could not read back saved data")
            }
            
            // 상태 업데이트
            updateWidgetStatus(todosCount: limitedTodos.count)
            
            // Widget 새로고침 트리거 (모든 위젯)
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
                CAPLog.print("🟢 [WidgetBridge] All widgets reload requested (reloadAllTimelines)")
                
                // 추가적으로 특정 위젯도 새로고침
                WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
                CAPLog.print("🟢 [WidgetBridge] Specific widget '\(widgetKind)' reload also requested")
            }
            
            // 이벤트 발생
            notifyListeners("widgetDataChanged", data: [
                "todos": limitedTodos,
                "timestamp": ISO8601DateFormatter().string(from: Date()),
                "count": limitedTodos.count
            ])
            
            call.resolve([
                "success": true,
                "message": "Successfully synced \(limitedTodos.count) todos",
                "data": ["count": limitedTodos.count]
            ])
            
            CAPLog.print("✅ Widget: Synced \(limitedTodos.count) todos to widget")
            
        } catch {
            CAPLog.print("❌ Widget: Failed to sync todos - \(error.localizedDescription)")
            call.reject("Failed to serialize todos data: \(error.localizedDescription)")
        }
    }
    
    /**
     * Widget에서 저장된 할일 데이터 가져오기
     */
    @objc func getTodos(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults else {
            call.reject("Failed to access shared UserDefaults")
            return
        }
        
        guard let data = defaults.data(forKey: todosKey) else {
            // 데이터가 없는 경우 빈 배열 반환
            call.resolve([
                "todos": [],
                "count": 0
            ])
            return
        }
        
        do {
            let todos = try JSONSerialization.jsonObject(with: data, options: [])
            let todosArray = todos as? [Any] ?? []
            
            call.resolve([
                "todos": todosArray,
                "count": todosArray.count
            ])
            
            CAPLog.print("✅ Widget: Retrieved \(todosArray.count) todos from widget storage")
            
        } catch {
            CAPLog.print("❌ Widget: Failed to deserialize todos - \(error.localizedDescription)")
            call.reject("Failed to deserialize todos data: \(error.localizedDescription)")
        }
    }
    
    /**
     * Widget의 모든 데이터 삭제
     */
    @objc func clearTodos(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults else {
            call.reject("Failed to access shared UserDefaults")
            return
        }
        
        defaults.removeObject(forKey: todosKey)
        defaults.synchronize()
        
        // 상태 업데이트
        updateWidgetStatus(todosCount: 0)
        
        // Widget 새로고침
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
        }
        
        call.resolve([
            "success": true,
            "message": "All todos cleared from widget storage"
        ])
        
        CAPLog.print("✅ Widget: Cleared all todos from widget storage")
    }
    
    /**
     * Widget 새로고침 요청
     */
    @objc func reloadWidget(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            // 모든 위젯 새로고침
            WidgetCenter.shared.reloadAllTimelines()
            CAPLog.print("🟢 [WidgetBridge] reloadWidget: All widgets reload requested")
            
            // 특정 위젯도 새로고침 (추가 보장)
            WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
            CAPLog.print("🟢 [WidgetBridge] reloadWidget: Specific widget '\(widgetKind)' reload requested")
            
            call.resolve([
                "success": true,
                "message": "Widget reload requested (all timelines)"
            ])
            
            CAPLog.print("✅ Widget: Widget reload completed")
        } else {
            call.reject("Widget is not supported on this iOS version")
        }
    }
    
    /**
     * Widget 업데이트 스케줄 설정
     */
    @objc func scheduleUpdate(_ call: CAPPluginCall) {
        let intervalMinutes = call.getInt("intervalMinutes") ?? 30
        let allowBackgroundUpdate = call.getBool("allowBackgroundUpdate") ?? true
        
        // 백그라운드 앱 새로고침 권한 확인
        let backgroundRefreshStatus = UIApplication.shared.backgroundRefreshStatus
        let isBackgroundEnabled = backgroundRefreshStatus == .available && allowBackgroundUpdate
        
        if #available(iOS 14.0, *) {
            // Widget 새로고침 스케줄 설정
            WidgetCenter.shared.reloadAllTimelines()
            
            // 백그라운드 작업 스케줄링 (실제 구현은 앱별로 다름)
            if isBackgroundEnabled {
                scheduleBackgroundRefresh(interval: TimeInterval(intervalMinutes * 60))
            }
            
            call.resolve([
                "success": true,
                "message": "Widget update scheduled",
                "data": [
                    "intervalMinutes": intervalMinutes,
                    "backgroundUpdateEnabled": isBackgroundEnabled
                ]
            ])
            
            CAPLog.print("✅ Widget: Update scheduled - interval: \(intervalMinutes)min, background: \(isBackgroundEnabled)")
        } else {
            call.reject("Widget scheduling is not supported on this iOS version")
        }
    }
    
    /**
     * Widget 상태 정보 조회
     */
    @objc func getWidgetStatus(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults else {
            call.reject("Failed to access shared UserDefaults")
            return
        }
        
        // 저장된 할일 개수 확인
        let todosCount: Int
        if let data = defaults.data(forKey: todosKey),
           let todos = try? JSONSerialization.jsonObject(with: data) as? [Any] {
            todosCount = todos.count
        } else {
            todosCount = 0
        }
        
        // 상태 정보 가져오기
        let statusData = defaults.data(forKey: statusKey)
        var lastUpdate: String? = nil
        
        if let data = statusData,
           let status = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let updateTime = status["lastUpdate"] as? String {
            lastUpdate = updateTime
        }
        
        // 백그라운드 업데이트 가능 여부
        let backgroundEnabled = UIApplication.shared.backgroundRefreshStatus == .available
        
        let status: [String: Any] = [
            "isInstalled": true, // iOS에서는 항상 true
            "lastUpdate": lastUpdate as Any,
            "syncedTodosCount": todosCount,
            "backgroundUpdateEnabled": backgroundEnabled
        ]
        
        call.resolve(status)
        
        CAPLog.print("✅ Widget: Status retrieved - \(todosCount) todos, background: \(backgroundEnabled)")
    }
    
    /**
     * 앱을 특정 섹션으로 열기 (딥링킹)
     */
    @objc func openApp(_ call: CAPPluginCall) {
        let section = call.getString("section") ?? "todos"
        let todoId = call.getString("todoId")
        
        var urlString = "daystep://\(section)"
        if let todoId = todoId {
            urlString += "/\(todoId)"
        }
        
        guard let url = URL(string: urlString) else {
            call.reject("Invalid URL: \(urlString)")
            return
        }
        
        DispatchQueue.main.async {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url) { success in
                    if success {
                        call.resolve([
                            "success": true,
                            "message": "App opened successfully",
                            "data": ["url": urlString, "section": section, "todoId": todoId as Any]
                        ])
                        
                        // 이벤트 발생
                        self.notifyListeners("widgetTapped", data: [
                            "section": section,
                            "todoId": todoId as Any,
                            "timestamp": ISO8601DateFormatter().string(from: Date())
                        ])
                        
                        CAPLog.print("✅ Widget: App opened with URL: \(urlString)")
                    } else {
                        call.reject("Failed to open URL: \(urlString)")
                    }
                }
            } else {
                call.reject("Cannot open URL: \(urlString)")
            }
        }
    }
    
    // MARK: - Helper Methods
    
    /**
     * Widget 상태 업데이트
     */
    private func updateWidgetStatus(todosCount: Int) {
        guard let defaults = sharedDefaults else { return }
        
        let status: [String: Any] = [
            "lastUpdate": ISO8601DateFormatter().string(from: Date()),
            "syncedTodosCount": todosCount,
            "backgroundUpdateEnabled": UIApplication.shared.backgroundRefreshStatus == .available
        ]
        
        do {
            let statusData = try JSONSerialization.data(withJSONObject: status)
            defaults.set(statusData, forKey: statusKey)
            defaults.synchronize()
        } catch {
            CAPLog.print("❌ Widget: Failed to update status - \(error.localizedDescription)")
        }
    }
    
    /**
     * 백그라운드 새로고침 스케줄링
     */
    private func scheduleBackgroundRefresh(interval: TimeInterval) {
        // 실제 백그라운드 작업 스케줄링은 앱의 AppDelegate에서 구현
        // 여기서는 UserDefaults에 설정만 저장
        guard let defaults = sharedDefaults else { return }
        
        let refreshConfig: [String: Any] = [
            "enabled": true,
            "interval": interval,
            "scheduledAt": ISO8601DateFormatter().string(from: Date())
        ]
        
        do {
            let configData = try JSONSerialization.data(withJSONObject: refreshConfig)
            defaults.set(configData, forKey: "background_refresh_config")
            defaults.synchronize()
            
            CAPLog.print("✅ Widget: Background refresh config saved")
        } catch {
            CAPLog.print("❌ Widget: Failed to save background refresh config - \(error.localizedDescription)")
        }
    }
    
    // MARK: - Plugin Lifecycle
    
    public override func load() {
        super.load()
        CAPLog.print("✅ Widget: WidgetBridgePlugin loaded")
        
        // 초기 상태 확인
        checkInitialStatus()
    }
    
    /**
     * 플러그인 로드 시 초기 상태 확인
     */
    private func checkInitialStatus() {
        guard let defaults = sharedDefaults else {
            CAPLog.print("❌ Widget: Failed to access shared UserDefaults during initialization")
            return
        }
        
        // App Groups 접근 가능 여부 확인
        defaults.set("test", forKey: "widget_test")
        let testValue = defaults.string(forKey: "widget_test")
        defaults.removeObject(forKey: "widget_test")
        
        if testValue == "test" {
            CAPLog.print("✅ Widget: App Groups access verified")
        } else {
            CAPLog.print("❌ Widget: App Groups access failed - please check configuration")
        }
        
        // 현재 저장된 데이터 상태 로그
        if let data = defaults.data(forKey: todosKey),
           let todos = try? JSONSerialization.jsonObject(with: data) as? [Any] {
            CAPLog.print("✅ Widget: Found \(todos.count) existing todos in widget storage")
        } else {
            CAPLog.print("ℹ️ Widget: No existing todos found in widget storage")
        }
    }
}