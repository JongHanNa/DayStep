/**
 * NativeMultiDayTimeGrid — 3일/주 뷰 시간 그리드
 * dayCount개 컬럼의 시간 그리드 + 좌우 스와이프
 *
 * 패턴: ObservableObject + setupOnce() (NativeWeekStripCalendar 참조)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Observable State

class MultiDayTimeGridState: ObservableObject {
  @Published var dayCount: Int = 3
  @Published var centerDate: String = ""
  @Published var primaryColor: String = "#6366F1"
  @Published var todoMap: [String: [DayGridTodoItem]] = [:]
  @Published var eventMap: [String: [DayGridEventItem]] = [:]

  private let decoder = JSONDecoder()

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

  // 중심 날짜 기준 dayCount개 날짜 배열 반환
  func dateRange() -> [String] {
    let calendar = Calendar.current
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"

    guard let center = df.date(from: centerDate) else { return [] }

    let startOffset = -(dayCount / 2)
    var dates: [String] = []
    for i in 0..<dayCount {
      if let date = calendar.date(byAdding: .day, value: startOffset + i, to: center) {
        dates.append(df.string(from: date))
      }
    }
    return dates
  }
}

// MARK: - SwiftUI View

@available(iOS 17.0, *)
struct MultiDayTimeGridContent: View {
  @ObservedObject var state: MultiDayTimeGridState
  @State private var currentTime = Date()

  var onDateSelect: ((String) -> Void)?
  var onTodoPress: ((String) -> Void)?
  var onDateRangeChange: ((String, String) -> Void)?

  private let hourHeight: CGFloat = 50
  private let timeColumnWidth: CGFloat = 40
  private let calendar = Calendar.current

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

  var body: some View {
    let dates = state.dateRange()

    VStack(spacing: 0) {
      // 상단 헤더: 날짜 행
      headerView(dates: dates)

      // 시간 그리드
      ScrollView(.vertical, showsIndicators: true) {
        ZStack(alignment: .topLeading) {
          // 시간 행 배경 + 컬럼 구분
          timeGridBackground(columnCount: dates.count)

          // 각 컬럼별 할일/이벤트
          ForEach(Array(dates.enumerated()), id: \.offset) { colIndex, dateStr in
            columnBlocks(dateStr: dateStr, colIndex: colIndex, totalColumns: dates.count)
          }

          // 현재 시각 라인
          currentTimeLine
        }
        .frame(height: hourHeight * 24)
      }
    }
    .gesture(
      DragGesture(minimumDistance: 50)
        .onEnded { value in
          if value.translation.width < -50 {
            navigatePeriod(1)
          } else if value.translation.width > 50 {
            navigatePeriod(-1)
          }
        }
    )
    .onAppear { startTimer() }
  }

  // MARK: - Header

  private func headerView(dates: [String]) -> some View {
    HStack(spacing: 0) {
      // 시간 컬럼 빈 공간
      Color.clear
        .frame(width: timeColumnWidth)

      ForEach(Array(dates.enumerated()), id: \.offset) { _, dateStr in
        let isToday = dateStr == dateFormatter.string(from: Date())

        VStack(spacing: 2) {
          // 요일
          Text(dayOfWeekString(dateStr))
            .font(.system(size: state.dayCount <= 3 ? 12 : 10, weight: .medium))
            .foregroundColor(isToday ? Color(hex: state.primaryColor) : Color(hex: "#9CA3AF"))

          // 일자
          Text(dayNumberString(dateStr))
            .font(.system(size: state.dayCount <= 3 ? 16 : 13, weight: isToday ? .bold : .regular))
            .foregroundColor(isToday ? .white : Color(hex: "#374151"))
            .frame(width: state.dayCount <= 3 ? 28 : 22, height: state.dayCount <= 3 ? 28 : 22)
            .background(
              isToday ? Circle().fill(Color(hex: state.primaryColor)) : nil
            )
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .onTapGesture {
          onDateSelect?(dateStr)
        }
      }
    }
    .background(Color(hex: "#F9FAFB"))
  }

  // MARK: - Time Grid Background

  private func timeGridBackground(columnCount: Int) -> some View {
    VStack(spacing: 0) {
      ForEach(0..<24, id: \.self) { hour in
        HStack(alignment: .top, spacing: 0) {
          Text(String(format: "%02d", hour))
            .font(.system(size: 10, weight: .regular, design: .monospaced))
            .foregroundColor(Color(hex: "#9CA3AF"))
            .frame(width: timeColumnWidth, alignment: .trailing)
            .padding(.trailing, 4)
            .offset(y: -5)

          VStack(spacing: 0) {
            Divider().background(Color(hex: "#E5E7EB"))
            Spacer()
          }
        }
        .frame(height: hourHeight)
      }
    }
  }

  // MARK: - Column Blocks

  private func columnBlocks(dateStr: String, colIndex: Int, totalColumns: Int) -> some View {
    let todos = state.todoMap[dateStr] ?? []
    let events = state.eventMap[dateStr] ?? []
    let columnWidth = (UIScreen.main.bounds.width - timeColumnWidth) / CGFloat(totalColumns)
    let xOffset = timeColumnWidth + columnWidth * CGFloat(colIndex)

    return ZStack(alignment: .topLeading) {
      // 할일 블록
      ForEach(todos.filter { $0.startTime != nil }) { todo in
        let pos = blockPosition(startTime: todo.startTime, endTime: todo.endTime)

        Button(action: { onTodoPress?(todo.id) }) {
          VStack(alignment: .leading, spacing: 0) {
            Text(todo.title)
              .font(.system(size: totalColumns <= 3 ? 10 : 8, weight: .medium))
              .foregroundColor(todo.completed ? Color(hex: "#9CA3AF") : Color(hex: "#1F2937"))
              .strikethrough(todo.completed)
              .lineLimit(totalColumns <= 3 ? 2 : 1)
          }
          .padding(2)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(Color(hex: todo.projectColor).opacity(todo.completed ? 0.05 : 0.15))
          .cornerRadius(3)
          .overlay(
            RoundedRectangle(cornerRadius: 3)
              .stroke(Color(hex: todo.projectColor).opacity(0.3), lineWidth: 0.5)
          )
        }
        .buttonStyle(.plain)
        .frame(width: columnWidth - 4, height: max(pos.height, 18))
        .offset(x: xOffset + 2, y: pos.topOffset)
      }

      // 이벤트 블록
      ForEach(events.filter { !$0.isAllDay && $0.start != nil }) { event in
        let pos = blockPosition(startTime: event.start, endTime: event.end)

        VStack(alignment: .leading, spacing: 0) {
          Text(event.title)
            .font(.system(size: totalColumns <= 3 ? 10 : 8, weight: .medium))
            .foregroundColor(Color(hex: "#1F2937"))
            .lineLimit(totalColumns <= 3 ? 2 : 1)
        }
        .padding(2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: event.color).opacity(0.15))
        .cornerRadius(3)
        .frame(width: columnWidth - 4, height: max(pos.height, 18))
        .offset(x: xOffset + 2, y: pos.topOffset)
      }
    }
  }

  // MARK: - Current Time Line

  private var currentTimeLine: some View {
    let todayStr = dateFormatter.string(from: Date())
    let dates = state.dateRange()
    let isVisible = dates.contains(todayStr)

    return Group {
      if isVisible {
        let components = calendar.dateComponents([.hour, .minute], from: currentTime)
        let minutes = CGFloat(components.hour ?? 0) * 60 + CGFloat(components.minute ?? 0)
        let topOffset = minutes / 60.0 * hourHeight

        HStack(spacing: 0) {
          Color.clear.frame(width: timeColumnWidth - 4)
          Circle()
            .fill(Color.red)
            .frame(width: 6, height: 6)
          Rectangle()
            .fill(Color.red)
            .frame(height: 1)
        }
        .offset(y: topOffset - 3)
      }
    }
  }

  // MARK: - Helpers

  private func blockPosition(startTime: String?, endTime: String?) -> (topOffset: CGFloat, height: CGFloat) {
    guard let startStr = startTime else { return (0, 18) }

    let startMinutes = minutesFromTimeString(startStr)
    let endMinutes: CGFloat
    if let endStr = endTime {
      endMinutes = minutesFromTimeString(endStr)
    } else {
      endMinutes = startMinutes + 30
    }

    let topOffset = startMinutes / 60.0 * hourHeight
    let height = max((endMinutes - startMinutes) / 60.0 * hourHeight, 18)
    return (topOffset, height)
  }

  private func minutesFromTimeString(_ timeStr: String) -> CGFloat {
    let components: [String]
    if timeStr.contains("T") {
      let timePart = timeStr.components(separatedBy: "T").last ?? "00:00"
      components = timePart.prefix(5).components(separatedBy: ":")
    } else {
      components = timeStr.prefix(5).components(separatedBy: ":")
    }

    guard components.count >= 2,
          let hour = Double(components[0]),
          let minute = Double(components[1]) else { return 0 }
    return CGFloat(hour * 60 + minute)
  }

  private func dayOfWeekString(_ dateStr: String) -> String {
    guard let date = dateFormatter.date(from: dateStr) else { return "" }
    return dayOfWeekFormatter.string(from: date)
  }

  private func dayNumberString(_ dateStr: String) -> String {
    guard let date = dateFormatter.date(from: dateStr) else { return "" }
    return "\(calendar.component(.day, from: date))"
  }

  private func navigatePeriod(_ direction: Int) {
    guard let center = dateFormatter.date(from: state.centerDate),
          let newCenter = calendar.date(byAdding: .day, value: state.dayCount * direction, to: center) else { return }

    let newCenterStr = dateFormatter.string(from: newCenter)
    state.centerDate = newCenterStr

    let dates = state.dateRange()
    if let first = dates.first, let last = dates.last {
      onDateRangeChange?(first, last)
    }
  }

  private func startTimer() {
    Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in
      DispatchQueue.main.async {
        currentTime = Date()
      }
    }
  }
}

// MARK: - UIView Wrapper

class NativeMultiDayTimeGridUIView: UIView {

  @objc var onDateSelect: RCTDirectEventBlock?
  @objc var onTodoPress: RCTDirectEventBlock?
  @objc var onDateRangeChange: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let gridState = MultiDayTimeGridState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setDayCount(_ value: NSNumber) {
    gridState.dayCount = value.intValue
  }

  @objc func setCenterDate(_ value: NSString) {
    gridState.centerDate = value as String
    setupOnce()
  }

  @objc func setPrimaryColor(_ value: NSString) {
    gridState.primaryColor = value as String
  }

  @objc func setTodoData(_ value: NSString) {
    gridState.parseTodoData(value as String)
  }

  @objc func setEventData(_ value: NSString) {
    gridState.parseEventData(value as String)
  }

  // MARK: - Setup Once

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .clear

    if #available(iOS 17.0, *) {
      let swiftUIView = MultiDayTimeGridContent(
        state: gridState,
        onDateSelect: { [weak self] dateString in
          self?.onDateSelect?(["date": dateString])
        },
        onTodoPress: { [weak self] todoId in
          self?.onTodoPress?(["todoId": todoId])
        },
        onDateRangeChange: { [weak self] startDate, endDate in
          self?.onDateRangeChange?(["startDate": startDate, "endDate": endDate])
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
        guard let self = self, let hc = self.hostingController, self.bounds.width > 0 else { return }
        let size = hc.sizeThatFits(in: CGSize(width: self.bounds.width, height: .greatestFiniteMagnitude))
        self.onHeightChange?(["height": size.height])
      }
    }
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
