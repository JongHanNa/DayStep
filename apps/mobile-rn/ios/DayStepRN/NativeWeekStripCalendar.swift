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
 *     ├─ weekScrollView (주간 모드 전용, isPagingEnabled=true)
 *     │   └─ weekContentView → 53개 주 페이지 (각 7셀 1행)
 *     └─ gridScrollView (월간 모드 전용, isPagingEnabled=true)
 *         └─ gridContentView → monthPageViews: [UIView]
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

  // MARK: - Week data (접힌 상태 전용)

  var weeks: [[MonthGridCell]] = []
  var currentWeekIndex: Int = 26  // 중앙에서 시작

  /// 선택된 날짜 기준 ±26주 (총 53주) 생성
  func generateWeeks(for date: Date) {
    // 선택된 날짜가 속한 주의 일요일 계산
    let weekday = calendar.component(.weekday, from: date)
    guard let sunday = calendar.date(byAdding: .day, value: -(weekday - 1), to: date) else { return }

    var result: [[MonthGridCell]] = []
    for weekOffset in -26...26 {
      guard let weekSunday = calendar.date(byAdding: .weekOfYear, value: weekOffset, to: sunday) else { continue }
      var row: [MonthGridCell] = []
      for d in 0..<7 {
        guard let cellDate = calendar.date(byAdding: .day, value: d, to: weekSunday) else { continue }
        let dayNum = calendar.component(.day, from: cellDate)
        let dateStr = dateFormatter.string(from: cellDate)
        // isCurrentMonth: 선택된 날짜의 월과 동일한지
        let cellMonth = calendar.component(.month, from: cellDate)
        let cellYear = calendar.component(.year, from: cellDate)
        let selectedMonth = calendar.component(.month, from: date)
        let selectedYear = calendar.component(.year, from: date)
        let isCurrentMonth = (cellMonth == selectedMonth && cellYear == selectedYear)

        row.append(MonthGridCell(
          id: dateStr,
          date: cellDate,
          day: dayNum,
          isCurrentMonth: isCurrentMonth,
          weekdayIndex: d
        ))
      }
      result.append(row)
    }
    weeks = result
    currentWeekIndex = 26
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
  private var hasPerformedInitialLayout = false

  // UI Components
  private let headerView = UIView()
  private let monthLabel = UILabel()
  private let todayButton = UIButton(type: .system)
  private let weekdayView = UIView()
  private var weekdayLabels: [UILabel] = []
  private let gridContainerView = UIView()     // clipsToBounds=true → 핵심
  private let gridScrollView = UIScrollView()  // horizontal paging (월간 모드)
  private let gridContentView = UIView()       // scrollView 내부 콘텐츠
  private var monthPageViews: [String: UIView] = [:] // monthId → UIView
  private var cellButtons: [String: UIButton] = [:]  // cellId → UIButton
  private var circleViews: [String: UIView] = [:]    // cellId → circle background

  // 주간 모드 전용 스크롤뷰
  private let weekScrollView = UIScrollView()
  private let weekContentView = UIView()
  private var weekCellButtons: [String: UIButton] = [:]
  private var weekCircleViews: [String: UIView] = [:]

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
    if hasSetUp {
      syncWeekScrollToSelectedDate()
    }
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

    // 주간 모드 전용 weekScrollView
    weekScrollView.isPagingEnabled = true
    weekScrollView.showsHorizontalScrollIndicator = false
    weekScrollView.showsVerticalScrollIndicator = false
    weekScrollView.delegate = self
    weekScrollView.backgroundColor = .clear
    weekScrollView.clipsToBounds = false
    gridContainerView.addSubview(weekScrollView)

    weekContentView.backgroundColor = .clear
    weekScrollView.addSubview(weekContentView)

    state.generateWeeks(for: state.selectedDate)
    buildWeekPages()

    // 초기 상태: 접힌 모드이므로 weekScrollView 표시
    weekScrollView.isHidden = false
    weekScrollView.isScrollEnabled = true
    gridScrollView.isHidden = true
    gridScrollView.isScrollEnabled = false
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

  // MARK: - Week Pages (접힌 상태 전용)

  private func buildWeekPages() {
    for (_, view) in weekCellButtons { view.removeFromSuperview() }
    for (_, view) in weekCircleViews { view.removeFromSuperview() }
    weekContentView.subviews.forEach { $0.removeFromSuperview() }
    weekCellButtons.removeAll()
    weekCircleViews.removeAll()

    for (weekIndex, week) in state.weeks.enumerated() {
      let pageView = UIView()
      pageView.backgroundColor = .clear
      pageView.tag = weekIndex
      weekContentView.addSubview(pageView)

      for cell in week {
        let circleView = UIView()
        circleView.layer.cornerRadius = 17
        circleView.backgroundColor = .clear
        pageView.addSubview(circleView)
        weekCircleViews["\(weekIndex)_\(cell.id)"] = circleView

        let button = UIButton(type: .system)
        button.setTitle("\(cell.day)", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 15, weight: .regular)
        button.addTarget(self, action: #selector(dayCellTapped(_:)), for: .touchUpInside)
        button.accessibilityIdentifier = cell.id
        pageView.addSubview(button)
        weekCellButtons["\(weekIndex)_\(cell.id)"] = button
      }
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
    // 축소 시 weekScrollView를 현재 선택 주로 동기화
    syncWeekScrollToSelectedDate()
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

  /// 선택된 날짜에 해당하는 주 인덱스를 찾아 weekScrollView 위치 동기화
  private func syncWeekScrollToSelectedDate() {
    let selectedStr = state.dateString(from: state.selectedDate)
    for (index, week) in state.weeks.enumerated() {
      if week.contains(where: { $0.id == selectedStr }) {
        state.currentWeekIndex = index
        scrollToCurrentWeek(animated: false)
        return
      }
    }
    // 찾지 못하면 주간 데이터 재생성
    state.generateWeeks(for: state.selectedDate)
    buildWeekPages()
    scrollToCurrentWeek(animated: false)
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

    // 첫 유효 레이아웃 후 UI 스타일 + 스크롤 위치 재적용
    if hasSetUp && !hasPerformedInitialLayout {
      hasPerformedInitialLayout = true
      updateUI()
    }
  }

  private func layoutGrid() {
    let w = bounds.width
    guard w > 0 else { return }

    let gridTop = state.headerHeight + state.weekdayHeight
    let gridVisibleHeight = state.weekHeight + (state.monthFullHeight - state.weekHeight) * state.expandProgress
    gridContainerView.frame = CGRect(x: 0, y: gridTop, width: w, height: gridVisibleHeight)

    // 모드 전환: expandProgress에 따라 weekScrollView/gridScrollView 표시 전환
    let showWeekScroll = state.expandProgress < 0.5
    weekScrollView.isHidden = !showWeekScroll
    gridScrollView.isHidden = showWeekScroll

    // --- weekScrollView 레이아웃 (접힌 상태) ---
    let weekRowHeight = state.weekHeight
    weekScrollView.frame = CGRect(x: 0, y: 0, width: w, height: weekRowHeight)
    let weekPageCount = CGFloat(state.weeks.count)
    weekContentView.frame = CGRect(x: 0, y: 0, width: w * weekPageCount, height: weekRowHeight)
    weekScrollView.contentSize = CGSize(width: w * weekPageCount, height: weekRowHeight)

    let gridInset: CGFloat = 8
    let cellWidth = (w - gridInset * 2) / 7
    let cellHeight = state.cellHeight

    // 주간 페이지 셀 레이아웃
    for (weekIndex, week) in state.weeks.enumerated() {
      // pageView는 weekContentView의 subview
      let pageView = weekContentView.subviews.first(where: { $0.tag == weekIndex })
      pageView?.frame = CGRect(x: CGFloat(weekIndex) * w, y: 0, width: w, height: weekRowHeight)

      let rowY: CGFloat = 2 // top padding
      for cell in week {
        let cellX = gridInset + CGFloat(cell.weekdayIndex) * cellWidth
        let cellFrame = CGRect(x: cellX, y: rowY, width: cellWidth, height: cellHeight)
        let key = "\(weekIndex)_\(cell.id)"

        if let button = weekCellButtons[key] {
          button.frame = cellFrame
        }
        if let circle = weekCircleViews[key] {
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

    // --- gridScrollView 레이아웃 (확장 상태) ---
    let scrollOffsetY = -state.selectedRowOffset * (1.0 - state.expandProgress)
    gridScrollView.frame = CGRect(x: 0, y: scrollOffsetY, width: w, height: state.monthFullHeight)

    let pageCount = CGFloat(state.months.count)
    gridContentView.frame = CGRect(x: 0, y: 0, width: w * pageCount, height: state.monthFullHeight)
    gridScrollView.contentSize = CGSize(width: w * pageCount, height: state.monthFullHeight)

    let cellSpacing = state.cellSpacing

    for (pageIndex, monthPage) in state.months.enumerated() {
      guard let pageView = monthPageViews[monthPage.id] else { continue }
      pageView.frame = CGRect(x: CGFloat(pageIndex) * w, y: 0, width: w, height: state.monthFullHeight)

      for (rowIndex, row) in monthPage.rows.enumerated() {
        let rowY: CGFloat = CGFloat(rowIndex) * (cellHeight + cellSpacing) + 2
        for cell in row {
          let cellX = gridInset + CGFloat(cell.weekdayIndex) * cellWidth
          let cellFrame = CGRect(x: cellX, y: rowY, width: cellWidth, height: cellHeight)

          if let button = cellButtons[cell.id] {
            button.frame = cellFrame
          }
          if let circle = circleViews[cell.id] {
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

    // Week cell 스타일 업데이트
    for (weekIndex, week) in state.weeks.enumerated() {
      for cell in week {
        let key = "\(weekIndex)_\(cell.id)"
        guard let button = weekCellButtons[key],
              let circle = weekCircleViews[key] else { continue }

        let isToday = cell.id == todayStr
        let isSelected = cell.id == selectedStr

        if isToday {
          circle.backgroundColor = primaryUIColor
        } else if isSelected {
          circle.backgroundColor = primaryUIColor.withAlphaComponent(0.15)
        } else {
          circle.backgroundColor = .clear
        }

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

    // Scroll position 동기화
    scrollToCurrentMonth(animated: false)
    scrollToCurrentWeek(animated: false)
    setNeedsLayout()
  }

  private func rebuildGrid() {
    buildMonthPages()
    state.generateWeeks(for: state.selectedDate)
    buildWeekPages()
    setNeedsLayout()
    layoutIfNeeded()
    scrollToCurrentMonth(animated: false)
    scrollToCurrentWeek(animated: false)
  }

  // MARK: - Scroll to Month

  private func scrollToCurrentWeek(animated: Bool) {
    let w = bounds.width
    guard w > 0, state.currentWeekIndex >= 0, state.currentWeekIndex < state.weeks.count else { return }
    let offsetX = CGFloat(state.currentWeekIndex) * w
    weekScrollView.setContentOffset(CGPoint(x: offsetX, y: 0), animated: animated)
  }

  private func scrollToCurrentMonth(animated: Bool) {
    guard let index = state.months.firstIndex(where: { $0.id == state.currentMonthId }) else { return }
    let w = bounds.width
    guard w > 0 else { return }
    let offsetX = CGFloat(index) * w
    gridScrollView.setContentOffset(CGPoint(x: offsetX, y: 0), animated: animated)
  }

  private func updateScrollEnabled() {
    let isExpanded = state.expandProgress >= 0.5
    gridScrollView.isScrollEnabled = isExpanded
    weekScrollView.isScrollEnabled = !isExpanded
  }

  // MARK: - UIScrollViewDelegate (가로 페이징 → 월 변경)

  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
    if scrollView === gridScrollView {
      updateCurrentMonthFromScroll()
    } else if scrollView === weekScrollView {
      updateCurrentWeekFromScroll()
    }
  }

  func scrollViewDidEndScrollingAnimation(_ scrollView: UIScrollView) {
    if scrollView === gridScrollView {
      updateCurrentMonthFromScroll()
    } else if scrollView === weekScrollView {
      updateCurrentWeekFromScroll()
    }
  }

  private func updateCurrentWeekFromScroll() {
    let w = bounds.width
    guard w > 0 else { return }
    let pageIndex = Int(round(weekScrollView.contentOffset.x / w))
    guard pageIndex >= 0 && pageIndex < state.weeks.count else { return }

    state.currentWeekIndex = pageIndex
    let week = state.weeks[pageIndex]

    // 오늘이 포함된 주면 오늘 선택, 아니면 일요일(첫 번째 셀) 선택
    let todayStr = state.dateString(from: today)
    let newCell = week.first(where: { $0.id == todayStr }) ?? week.first!

    state.selectedDate = newCell.date
    state.updateDisplayMonth(for: newCell.date)
    let newMonthId = state.monthId(for: newCell.date)
    if newMonthId != state.currentMonthId {
      state.currentMonthId = newMonthId
    }

    onDateSelect?(["date": newCell.id])
    updateUI()
  }

  private func updateCurrentMonthFromScroll() {
    let w = bounds.width
    guard w > 0 else { return }
    let pageIndex = Int(round(gridScrollView.contentOffset.x / w))
    guard pageIndex >= 0 && pageIndex < state.months.count else { return }

    let newMonthId = state.months[pageIndex].id
    if newMonthId != state.currentMonthId {
      state.currentMonthId = newMonthId
      // 해당 달의 1일을 선택
      if let monthPage = state.months.first(where: { $0.id == newMonthId }),
         let firstDayCell = monthPage.rows.flatMap({ $0 }).first(where: { $0.isCurrentMonth && $0.day == 1 }) {
        state.selectedDate = firstDayCell.date
        state.updateDisplayMonth(for: firstDayCell.date)
        onDateSelect?(["date": firstDayCell.id])
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
      // 모드 전환 시 동기화
      if shouldExpand {
        // 확장: gridScrollView를 현재 월로 동기화
        scrollToCurrentMonth(animated: false)
      } else {
        // 축소: weekScrollView를 현재 선택 주로 동기화
        syncWeekScrollToSelectedDate()
      }
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
