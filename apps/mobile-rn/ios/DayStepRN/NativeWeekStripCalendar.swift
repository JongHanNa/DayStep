/**
 * NativeWeekStripCalendar — 주간 스트립 캘린더 (Apple Calendar 스타일)
 * 상단 월 레이블 + "오늘" 버튼, 하단 가로 스크롤 주간 그리드
 *
 * 패턴: ObservableObject + setupOnce() (NativeCleanupAccordion 참조)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct WeekData: Identifiable {
  let id: String          // 주 시작일 "yyyy-MM-dd"
  let dates: [Date]       // 7일 (일~토)
}

// MARK: - Observable State

class WeekStripState: ObservableObject {
  @Published var selectedDate: Date = Date()
  @Published var primaryColor: String = "#6366F1"
  @Published var weeks: [WeekData] = []
  @Published var currentWeekId: String = ""
  @Published var displayMonth: String = ""

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

  func generateWeeks() {
    let today = calendar.startOfDay(for: Date())

    // 오늘이 속한 주의 일요일 찾기
    let weekday = calendar.component(.weekday, from: today)
    guard let thisSunday = calendar.date(byAdding: .day, value: -(weekday - 1), to: today) else { return }

    var result: [WeekData] = []
    for offset in -52...52 {
      guard let weekStart = calendar.date(byAdding: .weekOfYear, value: offset, to: thisSunday) else { continue }
      var dates: [Date] = []
      for d in 0..<7 {
        if let date = calendar.date(byAdding: .day, value: d, to: weekStart) {
          dates.append(date)
        }
      }
      let id = dateFormatter.string(from: weekStart)
      result.append(WeekData(id: id, dates: dates))
    }
    weeks = result
    updateCurrentWeek(for: selectedDate)
  }

  func updateCurrentWeek(for date: Date) {
    let startOfDate = calendar.startOfDay(for: date)
    let weekday = calendar.component(.weekday, from: startOfDate)
    guard let sunday = calendar.date(byAdding: .day, value: -(weekday - 1), to: startOfDate) else { return }
    currentWeekId = dateFormatter.string(from: sunday)
    updateDisplayMonth(for: date)
  }

  func updateDisplayMonth(for date: Date) {
    let month = calendar.component(.month, from: date)
    displayMonth = "\(month)월"
  }

  func weekId(for date: Date) -> String {
    let startOfDate = calendar.startOfDay(for: date)
    let weekday = calendar.component(.weekday, from: startOfDate)
    guard let sunday = calendar.date(byAdding: .day, value: -(weekday - 1), to: startOfDate) else { return "" }
    return dateFormatter.string(from: sunday)
  }

  func dateString(from date: Date) -> String {
    return dateFormatter.string(from: date)
  }
}

// MARK: - SwiftUI View

@available(iOS 17.0, *)
struct WeekStripContent: View {
  @ObservedObject var state: WeekStripState

  var onDateSelect: ((String) -> Void)?

  private let calendar: Calendar = {
    var cal = Calendar(identifier: .gregorian)
    cal.firstWeekday = 1
    cal.locale = Locale(identifier: "ko_KR")
    return cal
  }()

  private let dayLabels = ["일", "월", "화", "수", "목", "금", "토"]
  private let today = Calendar.current.startOfDay(for: Date())

  var body: some View {
    VStack(spacing: 0) {
      // 상단: 월 레이블 + 오늘 버튼
      HStack {
        Text(state.displayMonth)
          .font(.system(size: 18, weight: .bold))
          .foregroundColor(Color(hex: "#1F2937"))

        Spacer()

        let todayWeekId = state.weekId(for: today)
        let isOnTodayWeek = state.currentWeekId == todayWeekId
          && calendar.isDate(state.selectedDate, inSameDayAs: today)

        Button(action: {
          let todayStr = state.dateString(from: today)
          state.selectedDate = today
          state.updateCurrentWeek(for: today)
          onDateSelect?(todayStr)
        }) {
          Text("오늘")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(isOnTodayWeek ? Color(hex: "#9CA3AF") : Color(hex: state.primaryColor))
        }
        .disabled(isOnTodayWeek)
      }
      .padding(.horizontal, 20)
      .padding(.top, 12)
      .padding(.bottom, 16)

      // 하단: 주간 스크롤
      ScrollView(.horizontal, showsIndicators: false) {
        LazyHStack(spacing: 0) {
          ForEach(state.weeks) { week in
            weekView(week: week)
              .containerRelativeFrame(.horizontal, count: 1, spacing: 0)
              .id(week.id)
          }
        }
        .scrollTargetLayout()
      }
      .scrollTargetBehavior(.paging)
      .scrollPosition(id: Binding(
        get: { state.currentWeekId },
        set: { newId in
          if let id = newId, id != state.currentWeekId {
            state.currentWeekId = id
            // 스크롤 시 월 레이블 업데이트 (가운데 날짜 기준)
            if let week = state.weeks.first(where: { $0.id == id }),
               week.dates.count > 3 {
              state.updateDisplayMonth(for: week.dates[3])
            }
          }
        }
      ))
      .frame(height: 60)
      .padding(.bottom, 4)
    }
  }

  private func weekView(week: WeekData) -> some View {
    HStack(spacing: 0) {
      ForEach(Array(week.dates.enumerated()), id: \.offset) { index, date in
        let isToday = calendar.isDate(date, inSameDayAs: today)
        let isSelected = calendar.isDate(date, inSameDayAs: state.selectedDate)
        let day = calendar.component(.day, from: date)

        Button(action: {
          state.selectedDate = date
          onDateSelect?(state.dateString(from: date))
        }) {
          VStack(spacing: 4) {
            // 요일 레이블
            Text(dayLabels[index])
              .font(.system(size: 11, weight: .medium))
              .foregroundColor(dayLabelColor(index: index, isToday: isToday))

            // 일자
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

              Text("\(day)")
                .font(.system(size: 15, weight: isToday || isSelected ? .bold : .regular))
                .foregroundColor(
                  isToday ? .white :
                  isSelected ? Color(hex: state.primaryColor) :
                  dayNumberColor(index: index)
                )
            }
            .frame(width: 34, height: 34)
          }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
      }
    }
    .padding(.horizontal, 8)
  }

  private func dayLabelColor(index: Int, isToday: Bool) -> Color {
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

class NativeWeekStripCalendarUIView: UIView {

  // RN Event Blocks
  @objc var onDateSelect: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

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
    weekState.updateCurrentWeek(for: date)
    setupOnce()
  }

  @objc func setPrimaryColor(_ value: NSString) {
    weekState.primaryColor = value as String
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

    weekState.generateWeeks()

    if #available(iOS 17.0, *) {
      let swiftUIView = WeekStripContent(
        state: weekState,
        onDateSelect: { [weak self] dateString in
          self?.onDateSelect?(["date": dateString])
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
