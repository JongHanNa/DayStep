import WidgetKit
import SwiftUI
import os.log

// Widget Logger 설정
private let widgetLogger = Logger(subsystem: "com.daystep.app", category: "DayStepWidget")

// DateFormatter 확장
extension DateFormatter {
    static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.locale = Locale(identifier: "ko_KR")
        return formatter
    }()
}

// Widget Entry
struct TodoEntry: TimelineEntry {
    let date: Date
    let todayTodos: [WidgetTodo]
    let completedCount: Int
    let totalCount: Int
    let nextTodo: WidgetTodo?
}

// Widget Todo Model
struct WidgetTodo: Identifiable {
    let id: String
    let content: String
    let completed: Bool
    let startTime: Date?
    let endTime: Date?
    let isUpcoming: Bool
    let priority: String
    let category: String?
    
    // 현재 시간 이후의 할일인지 확인
    var isAfterCurrentTime: Bool {
        guard let startTime = startTime else { return false }
        return startTime > Date()
    }
    
    // 시간 표시 텍스트
    var displayText: String {
        if let startTime = startTime {
            let timeString = DateFormatter.timeFormatter.string(from: startTime)
            return "\(timeString) \(content)"
        }
        return content
    }
}

// Widget Provider
struct DayStepWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodoEntry {
        widgetLogger.info("🔵 [DayStepWidget] placeholder called")
        let futureTime = Calendar.current.date(byAdding: .hour, value: 2, to: Date()) ?? Date()
        
        return TodoEntry(
            date: Date(),
            todayTodos: [
                WidgetTodo(
                    id: "1", 
                    content: "운동하기", 
                    completed: false, 
                    startTime: futureTime,
                    endTime: nil,
                    isUpcoming: true,
                    priority: "high",
                    category: "건강"
                ),
                WidgetTodo(
                    id: "2", 
                    content: "독서하기", 
                    completed: true, 
                    startTime: nil,
                    endTime: nil,
                    isUpcoming: false,
                    priority: "medium",
                    category: "학습"
                )
            ],
            completedCount: 1,
            totalCount: 2,
            nextTodo: WidgetTodo(
                id: "1", 
                content: "운동하기", 
                completed: false, 
                startTime: futureTime,
                endTime: nil,
                isUpcoming: true,
                priority: "high",
                category: "건강"
            )
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (TodoEntry) -> ()) {
        widgetLogger.info("🔵 [DayStepWidget] getSnapshot called")
        
        // Preview 모드에서는 placeholder 사용
        if context.isPreview {
            widgetLogger.info("🟡 [DayStepWidget] Using placeholder for preview")
            completion(placeholder(in: context))
            return
        }
        
        // 실제 데이터 로드 시도
        loadRealData { entry in
            widgetLogger.info("🟢 [DayStepWidget] getSnapshot returning real data with \(entry.totalCount) todos")
            completion(entry)
        }
    }
    
