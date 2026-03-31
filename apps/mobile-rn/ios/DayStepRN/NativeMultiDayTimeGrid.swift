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

// MARK: - 4-Quadrant Grid View

class NativeMultiDayTimeGridUIView: UIView, UIScrollViewDelegate {

  // RCT callbacks
  @objc var onDateSelect: RCTDirectEventBlock?
  @objc var onTodoPress: RCTDirectEventBlock?
  @objc var onDateRangeChange: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let gridState = MultiDayTimeGridState()
  private var hasSetUp = false

  // Constants
  private let hourHeight: CGFloat = 50
  private let timeColumnWidth: CGFloat = 40
  private let headerHeight: CGFloat = 44
  private let bufferDays: Int = 7

  // 4-Quadrant scroll views
  private let cornerView = UIView()
  private let headerScrollView = UIScrollView()
  private let timeAxisScrollView = UIScrollView()
  private let contentScrollView = UIScrollView()

  // Content containers
  private let headerContentView = UIView()
  private let timeAxisContentView = UIView()
  private let gridContentView = UIView()

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

    // Auto Layout
    cornerView.translatesAutoresizingMaskIntoConstraints = false
    headerScrollView.translatesAutoresizingMaskIntoConstraints = false
    timeAxisScrollView.translatesAutoresizingMaskIntoConstraints = false
    contentScrollView.translatesAutoresizingMaskIntoConstraints = false

    NSLayoutConstraint.activate([
      cornerView.topAnchor.constraint(equalTo: topAnchor),
      cornerView.leadingAnchor.constraint(equalTo: leadingAnchor),
      cornerView.widthAnchor.constraint(equalToConstant: timeColumnWidth),
      cornerView.heightAnchor.constraint(equalToConstant: headerHeight),

      headerScrollView.topAnchor.constraint(equalTo: topAnchor),
      headerScrollView.leadingAnchor.constraint(equalTo: cornerView.trailingAnchor),
      headerScrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
      headerScrollView.heightAnchor.constraint(equalToConstant: headerHeight),

      timeAxisScrollView.topAnchor.constraint(equalTo: cornerView.bottomAnchor),
      timeAxisScrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
      timeAxisScrollView.widthAnchor.constraint(equalToConstant: timeColumnWidth),
      timeAxisScrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

      contentScrollView.topAnchor.constraint(equalTo: headerScrollView.bottomAnchor),
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

      // Todo blocks
      for todo in todos where todo.startTime != nil {
        let pos = blockPosition(startTime: todo.startTime, endTime: todo.endTime)
        let h = max(pos.height, 18)
        let blockView = makeTodoBlock(todo: todo, width: columnWidth - 4, height: h)
        blockView.frame = CGRect(x: x + 2, y: pos.topOffset, width: columnWidth - 4, height: h)
        gridContentView.addSubview(blockView)
      }

      // Event blocks
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
    view.clipsToBounds = true

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

    // Tap gesture
    let tap = TodoTapGesture(target: self, action: #selector(todoTapped(_:)))
    tap.todoId = todo.id
    view.addGestureRecognizer(tap)
    view.isUserInteractionEnabled = true

    return view
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
