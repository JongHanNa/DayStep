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

// MARK: - Tree Canvas View

struct TreeCanvasView: View {
  let durationMinutes: Int
  let outcome: String   // "completed" | "abandoned"
  let size: CGFloat

  /// 성장 단계: 0=씨앗, 1=새싹, 2=작은나무, 3=큰나무
  private var growthLevel: Int {
    let hours = Double(durationMinutes) / 60.0
    if hours >= 7 { return 3 }
    if hours >= 5 { return 2 }
    if hours >= 2 { return 1 }
    return 0
  }

  private var isAbandoned: Bool { outcome == "abandoned" }

  /// 성장 단계별 crown 색상
  private var crownColor: Color {
    if isAbandoned { return Color(hex: "#9CA3AF") }
    switch growthLevel {
    case 3: return Color(hex: "#22C55E")
    case 2: return Color(hex: "#16A34A")
    case 1: return Color(hex: "#84CC16")
    default: return Color(hex: "#FCD34D")
    }
  }

  /// 성장 단계별 trunk 색상
  private var trunkColor: Color {
    if isAbandoned { return Color(hex: "#9CA3AF") }
    switch growthLevel {
    case 3: return Color(hex: "#92400E")
    case 2: return Color(hex: "#92400E")
    case 1: return Color(hex: "#A16207")
    default: return Color(hex: "#D97706")
    }
  }

  /// 땅 색상
  private var groundColor: Color {
    isAbandoned ? Color(hex: "#D1D5DB") : Color(hex: "#92400E").opacity(0.3)
  }

  var body: some View {
    Canvas { context, canvasSize in
      let w = canvasSize.width
      let h = canvasSize.height
      let cx = w / 2        // center x
      let groundY = h * 0.88 // 땅 기준선

      // 땅 (작은 타원)
      let groundRect = CGRect(x: cx - w * 0.3, y: groundY, width: w * 0.6, height: h * 0.1)
      context.fill(Ellipse().path(in: groundRect), with: .color(groundColor))

      if isAbandoned {
        drawWiltedTree(context: context, w: w, h: h, cx: cx, groundY: groundY)
      } else {
        switch growthLevel {
        case 0:
          drawSeed(context: context, w: w, h: h, cx: cx, groundY: groundY)
        case 1:
          drawSprout(context: context, w: w, h: h, cx: cx, groundY: groundY)
        case 2:
          drawSmallTree(context: context, w: w, h: h, cx: cx, groundY: groundY)
        default:
          drawBigTree(context: context, w: w, h: h, cx: cx, groundY: groundY)
        }
      }
    }
    .frame(width: size, height: size)
  }

  // MARK: - 씨앗 (growth 0)
  private func drawSeed(context: GraphicsContext, w: CGFloat, h: CGFloat, cx: CGFloat, groundY: CGFloat) {
    let seedSize = w * 0.18
    let seedRect = CGRect(x: cx - seedSize / 2, y: groundY - seedSize * 0.6, width: seedSize, height: seedSize)
    context.fill(Ellipse().path(in: seedRect), with: .color(trunkColor))

    // 씨앗 위 작은 싹 (V자)
    var sproutPath = Path()
    let tipY = groundY - seedSize * 0.6 - w * 0.08
    sproutPath.move(to: CGPoint(x: cx, y: groundY - seedSize * 0.6))
    sproutPath.addLine(to: CGPoint(x: cx, y: tipY))
    context.stroke(sproutPath, with: .color(Color(hex: "#84CC16")), lineWidth: max(1, w * 0.04))
  }