    // 실제 데이터 로드 함수 (getTimeline과 공통 사용)
    private func loadRealData(completion: @escaping (TodoEntry) -> ()) {
        // App Groups를 통해 데이터 읽기
        let sharedDefaults = UserDefaults(suiteName: "group.com.daystep.app")
        
        var todos: [WidgetTodo] = []
        var completedCount = 0
        var totalCount = 0
        var nextTodo: WidgetTodo?
        
        widgetLogger.info("🔵 [DayStepWidget] loadRealData: Attempting to load data from App Groups")
        
        // 1차 시도: widget_todos 키에서 데이터 읽기
        if let todosData = sharedDefaults?.data(forKey: "widget_todos") {
            widgetLogger.info("🟢 [DayStepWidget] loadRealData: Found data - \(todosData.count) bytes")
            
            // JSON 파싱 시도
            do {
                if let jsonObject = try JSONSerialization.jsonObject(with: todosData) as? [[String: Any]] {
                    widgetLogger.info("🟡 [DayStepWidget] loadRealData: Successfully parsed \(jsonObject.count) todos")
                    
                    todos = jsonObject.compactMap { todoDict in
                        guard let id = todoDict["id"] as? String,
                              let title = todoDict["title"] as? String else {
                            return nil
                        }
                        
                        let completed = todoDict["completed"] as? Bool ?? false
                        let startTimeString = todoDict["dueDate"] as? String
                        let priority = todoDict["priority"] as? String ?? "medium"
                        let category = todoDict["category"] as? String
                        
                        var startTime: Date? = nil
                        if let timeString = startTimeString {
                            startTime = ISO8601DateFormatter().date(from: timeString)
                        }
                        
                        let isUpcoming = startTime != nil ? startTime! > Date() : false
                        
                        return WidgetTodo(
                            id: id,
                            content: title,
                            completed: completed,
                            startTime: startTime,
                            endTime: nil,
                            isUpcoming: isUpcoming,
                            priority: priority,
                            category: category
                        )
                    }
                    
                    totalCount = todos.count
                    completedCount = todos.filter { $0.completed }.count
                    
                    // 현재 시간 이후의 미완료 할일 중 가장 빠른 것
                    nextTodo = todos.first { !$0.completed && $0.isAfterCurrentTime } ?? 
                               todos.first { !$0.completed }
                    
                    widgetLogger.info("🟢 [DayStepWidget] loadRealData: Processed \(todos.count) todos, \(completedCount) completed")
                }
            } catch {
                widgetLogger.error("🔴 [DayStepWidget] loadRealData: JSON parsing error: \(error.localizedDescription)")
            }
        } else {
            widgetLogger.info("🟡 [DayStepWidget] loadRealData: No data found, using empty state")
        }
        
        let entry = TodoEntry(
            date: Date(),
            todayTodos: todos,
            completedCount: completedCount,
            totalCount: totalCount,
            nextTodo: nextTodo
        )
        
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodoEntry>) -> ()) {
        widgetLogger.info("🔵 [DayStepWidget] getTimeline called")
        
        // 공통 데이터 로드 함수 사용
        loadRealData { entry in
            widgetLogger.info("🟢 [DayStepWidget] getTimeline returning data with \(entry.totalCount) todos")
            
            // 5분마다 업데이트 (더 빠른 업데이트로 시간 변경 반영)
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            
            completion(timeline)
        }
    }
    
    // 이전의 긴 getTimeline 구현은 제거하고 위의 간단한 버전 사용
    func getTimelineOLD(in context: Context, completion: @escaping (Timeline<TodoEntry>) -> ()) {
        widgetLogger.info("🔵 [DayStepWidget] getTimelineOLD called (deprecated)")
        
        // App Groups를 통해 데이터 읽기
        let sharedDefaults = UserDefaults(suiteName: "group.com.daystep.app")
        
        var todos: [WidgetTodo] = []
        var completedCount = 0
        var totalCount = 0
        var nextTodo: WidgetTodo?
        
        // UserDefaults 연결 확인
        if let defaults = sharedDefaults {
            widgetLogger.info("🟢 [DayStepWidget] UserDefaults connected successfully")
        } else {
            widgetLogger.error("🔴 [DayStepWidget] Failed to connect to UserDefaults with suiteName: group.com.daystep.app")
        }
        
        // 1차 시도: 기존 widget_todos 키에서 데이터 읽기
        var todosData: Data? = sharedDefaults?.data(forKey: "widget_todos")
        var dataSource = "App Groups widget_todos"
        
        // 2차 시도: Capacitor Preferences 데이터 읽기 (widget_todos_data)
        if todosData == nil {
            todosData = sharedDefaults?.data(forKey: "widget_todos_data")
            dataSource = "App Groups widget_todos_data"
        }
        
        // 3차 시도: UserDefaults에서 Capacitor Preferences 직접 읽기
        if todosData == nil {
            let userDefaults = UserDefaults.standard
            if let prefData = userDefaults.data(forKey: "widget_todos_data") {
                todosData = prefData
                dataSource = "UserDefaults widget_todos_data"
                widgetLogger.info("🟡 [DayStepWidget] Found Capacitor Preferences data in standard UserDefaults")
                
                // 향후 사용을 위해 App Groups에 복사
                sharedDefaults?.set(prefData, forKey: "widget_todos_data")
                sharedDefaults?.synchronize()
                widgetLogger.info("🟡 [DayStepWidget] Copied Preferences data to App Groups for future use")
            }
        }
        
        // 저장된 데이터 확인
        if let data = todosData {
            widgetLogger.info("🟢 [DayStepWidget] Found data from \(dataSource): \(data.count) bytes")
            
            // Capacitor Preferences 형식 데이터 파싱 시도 (widget_todos_data)
            do {
                if let preferencesWrapper = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let todosArray = preferencesWrapper["todos"] as? [[String: Any]] {
                    widgetLogger.info("🟢 [DayStepWidget] Found Preferences format with \(todosArray.count) todos")
                    
                    // Preferences 형식에서 todos 추출
                    todos = todosArray.compactMap { todoDict in
                        guard let id = todoDict["id"] as? String,
                              let content = todoDict["title"] as? String else {
                            widgetLogger.error("🔴 [DayStepWidget] Missing required fields in Preferences todo: \(todoDict)")
                            return nil
                        }
                        
                        let completed = todoDict["completed"] as? Bool ?? false
                        let startTimeString = todoDict["dueDate"] as? String
                        let priority = todoDict["priority"] as? String ?? "medium"
                        let category = todoDict["category"] as? String
                        
                        var startTime: Date? = nil
                        if let timeString = startTimeString {
                            startTime = ISO8601DateFormatter().date(from: timeString)
                        }
                        
                        let isUpcoming = startTime != nil ? startTime! > Date() : false
                        
                        let todo = WidgetTodo(
                            id: id,
                            content: content,
                            completed: completed,
                            startTime: startTime,
                            endTime: nil,
                            isUpcoming: isUpcoming,
                            priority: priority,
                            category: category
                        )
                        
                        widgetLogger.info("🟢 [DayStepWidget] Created Preferences todo: '\(content)', time: \(startTime?.description ?? "nil"), upcoming: \(isUpcoming)")
                        return todo
                    }
                    
                    widgetLogger.info("🟢 [DayStepWidget] Successfully parsed \(todos.count) todos from Preferences format")
                    
                } else {
                    // 기존 형식 시도 (직접 배열)
                    if let jsonObject = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                        widgetLogger.info("🟡 [DayStepWidget] Using legacy format with \(jsonObject.count) todos")
                        
                        for (index, todoDict) in jsonObject.enumerated() {
                            let content = todoDict["content"] as? String ?? todoDict["title"] as? String ?? "Unknown"
                            let startTime = todoDict["startTime"] as? String ?? todoDict["dueDate"] as? String ?? "No time"
                            let completed = todoDict["completed"] as? Bool ?? false
                            let isUpcoming = todoDict["isUpcoming"] as? Bool ?? false
                            widgetLogger.info("🟡 [DayStepWidget] Legacy Todo \(index): '\(content)', time: \(startTime), completed: \(completed), upcoming: \(isUpcoming)")
                        }
                        
                        // 레거시 형식 수동 파싱
                        todos = jsonObject.compactMap { todoDict in
                            guard let id = todoDict["id"] as? String,
                                  let content = todoDict["content"] as? String ?? todoDict["title"] as? String else {
                                widgetLogger.error("🔴 [DayStepWidget] Missing required fields in legacy todo: \(todoDict)")
                                return nil
                            }
                            
                            let completed = todoDict["completed"] as? Bool ?? false
                            let startTimeString = todoDict["startTime"] as? String ?? todoDict["dueDate"] as? String
                            let isUpcoming = todoDict["isUpcoming"] as? Bool ?? false
                            let priority = todoDict["priority"] as? String ?? "medium"
                            let category = todoDict["category"] as? String
                            
                            var startTime: Date? = nil
                            if let timeString = startTimeString {
                                startTime = ISO8601DateFormatter().date(from: timeString)
                            }
                            
                            let todo = WidgetTodo(
                                id: id,
                                content: content,
                                completed: completed,
                                startTime: startTime,
                                endTime: nil,
                                isUpcoming: isUpcoming,
                                priority: priority,
                                category: category
                            )
                            
                            widgetLogger.info("🟢 [DayStepWidget] Created legacy todo: '\(content)', time: \(startTime?.description ?? "nil"), upcoming: \(isUpcoming)")
                            return todo
                        }
                        
                        widgetLogger.info("🟢 [DayStepWidget] Legacy parsing created \(todos.count) todos")
                    }
                }
            } catch {
                widgetLogger.error("🔴 [DayStepWidget] JSON parsing failed: \(error.localizedDescription)")
            }
            
            // 기존 JSONDecoder 방식 시도 (백업)
            if todos.isEmpty, let data = todosData,
               let decodedTodos = try? JSONDecoder().decode([WidgetTodoData].self, from: data) {
                widgetLogger.info("🟢 [DayStepWidget] Successfully decoded \(decodedTodos.count) todos using JSONDecoder")
            } else if let data = todosData {
                widgetLogger.info("🔴 [DayStepWidget] Failed to decode todos using JSONDecoder - trying manual parsing")
                
                // 수동 JSON 파싱 시도
                do {
                    if let jsonArray = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                        widgetLogger.info("🟡 [DayStepWidget] Attempting manual parsing of \(jsonArray.count) todos")
                        
                        todos = jsonArray.compactMap { todoDict -> WidgetTodo? in
                            guard let id = todoDict["id"] as? String,
                                  let content = todoDict["content"] as? String else {
                                widgetLogger.error("🔴 [DayStepWidget] Missing required fields in todo: \(todoDict)")
                                return nil
                            }
                            
                            let completed = todoDict["completed"] as? Bool ?? false
                            let startTimeString = todoDict["startTime"] as? String
                            let isUpcoming = todoDict["isUpcoming"] as? Bool ?? false
                            let priority = todoDict["priority"] as? String ?? "medium"
                            let category = todoDict["category"] as? String
                            
                            var startTime: Date? = nil
                            if let timeString = startTimeString {
                                startTime = ISO8601DateFormatter().date(from: timeString)
                            }
                            
                            let todo = WidgetTodo(
                                id: id,
                                content: content,
                                completed: completed,
                                startTime: startTime,
                                endTime: nil,
                                isUpcoming: isUpcoming,
                                priority: priority,
                                category: category
                            )
                            
                            widgetLogger.info("🟢 [DayStepWidget] Created todo: '\(content)', time: \(startTime?.description ?? "nil"), upcoming: \(isUpcoming)")
                            return todo
                        }
                        
                        widgetLogger.info("🟢 [DayStepWidget] Manual parsing created \(todos.count) todos")
                    }
                } catch {
                    widgetLogger.error("🔴 [DayStepWidget] Manual JSON parsing failed: \(error.localizedDescription)")
                }
            }
        } else {
            widgetLogger.info("🔴 [DayStepWidget] No widget_todos data found in UserDefaults")
            
            // 모든 키 확인
            if let defaults = sharedDefaults {
                let allKeys = defaults.dictionaryRepresentation().keys
                widgetLogger.info("🟡 [DayStepWidget] Available UserDefaults keys: \(Array(allKeys))")
            }
        }
        
        // 할일 정렬 및 통계 계산 (데이터가 있는 경우만)
        if !todos.isEmpty {
            // 현재 시간 이후의 할일을 우선 정렬
            todos.sort { todo1, todo2 in
                // 1. 완료 상태 (미완료 우선)
                if todo1.completed != todo2.completed {
                    return !todo1.completed && todo2.completed
                }
                
                // 2. 현재 시간 이후의 할일 우선
                if todo1.isAfterCurrentTime != todo2.isAfterCurrentTime {
                    return todo1.isAfterCurrentTime && !todo2.isAfterCurrentTime
                }
                
                // 3. 시간 지정 할일이 있는 경우 시간순 정렬
                if let time1 = todo1.startTime, let time2 = todo2.startTime {
                    return time1 < time2
                }
                
                // 4. 시간 지정 할일 우선
                if (todo1.startTime != nil) != (todo2.startTime != nil) {
                    return todo1.startTime != nil
                }
                
                return false
            }
            
            totalCount = todos.count
            completedCount = todos.filter { $0.completed }.count
            
            // 다음 할일: 현재 시간 이후의 미완료 할일 중 가장 빠른 것
            nextTodo = todos.first { !$0.completed && $0.isAfterCurrentTime } ?? 
                      todos.first { !$0.completed }
                      
            widgetLogger.info("🟢 [DayStepWidget] Final result: \(todos.count) todos, \(completedCount) completed")
            if let next = nextTodo {
                widgetLogger.info("🟢 [DayStepWidget] Next todo: '\(next.content)', upcoming: \(next.isAfterCurrentTime)")
            }
        }
        
        let entry = TodoEntry(
            date: Date(),
            todayTodos: todos,
            completedCount: completedCount,
            totalCount: totalCount,
            nextTodo: nextTodo
        )
        
        // 5분마다 업데이트 (더 빠른 업데이트로 시간 변경 반영)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
}

