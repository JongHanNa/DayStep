/**
 * NativeMultiDayTimeGrid — Apple Calendar 스타일 2D 스크롤 그리드
 * UIKit 4-Quadrant UIScrollView 구현
 *
 * 구조:
 * ┌──────────────┬──────────────────────────────────┐
 * │ cornerView   │ headerScrollView (가로, 터치 비활성) │
 * ├──────────────┼──────────────────────────────────┤
 * │ timeAxis     │ contentScrollView (2D, 메인 터치)   │
 * │ ScrollView   │                                  │
 * │ (세로, 비활성) │                                  │
 * └──────────────┴──────────────────────────────────┘
 *
 * 핵심: scrollViewDidScroll에서 헤더/시간축 동기화, 컬럼 스냅
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

// MARK: - Time Utilities (ISO8601 → local timezone)

private enum MultiDayTimeUtils {
  static let isoFrac: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
  }()
  static let isoNoFrac: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f
  }()

  static func minutesFromISO(_ timeStr: String) -> CGFloat? {
    guard timeStr.contains("T") else { return nil }
    if let date = isoFrac.date(from: timeStr) ?? isoNoFrac.date(from: timeStr) {
      let cal = Calendar.current
      let comps = cal.dateComponents([.hour, .minute], from: date)
      return CGFloat((comps.hour ?? 0) * 60 + (comps.minute ?? 0))
    }
    return nil
  }

  static func minutesFromTimeString(_ timeStr: String) -> CGFloat {
    if let mins = minutesFromISO(timeStr) { return mins }
    let components = timeStr.prefix(5).components(separatedBy: ":")
    guard components.count >= 2,
          let hour = Double(components[0]),
          let minute = Double(components[1]) else { return 0 }
    return CGFloat(hour * 60 + minute)
  }
}

// MARK: - Data State

private class MultiDayTimeGridState {
  var dayCount: Int = 3
  var centerDate: String = ""
  var primaryColor: String = "#6366F1"
  var todoMap: [String: [DayGridTodoItem]] = [:]
  var eventMap: [String: [DayGridEventItem]] = [:]

  private let decoder = JSONDecoder()
  private let calendar = Calendar.current
  private let dateFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    return df
  }()

  func parseTodoData(_ jsonString: String) {
    guard let data = jsonString.data(using: .utf8) else { return }
    do {
      todoMap = try decoder.decode([String: [DayGridTodoItem]].self, from: data)
    } catch {
      print("[MultiDayTimeGrid] todo parse error: \(error)")
    }
  }

  func parseEventData(_ jsonString: String) {
    guard let data = jsonString.data(using: .utf8) else { return }
    do {
      eventMap = try decoder.decode([String: [DayGridEventItem]].self, from: data)
    } catch {
      print("[MultiDayTimeGrid] event parse error: \(error)")
    }
  }

  /// 버퍼 포함 전체 날짜 배열
  func allDatesInRange(buffer: Int) -> [String] {
    guard let center = dateFormatter.date(from: centerDate) else { return [] }
    let startOffset = -(dayCount / 2) - buffer
    let totalDays = dayCount + buffer * 2
    var dates: [String] = []
    for i in 0..<totalDays {
      if let date = calendar.date(byAdding: .day, value: startOffset + i, to: center) {
        dates.append(dateFormatter.string(from: date))
      }
    }
    return dates
  }
}

// MARK: - Tap Gesture with todoId

private class TodoTapGesture: UITapGestureRecognizer {
  var todoId: String = ""
}

// MARK: - LongPress Gesture with todoId

private class TodoLongPressGesture: UILongPressGestureRecognizer {
  var todoId: String = ""
}

// MARK: - 4-Quadrant Grid View

class NativeMultiDayTimeGridUIView: UIView, UIScrollViewDelegate {

  // RCT callbacks
  @objc var onDateSelect: RCTDirectEventBlock?
  @objc var onTodoPress: RCTDirectEventBlock?
  @objc var onDateRangeChange: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?
  @objc var onTodoEdit: RCTDirectEventBlock?

  // Long-press drag state
  private weak var draggingCard: UIView?
  private var draggingTodoId: String = ""
  private var draggingMode: DragMode = .move
  private var draggingInitialFrame: CGRect = .zero
  private var draggingInitialTouchInGrid: CGPoint = .zero
  private var draggingHandleTop: UIView?
  private var draggingHandleBottom: UIView?

  // 선택 모드: long-press 후 핸들이 유지되는 카드
  private var selectedTodoId: String?

  enum DragMode { case move, resizeTop, resizeBottom }

  private let gridState = MultiDayTimeGridState()
  private var hasSetUp = false

  // Constants
  private let hourHeight: CGFloat = 50
  private let timeColumnWidth: CGFloat = 40
  private let headerHeight: CGFloat = 44
  private let bufferDays: Int = 7

  // All-day lane constants
  private let allDayChipHeight: CGFloat = 16
  private let allDayChipVPad: CGFloat = 2 // 칩 사이 세로 간격
  private let allDayLaneVPad: CGFloat = 4 // 라인 위/아래 패딩
  private let allDayLaneMaxRows: Int = 3
  private let allDayLaneEmptyHeight: CGFloat = 0

  // 5-Quadrant scroll views
  private let cornerView = UIView()
  private let headerScrollView = UIScrollView()
  private let allDayCornerView = UIView()
  private let allDayScrollView = UIScrollView()
  private let timeAxisScrollView = UIScrollView()
  private let contentScrollView = UIScrollView()

  // Content containers
  private let headerContentView = UIView()
  private let allDayContentView = UIView()
  private let timeAxisContentView = UIView()
  private let gridContentView = UIView()

  // 종일 라인 동적 높이 — 칩 row 개수에 따라 갱신
  private var allDayLaneHeightConstraint: NSLayoutConstraint?
  private var allDayLaneCurrentHeight: CGFloat = 0

  // Grid layer
  private let gridLinesLayer = CAShapeLayer()

  // Current time
  private var currentTimeView: UIView?
  private var currentTimeTimer: Timer?

  // Layout tracking
  private var allDates: [String] = []
  private var columnWidth: CGFloat = 0
  private var needsInitialScroll = false
  private var isUpdatingScroll = false
  private var lastLayoutWidth: CGFloat = 0
  private var lastLayoutCenterDate: String = ""
  private var lastLayoutDayCount: Int = 0

  // Date formatters
  private let dateFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    return df
  }()
  private let dayOfWeekFormatter: DateFormatter = {
    let df = DateFormatter()
    df.locale = Locale(identifier: "ko_KR")
    df.dateFormat = "E"
    return df
  }()

  // MARK: - Prop Setters

  @objc func setDayCount(_ value: NSNumber) {
    let newVal = value.intValue
    guard newVal != gridState.dayCount else { return }
    gridState.dayCount = newVal
    requestRebuild()
  }

  @objc func setCenterDate(_ value: NSString) {
    let newDate = value as String
    let changed = gridState.centerDate != newDate
    gridState.centerDate = newDate
    if !hasSetUp {
      setupOnce()
    } else if changed {
      requestRebuild()
    }
  }

  @objc func setPrimaryColor(_ value: NSString) {
    gridState.primaryColor = value as String
    if hasSetUp { requestRebuild() }
  }

  @objc func setTodoData(_ value: NSString) {
    gridState.parseTodoData(value as String)
    if hasSetUp && bounds.width > 0 {
      layoutBlocks()
      layoutCurrentTimeLine()
    }
  }

  @objc func setEventData(_ value: NSString) {
    gridState.parseEventData(value as String)
    if hasSetUp && bounds.width > 0 {
      layoutBlocks()
      layoutCurrentTimeLine()
    }
  }

  // MARK: - Setup

  private func setupOnce() {
    guard !hasSetUp, !gridState.centerDate.isEmpty else { return }
    hasSetUp = true
    backgroundColor = .clear

    // Corner view (top-left fixed area)
    cornerView.backgroundColor = UIColor(hex: "#F9FAFB")
    addSubview(cornerView)

    // Header scroll view (horizontal only, synced to content)
    // isScrollEnabled=false: 스크롤은 contentScrollView에 동기화, 탭만 허용
    headerScrollView.backgroundColor = UIColor(hex: "#F9FAFB")
    headerScrollView.showsHorizontalScrollIndicator = false
    headerScrollView.showsVerticalScrollIndicator = false
    headerScrollView.isScrollEnabled = false
    headerScrollView.addSubview(headerContentView)
    addSubview(headerScrollView)

    // All-day corner (왼쪽 placeholder, 종일 라인 좌측)
    allDayCornerView.backgroundColor = UIColor(hex: "#F9FAFB")
    addSubview(allDayCornerView)

    // All-day scroll view (가로만, content와 동기화)
    allDayScrollView.backgroundColor = UIColor(hex: "#FAFAFA")
    allDayScrollView.showsHorizontalScrollIndicator = false
    allDayScrollView.showsVerticalScrollIndicator = false
    allDayScrollView.isScrollEnabled = false
    allDayScrollView.addSubview(allDayContentView)
    addSubview(allDayScrollView)

    // Time axis scroll view (vertical only, synced to content)
    timeAxisScrollView.backgroundColor = .clear
    timeAxisScrollView.showsHorizontalScrollIndicator = false
    timeAxisScrollView.showsVerticalScrollIndicator = false
    timeAxisScrollView.isUserInteractionEnabled = false
    timeAxisScrollView.addSubview(timeAxisContentView)
    addSubview(timeAxisScrollView)

    // Content scroll view (2D, main interaction)
    contentScrollView.backgroundColor = .white
    contentScrollView.showsHorizontalScrollIndicator = false
    contentScrollView.showsVerticalScrollIndicator = true
    contentScrollView.decelerationRate = .fast
    contentScrollView.isDirectionalLockEnabled = true
    contentScrollView.delegate = self
    contentScrollView.addSubview(gridContentView)
    addSubview(contentScrollView)

    // Grid lines layer
    gridLinesLayer.fillColor = nil
    gridLinesLayer.strokeColor = UIColor(hex: "#E5E7EB")?.cgColor
    gridLinesLayer.lineWidth = 0.5
    gridContentView.layer.addSublayer(gridLinesLayer)

    // 빈 영역 탭 → 선택 해제
    let bgTap = UITapGestureRecognizer(target: self, action: #selector(handleGridBackgroundTap(_:)))
    bgTap.cancelsTouchesInView = false
    gridContentView.addGestureRecognizer(bgTap)

    // Auto Layout
    cornerView.translatesAutoresizingMaskIntoConstraints = false
    headerScrollView.translatesAutoresizingMaskIntoConstraints = false
    allDayCornerView.translatesAutoresizingMaskIntoConstraints = false
    allDayScrollView.translatesAutoresizingMaskIntoConstraints = false
    timeAxisScrollView.translatesAutoresizingMaskIntoConstraints = false
    contentScrollView.translatesAutoresizingMaskIntoConstraints = false

    // 종일 라인 높이 동적 — 처음에는 0
    let allDayHeight = allDayScrollView.heightAnchor.constraint(equalToConstant: allDayLaneEmptyHeight)
    allDayLaneHeightConstraint = allDayHeight

    NSLayoutConstraint.activate([
      // Top-left corner (header 시간축)
      cornerView.topAnchor.constraint(equalTo: topAnchor),
      cornerView.leadingAnchor.constraint(equalTo: leadingAnchor),
      cornerView.widthAnchor.constraint(equalToConstant: timeColumnWidth),
      cornerView.heightAnchor.constraint(equalToConstant: headerHeight),

      // Header (요일/날짜)
      headerScrollView.topAnchor.constraint(equalTo: topAnchor),
      headerScrollView.leadingAnchor.constraint(equalTo: cornerView.trailingAnchor),
      headerScrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
      headerScrollView.heightAnchor.constraint(equalToConstant: headerHeight),

      // 종일 코너 (왼쪽 placeholder)
      allDayCornerView.topAnchor.constraint(equalTo: cornerView.bottomAnchor),
      allDayCornerView.leadingAnchor.constraint(equalTo: leadingAnchor),
      allDayCornerView.widthAnchor.constraint(equalToConstant: timeColumnWidth),
      allDayCornerView.heightAnchor.constraint(equalTo: allDayScrollView.heightAnchor),

      // 종일 라인 (가로 스크롤, 동적 높이)
      allDayScrollView.topAnchor.constraint(equalTo: headerScrollView.bottomAnchor),
      allDayScrollView.leadingAnchor.constraint(equalTo: allDayCornerView.trailingAnchor),
      allDayScrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
      allDayHeight,

      // 시간축
      timeAxisScrollView.topAnchor.constraint(equalTo: allDayCornerView.bottomAnchor),
      timeAxisScrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
      timeAxisScrollView.widthAnchor.constraint(equalToConstant: timeColumnWidth),
      timeAxisScrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

      // 메인 시간 그리드
      contentScrollView.topAnchor.constraint(equalTo: allDayScrollView.bottomAnchor),
      contentScrollView.leadingAnchor.constraint(equalTo: timeAxisScrollView.trailingAnchor),
      contentScrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
      contentScrollView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    needsInitialScroll = true
    startCurrentTimeTimer()
  }

  // MARK: - Layout

  override func layoutSubviews() {
    super.layoutSubviews()
    guard hasSetUp, bounds.width > 0 else { return }

    let needsRebuild = bounds.width != lastLayoutWidth
      || gridState.dayCount != lastLayoutDayCount
      || gridState.centerDate != lastLayoutCenterDate
      || needsInitialScroll

    if needsRebuild {
      lastLayoutWidth = bounds.width
      lastLayoutDayCount = gridState.dayCount
      lastLayoutCenterDate = gridState.centerDate
      rebuildGrid()
    }
  }

  private func requestRebuild() {
    needsInitialScroll = true
    setNeedsLayout()
  }

  private func rebuildGrid() {
    let contentWidth = bounds.width - timeColumnWidth
    guard contentWidth > 0, gridState.dayCount > 0 else { return }

    columnWidth = contentWidth / CGFloat(gridState.dayCount)
    allDates = gridState.allDatesInRange(buffer: bufferDays)

    let totalContentWidth = columnWidth * CGFloat(allDates.count)
    let totalContentHeight = hourHeight * 24

    // Set content sizes
    headerContentView.frame = CGRect(x: 0, y: 0, width: totalContentWidth, height: headerHeight)
    headerScrollView.contentSize = CGSize(width: totalContentWidth, height: headerHeight)

    timeAxisContentView.frame = CGRect(x: 0, y: 0, width: timeColumnWidth, height: totalContentHeight)
    timeAxisScrollView.contentSize = CGSize(width: timeColumnWidth, height: totalContentHeight)

    gridContentView.frame = CGRect(x: 0, y: 0, width: totalContentWidth, height: totalContentHeight)
    contentScrollView.contentSize = CGSize(width: totalContentWidth, height: totalContentHeight)

    layoutGridLines()
    layoutHeaders()
    layoutAllDayChips(totalContentWidth: totalContentWidth)
    layoutTimeAxis()
    layoutBlocks()
    layoutCurrentTimeLine()

    if needsInitialScroll {
      needsInitialScroll = false
      let initialX = CGFloat(bufferDays) * columnWidth
      contentScrollView.setContentOffset(
        CGPoint(x: initialX, y: contentScrollView.contentOffset.y),
        animated: false
      )
      headerScrollView.contentOffset.x = initialX
    }

    onHeightChange?(["height": bounds.height])
  }

  // MARK: - Grid Lines

  private func layoutGridLines() {
    let totalWidth = CGFloat(allDates.count) * columnWidth
    let totalHeight = hourHeight * 24
    let path = UIBezierPath()

    // Horizontal hour lines
    for hour in 0...24 {
      let y = CGFloat(hour) * hourHeight
      path.move(to: CGPoint(x: 0, y: y))
      path.addLine(to: CGPoint(x: totalWidth, y: y))
    }

    // Vertical column separators
    for col in 0...allDates.count {
      let x = CGFloat(col) * columnWidth
      path.move(to: CGPoint(x: x, y: 0))
      path.addLine(to: CGPoint(x: x, y: totalHeight))
    }

    gridLinesLayer.path = path.cgPath
    gridLinesLayer.frame = gridContentView.bounds
  }

  // MARK: - Headers

  private func layoutHeaders() {
    headerContentView.subviews.forEach { $0.removeFromSuperview() }
    headerContentView.layer.sublayers?.removeAll(where: { $0 is CALayer && $0 !== headerContentView.layer })

    let todayStr = dateFormatter.string(from: Date())
    let primaryUIColor = UIColor(hex: gridState.primaryColor) ?? .systemIndigo

    for (index, dateStr) in allDates.enumerated() {
      let x = CGFloat(index) * columnWidth
      let isToday = dateStr == todayStr

      let container = UIView(frame: CGRect(x: x, y: 0, width: columnWidth, height: headerHeight))

      // Day of week label
      let dowLabel = UILabel()
      dowLabel.text = dayOfWeekString(dateStr)
      dowLabel.font = .systemFont(ofSize: gridState.dayCount <= 3 ? 12 : 10, weight: .medium)
      dowLabel.textColor = isToday ? primaryUIColor : UIColor(hex: "#9CA3AF")
      dowLabel.textAlignment = .center
      dowLabel.frame = CGRect(x: 0, y: 4, width: columnWidth, height: 14)
      container.addSubview(dowLabel)

      // Day number label
      let numSize: CGFloat = gridState.dayCount <= 3 ? 28 : 22
      let fontSize: CGFloat = gridState.dayCount <= 3 ? 16 : 13
      let numLabel = UILabel()
      numLabel.text = dayNumberString(dateStr)
      numLabel.font = .systemFont(ofSize: fontSize, weight: isToday ? .bold : .regular)
      numLabel.textColor = isToday ? .white : UIColor(hex: "#374151")
      numLabel.textAlignment = .center
      numLabel.frame = CGRect(x: (columnWidth - numSize) / 2, y: 20, width: numSize, height: numSize)

      if isToday {
        numLabel.backgroundColor = primaryUIColor
        numLabel.layer.cornerRadius = numSize / 2
        numLabel.clipsToBounds = true
      }
      container.addSubview(numLabel)

      // Tap gesture for date selection
      container.tag = index
      let tap = UITapGestureRecognizer(target: self, action: #selector(headerTapped(_:)))
      container.addGestureRecognizer(tap)
      container.isUserInteractionEnabled = true

      headerContentView.addSubview(container)
    }

    // Bottom border
    let border = CALayer()
    border.frame = CGRect(x: 0, y: headerHeight - 0.5, width: headerContentView.frame.width, height: 0.5)
    border.backgroundColor = UIColor(hex: "#E5E7EB")?.cgColor
    headerContentView.layer.addSublayer(border)
  }

  @objc private func headerTapped(_ gesture: UITapGestureRecognizer) {
    guard let index = gesture.view?.tag, index >= 0, index < allDates.count else { return }
    onDateSelect?(["date": allDates[index]])
  }

  // MARK: - Time Axis

  private func layoutTimeAxis() {
    timeAxisContentView.subviews.forEach { $0.removeFromSuperview() }

    for hour in 0..<24 {
      let y = CGFloat(hour) * hourHeight
      let label = UILabel()
      label.text = String(format: "%02d", hour)
      label.font = .monospacedSystemFont(ofSize: 10, weight: .regular)
      label.textColor = UIColor(hex: "#9CA3AF")
      label.textAlignment = .right
      label.frame = CGRect(x: 0, y: y - 5, width: timeColumnWidth - 4, height: 14)
      timeAxisContentView.addSubview(label)
    }
  }

  // MARK: - All-Day Chips (헤더 아래 종일 라인)

  /// 종일/언제든지 todo + isAllDay event를 가로 칩으로 row-stacking 배치.
  /// 다일 종일은 [startCol, endCol] 범위를 가로 막대로 표시.
  private func layoutAllDayChips(totalContentWidth: CGFloat) {
    allDayContentView.subviews.forEach { $0.removeFromSuperview() }
    guard columnWidth > 0, !allDates.isEmpty else {
      updateAllDayLaneHeight(rows: 0, contentWidth: totalContentWidth)
      return
    }

    // 1) 종일 항목 수집 + 시작/끝 컬럼 계산
    struct AllDayItem {
      let title: String
      let color: UIColor
      let opacityBg: CGFloat
      let opacityBorder: CGFloat
      let startCol: Int
      let endCol: Int
      let id: String
      let isEvent: Bool
      let isCompleted: Bool
    }

    var items: [AllDayItem] = []
    var seenTodoIds = Set<String>()  // 다일 todo가 여러 날짜 키에 중복 등장하므로 dedupe

    for (dateIndex, dateStr) in allDates.enumerated() {
      let todos = gridState.todoMap[dateStr] ?? []
      let events = gridState.eventMap[dateStr] ?? []

      for todo in todos {
        let isAnytime = todo.scheduleType == "anytime" || todo.startTime == nil
        let isMultiDayAllDay = todo.scheduleType == "all_day"
        guard isAnytime || isMultiDayAllDay else { continue }

        // 다일 종일은 1번만 (가로 막대로 컬럼 걸침). 언제든지는 매 날짜에 별도 칩.
        if isMultiDayAllDay {
          if seenTodoIds.contains(todo.id) { continue }
          seenTodoIds.insert(todo.id)
        }

        // start_time/end_time 으로 보이는 범위 안에서 [startCol, endCol] 산출
        let (sCol, eCol) = columnRange(
          startISO: todo.startTime,
          endISO: todo.endTime,
          fallbackDateIndex: dateIndex,
          isAnytime: isAnytime
        )
        let color = UIColor(hex: todo.projectColor) ?? .systemIndigo
        items.append(AllDayItem(
          title: todo.title,
          color: color,
          opacityBg: todo.completed ? 0.06 : 0.18,
          opacityBorder: 0.4,
          startCol: sCol,
          endCol: eCol,
          id: todo.id,
          isEvent: false,
          isCompleted: todo.completed
        ))
      }

      for event in events where event.isAllDay {
        if seenTodoIds.contains("event:" + event.id) { continue }
        seenTodoIds.insert("event:" + event.id)
        let (sCol, eCol) = columnRange(
          startISO: event.start,
          endISO: event.end,
          fallbackDateIndex: dateIndex,
          isAnytime: false
        )
        let color = UIColor(hex: event.color) ?? .systemBlue
        items.append(AllDayItem(
          title: event.title,
          color: color,
          opacityBg: 0.7,
          opacityBorder: 0.0,
          startCol: sCol,
          endCol: eCol,
          id: event.id,
          isEvent: true,
          isCompleted: false
        ))
      }
    }

    // 2) row-stacking — 시작 컬럼 기준 정렬 후 row의 lastEndCol 추적
    let sorted = items.sorted { a, b in
      a.startCol == b.startCol ? a.endCol < b.endCol : a.startCol < b.startCol
    }
    var rowEnds: [Int] = []  // 각 row가 마지막으로 점유한 endCol
    var rowAssign: [Int] = Array(repeating: 0, count: sorted.count)
    for (i, item) in sorted.enumerated() {
      var placed = false
      for (rowIdx, end) in rowEnds.enumerated() {
        if item.startCol > end {
          rowAssign[i] = rowIdx
          rowEnds[rowIdx] = item.endCol
          placed = true
          break
        }
      }
      if !placed {
        rowAssign[i] = rowEnds.count
        rowEnds.append(item.endCol)
      }
    }

    let rowCount = min(rowEnds.count, allDayLaneMaxRows)
    let rowHeight = allDayChipHeight + allDayChipVPad

    // 3) 칩 view 렌더 (maxRows 초과는 무시)
    for (i, item) in sorted.enumerated() {
      let row = rowAssign[i]
      if row >= allDayLaneMaxRows { continue }
      let x = CGFloat(item.startCol) * columnWidth + 2
      let width = CGFloat(item.endCol - item.startCol + 1) * columnWidth - 4
      let y = allDayLaneVPad + CGFloat(row) * rowHeight
      let chip = _makeAllDayChip(
        title: item.title,
        color: item.color,
        opacityBg: item.opacityBg,
        opacityBorder: item.opacityBorder,
        width: max(width, 8),
        height: allDayChipHeight,
        itemId: item.id,
        isEvent: item.isEvent,
        isCompleted: item.isCompleted
      )
      chip.frame = CGRect(x: x, y: y, width: max(width, 8), height: allDayChipHeight)
      allDayContentView.addSubview(chip)
    }

    updateAllDayLaneHeight(rows: rowCount, contentWidth: totalContentWidth)
  }

  /// allDays 인덱스에서 종일 항목의 [startCol, endCol] 산출 (보이는 범위로 clamp)
  /// isAnytime이면 매 날짜에 단일 컬럼 칩이 그려지도록 fallbackDateIndex만 사용.
  private func columnRange(
    startISO: String?,
    endISO: String?,
    fallbackDateIndex: Int,
    isAnytime: Bool
  ) -> (Int, Int) {
    let lastIdx = max(allDates.count - 1, 0)

    if isAnytime {
      let col = max(0, min(fallbackDateIndex, lastIdx))
      return (col, col)
    }

    // start
    var startCol = fallbackDateIndex
    if let s = startISO, let date = parseISODate(s) {
      let dateStr = dateFormatter.string(from: date)
      if let idx = allDates.firstIndex(of: dateStr) {
        startCol = idx
      }
    }
    // end (inclusive end가 그 날 23:59:59이므로 그 날 컬럼까지 포함)
    var endCol = startCol
    if let e = endISO, let date = parseISODate(e) {
      let dateStr = dateFormatter.string(from: date)
      if let idx = allDates.firstIndex(of: dateStr) {
        endCol = idx
      }
    }
    if endCol < startCol { endCol = startCol }
    startCol = max(0, min(startCol, lastIdx))
    endCol = max(0, min(endCol, lastIdx))
    return (startCol, endCol)
  }

  private func parseISODate(_ s: String) -> Date? {
    return MultiDayTimeUtils.isoFrac.date(from: s) ?? MultiDayTimeUtils.isoNoFrac.date(from: s)
  }

  private func _makeAllDayChip(
    title: String,
    color: UIColor,
    opacityBg: CGFloat,
    opacityBorder: CGFloat,
    width: CGFloat,
    height: CGFloat,
    itemId: String,
    isEvent: Bool,
    isCompleted: Bool
  ) -> UIView {
    let view = UIView()
    view.backgroundColor = color.withAlphaComponent(opacityBg)
    view.layer.cornerRadius = 3
    if opacityBorder > 0 {
      view.layer.borderColor = color.withAlphaComponent(opacityBorder).cgColor
      view.layer.borderWidth = 0.5
    }
    view.clipsToBounds = true

    let label = UILabel()
    let fontSize: CGFloat = gridState.dayCount <= 3 ? 10 : 9
    if isCompleted {
      label.attributedText = NSAttributedString(string: title, attributes: [
        .strikethroughStyle: NSUnderlineStyle.single.rawValue,
        .font: UIFont.systemFont(ofSize: fontSize, weight: .medium),
        .foregroundColor: UIColor(hex: "#9CA3AF") ?? .gray,
      ])
    } else {
      label.text = title
      label.font = .systemFont(ofSize: fontSize, weight: .medium)
      label.textColor = isEvent ? .white : UIColor(hex: "#1F2937")
    }
    label.numberOfLines = 1
    label.lineBreakMode = .byTruncatingTail
    label.frame = CGRect(x: 4, y: 0, width: width - 8, height: height)
    view.addSubview(label)

    if !isEvent {
      let tap = TodoTapGesture(target: self, action: #selector(todoTapped(_:)))
      tap.todoId = itemId
      view.addGestureRecognizer(tap)
      view.isUserInteractionEnabled = true
    }
    return view
  }

  /// row 개수에 따라 allDay 라인 높이 갱신
  private func updateAllDayLaneHeight(rows: Int, contentWidth: CGFloat) {
    let chipsHeight = CGFloat(rows) * (allDayChipHeight + allDayChipVPad)
    let height: CGFloat = rows == 0 ? allDayLaneEmptyHeight : (chipsHeight + allDayLaneVPad * 2)

    if abs(height - allDayLaneCurrentHeight) > 0.5 {
      allDayLaneCurrentHeight = height
      allDayLaneHeightConstraint?.constant = height
      setNeedsLayout()
    }

    allDayContentView.frame = CGRect(x: 0, y: 0, width: contentWidth, height: height)
    allDayScrollView.contentSize = CGSize(width: contentWidth, height: height)
  }

  // MARK: - Blocks (Todos + Events)

  private func layoutBlocks() {
    // Remove existing block views (keep gridLinesLayer on the layer)
    gridContentView.subviews.forEach { $0.removeFromSuperview() }
    currentTimeView = nil

    guard columnWidth > 0 else { return }

    for (index, dateStr) in allDates.enumerated() {
      let x = CGFloat(index) * columnWidth
      let todos = gridState.todoMap[dateStr] ?? []
      let events = gridState.eventMap[dateStr] ?? []

      // Todo blocks — timed만 시간 그리드에 표시 (all_day/anytime은 종일 라인으로)
      for todo in todos where todo.startTime != nil
        && todo.scheduleType != "all_day"
        && todo.scheduleType != "anytime" {
        let pos = blockPosition(startTime: todo.startTime, endTime: todo.endTime)
        let h = max(pos.height, 18)
        let blockView = makeTodoBlock(todo: todo, width: columnWidth - 4, height: h)
        blockView.frame = CGRect(x: x + 2, y: pos.topOffset, width: columnWidth - 4, height: h)
        gridContentView.addSubview(blockView)

        // 이전에 선택된 카드면 selected UI 즉시 복원 (data 갱신으로 layoutBlocks 재호출 시)
        if todo.id == selectedTodoId {
          applySelectionUI(to: blockView, animated: false)
        }
      }

      // Event blocks — 시간 지정 이벤트만
      for event in events where !event.isAllDay && event.start != nil {
        let pos = blockPosition(startTime: event.start, endTime: event.end)
        let h = max(pos.height, 18)
        let blockView = makeEventBlock(event: event, width: columnWidth - 4, height: h)
        blockView.frame = CGRect(x: x + 2, y: pos.topOffset, width: columnWidth - 4, height: h)
        gridContentView.addSubview(blockView)
      }
    }
  }

  private func makeTodoBlock(todo: DayGridTodoItem, width: CGFloat, height: CGFloat) -> UIView {
    let view = UIView()
    let bgColor = UIColor(hex: todo.projectColor) ?? .systemIndigo
    view.backgroundColor = bgColor.withAlphaComponent(todo.completed ? 0.05 : 0.15)
    view.layer.cornerRadius = 3
    view.layer.borderColor = bgColor.withAlphaComponent(0.3).cgColor
    view.layer.borderWidth = 0.5
    // 핸들 점이 카드 밖으로 튀어나와도 보이도록 clipsToBounds=false
    // (텍스트 label은 자체 frame 폭으로 잘림 처리됨)
    view.clipsToBounds = false

    let label = UILabel()
    let fontSize: CGFloat = gridState.dayCount <= 3 ? 10 : 8
    if todo.completed {
      let attr = NSAttributedString(string: todo.title, attributes: [
        .strikethroughStyle: NSUnderlineStyle.single.rawValue,
        .font: UIFont.systemFont(ofSize: fontSize, weight: .medium),
        .foregroundColor: UIColor(hex: "#9CA3AF") ?? UIColor.gray,
      ])
      label.attributedText = attr
    } else {
      label.text = todo.title
      label.font = .systemFont(ofSize: fontSize, weight: .medium)
      label.textColor = UIColor(hex: "#1F2937")
    }
    label.numberOfLines = gridState.dayCount <= 3 ? 2 : 1
    label.frame = CGRect(x: 2, y: 1, width: width - 4, height: height - 2)
    view.addSubview(label)

    // Tap gesture (편집 시트 오픈)
    let tap = TodoTapGesture(target: self, action: #selector(todoTapped(_:)))
    tap.todoId = todo.id
    view.addGestureRecognizer(tap)

    // Long-press gesture (move/resize)
    let lp = TodoLongPressGesture(target: self, action: #selector(handleTodoLongPress(_:)))
    lp.minimumPressDuration = 0.4
    lp.todoId = todo.id
    tap.require(toFail: lp)
    view.addGestureRecognizer(lp)

    // 위/아래 핸들 (평소 alpha 0, long-press 시 fade-in)
    let handleTop = makeHandleDot(color: bgColor)
    handleTop.frame = CGRect(x: width / 2 - 4, y: -4, width: 8, height: 8)
    handleTop.tag = 9001
    handleTop.alpha = 0
    view.addSubview(handleTop)

    let handleBottom = makeHandleDot(color: bgColor)
    handleBottom.frame = CGRect(x: width / 2 - 4, y: height - 4, width: 8, height: 8)
    handleBottom.tag = 9002
    handleBottom.alpha = 0
    view.addSubview(handleBottom)

    view.isUserInteractionEnabled = true
    return view
  }

  private func makeHandleDot(color: UIColor) -> UIView {
    let dot = UIView()
    dot.backgroundColor = color
    dot.layer.cornerRadius = 4
    dot.layer.borderWidth = 1.5
    dot.layer.borderColor = UIColor.white.cgColor
    return dot
  }

  private func makeEventBlock(event: DayGridEventItem, width: CGFloat, height: CGFloat) -> UIView {
    let view = UIView()
    let bgColor = UIColor(hex: event.color) ?? .systemBlue
    view.backgroundColor = bgColor.withAlphaComponent(0.15)
    view.layer.cornerRadius = 3
    view.clipsToBounds = true

    let label = UILabel()
    label.text = event.title
    label.font = .systemFont(ofSize: gridState.dayCount <= 3 ? 10 : 8, weight: .medium)
    label.textColor = UIColor(hex: "#1F2937")
    label.numberOfLines = gridState.dayCount <= 3 ? 2 : 1
    label.frame = CGRect(x: 2, y: 1, width: width - 4, height: height - 2)
    view.addSubview(label)

    return view
  }

  @objc private func todoTapped(_ gesture: TodoTapGesture) {
    onTodoPress?(["todoId": gesture.todoId])
  }

  // MARK: - Long-press Drag (move + resize)

  @objc private func handleTodoLongPress(_ g: TodoLongPressGesture) {
    guard let card = g.view else { return }
    let touchInGrid = g.location(in: gridContentView)

    switch g.state {
    case .began:
      // 다른 카드가 선택 중이면 그 카드 핸들/강조 해제
      if selectedTodoId != nil && selectedTodoId != g.todoId {
        clearSelection()
      }

      // 시작 위치로 mode 결정 — 카드 내부 좌표
      let touchInCard = g.location(in: card)
      let edge: CGFloat = 10
      if touchInCard.y < edge {
        draggingMode = .resizeTop
      } else if touchInCard.y > card.bounds.height - edge {
        draggingMode = .resizeBottom
      } else {
        draggingMode = .move
      }
      draggingCard = card
      draggingTodoId = g.todoId
      selectedTodoId = g.todoId
      draggingInitialFrame = card.frame
      draggingInitialTouchInGrid = touchInGrid

      // 핸들 fade-in + 카드 강조 (선택 모드 진입)
      let handleTop = card.viewWithTag(9001)
      let handleBottom = card.viewWithTag(9002)
      draggingHandleTop = handleTop
      draggingHandleBottom = handleBottom

      gridContentView.bringSubviewToFront(card)
      contentScrollView.isScrollEnabled = false

      applySelectionUI(to: card, animated: true)

      let gen = UIImpactFeedbackGenerator(style: .medium)
      gen.impactOccurred()

    case .changed:
      let dx = touchInGrid.x - draggingInitialTouchInGrid.x
      let dy = touchInGrid.y - draggingInitialTouchInGrid.y
      var newFrame = draggingInitialFrame

      switch draggingMode {
      case .move:
        newFrame.origin.x += dx
        newFrame.origin.y += dy
      case .resizeTop:
        let newY = draggingInitialFrame.origin.y + dy
        let maxY = draggingInitialFrame.maxY - 18
        newFrame.origin.y = min(maxY, max(0, newY))
        newFrame.size.height = draggingInitialFrame.maxY - newFrame.origin.y
      case .resizeBottom:
        newFrame.size.height = max(18, draggingInitialFrame.size.height + dy)
      }

      // 그리드 영역 내로 clamping
      newFrame.origin.x = max(0, min(newFrame.origin.x, gridContentView.bounds.width - newFrame.width))
      newFrame.origin.y = max(0, min(newFrame.origin.y, gridContentView.bounds.height - newFrame.height))

      card.frame = newFrame

    case .ended, .cancelled, .failed:
      let frame = card.frame

      // 컬럼/시간 매핑 (snap)
      let snapMinutes: CGFloat = 5
      let yToMinutes: (CGFloat) -> CGFloat = { y in
        let mins = y / self.hourHeight * 60
        return round(mins / snapMinutes) * snapMinutes
      }

      var startMinutes: CGFloat = 0
      var endMinutes: CGFloat = 0
      var colIndex = Int(round(frame.origin.x / max(self.columnWidth, 1)))

      switch draggingMode {
      case .move:
        startMinutes = yToMinutes(frame.origin.y)
        let dur = draggingInitialFrame.height / self.hourHeight * 60
        endMinutes = startMinutes + dur
      case .resizeTop:
        // 컬럼은 변경 안 됨
        colIndex = Int(round(draggingInitialFrame.origin.x / max(self.columnWidth, 1)))
        startMinutes = yToMinutes(frame.origin.y)
        endMinutes = round(draggingInitialFrame.maxY / self.hourHeight * 60 / snapMinutes) * snapMinutes
      case .resizeBottom:
        colIndex = Int(round(draggingInitialFrame.origin.x / max(self.columnWidth, 1)))
        startMinutes = round(draggingInitialFrame.origin.y / self.hourHeight * 60 / snapMinutes) * snapMinutes
        endMinutes = yToMinutes(frame.maxY)
      }

      // 컬럼 범위 clamp
      colIndex = max(0, min(colIndex, allDates.count - 1))
      // 시간 범위 clamp
      startMinutes = max(0, min(startMinutes, 24 * 60 - 5))
      endMinutes = max(startMinutes + 5, min(endMinutes, 24 * 60))

      // ISO 변환
      let dateStr = allDates[colIndex]
      // 원본 occurrence 날짜 — drag 시작 시점의 컬럼
      let initialColIndex = max(0, min(
        Int(round(draggingInitialFrame.origin.x / max(self.columnWidth, 1))),
        allDates.count - 1
      ))
      let originalDate = allDates[initialColIndex]

      if let startISO = isoStringFor(dateStr: dateStr, minutes: startMinutes),
         let endISO = isoStringFor(dateStr: dateStr, minutes: endMinutes) {
        onTodoEdit?([
          "id": draggingTodoId,
          "start_time": startISO,
          "end_time": endISO,
          "original_date": originalDate,
        ])
      }

      // 선택 모드 유지 — 핸들/transform/shadow 그대로
      contentScrollView.isScrollEnabled = true
      draggingCard = nil

    default: break
    }
  }

  /// 선택 UI 적용 (핸들 fade-in, transform, shadow)
  private func applySelectionUI(to card: UIView, animated: Bool) {
    let handleTop = card.viewWithTag(9001)
    let handleBottom = card.viewWithTag(9002)
    let block: () -> Void = {
      handleTop?.alpha = 1
      handleBottom?.alpha = 1
      card.transform = CGAffineTransform(scaleX: 1.04, y: 1.04)
      card.layer.shadowColor = UIColor.black.cgColor
      card.layer.shadowOffset = CGSize(width: 0, height: 4)
      card.layer.shadowOpacity = 0.2
      card.layer.shadowRadius = 6
    }
    if animated {
      UIView.animate(withDuration: 0.15, animations: block)
    } else {
      block()
    }
  }

  @objc private func handleGridBackgroundTap(_ g: UITapGestureRecognizer) {
    // 카드 위 탭은 카드의 TapGesture가 처리 — 이 핸들러는 빈 영역만
    let loc = g.location(in: gridContentView)
    for sub in gridContentView.subviews {
      if sub.frame.contains(loc) { return }
    }
    if selectedTodoId != nil { clearSelection() }
  }

  /// 현재 선택 해제 — 핸들 fade-out, transform/shadow 복원
  private func clearSelection() {
    selectedTodoId = nil
    // gridContentView의 모든 카드를 순회해 핸들이 떠 있는 카드 복원
    for sub in gridContentView.subviews {
      if let handleTop = sub.viewWithTag(9001), handleTop.alpha > 0 {
        UIView.animate(withDuration: 0.15) {
          handleTop.alpha = 0
          sub.viewWithTag(9002)?.alpha = 0
          sub.transform = .identity
          sub.layer.shadowOpacity = 0
        }
      }
    }
    draggingHandleTop = nil
    draggingHandleBottom = nil
  }

  /// `dateStr`(yyyy-MM-dd)와 분 단위 시간을 ISO8601 문자열로 변환
  private func isoStringFor(dateStr: String, minutes: CGFloat) -> String? {
    guard let day = dateFormatter.date(from: dateStr) else { return nil }
    let hour = Int(minutes) / 60
    let minute = Int(minutes) % 60
    var comps = Calendar.current.dateComponents([.year, .month, .day], from: day)
    comps.hour = hour
    comps.minute = minute
    comps.second = 0
    guard let date = Calendar.current.date(from: comps) else { return nil }
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f.string(from: date)
  }

  // MARK: - Current Time Line

  private func layoutCurrentTimeLine() {
    currentTimeView?.removeFromSuperview()
    currentTimeView = nil

    let todayStr = dateFormatter.string(from: Date())
    guard let todayIndex = allDates.firstIndex(of: todayStr) else { return }

    let cal = Calendar.current
    let comps = cal.dateComponents([.hour, .minute], from: Date())
    let minutes = CGFloat(comps.hour ?? 0) * 60 + CGFloat(comps.minute ?? 0)
    let y = minutes / 60.0 * hourHeight

    let x = CGFloat(todayIndex) * columnWidth

    let container = UIView(frame: CGRect(x: x - 3, y: y - 3, width: columnWidth + 6, height: 7))
    container.isUserInteractionEnabled = false

    // Red circle
    let circle = UIView(frame: CGRect(x: 0, y: 0.5, width: 6, height: 6))
    circle.backgroundColor = .red
    circle.layer.cornerRadius = 3
    container.addSubview(circle)

    // Red line
    let line = UIView(frame: CGRect(x: 3, y: 2.5, width: columnWidth, height: 1))
    line.backgroundColor = .red
    container.addSubview(line)

    gridContentView.addSubview(container)
    currentTimeView = container
  }

  // MARK: - UIScrollViewDelegate

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    guard scrollView === contentScrollView, !isUpdatingScroll else { return }
    isUpdatingScroll = true
    headerScrollView.contentOffset.x = scrollView.contentOffset.x
    allDayScrollView.contentOffset.x = scrollView.contentOffset.x
    timeAxisScrollView.contentOffset.y = scrollView.contentOffset.y
    isUpdatingScroll = false
  }

  func scrollViewWillEndDragging(
    _ scrollView: UIScrollView,
    withVelocity velocity: CGPoint,
    targetContentOffset: UnsafeMutablePointer<CGPoint>
  ) {
    guard scrollView === contentScrollView, columnWidth > 0 else { return }
    let nearestCol = round(targetContentOffset.pointee.x / columnWidth)
    targetContentOffset.pointee.x = nearestCol * columnWidth
  }

  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
    guard scrollView === contentScrollView else { return }
    reportVisibleRange()
  }

  func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
    guard scrollView === contentScrollView, !decelerate else { return }
    reportVisibleRange()
  }

  private func reportVisibleRange() {
    guard columnWidth > 0 else { return }
    let firstVisibleCol = Int(round(contentScrollView.contentOffset.x / columnWidth))
    let lastVisibleCol = firstVisibleCol + gridState.dayCount - 1

    guard firstVisibleCol >= 0, lastVisibleCol < allDates.count else { return }
    let startDate = allDates[firstVisibleCol]
    let endDate = allDates[lastVisibleCol]
    onDateRangeChange?(["startDate": startDate, "endDate": endDate])
  }

  // MARK: - Helpers

  private func blockPosition(startTime: String?, endTime: String?) -> (topOffset: CGFloat, height: CGFloat) {
    guard let startStr = startTime else { return (0, 18) }

    let startMinutes = MultiDayTimeUtils.minutesFromTimeString(startStr)
    let endMinutes: CGFloat
    if let endStr = endTime {
      endMinutes = MultiDayTimeUtils.minutesFromTimeString(endStr)
    } else {
      endMinutes = startMinutes + 30
    }

    let topOffset = startMinutes / 60.0 * hourHeight
    let height = max((endMinutes - startMinutes) / 60.0 * hourHeight, 18)
    return (topOffset, height)
  }

  private func dayOfWeekString(_ dateStr: String) -> String {
    guard let date = dateFormatter.date(from: dateStr) else { return "" }
    return dayOfWeekFormatter.string(from: date)
  }

  private func dayNumberString(_ dateStr: String) -> String {
    guard let date = dateFormatter.date(from: dateStr) else { return "" }
    return "\(Calendar.current.component(.day, from: date))"
  }

  private func startCurrentTimeTimer() {
    currentTimeTimer?.invalidate()
    currentTimeTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
      DispatchQueue.main.async {
        self?.layoutCurrentTimeLine()
      }
    }
  }

  deinit {
    currentTimeTimer?.invalidate()
  }
}

// MARK: - RCTViewManager

@objc(NativeMultiDayTimeGridManager)
class NativeMultiDayTimeGridManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeMultiDayTimeGridUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
