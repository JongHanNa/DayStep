/**
 * NativeDayTimeGrid — 일 뷰 시간 그리드 (Apple Calendar 스타일)
 * 24시간 세로 그리드 + 할일/이벤트 블록 + 현재 시각 라인
 *
 * 패턴: ObservableObject + setupOnce() (NativeWeekStripCalendar 참조)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct DayGridTodoItem: Codable, Identifiable {
  let id: String
  let title: String
  let startTime: String?
  let endTime: String?
  let completed: Bool
  let projectColor: String

  enum CodingKeys: String, CodingKey {
    case id, title, completed
    case startTime = "start_time"
    case endTime = "end_time"
    case projectColor = "project_color"
  }
}

struct DayGridEventItem: Codable, Identifiable {
  let id: String
  let title: String
  let start: String?
  let end: String?
  let color: String
  let isAllDay: Bool
}

// MARK: - Observable State

class DayTimeGridState: ObservableObject {
  @Published var selectedDate: String = ""
  @Published var primaryColor: String = "#6366F1"
  @Published var todoItems: [DayGridTodoItem] = []
  @Published var eventItems: [DayGridEventItem] = []

  private let decoder = JSONDecoder()

  func parseTodoData(_ jsonString: String) {
    guard let data = jsonString.data(using: .utf8) else { return }
    do {
      todoItems = try decoder.decode([DayGridTodoItem].self, from: data)
    } catch {
      print("[DayTimeGrid] todo parse error: \(error)")
    }
  }

  func parseEventData(_ jsonString: String) {
    guard let data = jsonString.data(using: .utf8) else { return }
    do {
      eventItems = try decoder.decode([DayGridEventItem].self, from: data)
    } catch {
      print("[DayTimeGrid] event parse error: \(error)")
    }
  }
}

// MARK: - SwiftUI View

@available(iOS 17.0, *)
struct DayTimeGridContent: View {
  @ObservedObject var state: DayTimeGridState
  @State private var currentTime = Date()

  var onDateSelect: ((String) -> Void)?
  var onTodoPress: ((String) -> Void)?

  private let hourHeight: CGFloat = 60
  private let timeColumnWidth: CGFloat = 50
  private let calendar = Calendar.current

  private let dateFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    return df
  }()

  private let timeFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "HH:mm"
    df.locale = Locale(identifier: "ko_KR")
    return df
  }()

  var body: some View {
    VStack(spacing: 0) {
      // 종일 이벤트 영역
      allDaySection

      // 시간 그리드
      ScrollView(.vertical, showsIndicators: true) {
        ZStack(alignment: .topLeading) {
          // 시간 행 배경
          timeGridBackground

          // 할일 블록
          todoBlocks

          // 이벤트 블록
          eventBlocks

          // 현재 시각 라인
          currentTimeLine
        }
        .frame(height: hourHeight * 24)
      }
    }
    .onAppear {
      startTimer()
    }
  }

  // MARK: - All Day Section

  private var allDaySection: some View {
    let allDayEvents = state.eventItems.filter { $0.isAllDay }
    let anytimeTodos = state.todoItems.filter { $0.startTime == nil }

    return Group {
      if !allDayEvents.isEmpty || !anytimeTodos.isEmpty {
        VStack(alignment: .leading, spacing: 4) {
          Text("종일")
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(Color(hex: "#9CA3AF"))
            .padding(.leading, timeColumnWidth)

          // 종일 이벤트 칩
          ForEach(allDayEvents) { event in
            HStack(spacing: 6) {
              RoundedRectangle(cornerRadius: 2)
                .fill(Color(hex: event.color))
                .frame(width: 4, height: 16)
              Text(event.title)
                .font(.system(size: 12))
                .foregroundColor(Color(hex: "#374151"))
                .lineLimit(1)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(hex: event.color).opacity(0.1))
            .cornerRadius(4)
            .padding(.leading, timeColumnWidth)
          }

          // 시간 미지정 할일
          ForEach(anytimeTodos) { todo in
            Button(action: { onTodoPress?(todo.id) }) {
              HStack(spacing: 6) {
                Circle()
                  .fill(todo.completed ? Color(hex: "#9CA3AF") : Color(hex: todo.projectColor))
                  .frame(width: 8, height: 8)
                Text(todo.title)
                  .font(.system(size: 12))
                  .foregroundColor(todo.completed ? Color(hex: "#9CA3AF") : Color(hex: "#374151"))
                  .strikethrough(todo.completed)
                  .lineLimit(1)
              }
              .padding(.horizontal, 8)
              .padding(.vertical, 4)
              .background(Color(hex: todo.projectColor).opacity(0.08))
              .cornerRadius(4)
            }
            .buttonStyle(.plain)
            .padding(.leading, timeColumnWidth)
          }
        }
        .padding(.vertical, 8)
        .background(Color(hex: "#F9FAFB"))

        Divider()
      }
    }
  }

  // MARK: - Time Grid Background

  private var timeGridBackground: some View {
    VStack(spacing: 0) {
      ForEach(0..<24, id: \.self) { hour in
        HStack(alignment: .top, spacing: 0) {
          // 시간 레이블
          Text(String(format: "%02d:00", hour))
            .font(.system(size: 11, weight: .regular, design: .monospaced))
            .foregroundColor(Color(hex: "#9CA3AF"))
            .frame(width: timeColumnWidth, alignment: .trailing)
            .padding(.trailing, 8)
            .offset(y: -6)

          // 구분선
          VStack(spacing: 0) {
            Divider()
              .background(Color(hex: "#E5E7EB"))
            Spacer()
          }
        }
        .frame(height: hourHeight)
      }
    }
  }

  // MARK: - Todo Blocks

  private var todoBlocks: some View {
    ForEach(timedTodos) { todo in
      let position = blockPosition(startTime: todo.startTime, endTime: todo.endTime)

      Button(action: { onTodoPress?(todo.id) }) {
        HStack(spacing: 4) {
          RoundedRectangle(cornerRadius: 2)
            .fill(Color(hex: todo.projectColor))
            .frame(width: 3)

          VStack(alignment: .leading, spacing: 1) {
            Text(todo.title)
              .font(.system(size: 12, weight: .medium))
              .foregroundColor(todo.completed ? Color(hex: "#9CA3AF") : Color(hex: "#1F2937"))
              .strikethrough(todo.completed)
              .lineLimit(2)

            if let startStr = todo.startTime, let endStr = todo.endTime {
              Text("\(formatTimeShort(startStr)) - \(formatTimeShort(endStr))")
                .font(.system(size: 10))
                .foregroundColor(Color(hex: "#9CA3AF"))
            }
          }
          Spacer()
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 4)
        .background(Color(hex: todo.projectColor).opacity(todo.completed ? 0.05 : 0.12))
        .cornerRadius(6)
        .overlay(
          RoundedRectangle(cornerRadius: 6)
            .stroke(Color(hex: todo.projectColor).opacity(0.3), lineWidth: 0.5)
        )
      }
      .buttonStyle(.plain)
      .frame(height: max(position.height, 24))
      .padding(.leading, timeColumnWidth + 8)
      .padding(.trailing, 16)
      .offset(y: position.topOffset)
    }
  }

  // MARK: - Event Blocks

  private var eventBlocks: some View {
    ForEach(timedEvents) { event in
      let position = blockPosition(startTime: event.start, endTime: event.end)

      HStack(spacing: 4) {
        RoundedRectangle(cornerRadius: 2)
          .fill(Color(hex: event.color))
          .frame(width: 3)

        VStack(alignment: .leading, spacing: 1) {
          Text(event.title)
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(Color(hex: "#1F2937"))
            .lineLimit(2)

          if let startStr = event.start, let endStr = event.end {
            Text("\(formatTimeShort(startStr)) - \(formatTimeShort(endStr))")
              .font(.system(size: 10))
              .foregroundColor(Color(hex: "#9CA3AF"))
          }
        }
        Spacer()
      }
      .padding(.horizontal, 6)
      .padding(.vertical, 4)
      .background(Color(hex: event.color).opacity(0.12))
      .cornerRadius(6)
      .frame(height: max(position.height, 24))
      .padding(.leading, timeColumnWidth + 8)
      .padding(.trailing, 48) // 할일과 이벤트 겹침 방지를 위해 오프셋
      .offset(y: position.topOffset)
    }
  }

  // MARK: - Current Time Line

  private var currentTimeLine: some View {
    let todayStr = dateFormatter.string(from: Date())
    let isToday = state.selectedDate == todayStr

    return Group {
      if isToday {
        let components = calendar.dateComponents([.hour, .minute], from: currentTime)
        let minutes = CGFloat(components.hour ?? 0) * 60 + CGFloat(components.minute ?? 0)
        let topOffset = minutes / 60.0 * hourHeight

        HStack(spacing: 0) {
          Circle()
            .fill(Color.red)
            .frame(width: 8, height: 8)
            .offset(x: timeColumnWidth - 4)

          Rectangle()
            .fill(Color.red)
            .frame(height: 1)
        }
        .offset(y: topOffset - 4)
      }
    }
  }

  // MARK: - Helpers

  private var timedTodos: [DayGridTodoItem] {
    state.todoItems.filter { $0.startTime != nil }
  }

  private var timedEvents: [DayGridEventItem] {
    state.eventItems.filter { !$0.isAllDay && $0.start != nil }
  }

  private func blockPosition(startTime: String?, endTime: String?) -> (topOffset: CGFloat, height: CGFloat) {
    guard let startStr = startTime else { return (0, 24) }

    let startMinutes = minutesFromTimeString(startStr)
    let endMinutes: CGFloat
    if let endStr = endTime {
      endMinutes = minutesFromTimeString(endStr)
    } else {
      endMinutes = startMinutes + 30 // 기본 30분
    }

    let topOffset = startMinutes / 60.0 * hourHeight
    let height = max((endMinutes - startMinutes) / 60.0 * hourHeight, 24)
    return (topOffset, height)
  }

  private func minutesFromTimeString(_ timeStr: String) -> CGFloat {
    // "2026-03-16T09:00:00+09:00" 또는 "09:00" 형식 처리
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

  private func formatTimeShort(_ timeStr: String) -> String {
    if timeStr.contains("T") {
      let timePart = timeStr.components(separatedBy: "T").last ?? "00:00"
      return String(timePart.prefix(5))
    }
    return String(timeStr.prefix(5))
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

class NativeDayTimeGridUIView: UIView {

  @objc var onDateSelect: RCTDirectEventBlock?
  @objc var onTodoPress: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let gridState = DayTimeGridState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setSelectedDate(_ value: NSString) {
    gridState.selectedDate = value as String
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
      let swiftUIView = DayTimeGridContent(
        state: gridState,
        onDateSelect: { [weak self] dateString in
          self?.onDateSelect?(["date": dateString])
        },
        onTodoPress: { [weak self] todoId in
          self?.onTodoPress?(["todoId": todoId])
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

@objc(NativeDayTimeGridManager)
class NativeDayTimeGridManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeDayTimeGridUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
