/**
 * NativeWeekStripCalendar — 주간/월간 스트립 캘린더 (Apple Calendar 스타일)
 * 상단 월 레이블 + "오늘" 버튼, 하단 가로 스크롤 주간/월간 그리드
 *
 * 패턴: ObservableObject + setupOnce() (NativeCleanupAccordion 참조)
 * 드래그: UIKit UIPanGestureRecognizer (SwiftUI ScrollView 충돌 방지)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct MonthGridCell: Identifiable {
  let id: String      // "yyyy-MM-dd"
  let date: Date
  let day: Int
  let isCurrentMonth: Bool
  let weekdayIndex: Int  // 0=일, 6=토
}

struct MonthPageData: Identifiable {
  let id: String          // "yyyy-MM"
  let rows: [[MonthGridCell]]
}

// MARK: - Observable State

class WeekStripState: ObservableObject {
  @Published var selectedDate: Date = Date()
  @Published var primaryColor: String = "#6366F1"
  @Published var displayMonth: String = ""
  @Published var isExpanded: Bool = false
  @Published var expandProgress: CGFloat = 0  // 0=주간, 1=월간
  @Published var isDragging: Bool = false
  @Published var months: [MonthPageData] = []
  @Published var currentMonthId: String = ""

  // 레이아웃 상수 (수학적 높이 계산용)
  let weekHeight: CGFloat = 44    // 40 + padding 4
  let rowHeight: CGFloat = 40     // 38 cell + 2 spacing
  let headerHeight: CGFloat = 46  // padding(12+12) + font18 line height(~22)
  let weekdayHeight: CGFloat = 21 // font11(~15) + padding.bottom(6)

  var monthFullHeight: CGFloat {
    let rowCount = CGFloat(currentMonthRowCount)
    return rowCount * 38 + (rowCount - 1) * 2 + 4
  }

  var calculatedTotalHeight: CGFloat {
    let gridVisible = weekHeight + (monthFullHeight - weekHeight) * expandProgress
    return headerHeight + weekdayHeight + gridVisible
  }

  private let calendar: Calendar = {
    var cal = Calendar(identifier: .gregorian)
    cal.firstWeekday = 1 // 일요일 시작
    cal.locale = Locale(identifier: "ko_KR")
    return cal
  }()

  private let dateFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    return df
  }()

  private let monthIdFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM"
    return df
  }()

  func updateDisplayMonth(for date: Date) {
    let month = calendar.component(.month, from: date)
    displayMonth = "\(month)월"
  }

  func monthId(for date: Date) -> String {
    return monthIdFormatter.string(from: date)
  }

  func dateString(from date: Date) -> String {
    return dateFormatter.string(from: date)
  }

  /// 현재 월의 행 수 (5 또는 6)
  var currentMonthRowCount: Int {
    guard let monthPage = months.first(where: { $0.id == currentMonthId }) else { return 5 }
    return monthPage.rows.count
  }

  /// 현재 월 그리드에서 선택된 주가 몇 번째 행인지 (0-based)
  var selectedWeekRowIndex: Int {
    guard let monthPage = months.first(where: { $0.id == currentMonthId }) else { return 0 }
    let selectedStr = dateFormatter.string(from: selectedDate)
    for (index, row) in monthPage.rows.enumerated() {
      if row.contains(where: { $0.id == selectedStr }) {
        return index
      }
    }
    return 0
  }

  /// 선택된 날짜 기준 ±12개월 MonthPageData 배열 생성
  func generateMonths(for date: Date) {
    let year = calendar.component(.year, from: date)
    let month = calendar.component(.month, from: date)
    guard let baseDate = calendar.date(from: DateComponents(year: year, month: month, day: 1)) else { return }

    var result: [MonthPageData] = []
    for offset in -12...12 {
      guard let monthDate = calendar.date(byAdding: .month, value: offset, to: baseDate) else { continue }
      let rows = buildMonthGrid(for: monthDate)
      let id = monthIdFormatter.string(from: monthDate)
      result.append(MonthPageData(id: id, rows: rows))
    }
    months = result
    currentMonthId = monthIdFormatter.string(from: baseDate)
  }

  /// 단일 월의 그리드 행 생성 (5-6주 x 7일)
  private func buildMonthGrid(for date: Date) -> [[MonthGridCell]] {
    let year = calendar.component(.year, from: date)
    let month = calendar.component(.month, from: date)

    guard let firstOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
          let range = calendar.range(of: .day, in: .month, for: firstOfMonth) else { return [] }
    let lastDay = range.count
    guard let lastOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: lastDay)) else { return [] }

    // 1일이 속한 주의 일요일
    let firstWeekday = calendar.component(.weekday, from: firstOfMonth)
    guard let firstSunday = calendar.date(byAdding: .day, value: -(firstWeekday - 1), to: firstOfMonth) else { return [] }

    // 말일이 속한 주의 토요일
    let lastWeekday = calendar.component(.weekday, from: lastOfMonth)
    guard let lastSaturday = calendar.date(byAdding: .day, value: (7 - lastWeekday), to: lastOfMonth) else { return [] }

    var rows: [[MonthGridCell]] = []
    var currentSunday = firstSunday

    while currentSunday <= lastSaturday {
      var row: [MonthGridCell] = []
      for d in 0..<7 {
        guard let cellDate = calendar.date(byAdding: .day, value: d, to: currentSunday) else { continue }
        let dayNum = calendar.component(.day, from: cellDate)
        let dateStr = dateFormatter.string(from: cellDate)
        let cellMonth = calendar.component(.month, from: cellDate)
        let cellYear = calendar.component(.year, from: cellDate)
        let isCurrentMonth = (cellMonth == month && cellYear == year)

        row.append(MonthGridCell(
          id: dateStr,
          date: cellDate,
          day: dayNum,
          isCurrentMonth: isCurrentMonth,
          weekdayIndex: d
        ))
      }
      rows.append(row)

      guard let nextSunday = calendar.date(byAdding: .day, value: 7, to: currentSunday) else { break }
      currentSunday = nextSunday
    }

    return rows
  }
}

// MARK: - SwiftUI View

@available(iOS 17.0, *)
struct WeekStripContent: View {
  @ObservedObject var state: WeekStripState

  var onDateSelect: ((String) -> Void)?
  var onExpandChange: ((Bool) -> Void)?
  var onHeightChange: (() -> Void)?

  private let calendar: Calendar = {
    var cal = Calendar(identifier: .gregorian)
    cal.firstWeekday = 1
    cal.locale = Locale(identifier: "ko_KR")
    return cal
  }()

  private let dayLabels = ["일", "월", "화", "수", "목", "금", "토"]
  private let today = Calendar.current.startOfDay(for: Date())

  /// 선택된 주 행의 Y offset (그리드 내 위치)
  private var selectedRowOffset: CGFloat {
    CGFloat(state.selectedWeekRowIndex) * state.rowHeight
  }

  var body: some View {
    VStack(spacing: 0) {
      // 상단: 월 레이블 + 오늘 버튼
      HStack {
        Text(state.displayMonth)
          .font(.system(size: 18, weight: .bold))
          .foregroundColor(Color(hex: "#1F2937"))

        Spacer()

        let isOnToday = calendar.isDate(state.selectedDate, inSameDayAs: today)

        Button(action: {
          let todayStr = state.dateString(from: today)
          state.selectedDate = today
          state.updateDisplayMonth(for: today)
          state.generateMonths(for: today)
          onDateSelect?(todayStr)
        }) {
          Text("오늘")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(isOnToday ? Color(hex: "#9CA3AF") : Color(hex: state.primaryColor))
        }
        .disabled(isOnToday)
      }
      .padding(.horizontal, 20)
      .padding(.top, 12)
      .padding(.bottom, 12)
      .animation(nil, value: state.expandProgress)

      // 요일 라벨 행 (week/month 공통)
      weekdayHeader
        .animation(nil, value: state.expandProgress)

      // 서랍형 전환: 월간 그리드만 사용, 클리핑으로 선택된 행만 노출
      // progress=0: offset=-selectedRowOffset (선택된 행이 상단), height=weekHeight (1행만 보임)
      // progress=1: offset=0 (전체 그리드 정상), height=monthFullHeight (전체 보임)
      monthScrollView
        .frame(height: state.monthFullHeight)  // ScrollView 전체 높이 강제 (모든 행 렌더링)
        .offset(y: -selectedRowOffset * (1.0 - state.expandProgress))
        .frame(height: state.weekHeight + (state.monthFullHeight - state.weekHeight) * state.expandProgress, alignment: .top)
        .clipped()
    }
    // .gesture() 제거 — UIKit UIPanGestureRecognizer에서 처리
  }

  // MARK: - Weekday Header (공통)

  private var weekdayHeader: some View {
    HStack(spacing: 0) {
      ForEach(Array(dayLabels.enumerated()), id: \.offset) { index, label in
        Text(label)
          .font(.system(size: 11, weight: .semibold))
          .foregroundColor(weekdayColor(index: index))
          .frame(maxWidth: .infinity)
      }
    }
    .padding(.horizontal, 8)
    .padding(.bottom, 6)
  }

  // MARK: - Month Scroll View (가로 페이징, 각 페이지 = 1개월 그리드)

  private var monthScrollView: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      LazyHStack(spacing: 0) {
        ForEach(state.months) { monthPage in
          monthPageView(monthPage: monthPage)
            .containerRelativeFrame(.horizontal, count: 1, spacing: 0)
            .id(monthPage.id)
        }
      }
      .scrollTargetLayout()
    }
    .scrollTargetBehavior(.paging)
    .scrollPosition(id: Binding(
      get: { state.currentMonthId },
      set: { newId in
        if let id = newId, id != state.currentMonthId {
          state.currentMonthId = id
          // "yyyy-MM" → 월 레이블 갱신
          if let monthPage = state.months.first(where: { $0.id == id }),
             let firstRow = monthPage.rows.first,
             let midCell = firstRow.first(where: { $0.isCurrentMonth }) {
            state.updateDisplayMonth(for: midCell.date)
          }
        }
      }
    ))
    .scrollDisabled(state.expandProgress < 0.5)
  }

  /// 단일 월 페이지 (VStack 그리드)
  private func monthPageView(monthPage: MonthPageData) -> some View {
    VStack(spacing: 2) {
      ForEach(Array(monthPage.rows.enumerated()), id: \.offset) { _, row in
        HStack(spacing: 0) {
          ForEach(row) { cell in
            monthDayCellView(cell: cell)
              .frame(maxWidth: .infinity)
          }
        }
      }
    }
    .padding(.horizontal, 8)
  }

  private func monthDayCellView(cell: MonthGridCell) -> some View {
    let isToday = calendar.isDate(cell.date, inSameDayAs: today)
    let isSelected = calendar.isDate(cell.date, inSameDayAs: state.selectedDate)

    return Button(action: {
      state.selectedDate = cell.date
      state.updateDisplayMonth(for: cell.date)
      onDateSelect?(state.dateString(from: cell.date))

      // 다른 달 날짜 탭 시 월 페이지 갱신
      let tappedMonthId = state.monthId(for: cell.date)
      if tappedMonthId != state.currentMonthId {
        state.currentMonthId = tappedMonthId
      }

      // 날짜 선택 후 주간 모드로 축소
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
        withAnimation(.easeOut(duration: 0.25)) {
          state.isExpanded = false
          state.expandProgress = 0
        }
        onExpandChange?(false)
        onHeightChange?()
      }
    }) {
      ZStack {
        if isToday {
          Circle()
            .fill(Color(hex: state.primaryColor))
            .frame(width: 34, height: 34)
        } else if isSelected {
          Circle()
            .fill(Color(hex: state.primaryColor).opacity(0.15))
            .frame(width: 34, height: 34)
        }

        Text("\(cell.day)")
          .font(.system(size: 15, weight: isToday || isSelected ? .bold : .regular))
          .foregroundColor(
            isToday ? .white :
            !cell.isCurrentMonth ? Color(hex: "#D1D5DB") :
            isSelected ? Color(hex: state.primaryColor) :
            dayNumberColor(index: cell.weekdayIndex)
          )
      }
      .frame(width: 40, height: 38)
    }
    .buttonStyle(.plain)
  }

  // MARK: - Color Helpers

  private func weekdayColor(index: Int) -> Color {
    if index == 0 { return Color(hex: "#EF4444") } // 일: 빨강
    if index == 6 { return Color(hex: "#3B82F6") } // 토: 파랑
    return Color(hex: "#9CA3AF")
  }

  private func dayNumberColor(index: Int) -> Color {
    if index == 0 { return Color(hex: "#EF4444") }
    if index == 6 { return Color(hex: "#3B82F6") }
    return Color(hex: "#374151")
  }
}

// MARK: - UIView Wrapper

class NativeWeekStripCalendarUIView: UIView, UIGestureRecognizerDelegate {

  // RN Event Blocks
  @objc var onDateSelect: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?
  @objc var onExpandChange: RCTDirectEventBlock?

  private let weekState = WeekStripState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  private let dateFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    return df
  }()

  // MARK: Prop Setters

  @objc func setSelectedDate(_ value: NSString) {
    guard let date = dateFormatter.date(from: value as String) else { return }
    weekState.selectedDate = date
    weekState.updateDisplayMonth(for: date)
    // 월이 바뀌면 monthId도 갱신
    let newMonthId = weekState.monthId(for: date)
    if newMonthId != weekState.currentMonthId {
      weekState.currentMonthId = newMonthId
    }
    setupOnce()
  }

  @objc func setPrimaryColor(_ value: NSString) {
    weekState.primaryColor = value as String
  }

  // MARK: - Height Emission

  private func emitHeight(animated: Bool = true) {
    guard bounds.width > 0 else { return }
    onHeightChange?(["height": weekState.calculatedTotalHeight, "animated": animated])
  }

  // MARK: - UIPanGestureRecognizer Handler

  /// 드래그 가능한 높이 (월간 전체 - 주간 높이, 감도 기준)
  private var expandableHeight: CGFloat { 150.0 }

  @objc private func handleVerticalPan(_ gesture: UIPanGestureRecognizer) {
    let translation = gesture.translation(in: self)
    let velocity = gesture.velocity(in: self)

    switch gesture.state {
    case .began:
      weekState.isDragging = true

    case .changed:
      let ty = translation.y
      if weekState.isExpanded {
        // 축소 중: 위로 드래그 → progress 1→0
        let progress = max(0, 1.0 - (-ty / expandableHeight))
        weekState.expandProgress = min(1.0, progress)
      } else {
        // 확장 중: 아래로 드래그 → progress 0→1
        let progress = min(1.0, ty / expandableHeight)
        weekState.expandProgress = max(0, progress)
      }
      emitHeight(animated: false)

    case .ended, .cancelled:
      weekState.isDragging = false

      // velocity + progress threshold로 스냅 결정
      let shouldExpand: Bool
      if weekState.isExpanded {
        // 현재 확장 → 축소 여부: progress < 0.6 또는 빠른 위 방향 velocity
        shouldExpand = weekState.expandProgress > 0.6 && velocity.y > -500
      } else {
        // 현재 축소 → 확장 여부: progress > 0.4 또는 빠른 아래 방향 velocity
        shouldExpand = weekState.expandProgress > 0.4 || velocity.y > 500
      }

      withAnimation(.easeOut(duration: 0.25)) {
        weekState.expandProgress = shouldExpand ? 1.0 : 0.0
        weekState.isExpanded = shouldExpand
      }
      onExpandChange?(["expanded": shouldExpand])

      // 최종 높이를 수학적으로 계산하여 즉시 emit (지연 제거)
      let finalProgress: CGFloat = shouldExpand ? 1.0 : 0.0
      let gridVisible = weekState.weekHeight + (weekState.monthFullHeight - weekState.weekHeight) * finalProgress
      let totalHeight = weekState.headerHeight + weekState.weekdayHeight + gridVisible
      onHeightChange?(["height": totalHeight, "animated": true])

    default:
      break
    }
  }

  // UIGestureRecognizerDelegate — 수직 방향 우세 시에만 pan 인식 시작
  override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    guard let pan = gestureRecognizer as? UIPanGestureRecognizer else { return true }
    let v = pan.velocity(in: self)
    return abs(v.y) > abs(v.x)  // 수직 우세
  }

  // ScrollView와 동시 인식 허용
  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    return true
  }

  // MARK: - Setup Once

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .clear
    clipsToBounds = true  // HC 오버플로우 방지

    weekState.generateMonths(for: weekState.selectedDate)

    if #available(iOS 17.0, *) {
      let swiftUIView = WeekStripContent(
        state: weekState,
        onDateSelect: { [weak self] dateString in
          self?.onDateSelect?(["date": dateString])
        },
        onExpandChange: { [weak self] expanded in
          self?.onExpandChange?(["expanded": expanded])
        },
        onHeightChange: { [weak self] in
          self?.emitHeight()
        }
      )

      let hc = UIHostingController(rootView: AnyView(swiftUIView))
      hc.view.backgroundColor = .clear
      hc.sizingOptions = .intrinsicContentSize  // HC가 SwiftUI 콘텐츠에 따라 자동 크기 결정
      hostingController = hc

      addSubview(hc.view)
      hc.view.translatesAutoresizingMaskIntoConstraints = false
      NSLayoutConstraint.activate([
        hc.view.leadingAnchor.constraint(equalTo: leadingAnchor),
        hc.view.trailingAnchor.constraint(equalTo: trailingAnchor),
        hc.view.topAnchor.constraint(equalTo: topAnchor),
        // bottom 제거 — intrinsicContentSize가 높이 결정 (RN 컨테이너와 디커플링)
      ])

      // UIPanGestureRecognizer 추가 (수직 드래그 → expand/collapse)
      let pan = UIPanGestureRecognizer(target: self, action: #selector(handleVerticalPan(_:)))
      pan.delegate = self
      hc.view.addGestureRecognizer(pan)

      DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
        self?.emitHeight()
      }
    }
  }
}

// MARK: - RCTViewManager

@objc(NativeWeekStripCalendarManager)
class NativeWeekStripCalendarManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeWeekStripCalendarUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
