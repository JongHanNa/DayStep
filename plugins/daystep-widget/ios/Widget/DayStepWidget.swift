import WidgetKit
import SwiftUI

// 위젯에 표시할 데이터 구조
struct DayStepWidgetEntry: TimelineEntry {
    let date: Date
    let todos: [TodoItem]
    let todayProgress: Float
}

struct TodoItem {
    let id: String
    let title: String
    let completed: Bool
    let priority: String?
}

// Timeline Provider - 위젯 데이터를 제공
struct DayStepWidgetProvider: TimelineProvider {
    private let appGroupId = "group.com.daystep.app"
    
    func placeholder(in context: Context) -> DayStepWidgetEntry {
        DayStepWidgetEntry(
            date: Date(),
            todos: [
                TodoItem(id: "1", title: "예시 할일", completed: false, priority: "high"),
                TodoItem(id: "2", title: "완료된 할일", completed: true, priority: "medium")
            ],
            todayProgress: 0.6
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (DayStepWidgetEntry) -> ()) {
        let entry = placeholder(in: context)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DayStepWidgetEntry>) -> ()) {
        let entry = loadWidgetData()
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
    
    private func loadWidgetData() -> DayStepWidgetEntry {
        let sharedDefaults = UserDefaults(suiteName: appGroupId)
        
        // 할일 데이터 로드
        var todos: [TodoItem] = []
        if let todosData = sharedDefaults?.array(forKey: "widget_todos") as? [[String: Any]] {
            todos = todosData.compactMap { dict in
                guard let id = dict["id"] as? String,
                      let title = dict["title"] as? String,
                      let completed = dict["completed"] as? Bool else {
                    return nil
                }
                return TodoItem(
                    id: id,
                    title: title,
                    completed: completed,
                    priority: dict["priority"] as? String
                )
            }
        }
        
        let todayProgress = sharedDefaults?.float(forKey: "widget_today_progress") ?? 0.0
        
        return DayStepWidgetEntry(
            date: Date(),
            todos: todos,
            todayProgress: todayProgress
        )
    }
}

// 위젯 UI
struct DayStepWidgetEntryView: View {
    var entry: DayStepWidgetProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // 헤더
            HStack {
                Text("DayStep")
                    .font(.headline)
                    .fontWeight(.bold)
                Spacer()
                Text("\(Int(entry.todayProgress * 100))%")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // 오늘의 진행률
            ProgressView(value: entry.todayProgress)
                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
            
            // 할일 목록 (최대 3개)
            if !entry.todos.isEmpty {
                Text("오늘의 할일")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
                
                ForEach(Array(entry.todos.prefix(3)), id: \.id) { todo in
                    HStack {
                        Image(systemName: todo.completed ? "checkmark.circle.fill" : "circle")
                            .foregroundColor(todo.completed ? .green : .gray)
                            .font(.caption)
                        
                        Text(todo.title)
                            .font(.caption)
                            .strikethrough(todo.completed)
                            .foregroundColor(todo.completed ? .secondary : .primary)
                        
                        Spacer()
                        
                        if let priority = todo.priority {
                            Circle()
                                .fill(priorityColor(priority))
                                .frame(width: 6, height: 6)
                        }
                    }
                }
            }
            
            Spacer()
        }
        .padding()
    }
    
    private func priorityColor(_ priority: String) -> Color {
        switch priority {
        case "high":
            return .red
        case "medium":
            return .orange
        case "low":
            return .green
        default:
            return .gray
        }
    }
}

// 위젯 설정
@main
struct DayStepWidget: Widget {
    let kind: String = "DayStepWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DayStepWidgetProvider()) { entry in
            if #available(iOS 17.0, *) {
                DayStepWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                DayStepWidgetEntryView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("DayStep 위젯")
        .description("할일과 다짐을 한눈에 확인하세요")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}