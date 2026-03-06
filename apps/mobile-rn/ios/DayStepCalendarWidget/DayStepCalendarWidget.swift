//
//  DayStepCalendarWidget.swift
//  DayStepCalendarWidget
//
//  Created by JongHanNa on 2/26/26.
//

import WidgetKit
import SwiftUI
import AppIntents

// MARK: - 월 이동 Intent

struct ChangeMonthIntent: AppIntent {
    static var title: LocalizedStringResource = "월 변경"

    @Parameter(title: "Delta")
    var delta: Int

    init() { delta = 0 }
    init(delta: Int) { self.delta = delta }

    func perform() async throws -> some IntentResult {
        let appGroupID = "group.com.daystep.app"
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            return .result()
        }

        let cal = Calendar.current
        let now = Date()
        let curY = defaults.object(forKey: "widget_display_year") as? Int
            ?? cal.component(.year, from: now)
        let curM = defaults.object(forKey: "widget_display_month") as? Int
            ?? cal.component(.month, from: now)

        var comps = DateComponents()
        comps.year = curY
        comps.month = curM + delta
        comps.day = 1
        if let newDate = cal.date(from: comps) {
            defaults.set(cal.component(.year, from: newDate), forKey: "widget_display_year")
            defaults.set(cal.component(.month, from: newDate), forKey: "widget_display_month")
        }

        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - 데이터 모델

struct WidgetTodoItem: Codable {
    var title: String
    var color: String
}

struct WidgetCalendarDay: Codable {
    var date: String    // 'YYYY-MM-DD'
    var todos: [WidgetTodoItem]

    // 구버전 JSON 호환 (todos 필드 없는 캐시 대비)
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        date = try container.decode(String.self, forKey: .date)
        todos = (try? container.decode([WidgetTodoItem].self, forKey: .todos)) ?? []
    }

    enum CodingKeys: String, CodingKey {
        case date, todos
    }
}

struct WidgetCalendarPayload: Codable {
    var year: Int
    var month: Int
    var days: [WidgetCalendarDay]
}

struct CalendarEntry: TimelineEntry {
    let date: Date
    let payload: WidgetCalendarPayload?
}

// MARK: - TimelineProvider

struct DayStepCalendarProvider: TimelineProvider {
    private let appGroupID = "group.com.daystep.app"
    private let userDefaultsKey = "daystep_widget_calendar"

