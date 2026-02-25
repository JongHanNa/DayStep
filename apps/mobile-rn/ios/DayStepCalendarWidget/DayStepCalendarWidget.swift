import WidgetKit
import SwiftUI

// MARK: - 데이터 모델

struct WidgetCalendarDay: Codable {
    var date: String       // 'YYYY-MM-DD'
    var count: Int
    var colors: [String]
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
        let payload = loadPayload()
        let entry = CalendarEntry(date: Date(), payload: payload)
        // 1시간마다 갱신
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
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
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
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
}

// MARK: - WidgetView

struct DayStepCalendarWidgetView: View {
    var entry: CalendarEntry
    @Environment(\.widgetFamily) var family

    private var calendar: Calendar {
        var cal = Calendar.current
        cal.firstWeekday = 1 // 일요일 시작
        return cal
    }

    private var displayYear: Int {
        entry.payload?.year ?? calendar.component(.year, from: Date())
    }

    private var displayMonth: Int {
        entry.payload?.month ?? calendar.component(.month, from: Date())
    }

    private var dayMap: [String: WidgetCalendarDay] {
        guard let days = entry.payload?.days else { return [:] }
        return Dictionary(uniqueKeysWithValues: days.map { ($0.date, $0) })
    }

    private var monthDates: [Date?] {
        var comps = DateComponents()
        comps.year = displayYear
        comps.month = displayMonth
        comps.day = 1
        guard let firstDay = calendar.date(from: comps) else { return [] }

        let weekday = calendar.component(.weekday, from: firstDay) - 1 // 0-based (0=일)
        let daysInMonth = calendar.range(of: .day, in: .month, for: firstDay)?.count ?? 30

        var result: [Date?] = Array(repeating: nil, count: weekday)
        for d in 1...daysInMonth {
            comps.day = d
            result.append(calendar.date(from: comps))
        }
        // 7의 배수 맞추기
        while result.count % 7 != 0 { result.append(nil) }
        return result
    }

    private func dateString(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    private var todayString: String { dateString(Date()) }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            // 헤더
            Text("\(displayYear)년 \(displayMonth)월")
                .font(.caption.bold())
                .foregroundColor(.primary)

            // 요일 레이블
            HStack(spacing: 0) {
                ForEach(["일", "월", "화", "수", "목", "금", "토"], id: \.self) { day in
                    Text(day)
                        .font(.system(size: 9, weight: .medium))
                        .frame(maxWidth: .infinity)
                        .foregroundColor(day == "일" ? .red : day == "토" ? .blue : .secondary)
                }
            }

            // 날짜 그리드
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
                                    Text("\(calendar.component(.day, from: date))")
                                        .font(.system(size: 10, weight: isToday ? .bold : .regular))
                                        .foregroundColor(isToday ? .white : .primary)
                                }
                                // 할일 색상 dot
                                if let colors = info?.colors, !colors.isEmpty {
                                    HStack(spacing: 2) {
                                        ForEach(colors.prefix(3), id: \.self) { hex in
                                            Circle()
                                                .fill(Color(hex: hex.hasPrefix("#") ? String(hex.dropFirst()) : hex))
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
}

// MARK: - Array chunked helper

extension Array {
    func chunked(into size: Int) -> [[Element]] {
        stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }
}

// MARK: - Widget 진입점

@main
struct DayStepCalendarWidget: Widget {
    let kind = "DayStepCalendarWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DayStepCalendarProvider()) { entry in
            DayStepCalendarWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("DayStep 월간 캘린더")
        .description("이번 달 할일을 한눈에 확인하세요.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
