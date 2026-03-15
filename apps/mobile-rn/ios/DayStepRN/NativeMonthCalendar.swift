/**
 * NativeMonthCalendar — 현재 월 고정 표시 + ScrollView 인라인 상세 패널 + 버튼 월 네비게이션
 *
 * 패턴: ObservableObject + setupOnce() (NativeCleanupAccordion/NativeWeekStripCalendar 참조)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct MonthCalTodoItem: Codable, Identifiable {
  let id: String
  let title: String
  let color: String?
  let startTime: String?
  let endTime: String?
  let scheduleType: String?
  let recurrencePattern: String?

  enum CodingKeys: String, CodingKey {
    case id, title, color
    case startTime = "start_time"
    case endTime = "end_time"
    case scheduleType = "schedule_type"
    case recurrencePattern = "recurrence_pattern"
  }
}

struct MonthCalEventItem: Codable, Identifiable {
  let id: String
  let title: String
  let color: String
  let isAllDay: Bool
  let start: String?
  let end: String?
}

// MARK: - Observable State

class MonthCalendarState: ObservableObject {
  @Published var selectedDate: String? = nil
  @Published var primaryColor: String = "#6366F1"
  @Published var todoMap: [String: [MonthCalTodoItem]] = [:]
  @Published var eventMap: [String: [MonthCalEventItem]] = [:]
  @Published var displayMonth: String = ""
  @Published var currentScrollMonth: Int = 0
}

// MARK: - Week Row Model

struct MonthWeekRow: Identifiable {
  let id: String  // "yyyy-MM-dd" of week start (Sunday)
  let dates: [DayCellInfo]
}

struct DayCellInfo: Identifiable {
  let id: String      // "yyyy-MM-dd"
  let date: Date
  let day: Int
  let isCurrentMonth: Bool
  let weekdayIndex: Int  // 0=일, 6=토
}

// MARK: - SwiftUI View

struct MonthCalendarContent: View {
  @ObservedObject var state: MonthCalendarState

  var onDateSelect: ((String) -> Void)?
  var onHeightChange: ((CGFloat) -> Void)?
  var onMonthChange: ((Int, Int) -> Void)?  // (year, month)
  var onNavigateToPlanner: ((String) -> Void)?

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

  private let dayLabels = ["일", "월", "화", "수", "목", "금", "토"]
  private let today: Date = Calendar.current.startOfDay(for: Date())

  @State private var weekRows: [MonthWeekRow] = []
  @State private var displayedDate: Date = Calendar.current.startOfDay(for: Date())

  var body: some View {
    VStack(spacing: 0) {
      // 상단: 월 레이블 + 네비게이션 버튼 + 오늘 버튼
      headerView

      // 요일 헤더
      weekdayHeader

      // 캘린더 그리드 (ScrollView + 인라인 상세 패널)
      scrollableWeeks
    }
    .onAppear {
      generateMonthWeeks(for: displayedDate)
    }
  }

  // MARK: - Header

  private var headerView: some View {
    HStack {
      Button(action: { navigateMonth(by: -1) }) {
        Image(systemName: "chevron.left")
          .font(.system(size: 16, weight: .semibold))
          .foregroundColor(Color(hex: "#6B7280"))
      }

      Text(state.displayMonth)
        .font(.system(size: 18, weight: .bold))
        .foregroundColor(Color(hex: "#1F2937"))
        .padding(.horizontal, 8)

      Button(action: { navigateMonth(by: 1) }) {
        Image(systemName: "chevron.right")
          .font(.system(size: 16, weight: .semibold))
          .foregroundColor(Color(hex: "#6B7280"))
      }

      Spacer()

      Button(action: {
        goToToday()
      }) {
        Text("오늘")
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(Color(hex: state.primaryColor))
      }
    }
    .padding(.horizontal, 20)
    .padding(.top, 12)
    .padding(.bottom, 8)
  }

  // MARK: - Weekday Header

  private var weekdayHeader: some View {
    HStack(spacing: 0) {
      ForEach(Array(dayLabels.enumerated()), id: \.offset) { index, label in
        Text(label)
          .font(.system(size: 11, weight: .semibold))
          .foregroundColor(weekdayColor(index: index))
          .frame(maxWidth: .infinity)
      }
    }
    .padding(.horizontal, 4)
    .padding(.bottom, 4)
  }

  // MARK: - Scrollable Weeks (GeometryReader + ScrollView 하이브리드)

  private var scrollableWeeks: some View {
    GeometryReader { geo in
      let availableHeight = geo.size.height
      let weekCount = max(CGFloat(weekRows.count), 1)
      let hasSelection = state.selectedDate != nil
      // 미선택: 화면 균등 분할 / 선택: 68pt 고정 (스크롤 가능하도록)
      let rowHeight: CGFloat = hasSelection ? 68 : availableHeight / weekCount

      ScrollViewReader { proxy in
        ScrollView(.vertical, showsIndicators: false) {
          VStack(spacing: 0) {
            ForEach(weekRows) { week in
              VStack(spacing: 0) {
                weekRowView(week: week, rowHeight: rowHeight)
                  .frame(height: rowHeight)

                // 선택된 날짜가 이 주에 속하면 상세 패널 삽입
                if let selected = state.selectedDate,
                   week.dates.contains(where: { $0.id == selected }) {
                  detailPanel(for: selected)
                }
              }
              .id(week.id)
            }
          }
          .animation(.spring(response: 0.35, dampingFraction: 0.85), value: state.selectedDate)
        }
        .onChange(of: state.selectedDate) { newValue in
          if let dateStr = newValue,
             let week = weekRows.first(where: { $0.dates.contains(where: { $0.id == dateStr }) }) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
              withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                proxy.scrollTo(week.id, anchor: .top)
              }
            }
          }
        }
      }
    }
  }

  // MARK: - Week Row

  private func weekRowView(week: MonthWeekRow, rowHeight: CGFloat) -> some View {
    HStack(spacing: 0) {
      ForEach(week.dates) { cellInfo in
        dayCellView(cellInfo: cellInfo, rowHeight: rowHeight)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
    }
    .padding(.horizontal, 4)
  }

  // MARK: - Day Cell

  private func dayCellView(cellInfo: DayCellInfo, rowHeight: CGFloat) -> some View {
    let dateStr = cellInfo.id
    let isToday = calendar.isDate(cellInfo.date, inSameDayAs: today)
    let isSelected = state.selectedDate == dateStr
    let todos = state.todoMap[dateStr] ?? []
    let events = state.eventMap[dateStr] ?? []
    let allItems = todos.count + events.count

    // 동적 칩 슬롯 계산: 날짜 영역(28pt) + padding(4+2*2=8pt) = 36pt
    let chipHeight: CGFloat = 14
    let availableForChips = rowHeight - 36
    let maxChips = max(2, Int(availableForChips / chipHeight))

    let eventSlots = min(events.count, maxChips)
    let todoSlots = min(todos.count, maxChips - eventSlots)
    let shown = eventSlots + todoSlots

    return Button(action: {
      if state.selectedDate == dateStr {
        state.selectedDate = nil
      } else {
        state.selectedDate = dateStr
      }
      onDateSelect?(dateStr)
    }) {
      VStack(spacing: 2) {
        // 날짜 숫자
        ZStack {
          if isToday {
            Circle()
              .fill(Color(hex: state.primaryColor))
              .frame(width: 28, height: 28)
          } else if isSelected {
            Circle()
              .fill(Color(hex: state.primaryColor).opacity(0.15))
              .frame(width: 28, height: 28)
          }

          Text("\(cellInfo.day)")
            .font(.system(size: 14, weight: isToday || isSelected ? .bold : .regular))
            .foregroundColor(
              isToday ? .white :
              !cellInfo.isCurrentMonth ? Color(hex: "#D1D5DB") :
              isSelected ? Color(hex: state.primaryColor) :
              dayNumberColor(index: cellInfo.weekdayIndex)
            )
        }
        .frame(width: 28, height: 28)

        // 칩 영역 — 가용 높이에 맞게 동적 표시
        VStack(spacing: 1) {
          // 이벤트 칩
          ForEach(Array(events.prefix(eventSlots).enumerated()), id: \.element.id) { _, event in
            chipView(title: event.title, color: event.color)
          }

          // todo 칩
          ForEach(Array(todos.prefix(todoSlots).enumerated()), id: \.element.id) { _, todo in
            chipView(title: todo.title, color: todo.color ?? state.primaryColor)
          }

          // overflow
          if allItems > shown && shown > 0 {
            Text("+\(allItems - shown)")
              .font(.system(size: 8))
              .foregroundColor(Color(hex: "#9CA3AF"))
          }

          Spacer(minLength: 0)
        }
      }
      .padding(.vertical, 2)
    }
    .buttonStyle(.plain)
  }

  // MARK: - Chip View

  private func chipView(title: String, color: String) -> some View {
    Text(title)
      .font(.system(size: 9))
      .lineLimit(1)
      .foregroundColor(.white)
      .padding(.horizontal, 3)
      .padding(.vertical, 1)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Color(hex: color).opacity(0.8))
      .cornerRadius(2)
  }

  // MARK: - Detail Panel

  private func detailPanel(for dateStr: String) -> some View {
    let todos = state.todoMap[dateStr] ?? []
    let events = state.eventMap[dateStr] ?? []

    return VStack(alignment: .leading, spacing: 0) {
      // 날짜 헤더
      if let date = dateFormatter.date(from: dateStr) {
        let df = DateFormatter()
        let _ = df.dateFormat = "M월 d일 (E)"
        let _ = df.locale = Locale(identifier: "ko_KR")
        Text(df.string(from: date))
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(Color(hex: "#374151"))
          .padding(.horizontal, 16)
          .padding(.top, 12)
          .padding(.bottom, 8)
      }

      if todos.isEmpty && events.isEmpty {
        Text("일정이 없습니다")
          .font(.system(size: 13))
          .foregroundColor(Color(hex: "#9CA3AF"))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 16)
      } else {
        // 이벤트 목록
        ForEach(events) { event in
          HStack(spacing: 10) {
            Circle()
              .fill(Color(hex: event.color))
              .frame(width: 8, height: 8)

            Text(event.title)
              .font(.system(size: 14))
              .foregroundColor(Color(hex: "#374151"))
              .lineLimit(1)

            Spacer()

            Text(event.isAllDay ? "종일" : formatEventTime(event))
              .font(.system(size: 12))
              .foregroundColor(Color(hex: "#9CA3AF"))
          }
          .padding(.horizontal, 16)
          .padding(.vertical, 8)
        }

        // 할일 목록
        ForEach(todos) { todo in
          Button(action: {
            onNavigateToPlanner?(dateStr)
          }) {
            HStack(spacing: 10) {
              Circle()
                .fill(Color(hex: todo.color ?? state.primaryColor))
                .frame(width: 8, height: 8)

              Text(todo.title)
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "#374151"))
                .lineLimit(1)

              Spacer()

              // 시간 또는 반복 정보
              if let time = todo.startTime, !time.isEmpty {
                if let endTime = todo.endTime, !endTime.isEmpty {
                  if isCrossDay(start: time, end: endTime) {
                    // 크로스데이: 날짜 + 시간
                    Text("\(formatShortDate(time) ?? "") \(formatTime(time)) - \(formatShortDate(endTime) ?? "") \(formatTime(endTime))")
                      .font(.system(size: 12))
                      .foregroundColor(Color(hex: "#9CA3AF"))
                  } else {
                    // 같은 날: 시간만
                    Text("\(formatTime(time)) - \(formatTime(endTime))")
                      .font(.system(size: 12))
                      .foregroundColor(Color(hex: "#9CA3AF"))
                  }
                } else {
                  Text(formatTime(time))
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "#9CA3AF"))
                }
              } else if let pattern = todo.recurrencePattern, !pattern.isEmpty, pattern != "none" {
                Image(systemName: "repeat")
                  .font(.system(size: 11))
                  .foregroundColor(Color(hex: "#9CA3AF"))
              }

              Image(systemName: "chevron.right")
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "#CBD5E1"))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
          }
          .buttonStyle(.plain)
        }
      }
    }
    .background(Color.white)
    .cornerRadius(14)
    .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
  }

  // MARK: - Helpers

  private func weekdayColor(index: Int) -> Color {
    if index == 0 { return Color(hex: "#EF4444") }  // 일: 빨강
    if index == 6 { return Color(hex: "#3B82F6") }  // 토: 파랑
    return Color(hex: "#9CA3AF")
  }

  private func dayNumberColor(index: Int) -> Color {
    if index == 0 { return Color(hex: "#EF4444") }
    if index == 6 { return Color(hex: "#3B82F6") }
    return Color(hex: "#374151")
  }

  private func formatTime(_ timeStr: String) -> String {
    // ISO 문자열을 Date로 파싱 → KST TimeZone 기준 포맷
    let isoFormatter = ISO8601DateFormatter()
    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    let isoFormatterBasic = ISO8601DateFormatter()
    isoFormatterBasic.formatOptions = [.withInternetDateTime]

    if let date = isoFormatter.date(from: timeStr) ?? isoFormatterBasic.date(from: timeStr) {
      let df = DateFormatter()
      df.locale = Locale(identifier: "ko_KR")
      df.timeZone = TimeZone(identifier: "Asia/Seoul")
      df.dateFormat = "a h:mm"
      return df.string(from: date)
    }

    // fallback: 기존 HH:mm 파싱
    return formatHHmm(timeStr)
  }

  private func formatHHmm(_ timeStr: String) -> String {
    let parts = timeStr.split(separator: ":")
    guard parts.count >= 2,
          let hour = Int(parts[0]),
          let minute = Int(parts[1]) else { return timeStr }
    let period = hour < 12 ? "오전" : "오후"
    let h = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)
    return "\(period) \(h):\(String(format: "%02d", minute))"
  }

  /// ISO 문자열에서 "M/d" 형식 날짜 추출 (KST 기준)
  private func formatShortDate(_ isoStr: String) -> String? {
    let isoFormatter = ISO8601DateFormatter()
    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let isoFormatterBasic = ISO8601DateFormatter()
    isoFormatterBasic.formatOptions = [.withInternetDateTime]

    guard let date = isoFormatter.date(from: isoStr) ?? isoFormatterBasic.date(from: isoStr) else { return nil }
    let df = DateFormatter()
    df.locale = Locale(identifier: "ko_KR")
    df.timeZone = TimeZone(identifier: "Asia/Seoul")
    df.dateFormat = "M/d"
    return df.string(from: date)
  }

  /// start_time과 end_time의 날짜가 다른지 판별 (KST 기준)
  private func isCrossDay(start: String?, end: String?) -> Bool {
    guard let s = start, let e = end else { return false }
    let isoFormatter = ISO8601DateFormatter()
    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let isoFormatterBasic = ISO8601DateFormatter()
    isoFormatterBasic.formatOptions = [.withInternetDateTime]

    guard let startDate = isoFormatter.date(from: s) ?? isoFormatterBasic.date(from: s),
          let endDate = isoFormatter.date(from: e) ?? isoFormatterBasic.date(from: e) else { return false }

    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "Asia/Seoul")!
    return !cal.isDate(startDate, inSameDayAs: endDate)
  }

  /// 이벤트 시간 포맷 (시작 - 종료)
  private func formatEventTime(_ event: MonthCalEventItem) -> String {
    guard let start = event.start, !start.isEmpty else { return "" }
    let startFormatted = formatTime(start)
    if let end = event.end, !end.isEmpty {
      let endFormatted = formatTime(end)
      return "\(startFormatted) - \(endFormatted)"
    }
    return startFormatted
  }

  // MARK: - Month Navigation

  private func navigateMonth(by offset: Int) {
    guard let newDate = calendar.date(byAdding: .month, value: offset, to: displayedDate) else { return }
    displayedDate = newDate
    state.selectedDate = nil
    generateMonthWeeks(for: newDate)
  }

  private func goToToday() {
    withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
      displayedDate = today
      state.selectedDate = nil
      generateMonthWeeks(for: today)
    }
  }

  // MARK: - Generate Month Weeks

  private func generateMonthWeeks(for date: Date) {
    let year = calendar.component(.year, from: date)
    let month = calendar.component(.month, from: date)

    // 해당 월의 1일과 말일
    guard let firstOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
          let range = calendar.range(of: .day, in: .month, for: firstOfMonth) else { return }
    let lastDay = range.count
    guard let lastOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: lastDay)) else { return }

    // 1일이 속한 주의 일요일
    let firstWeekday = calendar.component(.weekday, from: firstOfMonth)
    guard let firstSunday = calendar.date(byAdding: .day, value: -(firstWeekday - 1), to: firstOfMonth) else { return }

    // 말일이 속한 주의 토요일
    let lastWeekday = calendar.component(.weekday, from: lastOfMonth)
    guard let lastSaturday = calendar.date(byAdding: .day, value: (7 - lastWeekday), to: lastOfMonth) else { return }

    var rows: [MonthWeekRow] = []
    var currentSunday = firstSunday

    while currentSunday <= lastSaturday {
      var dayCells: [DayCellInfo] = []
      for d in 0..<7 {
        guard let cellDate = calendar.date(byAdding: .day, value: d, to: currentSunday) else { continue }
        let dayNum = calendar.component(.day, from: cellDate)
        let dateStr = dateFormatter.string(from: cellDate)
        let cellMonth = calendar.component(.month, from: cellDate)
        let cellYear = calendar.component(.year, from: cellDate)
        let isCurrentMonth = (cellMonth == month && cellYear == year)

        dayCells.append(DayCellInfo(
          id: dateStr,
          date: cellDate,
          day: dayNum,
          isCurrentMonth: isCurrentMonth,
          weekdayIndex: d
        ))
      }

      let weekId = dateFormatter.string(from: currentSunday)
      rows.append(MonthWeekRow(id: weekId, dates: dayCells))

      guard let nextSunday = calendar.date(byAdding: .day, value: 7, to: currentSunday) else { break }
      currentSunday = nextSunday
    }

    weekRows = rows

    // 월 레이블 업데이트
    state.displayMonth = "\(year)년 \(month)월"
    onMonthChange?(year, month)
  }
}

// MARK: - UIView Wrapper

class NativeMonthCalendarUIView: UIView {

  // RN Event Blocks
  @objc var onDateSelect: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?
  @objc var onMonthChange: RCTDirectEventBlock?
  @objc var onNavigateToPlanner: RCTDirectEventBlock?

  private let calendarState = MonthCalendarState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setSelectedDate(_ value: NSString?) {
    let str = value as String?
    if str?.isEmpty == true {
      calendarState.selectedDate = nil
    } else {
      calendarState.selectedDate = str
    }
    setupOnce()
  }

  @objc func setPrimaryColor(_ value: NSString) {
    calendarState.primaryColor = value as String
  }

  @objc func setMonthData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let map = try JSONDecoder().decode([String: [MonthCalTodoItem]].self, from: data)
      calendarState.todoMap = map
    } catch {
      print("[NativeMonthCalendar] monthData decode error: \(error)")
    }
  }

  @objc func setEventData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let map = try JSONDecoder().decode([String: [MonthCalEventItem]].self, from: data)
      calendarState.eventMap = map
    } catch {
      print("[NativeMonthCalendar] eventData decode error: \(error)")
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

    let swiftUIView = MonthCalendarContent(
      state: calendarState,
      onDateSelect: { [weak self] dateStr in
        self?.onDateSelect?(["date": dateStr])
      },
      onHeightChange: { [weak self] height in
        self?.onHeightChange?(["height": height])
      },
      onMonthChange: { [weak self] year, month in
        self?.onMonthChange?(["year": year, "month": month])
      },
      onNavigateToPlanner: { [weak self] dateStr in
        self?.onNavigateToPlanner?(["date": dateStr])
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

@objc(NativeMonthCalendarManager)
class NativeMonthCalendarManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeMonthCalendarUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