  // MARK: - 새싹 (growth 1)
  private func drawSprout(context: GraphicsContext, w: CGFloat, h: CGFloat, cx: CGFloat, groundY: CGFloat) {
    let stemHeight = h * 0.35
    let stemTop = groundY - stemHeight
    let stemWidth = max(1.5, w * 0.06)

    // 줄기
    var stem = Path()
    stem.move(to: CGPoint(x: cx, y: groundY))
    stem.addLine(to: CGPoint(x: cx, y: stemTop))
    context.stroke(stem, with: .color(trunkColor), lineWidth: stemWidth)

    // 왼쪽 잎
    let leafW = w * 0.22
    let leafH = w * 0.12
    let leafY = stemTop + stemHeight * 0.3
    let leftLeaf = CGRect(x: cx - leafW - stemWidth / 2, y: leafY - leafH / 2, width: leafW, height: leafH)
    context.fill(Ellipse().path(in: leftLeaf), with: .color(crownColor))

    // 오른쪽 잎
    let rightLeaf = CGRect(x: cx + stemWidth / 2, y: leafY - leafH * 0.8, width: leafW, height: leafH)
    context.fill(Ellipse().path(in: rightLeaf), with: .color(crownColor))

    // 꼭대기 잎
    let topLeafW = w * 0.16
    let topLeafH = w * 0.20
    let topLeaf = CGRect(x: cx - topLeafW / 2, y: stemTop - topLeafH * 0.7, width: topLeafW, height: topLeafH)
    context.fill(Ellipse().path(in: topLeaf), with: .color(crownColor))
  }

  // MARK: - 작은 나무 (growth 2)
  private func drawSmallTree(context: GraphicsContext, w: CGFloat, h: CGFloat, cx: CGFloat, groundY: CGFloat) {
    let trunkH = h * 0.32
    let trunkW = w * 0.10
    let trunkTop = groundY - trunkH

    // Trunk (사다리꼴)
    var trunk = Path()
    trunk.move(to: CGPoint(x: cx - trunkW * 0.7, y: groundY))
    trunk.addLine(to: CGPoint(x: cx - trunkW * 0.4, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.4, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.7, y: groundY))
    trunk.closeSubpath()
    context.fill(trunk, with: .color(trunkColor))

    // Crown (원형)
    let crownR = w * 0.28
    let crownRect = CGRect(x: cx - crownR, y: trunkTop - crownR * 1.3, width: crownR * 2, height: crownR * 1.8)
    context.fill(Ellipse().path(in: crownRect), with: .color(crownColor))

    // Crown 하이라이트 (살짝 밝은 원)
    let hlR = crownR * 0.5
    let hlRect = CGRect(x: cx - hlR * 0.6, y: trunkTop - crownR * 1.1, width: hlR, height: hlR * 0.8)
    context.fill(Ellipse().path(in: hlRect), with: .color(crownColor.opacity(0.4)))
  }

  // MARK: - 큰 나무 (growth 3)
  private func drawBigTree(context: GraphicsContext, w: CGFloat, h: CGFloat, cx: CGFloat, groundY: CGFloat) {
    let trunkH = h * 0.42
    let trunkW = w * 0.12
    let trunkTop = groundY - trunkH

    // Trunk
    var trunk = Path()
    trunk.move(to: CGPoint(x: cx - trunkW * 0.8, y: groundY))
    trunk.addLine(to: CGPoint(x: cx - trunkW * 0.4, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.4, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.8, y: groundY))
    trunk.closeSubpath()
    context.fill(trunk, with: .color(trunkColor))

    // 왼쪽 가지
    let branchY = trunkTop + trunkH * 0.3
    var leftBranch = Path()
    leftBranch.move(to: CGPoint(x: cx - trunkW * 0.3, y: branchY))
    leftBranch.addQuadCurve(
      to: CGPoint(x: cx - w * 0.28, y: branchY - h * 0.12),
      control: CGPoint(x: cx - w * 0.22, y: branchY + h * 0.02)
    )
    context.stroke(leftBranch, with: .color(trunkColor), lineWidth: max(1.5, w * 0.04))

    // 오른쪽 가지
    var rightBranch = Path()
    rightBranch.move(to: CGPoint(x: cx + trunkW * 0.3, y: branchY - h * 0.05))
    rightBranch.addQuadCurve(
      to: CGPoint(x: cx + w * 0.26, y: branchY - h * 0.16),
      control: CGPoint(x: cx + w * 0.2, y: branchY - h * 0.02)
    )
    context.stroke(rightBranch, with: .color(trunkColor), lineWidth: max(1.5, w * 0.04))

    // Crown 메인 (큰 타원)
    let crownR = w * 0.38
    let crownRect = CGRect(x: cx - crownR, y: trunkTop - crownR * 1.2, width: crownR * 2, height: crownR * 1.7)
    context.fill(Ellipse().path(in: crownRect), with: .color(crownColor))

    // Crown 좌측 보조
    let subR = crownR * 0.55
    let leftCrown = CGRect(x: cx - crownR * 1.05, y: trunkTop - crownR * 0.6, width: subR * 1.6, height: subR * 1.3)
    context.fill(Ellipse().path(in: leftCrown), with: .color(crownColor))

    // Crown 우측 보조
    let rightCrown = CGRect(x: cx + crownR * 0.25, y: trunkTop - crownR * 0.7, width: subR * 1.5, height: subR * 1.2)
    context.fill(Ellipse().path(in: rightCrown), with: .color(crownColor))

    // 하이라이트
    let hlR = crownR * 0.35
    let hlRect = CGRect(x: cx - hlR * 0.5, y: trunkTop - crownR * 1.0, width: hlR, height: hlR * 0.7)
    context.fill(Ellipse().path(in: hlRect), with: .color(.white.opacity(0.15)))
  }