// 공유 데이터 모델 (위젯 브리지에서 전달되는 데이터와 동일한 구조)
struct WidgetTodoData: Codable {
    let id: String
    let title: String
    let completed: Bool
    let priority: String
    let dueDate: String?
    let createdAt: String
    let updatedAt: String
    let category: String?
    let tags: [String]?
    
    // 시간 변환을 위한 계산 속성들
    var startTime: Date? {
        guard let dueDate = dueDate else { return nil }
        return ISO8601DateFormatter().date(from: dueDate)
    }
    
    var isAfterCurrentTime: Bool {
        guard let startTime = startTime else { return false }
        return startTime > Date()
    }
}

// Widget UI
struct DayStepWidgetEntryView: View {
    var entry: DayStepWidgetProvider.Entry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // 헤더
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.blue)
                Text("DayStep")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
                Text("\(entry.completedCount)/\(entry.totalCount)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // 진행률 바
            ProgressView(value: Double(entry.completedCount), total: Double(entry.totalCount))
                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
            
            // 다음 할일 (현재 시간 이후 할일 우선 표시)
            if let nextTodo = entry.nextTodo {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        if nextTodo.isAfterCurrentTime {
                            Text("다음 할일")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        } else {
                            Text("진행중인 할일")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                        
                        Spacer()
                        
                        if nextTodo.priority == "high" {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.red)
                                .font(.caption2)
                        }
                    }
                    
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: nextTodo.completed ? "checkmark.circle.fill" : "circle")
                            .foregroundColor(nextTodo.completed ? .green : .blue)
                            .font(.caption)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(nextTodo.displayText)
                                .font(.body)
                                .lineLimit(2)
                                .strikethrough(nextTodo.completed)
                            
                            if let category = nextTodo.category {
                                Text(category)
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.secondary.opacity(0.1))
                                    .cornerRadius(4)
                            }
                        }
                        
                        Spacer()
                    }
                    
                    if let startTime = nextTodo.startTime {
                        HStack {
                            Image(systemName: "clock")
                                .font(.caption2)
                            Text(formatTimeWithRelative(startTime))
                                .font(.caption2)
                        }
                        .foregroundColor(nextTodo.isAfterCurrentTime ? .orange : .secondary)
                    }
                }
            } else if entry.totalCount > 0 {
                Text("모든 할일 완료! 🎉")
                    .font(.body)
                    .foregroundColor(.green)
            } else {
                VStack {
                    Image(systemName: "plus.circle")
                        .font(.title2)
                        .foregroundColor(.blue)
                    Text("할일을 추가해보세요")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .modifier(WidgetBackgroundModifier())
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func formatTimeWithRelative(_ date: Date) -> String {
        let now = Date()
        let timeInterval = date.timeIntervalSince(now)
        let minutes = Int(timeInterval / 60)
        
        if abs(minutes) < 5 {
            return "곧 시작"
        } else if minutes > 0 {
            if minutes < 60 {
                return "\(minutes)분 후"
            } else {
                let hours = minutes / 60
                return "\(hours)시간 후"
            }
        } else {
            return formatTime(date)
        }
    }
}

// Widget 구성
struct DayStepWidget: Widget {
    let kind: String = "DayStepWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DayStepWidgetProvider()) { entry in
            DayStepWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("DayStep 할일")
        .description("오늘의 할일 진행상황을 확인하세요.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// Widget Bundle은 DayStepWidgetBundle.swift 파일에서 관리됨

// iOS 버전 호환성을 위한 배경 Modifier
struct WidgetBackgroundModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content
                .containerBackground(.fill.tertiary, for: .widget)
        } else {
            content
                .background(Color(.systemBackground))
        }
    }
}