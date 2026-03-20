/**
 * NativeWeekStripCalendar — 주간/월간 스트립 캘린더 (Apple Calendar 스타일)
 * 순수 UIKit 구현: clipsToBounds로 snap-close 블리딩 완전 차단
 * 헤더/요일 배경 투명 → RN GradientBackground 그대로 비침 (색상 불일치 해소)
 *
 * 레이어 구조:
 * NativeWeekStripCalendarUIView (clipsToBounds=true)
 * ├─ headerView (backgroundColor=.clear)
 * │   ├─ monthLabel ("3월")
 * │   └─ todayButton ("오늘")
 * ├─ weekdayView (backgroundColor=.clear)
 * │   └─ 일/월/화/수/목/금/토 labels
 * └─ gridContainerView (clipsToBounds=true) ← 핵심: GPU 수준 마스킹
 *     └─ gridScrollView (UIScrollView, horizontal paging)
 *         └─ gridContentView
 *             └─ monthPageViews: [UIView]
 */

import Foundation
import UIKit

// MARK: - UIColor hex extension

private extension UIColor {
  convenience init?(hex: String) {
    let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int: UInt64 = 0
    Scanner(string: hex).scanHexInt64(&int)
    let a, r, g, b: UInt64
    switch hex.count {
    case 3:
      (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
    case 6:
      (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
    case 8:
      (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
    default:
      return nil
    }
    self.init(
      red: CGFloat(r) / 255,
      green: CGFloat(g) / 255,
      blue: CGFloat(b) / 255,
      alpha: CGFloat(a) / 255
    )
  }
}

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

// MARK: - State (pure class, no SwiftUI dependency)

class WeekStripState {
  var selectedDate: Date = Date()
  var primaryColor: String = "#6366F1"
  var displayMonth: String = ""
  var isExpanded: Bool = false
  var expandProgress: CGFloat = 0  // 0=주간, 1=월간
  var isDragging: Bool = false
  var months: [MonthPageData] = []
  var currentMonthId: String = ""

  // 레이아웃 상수
  let cellHeight: CGFloat = 38
  let cellSpacing: CGFloat = 2
  let weekHeight: CGFloat = 44    // 40 + padding 4
  let rowHeight: CGFloat = 40     // 38 cell + 2 spacing
  let headerHeight: CGFloat = 46  // padding(12+12) + font18 line height(~22)
  let weekdayHeight: CGFloat = 21 // font11(~15) + padding.bottom(6)

  var monthFullHeight: CGFloat {
    let rowCount = CGFloat(currentMonthRowCount)
    return rowCount * cellHeight + (rowCount - 1) * cellSpacing + 4
  }

  var calculatedTotalHeight: CGFloat {
    let gridVisible = weekHeight + (monthFullHeight - weekHeight) * expandProgress
    return headerHeight + weekdayHeight + gridVisible
  }

  let calendar: Calendar = {
    var cal = Calendar(identifier: .gregorian)
    cal.firstWeekday = 1
    cal.locale = Locale(identifier: "ko_KR")
    return cal
  }()

  let dateFormatter: DateFormatter = {
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

  var currentMonthRowCount: Int {
    guard let monthPage = months.first(where: { $0.id == currentMonthId }) else { return 5 }
    return monthPage.rows.count
  }

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

  /// 선택된 주 행의 Y offset
  var selectedRowOffset: CGFloat {
    CGFloat(selectedWeekRowIndex) * rowHeight
  }

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

  private func buildMonthGrid(for date: Date) -> [[MonthGridCell]] {
    let year = calendar.component(.year, from: date)
    let month = calendar.component(.month, from: date)

    guard let firstOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
          let range = calendar.range(of: .day, in: .month, for: firstOfMonth) else { return [] }
    let lastDay = range.count
    guard let lastOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: lastDay)) else { return [] }

    let firstWeekday = calendar.component(.weekday, from: firstOfMonth)
    guard let firstSunday = calendar.date(byAdding: .day, value: -(firstWeekday - 1), to: firstOfMonth) else { return [] }

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

// MARK: - UIView (Pure UIKit)

class NativeWeekStripCalendarUIView: UIView, UIGestureRecognizerDelegate, UIScrollViewDelegate {

  // RN Event Blocks
  @objc var onDateSelect: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?
  @objc var onExpandChange: RCTDirectEventBlock?

  private let state = WeekStripState()
  private var hasSetUp = false

  // UI Components
  private let headerView = UIView()
  private let monthLabel = UILabel()
  private let todayButton = UIButton(type: .system)
  private let weekdayView = UIView()
  private var weekdayLabels: [UILabel] = []
  private let gridContainerView = UIView()     // clipsToBounds=true → 핵심
  private let gridScrollView = UIScrollView()  // horizontal paging
  private let gridContentView = UIView()       // scrollView 내부 콘텐츠
  private var monthPageViews: [String: UIView] = [:] // monthId → UIView
  private var cellButtons: [String: UIButton] = [:]  // cellId → UIButton
  private var circleViews: [String: UIView] = [:]    // cellId → circle background

  private let dayLabels = ["일", "월", "화", "수", "목", "금", "토"]
  private var today: Date { Calendar.current.startOfDay(for: Date()) }

  private let dateFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    return df
  }()

  // MARK: - Prop Setters

  @objc func setSelectedDate(_ value: NSString) {
    guard let date = dateFormatter.date(from: value as String) else { return }
    state.selectedDate = date
    state.updateDisplayMonth(for: date)
    let newMonthId = state.monthId(for: date)
    if newMonthId != state.currentMonthId {
      state.currentMonthId = newMonthId
    }
    setupOnce()
    updateUI()
  }

  @objc func setPrimaryColor(_ value: NSString) {
    state.primaryColor = value as String
    if hasSetUp { updateUI() }
  }

  // gradient props 유지 (인터페이스 호환) — 하지만 UIKit에서는 사용하지 않음 (투명 배경)
  @objc func setGradientColors(_ value: NSArray) {}
  @objc func setGradientStartX(_ value: NSNumber) {}
  @objc func setGradientStartY(_ value: NSNumber) {}
  @objc func setGradientEndX(_ value: NSNumber) {}
  @objc func setGradientEndY(_ value: NSNumber) {}

  // MARK: - Height Emission

  private func emitHeight(animated: Bool = true) {
    guard bounds.width > 0 else { return }
    onHeightChange?(["height": state.calculatedTotalHeight, "animated": animated])
  }

  // MARK: - Setup Once

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true

    backgroundColor = .clear
    clipsToBounds = true

    state.generateMonths(for: state.selectedDate)

    setupHeader()
    setupWeekdayRow()
    setupGrid()
    setupPanGesture()

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
      self?.emitHeight()
    }
  }

  // MARK: - Header (월 레이블 + 오늘 버튼)

  private func setupHeader() {
    headerView.backgroundColor = .clear
    addSubview(headerView)

    monthLabel.font = .systemFont(ofSize: 18, weight: .bold)
    monthLabel.textColor = UIColor(hex: "#1F2937")
    monthLabel.text = state.displayMonth
    headerView.addSubview(monthLabel)

    todayButton.setTitle("오늘", for: .normal)
    todayButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
    todayButton.addTarget(self, action: #selector(todayTapped), for: .touchUpInside)
    headerView.addSubview(todayButton)
  }

  @objc private func todayTapped() {
    let todayDate = today
    let todayStr = state.dateString(from: todayDate)
    state.selectedDate = todayDate
    state.updateDisplayMonth(for: todayDate)
    state.generateMonths(for: todayDate)
    onDateSelect?(["date": todayStr])
    rebuildGrid()
    updateUI()
  }

  // MARK: - Weekday Row

  private func setupWeekdayRow() {
    weekdayView.backgroundColor = .clear
    addSubview(weekdayView)

    for (index, label) in dayLabels.enumerated() {
      let lbl = UILabel()
      lbl.text = label
      lbl.font = .systemFont(ofSize: 11, weight: .semibold)
      lbl.textAlignment = .center
      lbl.textColor = weekdayColor(index: index)
      weekdayView.addSubview(lbl)
      weekdayLabels.append(lbl)
    }
  }

  // MARK: - Grid (핵심: clipsToBounds로 블리딩 차단)

  private func setupGrid() {
    // gridContainerView: clipsToBounds = true → GPU 수준 마스킹
    gridContainerView.clipsToBounds = true
    gridContainerView.layer.masksToBounds = true
    gridContainerView.backgroundColor = .clear
    addSubview(gridContainerView)

    // gridScrollView: 가로 페이징
    gridScrollView.isPagingEnabled = true
    gridScrollView.showsHorizontalScrollIndicator = false
    gridScrollView.showsVerticalScrollIndicator = false
    gridScrollView.delegate = self
    gridScrollView.backgroundColor = .clear
    gridScrollView.clipsToBounds = false  // scrollView 자체는 클리핑 안 함 (container가 담당)
    gridContainerView.addSubview(gridScrollView)

    gridContentView.backgroundColor = .clear
    gridScrollView.addSubview(gridContentView)

    buildMonthPages()
  }

  private func buildMonthPages() {
    // 기존 페이지 뷰 제거
    for (_, view) in monthPageViews {
      view.removeFromSuperview()
    }
    monthPageViews.removeAll()
    cellButtons.removeAll()
    circleViews.removeAll()

    for monthPage in state.months {
      let pageView = createMonthPageView(monthPage: monthPage)
      gridContentView.addSubview(pageView)
      monthPageViews[monthPage.id] = pageView
    }
  }

  private func createMonthPageView(monthPage: MonthPageData) -> UIView {
    let pageView = UIView()
    pageView.backgroundColor = .clear

    for (rowIndex, row) in monthPage.rows.enumerated() {
      for cell in row {
        // Circle background view
        let circleView = UIView()
        circleView.layer.cornerRadius = 17
        circleView.backgroundColor = .clear
        circleView.tag = rowIndex
        pageView.addSubview(circleView)
        circleViews[cell.id] = circleView

        // Day button
        let button = UIButton(type: .system)
        button.setTitle("\(cell.day)", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 15, weight: .regular)
        button.addTarget(self, action: #selector(dayCellTapped(_:)), for: .touchUpInside)
        // accessibilityIdentifier에 cellId 저장
        button.accessibilityIdentifier = cell.id
        pageView.addSubview(button)
        cellButtons[cell.id] = button
      }
    }

    return pageView
  }

  @objc private func dayCellTapped(_ sender: UIButton) {
    guard let cellId = sender.accessibilityIdentifier else { return }

    // cellId ("yyyy-MM-dd") → Date
    guard let date = dateFormatter.date(from: cellId) else { return }

    state.selectedDate = date
    state.updateDisplayMonth(for: date)
    onDateSelect?(["date": cellId])

    // 다른 달 날짜 탭 시 월 페이지 갱신
    let tappedMonthId = state.monthId(for: date)
    if tappedMonthId != state.currentMonthId {
      state.currentMonthId = tappedMonthId
      scrollToCurrentMonth(animated: true)
    }

    updateUI()

    // 날짜 선택 후 주간 모드로 축소
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
      self?.animateCollapse()
    }
  }

  private func animateCollapse() {
    state.isExpanded = false
    UIView.animate(withDuration: 0.25, delay: 0, options: .curveEaseOut) { [weak self] in
      guard let self = self else { return }
      self.state.expandProgress = 0
      self.layoutGrid()
      self.layoutSubviews()
    } completion: { [weak self] _ in
      self?.updateScrollEnabled()
    }
    onExpandChange?(["expanded": false])
    let gridVisible = state.weekHeight
    let totalHeight = state.headerHeight + state.weekdayHeight + gridVisible
    onHeightChange?(["height": totalHeight, "animated": true])
  }

  // MARK: - Layout

  override func layoutSubviews() {
    super.layoutSubviews()

    let w = bounds.width
    guard w > 0 else { return }

    // Header
    headerView.frame = CGRect(x: 0, y: 0, width: w, height: state.headerHeight)
    monthLabel.sizeToFit()
    monthLabel.frame = CGRect(x: 20, y: 12, width: monthLabel.bounds.width, height: 22)
    todayButton.sizeToFit()
    todayButton.frame = CGRect(
      x: w - 20 - todayButton.bounds.width,
      y: 12,
      width: todayButton.bounds.width,
      height: 22
    )

    // Weekday row
    weekdayView.frame = CGRect(x: 0, y: state.headerHeight, width: w, height: state.weekdayHeight)
    let weekdayInset: CGFloat = 8
    let weekdayCellWidth = (w - weekdayInset * 2) / 7
    for (index, lbl) in weekdayLabels.enumerated() {
      lbl.frame = CGRect(
        x: weekdayInset + CGFloat(index) * weekdayCellWidth,
        y: 0,
        width: weekdayCellWidth,
        height: 15
      )
    }

    // Grid container + scroll
    layoutGrid()
  }

  private func layoutGrid() {
    let w = bounds.width
    guard w > 0 else { return }

    let gridTop = state.headerHeight + state.weekdayHeight
    let gridVisibleHeight = state.weekHeight + (state.monthFullHeight - state.weekHeight) * state.expandProgress
    gridContainerView.frame = CGRect(x: 0, y: gridTop, width: w, height: gridVisibleHeight)

    // scrollView는 전체 월 높이로 설정, offset으로 선택된 행 위치 조정
    let scrollOffsetY = -state.selectedRowOffset * (1.0 - state.expandProgress)
    gridScrollView.frame = CGRect(x: 0, y: scrollOffsetY, width: w, height: state.monthFullHeight)

    // Content size = 모든 월 페이지 가로 나열
    let pageCount = CGFloat(state.months.count)
    gridContentView.frame = CGRect(x: 0, y: 0, width: w * pageCount, height: state.monthFullHeight)
    gridScrollView.contentSize = CGSize(width: w * pageCount, height: state.monthFullHeight)

    // 각 월 페이지 레이아웃
    let gridInset: CGFloat = 8
    let cellWidth = (w - gridInset * 2) / 7
    let cellHeight = state.cellHeight
    let cellSpacing = state.cellSpacing

    for (pageIndex, monthPage) in state.months.enumerated() {
      guard let pageView = monthPageViews[monthPage.id] else { continue }
      pageView.frame = CGRect(x: CGFloat(pageIndex) * w, y: 0, width: w, height: state.monthFullHeight)

      for (rowIndex, row) in monthPage.rows.enumerated() {
        let rowY: CGFloat = CGFloat(rowIndex) * (cellHeight + cellSpacing) + 2 // +2 top padding
        for cell in row {
          let cellX = gridInset + CGFloat(cell.weekdayIndex) * cellWidth
          let cellFrame = CGRect(x: cellX, y: rowY, width: cellWidth, height: cellHeight)

          if let button = cellButtons[cell.id] {
            button.frame = cellFrame
          }
          if let circle = circleViews[cell.id] {
            // 원은 34x34, 셀 중앙
            let circleSize: CGFloat = 34
            circle.frame = CGRect(
              x: cellX + (cellWidth - circleSize) / 2,
              y: rowY + (cellHeight - circleSize) / 2,
              width: circleSize,
              height: circleSize
            )
          }
        }
      }
    }
  }

  // MARK: - Update UI (selection, colors)

  private func updateUI() {
    guard hasSetUp else { return }

    let todayStr = state.dateString(from: today)
    let selectedStr = state.dateString(from: state.selectedDate)
    let primaryUIColor = UIColor(hex: state.primaryColor) ?? .systemIndigo

    // Header
    monthLabel.text = state.displayMonth
    monthLabel.sizeToFit()

    // 오늘 버튼 색상
    let isOnToday = state.calendar.isDate(state.selectedDate, inSameDayAs: today)
    todayButton.setTitleColor(isOnToday ? UIColor(hex: "#9CA3AF") : primaryUIColor, for: .normal)
    todayButton.isEnabled = !isOnToday

    // Cell 스타일 업데이트
    for monthPage in state.months {
      for row in monthPage.rows {
        for cell in row {
          guard let button = cellButtons[cell.id],
                let circle = circleViews[cell.id] else { continue }

          let isToday = cell.id == todayStr
          let isSelected = cell.id == selectedStr

          // Circle background
          if isToday {
            circle.backgroundColor = primaryUIColor
          } else if isSelected {
            circle.backgroundColor = primaryUIColor.withAlphaComponent(0.15)
          } else {
            circle.backgroundColor = .clear
          }

          // Text style
          let weight: UIFont.Weight = (isToday || isSelected) ? .bold : .regular
          button.titleLabel?.font = .systemFont(ofSize: 15, weight: weight)

          let textColor: UIColor
          if isToday {
            textColor = .white
          } else if !cell.isCurrentMonth {
            textColor = UIColor(hex: "#D1D5DB") ?? .lightGray
          } else if isSelected {
            textColor = primaryUIColor
          } else {
            textColor = dayNumberColor(index: cell.weekdayIndex)
          }
          button.setTitleColor(textColor, for: .normal)
        }
      }
    }

    // Scroll position 동기화
    scrollToCurrentMonth(animated: false)
    setNeedsLayout()
  }

  private func rebuildGrid() {
    buildMonthPages()
    setNeedsLayout()
    layoutIfNeeded()
    scrollToCurrentMonth(animated: false)
  }

  // MARK: - Scroll to Month

  private func scrollToCurrentMonth(animated: Bool) {
    guard let index = state.months.firstIndex(where: { $0.id == state.currentMonthId }) else { return }
    let w = bounds.width
    guard w > 0 else { return }
    let offsetX = CGFloat(index) * w
    gridScrollView.setContentOffset(CGPoint(x: offsetX, y: 0), animated: animated)
  }

  private func updateScrollEnabled() {
    gridScrollView.isScrollEnabled = state.expandProgress >= 0.5
  }

  // MARK: - UIScrollViewDelegate (가로 페이징 → 월 변경)

  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
    guard scrollView === gridScrollView else { return }
    updateCurrentMonthFromScroll()
  }

  func scrollViewDidEndScrollingAnimation(_ scrollView: UIScrollView) {
    guard scrollView === gridScrollView else { return }
    updateCurrentMonthFromScroll()
  }

  private func updateCurrentMonthFromScroll() {
    let w = bounds.width
    guard w > 0 else { return }
    let pageIndex = Int(round(gridScrollView.contentOffset.x / w))
    guard pageIndex >= 0 && pageIndex < state.months.count else { return }

    let newMonthId = state.months[pageIndex].id
    if newMonthId != state.currentMonthId {
      state.currentMonthId = newMonthId
      if let monthPage = state.months.first(where: { $0.id == newMonthId }),
         let firstRow = monthPage.rows.first,
         let midCell = firstRow.first(where: { $0.isCurrentMonth }) {
        state.updateDisplayMonth(for: midCell.date)
      }
      updateUI()
    }
  }

  // MARK: - UIPanGestureRecognizer (수직 드래그 → expand/collapse)

  private var expandableHeight: CGFloat { 150.0 }

  private func setupPanGesture() {
    let pan = UIPanGestureRecognizer(target: self, action: #selector(handleVerticalPan(_:)))
    pan.delegate = self
    addGestureRecognizer(pan)
  }

  @objc private func handleVerticalPan(_ gesture: UIPanGestureRecognizer) {
    let translation = gesture.translation(in: self)
    let velocity = gesture.velocity(in: self)

    switch gesture.state {
    case .began:
      state.isDragging = true

    case .changed:
      let ty = translation.y
      if state.isExpanded {
        let progress = max(0, 1.0 - (-ty / expandableHeight))
        state.expandProgress = min(1.0, progress)
      } else {
        let progress = min(1.0, ty / expandableHeight)
        state.expandProgress = max(0, progress)
      }
      layoutGrid()
      updateScrollEnabled()
      emitHeight(animated: false)

    case .ended, .cancelled:
      state.isDragging = false

      let shouldExpand: Bool
      if state.isExpanded {
        shouldExpand = state.expandProgress > 0.6 && velocity.y > -500
      } else {
        shouldExpand = state.expandProgress > 0.4 || velocity.y > 500
      }

      state.isExpanded = shouldExpand
      UIView.animate(withDuration: 0.25, delay: 0, options: .curveEaseOut) { [weak self] in
        guard let self = self else { return }
        self.state.expandProgress = shouldExpand ? 1.0 : 0.0
        self.layoutGrid()
      } completion: { [weak self] _ in
        self?.updateScrollEnabled()
      }
      onExpandChange?(["expanded": shouldExpand])

      let finalProgress: CGFloat = shouldExpand ? 1.0 : 0.0
      let gridVisible = state.weekHeight + (state.monthFullHeight - state.weekHeight) * finalProgress
      let totalHeight = state.headerHeight + state.weekdayHeight + gridVisible
      onHeightChange?(["height": totalHeight, "animated": true])

    default:
      break
    }
  }

  // UIGestureRecognizerDelegate — 수직 방향 우세 시에만 pan 인식
  override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    guard let pan = gestureRecognizer as? UIPanGestureRecognizer else { return true }
    let v = pan.velocity(in: self)
    return abs(v.y) > abs(v.x)
  }

  // ScrollView와 동시 인식 허용
  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    return true
  }

  // MARK: - Color Helpers

  private func weekdayColor(index: Int) -> UIColor {
    if index == 0 { return UIColor(hex: "#EF4444") ?? .red }
    if index == 6 { return UIColor(hex: "#3B82F6") ?? .blue }
    return UIColor(hex: "#9CA3AF") ?? .gray
  }

  private func dayNumberColor(index: Int) -> UIColor {
    if index == 0 { return UIColor(hex: "#EF4444") ?? .red }
    if index == 6 { return UIColor(hex: "#3B82F6") ?? .blue }
    return UIColor(hex: "#374151") ?? .darkGray
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