  // MARK: - 시든 나무 (abandoned)
  private func drawWiltedTree(context: GraphicsContext, w: CGFloat, h: CGFloat, cx: CGFloat, groundY: CGFloat) {
    let trunkH = h * 0.35
    let trunkW = w * 0.10
    let tilt = w * 0.06  // 기울기
    let trunkTop = groundY - trunkH

    // 기울어진 Trunk
    var trunk = Path()
    trunk.move(to: CGPoint(x: cx - trunkW * 0.6, y: groundY))
    trunk.addLine(to: CGPoint(x: cx - trunkW * 0.3 + tilt, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.3 + tilt, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.6, y: groundY))
    trunk.closeSubpath()
    context.fill(trunk, with: .color(Color(hex: "#9CA3AF")))

    // 처진 Crown (y축 눌림 + 아래로 처짐)
    let crownR = w * 0.26
    let crownRect = CGRect(
      x: cx - crownR + tilt,
      y: trunkTop - crownR * 0.5,  // 덜 올라감 (처진 느낌)
      width: crownR * 2,
      height: crownR * 1.2  // 눌린 비율
    )
    context.fill(Ellipse().path(in: crownRect), with: .color(Color(hex: "#9CA3AF").opacity(0.6)))

    // 떨어진 잎 하나
    let fallenLeaf = CGRect(x: cx + w * 0.15, y: groundY - h * 0.08, width: w * 0.08, height: w * 0.05)
    context.fill(Ellipse().path(in: fallenLeaf), with: .color(Color(hex: "#D1D5DB")))
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
    HStack(spacing: 12) {
      legendItem(minutes: 420, outcome: "completed", label: "7h+")
      legendItem(minutes: 360, outcome: "completed", label: "5-7h")
      legendItem(minutes: 150, outcome: "completed", label: "2-5h")
      legendItem(minutes: 60, outcome: "completed", label: "~2h")
      legendItem(minutes: 300, outcome: "abandoned", label: "포기")
      HStack(spacing: 4) {
        Circle()
          .fill(Color(hex: "#E5E7EB"))
          .frame(width: 8, height: 8)
        Text("없음")
          .font(.system(size: 11))
          .foregroundColor(Color(hex: "#9CA3AF"))
      }
    }
  }

  private func legendItem(minutes: Int, outcome: String, label: String) -> some View {
    HStack(spacing: 4) {
      TreeCanvasView(durationMinutes: minutes, outcome: outcome, size: 14)
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
    return VStack(spacing: 6) {
      TreeCanvasView(durationMinutes: session.durationMinutes, outcome: session.outcome, size: 48)

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
            TreeCanvasView(durationMinutes: session.durationMinutes, outcome: session.outcome, size: 24)
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
          let totalMin = state.totalCompletedMinutes(for: dateStr)
          let hasAbandoned = sessions.contains(where: { $0.outcome == "abandoned" }) && sessions.filter({ $0.outcome == "completed" }).isEmpty
          ZStack {
            TreeCanvasView(
              durationMinutes: totalMin,
              outcome: hasAbandoned ? "abandoned" : "completed",
              size: 14
            )

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
    setupOnce()
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
