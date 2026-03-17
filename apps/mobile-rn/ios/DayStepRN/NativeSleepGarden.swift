/**
 * NativeSleepGarden — SwiftUI 수면 정원 4-뷰 컴포넌트
 * 일/주/월/년 뷰 + 하루 다중 세션 지원
 *
 * 패턴: ObservableObject + setupOnce() (NativeMonthCalendar/NativeProgressCard 참조)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct SleepSessionInfo: Codable {
  let durationMinutes: Int
  let outcome: String  // "completed" | "abandoned"
  let isHealthy: Bool
}

struct SleepGardenDayInfo: Codable {
  let date: String  // yyyy-MM-dd
  let sessions: [SleepSessionInfo]
}

struct SleepGardenPayload: Codable {
  let days: [SleepGardenDayInfo]
}

// MARK: - Observable State

class SleepGardenState: ObservableObject {
  @Published var viewMode: String = "month"  // day, week, month, year
  @Published var selectedDate: String = ""
  @Published var primaryColor: String = "#6366F1"
  @Published var goalMinutes: Int = 450
  @Published var streak: Int = 0
  @Published var parsedDays: [String: [SleepSessionInfo]] = [:]  // date -> sessions

  func dayStatus(for date: String, today: String) -> String {
    let sessions = parsedDays[date] ?? []
    if date == today { return "today" }
    if sessions.isEmpty { return "empty" }
    if sessions.contains(where: { $0.isHealthy }) { return "healthy" }
    return "wilted"
  }

  func totalCompletedMinutes(for date: String) -> Int {
    let sessions = parsedDays[date] ?? []
    return sessions.filter { $0.outcome == "completed" }.reduce(0) { $0 + $1.durationMinutes }
  }
}

// MARK: - SwiftUI Main View

struct SleepGardenContent: View {
  @ObservedObject var state: SleepGardenState

  var onDateSelect: ((String) -> Void)?
  var onHeightChange: ((CGFloat) -> Void)?
  var onViewModeChange: ((String) -> Void)?
  var onMonthChange: ((Int, Int) -> Void)?

  private let calendar: Calendar = {
    var cal = Calendar(identifier: .gregorian)
    cal.firstWeekday = 1  // 일요일 시작
    cal.locale = Locale(identifier: "ko_KR")
    return cal
  }()

  private let dateFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    return df
  }()

  private let todayStr: String = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    return df.string(from: Date())
  }()

  private let viewModes = ["일", "주", "월", "년"]
  private let viewModeKeys = ["day", "week", "month", "year"]

  var body: some View {
    VStack(spacing: 0) {
      // 세그먼트 컨트롤
      viewModePicker
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 12)

      // 뷰 전환
      Group {
        switch state.viewMode {
        case "day":
          DayGardenView(state: state, calendar: calendar, dateFormatter: dateFormatter, todayStr: todayStr)
        case "week":
          WeekGardenView(state: state, calendar: calendar, dateFormatter: dateFormatter, todayStr: todayStr, onDateSelect: onDateSelect, onMonthChange: onMonthChange)
        case "year":
          YearGardenView(state: state, calendar: calendar, dateFormatter: dateFormatter, todayStr: todayStr, onDateSelect: { date in
            state.viewMode = "month"
            onViewModeChange?("month")
            onDateSelect?(date)
          }, onMonthChange: onMonthChange)
        default: // month
          MonthGardenView(state: state, calendar: calendar, dateFormatter: dateFormatter, todayStr: todayStr, onDateSelect: { date in
            state.viewMode = "day"
            onViewModeChange?("day")
            state.selectedDate = date
            onDateSelect?(date)
          }, onMonthChange: onMonthChange)
        }
      }

      // 범례
      legendView
        .padding(.top, 8)
        .padding(.bottom, 12)
    }
  }

  // MARK: - Picker

  private var viewModePicker: some View {
    HStack(spacing: 0) {
      ForEach(Array(viewModes.enumerated()), id: \.offset) { index, label in
        let isSelected = state.viewMode == viewModeKeys[index]
        Button(action: {
          withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            state.viewMode = viewModeKeys[index]
            onViewModeChange?(viewModeKeys[index])
          }
        }) {
          Text(label)
            .font(.system(size: 14, weight: isSelected ? .semibold : .regular))
            .foregroundColor(isSelected ? .white : Color(hex: "#6B7280"))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(
              isSelected
                ? AnyView(RoundedRectangle(cornerRadius: 8).fill(Color(hex: state.primaryColor)))
                : AnyView(Color.clear)
            )
        }
      }
    }
    .background(Color(hex: "#F3F4F6"))
    .cornerRadius(10)
  }

  // MARK: - Legend

  private var legendView: some View {
    HStack(spacing: 16) {
      legendItem(icon: "tree.fill", color: "#22C55E", label: "성공")
      legendItem(icon: "tree.fill", color: "#9CA3AF", label: "미달")
      HStack(spacing: 4) {
        Circle()
          .fill(Color(hex: "#E5E7EB"))
          .frame(width: 8, height: 8)
        Text("기록없음")
          .font(.system(size: 11))
          .foregroundColor(Color(hex: "#9CA3AF"))
      }
    }
  }

  private func legendItem(icon: String, color: String, label: String) -> some View {
    HStack(spacing: 4) {
      Image(systemName: icon)
        .font(.system(size: 10))
        .foregroundColor(Color(hex: color))
      Text(label)
        .font(.system(size: 11))
        .foregroundColor(Color(hex: "#9CA3AF"))
    }
  }
}

// MARK: - Day Garden View

struct DayGardenView: View {
  @ObservedObject var state: SleepGardenState
  let calendar: Calendar
  let dateFormatter: DateFormatter
  let todayStr: String

  var body: some View {
    let dateStr = state.selectedDate.isEmpty ? todayStr : state.selectedDate
    let sessions = state.parsedDays[dateStr] ?? []

    VStack(spacing: 12) {
      // 날짜 헤더
      if let date = dateFormatter.date(from: dateStr) {
        let df = DateFormatter()
        let _ = df.dateFormat = "M월 d일 EEEE"
        let _ = df.locale = Locale(identifier: "ko_KR")
        Text(df.string(from: date))
          .font(.system(size: 18, weight: .bold))
          .foregroundColor(Color(hex: "#1F2937"))
      }

      if sessions.isEmpty {
        VStack(spacing: 8) {
          Image(systemName: "moon.zzz")
            .font(.system(size: 32))
            .foregroundColor(Color(hex: "#D1D5DB"))
          Text("아직 수면 기록이 없습니다")
            .font(.system(size: 14))
            .foregroundColor(Color(hex: "#9CA3AF"))
        }
        .padding(.vertical, 24)
      } else {
        // 나무 아이콘 가로 배치
        HStack(spacing: 16) {
          ForEach(Array(sessions.enumerated()), id: \.offset) { index, session in
            sessionTreeView(session: session, index: index + 1)
          }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)

        // 총 수면 시간
        let totalMinutes = sessions.filter { $0.outcome == "completed" }.reduce(0) { $0 + $1.durationMinutes }
        if totalMinutes > 0 {
          Text("총 \(totalMinutes / 60)시간 \(totalMinutes % 60)분")
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(Color(hex: state.primaryColor))
        }
      }
    }
    .padding(.horizontal, 16)
  }

  private func sessionTreeView(session: SleepSessionInfo, index: Int) -> some View {
    VStack(spacing: 6) {
      Image(systemName: "tree.fill")
        .font(.system(size: 28))
        .foregroundColor(Color(hex: session.isHealthy ? "#22C55E" : "#9CA3AF"))

      Text("\(session.durationMinutes / 60)h \(session.durationMinutes % 60)m")
        .font(.system(size: 11))
        .foregroundColor(Color(hex: "#6B7280"))

      if session.outcome == "abandoned" {
        Text("포기")
          .font(.system(size: 9, weight: .semibold))
          .foregroundColor(Color(hex: "#EF4444"))
          .padding(.horizontal, 6)
          .padding(.vertical, 2)
          .background(Color(hex: "#FEE2E2"))
          .cornerRadius(4)
      }
    }
  }
}

// MARK: - Week Garden View

struct WeekGardenView: View {
  @ObservedObject var state: SleepGardenState
  let calendar: Calendar
  let dateFormatter: DateFormatter
  let todayStr: String
  var onDateSelect: ((String) -> Void)?
  var onMonthChange: ((Int, Int) -> Void)?

  private let dayLabels = ["일", "월", "화", "수", "목", "금", "토"]

  @State private var weekOffset: Int = 0

  private var weekDates: [String] {
    let today = Date()
    guard let weekStart = calendar.date(byAdding: .weekOfYear, value: weekOffset, to: today),
          let sunday = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: weekStart))
    else { return [] }

    return (0..<7).compactMap { day in
      guard let date = calendar.date(byAdding: .day, value: day, to: sunday) else { return nil }
      return dateFormatter.string(from: date)
    }
  }

  var body: some View {
    VStack(spacing: 8) {
      // 주간 네비게이션
      HStack {
        Button(action: { withAnimation { weekOffset -= 1 } }) {
          Image(systemName: "chevron.left")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(Color(hex: "#6B7280"))
        }

        Spacer()

        if let firstDate = weekDates.first, let lastDate = weekDates.last {
          Text(weekRangeText(first: firstDate, last: lastDate))
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(Color(hex: "#1F2937"))
        }

        Spacer()

        Button(action: { withAnimation { weekOffset += 1 } }) {
          Image(systemName: "chevron.right")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(Color(hex: "#6B7280"))
        }

        if weekOffset != 0 {
          Button(action: { withAnimation { weekOffset = 0 } }) {
            Text("오늘")
              .font(.system(size: 13, weight: .semibold))
              .foregroundColor(Color(hex: state.primaryColor))
          }
          .padding(.leading, 8)
        }
      }
      .padding(.horizontal, 16)

      // 7개 컬럼
      HStack(spacing: 4) {
        ForEach(Array(weekDates.enumerated()), id: \.element) { index, dateStr in
          weekColumn(dateStr: dateStr, dayLabel: dayLabels[index])
        }
      }
      .padding(.horizontal, 8)
    }
  }

  private func weekColumn(dateStr: String, dayLabel: String) -> some View {
    let sessions = state.parsedDays[dateStr] ?? []
    let isToday = dateStr == todayStr
    let dayNum = dateStr.split(separator: "-").last.flatMap { Int($0) } ?? 0
    let totalMinutes = state.totalCompletedMinutes(for: dateStr)

    return Button(action: {
      onDateSelect?(dateStr)
    }) {
      VStack(spacing: 4) {
        Text(dayLabel)
          .font(.system(size: 10, weight: .semibold))
          .foregroundColor(Color(hex: index(of: dayLabel) == 0 ? "#EF4444" : index(of: dayLabel) == 6 ? "#3B82F6" : "#9CA3AF"))

        ZStack {
          if isToday {
            Circle()
              .fill(Color(hex: state.primaryColor))
              .frame(width: 24, height: 24)
            Text("\(dayNum)")
              .font(.system(size: 12, weight: .bold))
              .foregroundColor(.white)
          } else {
            Text("\(dayNum)")
              .font(.system(size: 12, weight: .medium))
              .foregroundColor(Color(hex: "#374151"))
          }
        }
        .frame(width: 24, height: 24)

        // 나무 세로 스택
        VStack(spacing: 2) {
          ForEach(Array(sessions.prefix(3).enumerated()), id: \.offset) { _, session in
            Image(systemName: "tree.fill")
              .font(.system(size: 14))
              .foregroundColor(Color(hex: session.isHealthy ? "#22C55E" : "#9CA3AF"))
          }
          if sessions.count > 3 {
            Text("+\(sessions.count - 3)")
              .font(.system(size: 8))
              .foregroundColor(Color(hex: "#9CA3AF"))
          }
        }
        .frame(minHeight: 40)

        // 총 수면 시간
        if totalMinutes > 0 {
          Text("\(totalMinutes / 60)h")
            .font(.system(size: 9))
            .foregroundColor(Color(hex: "#6B7280"))
        } else {
          Text("-")
            .font(.system(size: 9))
            .foregroundColor(Color(hex: "#D1D5DB"))
        }
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, 6)
      .background(
        isToday
          ? AnyView(RoundedRectangle(cornerRadius: 8).fill(Color(hex: state.primaryColor).opacity(0.06)))
          : AnyView(Color.clear)
      )
    }
    .buttonStyle(.plain)
  }

  private func index(of dayLabel: String) -> Int {
    dayLabels.firstIndex(of: dayLabel) ?? -1
  }

  private func weekRangeText(first: String, last: String) -> String {
    guard let firstDate = dateFormatter.date(from: first),
          let lastDate = dateFormatter.date(from: last) else { return "" }
    let df = DateFormatter()
    df.locale = Locale(identifier: "ko_KR")
    df.dateFormat = "M/d"
    return "\(df.string(from: firstDate)) - \(df.string(from: lastDate))"
  }
}

// MARK: - Month Garden View

struct MonthGardenView: View {
  @ObservedObject var state: SleepGardenState
  let calendar: Calendar
  let dateFormatter: DateFormatter
  let todayStr: String
  var onDateSelect: ((String) -> Void)?
  var onMonthChange: ((Int, Int) -> Void)?

  private let dayLabels = ["일", "월", "화", "수", "목", "금", "토"]

  @State private var displayedDate: Date = Date()

  private var year: Int { calendar.component(.year, from: displayedDate) }
  private var month: Int { calendar.component(.month, from: displayedDate) }

  var body: some View {
    VStack(spacing: 8) {
      // 월 네비게이션
      HStack {
        Button(action: { navigateMonth(by: -1) }) {
          Image(systemName: "chevron.left")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(Color(hex: "#6B7280"))
        }

        Text("\(year)년 \(month)월")
          .font(.system(size: 17, weight: .bold))
          .foregroundColor(Color(hex: "#1F2937"))
          .padding(.horizontal, 8)

        Button(action: { navigateMonth(by: 1) }) {
          Image(systemName: "chevron.right")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(Color(hex: "#6B7280"))
        }

        Spacer()

        Button(action: {
          withAnimation { displayedDate = Date() }
          let now = Date()
          onMonthChange?(calendar.component(.year, from: now), calendar.component(.month, from: now))
        }) {
          Text("오늘")
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(Color(hex: state.primaryColor))
        }
      }
      .padding(.horizontal, 16)

      // 요일 헤더
      HStack(spacing: 0) {
        ForEach(Array(dayLabels.enumerated()), id: \.offset) { index, label in
          Text(label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(index == 0 ? Color(hex: "#EF4444") : index == 6 ? Color(hex: "#3B82F6") : Color(hex: "#9CA3AF"))
            .frame(maxWidth: .infinity)
        }
      }
      .padding(.horizontal, 8)
      .padding(.bottom, 4)

      // 캘린더 그리드
      let weeks = generateMonthWeeks()
      VStack(spacing: 2) {
        ForEach(weeks, id: \.self) { week in
          HStack(spacing: 2) {
            ForEach(week, id: \.self) { dateStr in
              monthDayCell(dateStr: dateStr)
            }
          }
        }
      }
      .padding(.horizontal, 8)
    }
  }

  private func monthDayCell(dateStr: String) -> some View {
    let sessions = state.parsedDays[dateStr] ?? []
    let status = state.dayStatus(for: dateStr, today: todayStr)
    let dayNum = dateStr.split(separator: "-").last.flatMap { Int($0) } ?? 0
    let isCurrentMonth: Bool = {
      guard let date = dateFormatter.date(from: dateStr) else { return false }
      return calendar.component(.month, from: date) == month && calendar.component(.year, from: date) == year
    }()

    return Button(action: {
      onDateSelect?(dateStr)
    }) {
      VStack(spacing: 2) {
        Text("\(dayNum)")
          .font(.system(size: 12, weight: dateStr == todayStr ? .bold : .regular))
          .foregroundColor(
            dateStr == todayStr ? .white :
            !isCurrentMonth ? Color(hex: "#D1D5DB") :
            Color(hex: "#374151")
          )
          .frame(width: 24, height: 24)
          .background(
            dateStr == todayStr
              ? AnyView(Circle().fill(Color(hex: state.primaryColor)))
              : AnyView(Color.clear)
          )

        // 미니 나무 아이콘
        if sessions.isEmpty {
          Circle()
            .fill(Color(hex: "#F3F4F6"))
            .frame(width: 6, height: 6)
        } else {
          ZStack {
            Image(systemName: "tree.fill")
              .font(.system(size: 12))
              .foregroundColor(Color(hex: status == "healthy" ? "#22C55E" : "#9CA3AF"))

            if sessions.count > 1 {
              Text("\(sessions.count)")
                .font(.system(size: 7, weight: .bold))
                .foregroundColor(.white)
                .padding(2)
                .background(Circle().fill(Color(hex: "#6B7280")))
                .offset(x: 8, y: -6)
            }
          }
        }
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, 4)
    }
    .buttonStyle(.plain)
  }

  private func navigateMonth(by offset: Int) {
    guard let newDate = calendar.date(byAdding: .month, value: offset, to: displayedDate) else { return }
    withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
      displayedDate = newDate
    }
    let y = calendar.component(.year, from: newDate)
    let m = calendar.component(.month, from: newDate)
    onMonthChange?(y, m)
  }

  private func generateMonthWeeks() -> [[String]] {
    guard let firstOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
          let range = calendar.range(of: .day, in: .month, for: firstOfMonth) else { return [] }
    let lastDay = range.count
    guard let lastOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: lastDay)) else { return [] }

    let firstWeekday = calendar.component(.weekday, from: firstOfMonth)
    guard let firstSunday = calendar.date(byAdding: .day, value: -(firstWeekday - 1), to: firstOfMonth) else { return [] }

    let lastWeekday = calendar.component(.weekday, from: lastOfMonth)
    guard let lastSaturday = calendar.date(byAdding: .day, value: (7 - lastWeekday), to: lastOfMonth) else { return [] }

    var weeks: [[String]] = []
    var currentSunday = firstSunday

    while currentSunday <= lastSaturday {
      var week: [String] = []
      for d in 0..<7 {
        guard let cellDate = calendar.date(byAdding: .day, value: d, to: currentSunday) else { continue }
        week.append(dateFormatter.string(from: cellDate))
      }
      weeks.append(week)
      guard let nextSunday = calendar.date(byAdding: .day, value: 7, to: currentSunday) else { break }
      currentSunday = nextSunday
    }

    return weeks
  }
}

// MARK: - Year Garden View

struct YearGardenView: View {
  @ObservedObject var state: SleepGardenState
  let calendar: Calendar
  let dateFormatter: DateFormatter
  let todayStr: String
  var onDateSelect: ((String) -> Void)?
  var onMonthChange: ((Int, Int) -> Void)?

  private var currentYear: Int { calendar.component(.year, from: Date()) }

  var body: some View {
    VStack(spacing: 8) {
      Text("\(currentYear)년")
        .font(.system(size: 17, weight: .bold))
        .foregroundColor(Color(hex: "#1F2937"))

      // 4x3 그리드
      let rows = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]
      VStack(spacing: 8) {
        ForEach(rows, id: \.self) { row in
          HStack(spacing: 8) {
            ForEach(row, id: \.self) { month in
              yearMonthCell(month: month)
            }
          }
        }
      }
      .padding(.horizontal, 16)
    }
  }

  private func yearMonthCell(month: Int) -> some View {
    Button(action: {
      // 해당 월의 1일 선택
      let dateStr = String(format: "%04d-%02d-01", currentYear, month)
      onMonthChange?(currentYear, month)
      onDateSelect?(dateStr)
    }) {
      VStack(spacing: 4) {
        Text("\(month)월")
          .font(.system(size: 12, weight: .semibold))
          .foregroundColor(Color(hex: "#374151"))

        // 미니 히트맵 (GitHub contribution 스타일)
        miniHeatmap(year: currentYear, month: month)
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, 8)
      .padding(.horizontal, 4)
      .background(Color(hex: "#F9FAFB"))
      .cornerRadius(10)
    }
    .buttonStyle(.plain)
  }

  private func miniHeatmap(year: Int, month: Int) -> some View {
    guard let firstOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
          let range = calendar.range(of: .day, in: .month, for: firstOfMonth) else {
      return AnyView(EmptyView())
    }
    let lastDay = range.count

    // 7열 x ceil(days/7) 행 그리드
    let cols = 7
    let rows = Int(ceil(Double(lastDay) / Double(cols)))

    return AnyView(
      VStack(spacing: 1) {
        ForEach(0..<rows, id: \.self) { row in
          HStack(spacing: 1) {
            ForEach(0..<cols, id: \.self) { col in
              let day = row * cols + col + 1
              if day <= lastDay {
                let dateStr = String(format: "%04d-%02d-%02d", year, month, day)
                let status = state.dayStatus(for: dateStr, today: todayStr)
                Rectangle()
                  .fill(heatmapColor(status: status))
                  .frame(width: 6, height: 6)
                  .cornerRadius(1)
              } else {
                Rectangle()
                  .fill(Color.clear)
                  .frame(width: 6, height: 6)
              }
            }
          }
        }
      }
    )
  }

  private func heatmapColor(status: String) -> Color {
    switch status {
    case "healthy": return Color(hex: "#22C55E")
    case "wilted": return Color(hex: "#D1D5DB")
    case "today": return Color(hex: state.primaryColor)
    default: return Color(hex: "#F3F4F6")
    }
  }
}

// MARK: - UIView Wrapper

class NativeSleepGardenUIView: UIView {

  @objc var onDateSelect: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?
  @objc var onViewModeChange: RCTDirectEventBlock?
  @objc var onMonthChange: RCTDirectEventBlock?

  private let gardenState = SleepGardenState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setViewMode(_ value: NSString) {
    gardenState.viewMode = value as String
    setupOnce()
  }

  @objc func setSelectedDate(_ value: NSString) {
    gardenState.selectedDate = value as String
    setupOnce()
  }

  @objc func setPrimaryColor(_ value: NSString) {
    gardenState.primaryColor = value as String
  }

  @objc func setGoalMinutes(_ value: NSNumber) {
    gardenState.goalMinutes = value.intValue
  }

  @objc func setStreak(_ value: NSNumber) {
    gardenState.streak = value.intValue
  }

  @objc func setGardenData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let payload = try JSONDecoder().decode(SleepGardenPayload.self, from: data)
      var map: [String: [SleepSessionInfo]] = [:]
      for day in payload.days {
        map[day.date] = day.sessions
      }
      gardenState.parsedDays = map
    } catch {
      print("[NativeSleepGarden] gardenData decode error: \(error)")
    }
    setupOnce()
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
      self?.emitHeight()
    }
  }

  // MARK: - Height Emission

  private func emitHeight() {
    guard let hc = hostingController, bounds.width > 0 else { return }
    let size = hc.sizeThatFits(in: CGSize(width: bounds.width, height: .greatestFiniteMagnitude))
    onHeightChange?(["height": size.height])
  }

  // MARK: - Setup Once

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .clear

    let swiftUIView = SleepGardenContent(
      state: gardenState,
      onDateSelect: { [weak self] dateStr in
        self?.onDateSelect?(["date": dateStr])
      },
      onHeightChange: { [weak self] height in
        self?.onHeightChange?(["height": height])
      },
      onViewModeChange: { [weak self] mode in
        self?.onViewModeChange?(["mode": mode])
      },
      onMonthChange: { [weak self] year, month in
        self?.onMonthChange?(["year": year, "month": month])
      }
    )

    let hc = UIHostingController(rootView: AnyView(swiftUIView))
    hc.view.backgroundColor = .clear
    hostingController = hc

    addSubview(hc.view)
    hc.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      hc.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      hc.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      hc.view.topAnchor.constraint(equalTo: topAnchor),
      hc.view.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
      self?.emitHeight()
    }
  }
}

// MARK: - RCTViewManager

@objc(NativeSleepGardenManager)
class NativeSleepGardenManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeSleepGardenUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