    func placeholder(in context: Context) -> CalendarEntry {
        CalendarEntry(date: Date(), payload: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (CalendarEntry) -> Void) {
        completion(CalendarEntry(date: Date(), payload: loadPayload()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CalendarEntry>) -> Void) {
        let entry = CalendarEntry(date: Date(), payload: loadPayload())
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadPayload() -> WidgetCalendarPayload? {
        guard
            let defaults = UserDefaults(suiteName: appGroupID),
            let jsonString = defaults.string(forKey: userDefaultsKey),
            let data = jsonString.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(WidgetCalendarPayload.self, from: data)
    }
}

// MARK: - 색상 헬퍼

extension Color {
    init(hexString: String) {
        let hex = hexString.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        switch hex.count {
        case 6:
            (r, g, b) = ((int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        default:
            (r, g, b) = (0, 0, 0)
        }
        self.init(
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255
        )
    }

    static func fromHex(_ hex: String) -> Color {
        let cleaned = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        return Color(hexString: cleaned)
    }
}

// MARK: - 할일 칩 뷰

struct TodoChipView: View {
    let todo: WidgetTodoItem

    private var chipColor: Color {
        Color.fromHex(todo.color)
    }

    var body: some View {
        HStack(spacing: 2) {
            Circle()
                .fill(chipColor)
                .frame(width: 5, height: 5)
            Text(todo.title)
                .font(.system(size: 8, weight: .medium))
                .lineLimit(1)
                .truncationMode(.tail)
                .foregroundColor(chipColor)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(chipColor.opacity(0.15))
        )
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - 날짜 셀 (Large — 칩 레이아웃)

struct CalendarDayCellLarge: View {
    let date: Date?
    let info: WidgetCalendarDay?
    let isToday: Bool
    let dayNumber: Int?
    let colIdx: Int

    var body: some View {
        if let day = dayNumber {
            VStack(alignment: .leading, spacing: 2) {
                ZStack {
                    if isToday {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 18, height: 18)
                    }
                    Text(verbatim: "\(day)")
                        .font(.system(size: 10, weight: isToday ? .bold : .regular))
                        .foregroundColor(
                            isToday ? .white :
                            colIdx == 0 ? .red :
                            colIdx == 6 ? Color(hexString: "2563EB") : .primary
                        )
                }
                let todos = info?.todos ?? []
                let count = min(todos.count, 3)
                ForEach(0..<count, id: \.self) { i in
                    TodoChipView(todo: todos[i])
                }
                if todos.count > 3 {
                    Text(verbatim: "+\(todos.count - 3)")
                        .font(.system(size: 7, weight: .medium))
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.leading, 4)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        } else {
            Color.clear
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

// MARK: - WidgetView

struct DayStepCalendarWidgetView: View {
    var entry: CalendarEntry
    @Environment(\.widgetFamily) var family

    private var cal: Calendar {
        var c = Calendar.current
        c.firstWeekday = 1
        return c
    }

    private var displayYear: Int {
        if let y = UserDefaults(suiteName: "group.com.daystep.app")?
            .object(forKey: "widget_display_year") as? Int { return y }
        return entry.payload?.year ?? cal.component(.year, from: Date())
    }
    private var displayMonth: Int {
        if let m = UserDefaults(suiteName: "group.com.daystep.app")?
            .object(forKey: "widget_display_month") as? Int { return m }
        return entry.payload?.month ?? cal.component(.month, from: Date())
    }

    private var dayMap: [String: WidgetCalendarDay] {
        guard let days = entry.payload?.days else { return [:] }
        return Dictionary(uniqueKeysWithValues: days.map { ($0.date, $0) })
    }

    private func dateString(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    private var todayString: String { dateString(Date()) }

    private var monthDates: [Date?] {
        var comps = DateComponents()
        comps.year = displayYear
        comps.month = displayMonth
        comps.day = 1
        guard let firstDay = cal.date(from: comps) else { return [] }

        let weekday = cal.component(.weekday, from: firstDay) - 1
        let daysInMonth = cal.range(of: .day, in: .month, for: firstDay)?.count ?? 30

        var result: [Date?] = Array(repeating: nil, count: weekday)
        for d in 1...daysInMonth {
            comps.day = d
            result.append(cal.date(from: comps))
        }
        while result.count % 7 != 0 { result.append(nil) }
        return result
    }

    // MARK: Large 레이아웃 (칩)

    var largeBody: some View {
        ZStack(alignment: .bottomTrailing) {
            VStack(alignment: .leading, spacing: 0) {
                // 헤더: < 년월 > 이동 버튼
                HStack {
                    Button(intent: ChangeMonthIntent(delta: -1)) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.blue)
                    }
                    .buttonStyle(.plain)

                    Text(verbatim: "\(displayYear)년 \(displayMonth)월")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.blue)

                    Button(intent: ChangeMonthIntent(delta: 1)) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.blue)
                    }
                    .buttonStyle(.plain)

                    Spacer()
                }
                .padding(.bottom, 4)

                // 요일 레이블
                HStack(spacing: 0) {
                    ForEach(Array(["일","월","화","수","목","금","토"].enumerated()), id: \.offset) { idx, label in
                        Text(verbatim: label)
                            .font(.system(size: 9, weight: .medium))
                            .frame(maxWidth: .infinity)
                            .foregroundColor(
                                idx == 0 ? .red :
                                idx == 6 ? Color(hexString: "2563EB") : .secondary
                            )
                    }
                }
                .padding(.bottom, 2)

                Divider()
                    .padding(.bottom, 2)

                // 날짜 그리드
                let rows = monthDates.chunked(into: 7)
                ForEach(0..<rows.count, id: \.self) { rowIdx in
                    HStack(alignment: .top, spacing: 0) {
                        ForEach(0..<rows[rowIdx].count, id: \.self) { colIdx in
                            let date = rows[rowIdx][colIdx]
                            let ds = date.map { dateString($0) }
                            let info = ds.flatMap { dayMap[$0] }
                            let isToday = ds == todayString
                            let dayNum = date.map { cal.component(.day, from: $0) }

                            CalendarDayCellLarge(
                                date: date,
                                info: info,
                                isToday: isToday,
                                dayNumber: dayNum,
                                colIdx: colIdx
                            )
                        }
                    }
                    .frame(maxHeight: .infinity)

                    if rowIdx < rows.count - 1 {
                        Divider()
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.top, 14)
            .padding(.bottom, 8)

            // 우하단 "+" 버튼
            Circle()
                .fill(Color.blue)
                .frame(width: 28, height: 28)
                .overlay(
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                )
                .padding(12)
        }
        .background(Color.white)
    }

    // MARK: Medium 레이아웃 (기존 dot 방식)

    var mediumBody: some View {
        VStack(alignment: .leading, spacing: 4) {
            let headerText = "\(displayYear)년 \(displayMonth)월"
            Text(verbatim: headerText)
                .font(.caption.bold())
                .foregroundColor(.primary)

            HStack(spacing: 0) {
                ForEach(Array(["일","월","화","수","목","금","토"].enumerated()), id: \.offset) { idx, label in
                    Text(verbatim: label)
                        .font(.system(size: 9, weight: .medium))
                        .frame(maxWidth: .infinity)
                        .foregroundColor(
                            idx == 0 ? .red :
                            idx == 6 ? .blue : .secondary
                        )
                }
            }

            let rows = monthDates.chunked(into: 7)
            ForEach(0..<rows.count, id: \.self) { rowIdx in
                HStack(spacing: 0) {
                    ForEach(0..<rows[rowIdx].count, id: \.self) { colIdx in
                        if let date = rows[rowIdx][colIdx] {
                            let ds = dateString(date)
                            let info = dayMap[ds]
                            let isToday = ds == todayString
                            VStack(spacing: 2) {
                                ZStack {
                                    if isToday {
                                        Circle()
                                            .fill(Color.blue)
                                            .frame(width: 18, height: 18)
                                    }
                                    Text(verbatim: "\(cal.component(.day, from: date))")
                                        .font(.system(size: 10, weight: isToday ? .bold : .regular))
                                        .foregroundColor(isToday ? .white : .primary)
                                }
                                let todos = info?.todos ?? []
                                if !todos.isEmpty {
                                    HStack(spacing: 2) {
                                        ForEach(0..<min(todos.count, 3), id: \.self) { i in
                                            Circle()
                                                .fill(Color.fromHex(todos[i].color))
                                                .frame(width: 4, height: 4)
                                        }
                                    }
                                } else {
                                    Color.clear.frame(width: 4, height: 4)
                                }
                            }
                            .frame(maxWidth: .infinity)
                        } else {
                            Color.clear.frame(maxWidth: .infinity)
                        }
                    }
                }
            }
        }
        .padding(8)
    }

    var body: some View {
        switch family {
        case .systemLarge:
            largeBody
        default:
            mediumBody
        }
    }
}

// MARK: - Array chunked 헬퍼

extension Array {
    func chunked(into size: Int) -> [[Element]] {
        stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }
}

// MARK: - Widget 진입점

struct DayStepCalendarWidget: Widget {
    let kind = "DayStepCalendarWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DayStepCalendarProvider()) { entry in
            DayStepCalendarWidgetView(entry: entry)
                .containerBackground(Color.white, for: .widget)
                .widgetURL(URL(string: "daystep://monthly"))
        }
        .contentMarginsDisabled()
        .configurationDisplayName("DayStep 월간 캘린더")
        .description("이번 달 할일을 한눈에 확인하세요.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - Preview

#Preview(as: .systemLarge) {
    DayStepCalendarWidget()
} timeline: {
    CalendarEntry(date: .now, payload: nil)
}
