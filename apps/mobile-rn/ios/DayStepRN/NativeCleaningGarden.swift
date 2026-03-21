/**
 * NativeCleaningGarden — SwiftUI 청소 정원 4-뷰 컴포넌트
 * 일: 5×5 아이소메트릭 다이아몬드 정원
 * 주/월/년: 수면정원과 유사한 패턴
 *
 * 패턴: ObservableObject + setupOnce() (NativeSleepGarden 참조)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct CleaningTreeInfo: Codable {
  let taskId: String
  let durationSeconds: Int
  let outcome: String  // "completed" | "abandoned" | "skipped"
  let tab: String      // "space" | "digital" | "belongings"
}

struct CleaningGardenDayInfo: Codable {
  let date: String  // yyyy-MM-dd
  let trees: [CleaningTreeInfo]
}

struct CleaningGardenPayload: Codable {
  let days: [CleaningGardenDayInfo]
}

// MARK: - Observable State

class CleaningGardenState: ObservableObject {
  @Published var viewMode: String = "day"
  @Published var selectedDate: String = ""
  @Published var primaryColor: String = "#D97706"
  @Published var parsedDays: [String: [CleaningTreeInfo]] = [:]
  @Published var dayOffset: Int = 0
  @Published var weekOffset: Int = 0
  @Published var monthOffset: Int = 0
  @Published var yearOffset: Int = 0

  func resetOffsets() {
    dayOffset = 0
    weekOffset = 0
    monthOffset = 0
    yearOffset = 0
  }

  /// 여러 날짜의 트리를 집계, 25개 초과 시 duration 내림차순 상위 25개
  func aggregatedTrees(for dates: [String]) -> [CleaningTreeInfo] {
    let all = dates.flatMap { parsedDays[$0] ?? [] }
    if all.count <= 25 { return all }
    return Array(all.sorted { $0.durationSeconds > $1.durationSeconds }.prefix(25))
  }

  func dayStatus(for date: String, today: String) -> String {
    let trees = parsedDays[date] ?? []
    if date == today { return "today" }
    if trees.isEmpty { return "empty" }
    if trees.contains(where: { $0.outcome == "completed" }) { return "healthy" }
    return "wilted"
  }

  func completedCount(for date: String) -> Int {
    let trees = parsedDays[date] ?? []
    return trees.filter { $0.outcome == "completed" }.count
  }

  func totalDurationMinutes(for date: String) -> Int {
    let trees = parsedDays[date] ?? []
    let totalSec = trees.filter { $0.outcome == "completed" }.reduce(0) { $0 + $1.durationSeconds }
    return totalSec / 60
  }
}

// MARK: - Cleaning Tree Canvas View

struct CleaningTreeCanvasView: View {
  let durationSeconds: Int
  let outcome: String
  let tab: String
  let size: CGFloat

  /// 성장 단계: 0=씨앗(<2분), 1=새싹(2-5분), 2=작은나무(5-10분), 3=큰나무(10분+)
  private var growthLevel: Int {
    let minutes = Double(durationSeconds) / 60.0
    if minutes >= 10 { return 3 }
    if minutes >= 5 { return 2 }
    if minutes >= 2 { return 1 }
    return 0
  }

  private var isAbandoned: Bool { outcome == "abandoned" }

  /// 탭별 크라운 색상
  private var crownColor: Color {
    if isAbandoned { return Color(hex: "#9CA3AF") }
    switch tab {
    case "digital":
      switch growthLevel {
      case 3: return Color(hex: "#3B82F6")
      case 2: return Color(hex: "#2563EB")
      case 1: return Color(hex: "#60A5FA")
      default: return Color(hex: "#93C5FD")
      }
    case "belongings":
      switch growthLevel {
      case 3: return Color(hex: "#8B5CF6")
      case 2: return Color(hex: "#7C3AED")
      case 1: return Color(hex: "#A78BFA")
      default: return Color(hex: "#C4B5FD")
      }
    default: // space
      switch growthLevel {
      case 3: return Color(hex: "#22C55E")
      case 2: return Color(hex: "#16A34A")
      case 1: return Color(hex: "#84CC16")
      default: return Color(hex: "#FCD34D")
      }
    }
  }

  private var trunkColor: Color {
    if isAbandoned { return Color(hex: "#9CA3AF") }
    switch growthLevel {
    case 3, 2: return Color(hex: "#92400E")
    case 1: return Color(hex: "#A16207")
    default: return Color(hex: "#D97706")
    }
  }

  private var groundColor: Color {
    isAbandoned ? Color(hex: "#D1D5DB") : Color(hex: "#92400E").opacity(0.3)
  }

  var body: some View {
    Canvas { context, canvasSize in
      let w = canvasSize.width
      let h = canvasSize.height
      let cx = w / 2
      let groundY = h * 0.88

      // 땅 타원
      let groundRect = CGRect(x: cx - w * 0.3, y: groundY, width: w * 0.6, height: h * 0.1)
      context.fill(Ellipse().path(in: groundRect), with: .color(groundColor))

      if isAbandoned {
        drawWiltedTree(context: context, w: w, h: h, cx: cx, groundY: groundY)
      } else {
        switch growthLevel {
        case 0: drawSeed(context: context, w: w, h: h, cx: cx, groundY: groundY)
        case 1: drawSprout(context: context, w: w, h: h, cx: cx, groundY: groundY)
        case 2: drawSmallTree(context: context, w: w, h: h, cx: cx, groundY: groundY)
        default: drawBigTree(context: context, w: w, h: h, cx: cx, groundY: groundY)
        }
      }
    }
    .frame(width: size, height: size)
  }

  // MARK: - 씨앗
  private func drawSeed(context: GraphicsContext, w: CGFloat, h: CGFloat, cx: CGFloat, groundY: CGFloat) {
    let seedSize = w * 0.18
    let seedRect = CGRect(x: cx - seedSize / 2, y: groundY - seedSize * 0.6, width: seedSize, height: seedSize)
    context.fill(Ellipse().path(in: seedRect), with: .color(trunkColor))
    var sproutPath = Path()
    let tipY = groundY - seedSize * 0.6 - w * 0.08
    sproutPath.move(to: CGPoint(x: cx, y: groundY - seedSize * 0.6))
    sproutPath.addLine(to: CGPoint(x: cx, y: tipY))
    context.stroke(sproutPath, with: .color(crownColor), lineWidth: max(1, w * 0.04))
  }

  // MARK: - 새싹
  private func drawSprout(context: GraphicsContext, w: CGFloat, h: CGFloat, cx: CGFloat, groundY: CGFloat) {
    let stemHeight = h * 0.35
    let stemTop = groundY - stemHeight
    let stemWidth = max(1.5, w * 0.06)
    var stem = Path()
    stem.move(to: CGPoint(x: cx, y: groundY))
    stem.addLine(to: CGPoint(x: cx, y: stemTop))
    context.stroke(stem, with: .color(trunkColor), lineWidth: stemWidth)

    let leafW = w * 0.22
    let leafH = w * 0.12
    let leafY = stemTop + stemHeight * 0.3
    context.fill(Ellipse().path(in: CGRect(x: cx - leafW - stemWidth / 2, y: leafY - leafH / 2, width: leafW, height: leafH)), with: .color(crownColor))
    context.fill(Ellipse().path(in: CGRect(x: cx + stemWidth / 2, y: leafY - leafH * 0.8, width: leafW, height: leafH)), with: .color(crownColor))

    let topLeafW = w * 0.16
    let topLeafH = w * 0.20
    context.fill(Ellipse().path(in: CGRect(x: cx - topLeafW / 2, y: stemTop - topLeafH * 0.7, width: topLeafW, height: topLeafH)), with: .color(crownColor))
  }

  // MARK: - 작은 나무
  private func drawSmallTree(context: GraphicsContext, w: CGFloat, h: CGFloat, cx: CGFloat, groundY: CGFloat) {
    let trunkH = h * 0.32
    let trunkW = w * 0.10
    let trunkTop = groundY - trunkH
    var trunk = Path()
    trunk.move(to: CGPoint(x: cx - trunkW * 0.7, y: groundY))
    trunk.addLine(to: CGPoint(x: cx - trunkW * 0.4, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.4, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.7, y: groundY))
    trunk.closeSubpath()
    context.fill(trunk, with: .color(trunkColor))

    let crownR = w * 0.28
    context.fill(Ellipse().path(in: CGRect(x: cx - crownR, y: trunkTop - crownR * 1.3, width: crownR * 2, height: crownR * 1.8)), with: .color(crownColor))
    let hlR = crownR * 0.5
    context.fill(Ellipse().path(in: CGRect(x: cx - hlR * 0.6, y: trunkTop - crownR * 1.1, width: hlR, height: hlR * 0.8)), with: .color(crownColor.opacity(0.4)))
  }

  // MARK: - 큰 나무
  private func drawBigTree(context: GraphicsContext, w: CGFloat, h: CGFloat, cx: CGFloat, groundY: CGFloat) {
    let trunkH = h * 0.42
    let trunkW = w * 0.12
    let trunkTop = groundY - trunkH
    var trunk = Path()
    trunk.move(to: CGPoint(x: cx - trunkW * 0.8, y: groundY))
    trunk.addLine(to: CGPoint(x: cx - trunkW * 0.4, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.4, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.8, y: groundY))
    trunk.closeSubpath()
    context.fill(trunk, with: .color(trunkColor))

    let branchY = trunkTop + trunkH * 0.3
    var leftBranch = Path()
    leftBranch.move(to: CGPoint(x: cx - trunkW * 0.3, y: branchY))
    leftBranch.addQuadCurve(to: CGPoint(x: cx - w * 0.28, y: branchY - h * 0.12), control: CGPoint(x: cx - w * 0.22, y: branchY + h * 0.02))
    context.stroke(leftBranch, with: .color(trunkColor), lineWidth: max(1.5, w * 0.04))

    var rightBranch = Path()
    rightBranch.move(to: CGPoint(x: cx + trunkW * 0.3, y: branchY - h * 0.05))
    rightBranch.addQuadCurve(to: CGPoint(x: cx + w * 0.26, y: branchY - h * 0.16), control: CGPoint(x: cx + w * 0.2, y: branchY - h * 0.02))
    context.stroke(rightBranch, with: .color(trunkColor), lineWidth: max(1.5, w * 0.04))

    let crownR = w * 0.38
    context.fill(Ellipse().path(in: CGRect(x: cx - crownR, y: trunkTop - crownR * 1.2, width: crownR * 2, height: crownR * 1.7)), with: .color(crownColor))
    let subR = crownR * 0.55
    context.fill(Ellipse().path(in: CGRect(x: cx - crownR * 1.05, y: trunkTop - crownR * 0.6, width: subR * 1.6, height: subR * 1.3)), with: .color(crownColor))
    context.fill(Ellipse().path(in: CGRect(x: cx + crownR * 0.25, y: trunkTop - crownR * 0.7, width: subR * 1.5, height: subR * 1.2)), with: .color(crownColor))
    let hlR = crownR * 0.35
    context.fill(Ellipse().path(in: CGRect(x: cx - hlR * 0.5, y: trunkTop - crownR * 1.0, width: hlR, height: hlR * 0.7)), with: .color(.white.opacity(0.15)))
  }

  // MARK: - 시든 나무
  private func drawWiltedTree(context: GraphicsContext, w: CGFloat, h: CGFloat, cx: CGFloat, groundY: CGFloat) {
    let trunkH = h * 0.35
    let trunkW = w * 0.10
    let tilt = w * 0.06
    let trunkTop = groundY - trunkH
    var trunk = Path()
    trunk.move(to: CGPoint(x: cx - trunkW * 0.6, y: groundY))
    trunk.addLine(to: CGPoint(x: cx - trunkW * 0.3 + tilt, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.3 + tilt, y: trunkTop))
    trunk.addLine(to: CGPoint(x: cx + trunkW * 0.6, y: groundY))
    trunk.closeSubpath()
    context.fill(trunk, with: .color(Color(hex: "#9CA3AF")))

    let crownR = w * 0.26
    context.fill(Ellipse().path(in: CGRect(x: cx - crownR + tilt, y: trunkTop - crownR * 0.5, width: crownR * 2, height: crownR * 1.2)), with: .color(Color(hex: "#9CA3AF").opacity(0.6)))
    context.fill(Ellipse().path(in: CGRect(x: cx + w * 0.15, y: groundY - h * 0.08, width: w * 0.08, height: w * 0.05)), with: .color(Color(hex: "#D1D5DB")))
  }
}

// MARK: - Isometric Tile View (Day View Core)

struct IsometricGardenView: View {
  @ObservedObject var state: CleaningGardenState
  let todayStr: String
  let calendar: Calendar
  let dateFormatter: DateFormatter
  var onMonthChange: ((Int, Int) -> Void)?

  private let gridSize = 5
  private let tileWidth: CGFloat = 52
  private var tileHeight: CGFloat { tileWidth * 0.5 }

  private var gardenWidth: CGFloat { tileWidth * CGFloat(gridSize) }
  private var gardenHeight: CGFloat { tileHeight * CGFloat(gridSize) + 90 }

  /// 현재 뷰모드+오프셋에 해당하는 날짜 범위의 트리
  private var trees: [CleaningTreeInfo] {
    let dates = datesForCurrentPeriod()
    return state.aggregatedTrees(for: dates)
  }

  var body: some View {
    VStack(spacing: 12) {
      // 날짜 헤더 (< 버튼만)
      dateHeaderWithNav

      // 아이소메트릭 그리드
      ZStack {
        ForEach(0..<gridSize, id: \.self) { row in
          ForEach(0..<gridSize, id: \.self) { col in
            let index = row * gridSize + col
            let pos = tilePosition(row: row, col: col)
            let tree = index < trees.count ? trees[index] : nil

            ZStack {
              isometricTile(row: row, col: col, hasTree: tree != nil)

              if let t = tree {
                CleaningTreeCanvasView(
                  durationSeconds: t.durationSeconds,
                  outcome: t.outcome,
                  tab: t.tab,
                  size: tileWidth * 0.65
                )
                .offset(y: -(tileHeight * 0.45))
              }
            }
            .position(x: pos.x, y: pos.y)
          }
        }
      }
      .frame(width: gardenWidth + 20, height: gardenHeight)

      // 완료 수 텍스트
      completedText
    }
  }

  // MARK: - 완료 수 텍스트

  private var completedText: some View {
    let completedCount = trees.filter { $0.outcome == "completed" }.count
    let currentOffset: Int = {
      switch state.viewMode {
      case "day": return state.dayOffset
      case "week": return state.weekOffset
      case "month": return state.monthOffset
      case "year": return state.yearOffset
      default: return 0
      }
    }()

    return Group {
      if completedCount > 0 {
        let prefix: String = {
          if currentOffset == 0 {
            switch state.viewMode {
            case "day": return "오늘"
            case "week": return "이번 주"
            case "month": return "이번 달"
            case "year": return "올해"
            default: return ""
            }
          }
          return ""
        }()
        if prefix.isEmpty {
          Text("\(completedCount)개 완료")
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(Color(hex: state.primaryColor))
        } else {
          Text("\(prefix) \(completedCount)개 완료")
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(Color(hex: state.primaryColor))
        }
      } else {
        Text("완료한 태스크가 없습니다")
          .font(.system(size: 14))
          .foregroundColor(Color(hex: "#9CA3AF"))
      }
    }
  }

  // MARK: - 날짜 헤더 + < 버튼

  private var dateHeaderWithNav: some View {
    HStack {
      Button(action: { navigateBack() }) {
        Image(systemName: "chevron.left")
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(Color(hex: "#6B7280"))
      }
      Text(headerLabel)
        .font(.system(size: 18, weight: .bold))
        .foregroundColor(Color(hex: "#1F2937"))
        .padding(.leading, 4)
      Spacer()
    }
    .padding(.horizontal, 16)
  }

  private var headerLabel: String {
    let today = Date()
    let df = DateFormatter()
    df.locale = Locale(identifier: "ko_KR")

    switch state.viewMode {
    case "day":
      guard let date = calendar.date(byAdding: .day, value: state.dayOffset, to: today) else { return "" }
      df.dateFormat = "yyyy년 M월 d일"
      let label = df.string(from: date)
      return state.dayOffset == 0 ? "\(label) (오늘)" : label
    case "week":
      guard let weekDate = calendar.date(byAdding: .weekOfYear, value: state.weekOffset, to: today),
            let sunday = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: weekDate)),
            let saturday = calendar.date(byAdding: .day, value: 6, to: sunday) else { return "" }
      df.dateFormat = "M월 d일"
      return "\(df.string(from: sunday))~\(df.string(from: saturday))"
    case "month":
      guard let monthDate = calendar.date(byAdding: .month, value: state.monthOffset, to: today) else { return "" }
      df.dateFormat = "yyyy년 M월"
      return df.string(from: monthDate)
    case "year":
      guard let yearDate = calendar.date(byAdding: .year, value: state.yearOffset, to: today) else { return "" }
      df.dateFormat = "yyyy년"
      return df.string(from: yearDate)
    default:
      return ""
    }
  }

  private func navigateBack() {
    withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
      switch state.viewMode {
      case "day":
        state.dayOffset -= 1
        checkMonthBoundary(for: .day, offset: state.dayOffset)
      case "week":
        state.weekOffset -= 1
        checkMonthBoundary(for: .week, offset: state.weekOffset)
      case "month":
        state.monthOffset -= 1
        checkMonthBoundary(for: .month, offset: state.monthOffset)
      case "year":
        state.yearOffset -= 1
        notifyYearChange(offset: state.yearOffset)
      default:
        break
      }
    }
  }

  private enum NavUnit { case day, week, month }

  private func checkMonthBoundary(for unit: NavUnit, offset: Int) {
    let today = Date()
    let targetDate: Date? = {
      switch unit {
      case .day: return calendar.date(byAdding: .day, value: offset, to: today)
      case .week: return calendar.date(byAdding: .weekOfYear, value: offset, to: today)
      case .month: return calendar.date(byAdding: .month, value: offset, to: today)
      }
    }()
    guard let date = targetDate else { return }
    let year = calendar.component(.year, from: date)
    let month = calendar.component(.month, from: date)
    onMonthChange?(year, month)
  }

  private func notifyYearChange(offset: Int) {
    let today = Date()
    guard let date = calendar.date(byAdding: .year, value: offset, to: today) else { return }
    let year = calendar.component(.year, from: date)
    // 년 뷰: year + month=1 로 알림 → RN에서 1년 범위 fetch
    onMonthChange?(year, 0)
  }

  // MARK: - 기간별 날짜 목록

  private func datesForCurrentPeriod() -> [String] {
    let today = Date()
    switch state.viewMode {
    case "day":
      guard let date = calendar.date(byAdding: .day, value: state.dayOffset, to: today) else { return [] }
      return [dateFormatter.string(from: date)]
    case "week":
      guard let weekDate = calendar.date(byAdding: .weekOfYear, value: state.weekOffset, to: today),
            let sunday = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: weekDate))
      else { return [] }
      return (0..<7).compactMap { day in
        guard let d = calendar.date(byAdding: .day, value: day, to: sunday) else { return nil }
        return dateFormatter.string(from: d)
      }
    case "month":
      guard let monthDate = calendar.date(byAdding: .month, value: state.monthOffset, to: today),
            let firstOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: monthDate)),
            let range = calendar.range(of: .day, in: .month, for: firstOfMonth)
      else { return [] }
      return range.compactMap { day in
        guard let d = calendar.date(byAdding: .day, value: day - 1, to: firstOfMonth) else { return nil }
        return dateFormatter.string(from: d)
      }
    case "year":
      guard let yearDate = calendar.date(byAdding: .year, value: state.yearOffset, to: today) else { return [] }
      let year = calendar.component(.year, from: yearDate)
      var dates: [String] = []
      for month in 1...12 {
        guard let firstOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
              let range = calendar.range(of: .day, in: .month, for: firstOfMonth)
        else { continue }
        for day in range {
          guard let d = calendar.date(byAdding: .day, value: day - 1, to: firstOfMonth) else { continue }
          dates.append(dateFormatter.string(from: d))
        }
      }
      return dates
    default:
      return []
    }
  }

  /// 그리드(row, col) → 화면좌표
  private func tilePosition(row: Int, col: Int) -> CGPoint {
    let centerX = (gardenWidth + 20) / 2
    let topY = CGFloat(gridSize) * tileHeight / 2 + 30  // 나무 높이 여유
    let x = centerX + CGFloat(col - row) * tileWidth / 2
    let y = topY + CGFloat(col + row) * tileHeight / 2
    return CGPoint(x: x, y: y)
  }

  /// 아이소메트릭 타일 (마름모 상면 + 좌측면 + 우측면)
  private func isometricTile(row: Int, col: Int, hasTree: Bool) -> some View {
    let tw = tileWidth
    let th = tileHeight

    return Canvas { context, _ in
      // 상면 (마름모)
      var top = Path()
      top.move(to: CGPoint(x: tw / 2, y: 0))       // 상
      top.addLine(to: CGPoint(x: tw, y: th / 2))    // 우
      top.addLine(to: CGPoint(x: tw / 2, y: th))    // 하
      top.addLine(to: CGPoint(x: 0, y: th / 2))     // 좌
      top.closeSubpath()
      let grassColor = hasTree
        ? Color(hex: "#4ADE80").opacity(0.8)
        : Color(hex: "#86EFAC").opacity(0.5)
      context.fill(top, with: .color(grassColor))
      context.stroke(top, with: .color(Color(hex: "#22C55E").opacity(0.3)), lineWidth: 0.5)

      let depth: CGFloat = 8

      // 좌측면
      var left = Path()
      left.move(to: CGPoint(x: 0, y: th / 2))
      left.addLine(to: CGPoint(x: tw / 2, y: th))
      left.addLine(to: CGPoint(x: tw / 2, y: th + depth))
      left.addLine(to: CGPoint(x: 0, y: th / 2 + depth))
      left.closeSubpath()
      context.fill(left, with: .color(Color(hex: "#A16207").opacity(0.6)))

      // 우측면
      var right = Path()
      right.move(to: CGPoint(x: tw, y: th / 2))
      right.addLine(to: CGPoint(x: tw / 2, y: th))
      right.addLine(to: CGPoint(x: tw / 2, y: th + depth))
      right.addLine(to: CGPoint(x: tw, y: th / 2 + depth))
      right.closeSubpath()
      context.fill(right, with: .color(Color(hex: "#92400E").opacity(0.5)))
    }
    .frame(width: tw, height: th + 8)
  }
}

// MARK: - SwiftUI Main View

struct CleaningGardenContent: View {
  @ObservedObject var state: CleaningGardenState

  var onDateSelect: ((String) -> Void)?
  var onHeightChange: ((CGFloat) -> Void)?
  var onViewModeChange: ((String) -> Void)?
  var onMonthChange: ((Int, Int) -> Void)?

  private let calendar: Calendar = {
    var cal = Calendar(identifier: .gregorian)
    cal.firstWeekday = 1
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
      viewModePicker
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 12)

      IsometricGardenView(
        state: state,
        todayStr: todayStr,
        calendar: calendar,
        dateFormatter: dateFormatter,
        onMonthChange: onMonthChange
      )

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
            state.resetOffsets()
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
    VStack(spacing: 6) {
      HStack(spacing: 12) {
        legendItem(seconds: 600, outcome: "completed", tab: "space", label: "10m+")
        legendItem(seconds: 420, outcome: "completed", tab: "space", label: "5-10m")
        legendItem(seconds: 180, outcome: "completed", tab: "space", label: "2-5m")
        legendItem(seconds: 60, outcome: "completed", tab: "space", label: "~2m")
        legendItem(seconds: 300, outcome: "abandoned", tab: "space", label: "포기")
      }
      HStack(spacing: 16) {
        tabLegendItem(tab: "space", label: "공간")
        tabLegendItem(tab: "digital", label: "디지털")
        tabLegendItem(tab: "belongings", label: "소지품")
      }
    }
  }

  private func legendItem(seconds: Int, outcome: String, tab: String, label: String) -> some View {
    HStack(spacing: 4) {
      CleaningTreeCanvasView(durationSeconds: seconds, outcome: outcome, tab: tab, size: 14)
      Text(label)
        .font(.system(size: 11))
        .foregroundColor(Color(hex: "#9CA3AF"))
    }
  }

  private func tabLegendItem(tab: String, label: String) -> some View {
    HStack(spacing: 4) {
      CleaningTreeCanvasView(durationSeconds: 600, outcome: "completed", tab: tab, size: 12)
      Text(label)
        .font(.system(size: 11))
        .foregroundColor(Color(hex: "#6B7280"))
    }
  }
}

// MARK: - Week View

struct CleaningWeekView: View {
  @ObservedObject var state: CleaningGardenState
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

      HStack(spacing: 4) {
        ForEach(Array(weekDates.enumerated()), id: \.element) { index, dateStr in
          weekColumn(dateStr: dateStr, dayLabel: dayLabels[index])
        }
      }
      .padding(.horizontal, 8)
    }
  }

  private func weekColumn(dateStr: String, dayLabel: String) -> some View {
    let trees = state.parsedDays[dateStr] ?? []
    let isToday = dateStr == todayStr
    let dayNum = dateStr.split(separator: "-").last.flatMap { Int($0) } ?? 0
    let completedCount = state.completedCount(for: dateStr)

    return Button(action: {
      onDateSelect?(dateStr)
    }) {
      VStack(spacing: 4) {
        Text(dayLabel)
          .font(.system(size: 10, weight: .semibold))
          .foregroundColor(Color(hex: dayIndex(dayLabel) == 0 ? "#EF4444" : dayIndex(dayLabel) == 6 ? "#3B82F6" : "#9CA3AF"))

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

        VStack(spacing: 2) {
          ForEach(Array(trees.prefix(3).enumerated()), id: \.offset) { _, tree in
            CleaningTreeCanvasView(durationSeconds: tree.durationSeconds, outcome: tree.outcome, tab: tree.tab, size: 24)
          }
          if trees.count > 3 {
            Text("+\(trees.count - 3)")
              .font(.system(size: 8))
              .foregroundColor(Color(hex: "#9CA3AF"))
          }
        }
        .frame(minHeight: 40)

        if completedCount > 0 {
          Text("\(completedCount)개")
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

  private func dayIndex(_ label: String) -> Int {
    dayLabels.firstIndex(of: label) ?? -1
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

// MARK: - Month View

struct CleaningMonthView: View {
  @ObservedObject var state: CleaningGardenState
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
    let trees = state.parsedDays[dateStr] ?? []
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

        if trees.isEmpty {
          Circle()
            .fill(Color(hex: "#F3F4F6"))
            .frame(width: 6, height: 6)
        } else {
          let hasCompleted = trees.contains(where: { $0.outcome == "completed" })
          let bestTree = trees.first(where: { $0.outcome == "completed" }) ?? trees.first!
          ZStack {
            CleaningTreeCanvasView(
              durationSeconds: bestTree.durationSeconds,
              outcome: hasCompleted ? "completed" : "abandoned",
              tab: bestTree.tab,
              size: 14
            )
            if trees.count > 1 {
              Text("\(trees.count)")
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
    onMonthChange?(calendar.component(.year, from: newDate), calendar.component(.month, from: newDate))
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

// MARK: - Year View

struct CleaningYearView: View {
  @ObservedObject var state: CleaningGardenState
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
      let dateStr = String(format: "%04d-%02d-01", currentYear, month)
      onMonthChange?(currentYear, month)
      onDateSelect?(dateStr)
    }) {
      VStack(spacing: 4) {
        Text("\(month)월")
          .font(.system(size: 12, weight: .semibold))
          .foregroundColor(Color(hex: "#374151"))
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
    case "healthy": return Color(hex: "#D97706")  // warm amber
    case "wilted": return Color(hex: "#D1D5DB")
    case "today": return Color(hex: state.primaryColor)
    default: return Color(hex: "#F3F4F6")
    }
  }
}

// MARK: - UIView Wrapper

class NativeCleaningGardenUIView: UIView {

  @objc var onDateSelect: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?
  @objc var onViewModeChange: RCTDirectEventBlock?
  @objc var onMonthChange: RCTDirectEventBlock?

  private let gardenState = CleaningGardenState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

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

  @objc func setGardenData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let payload = try JSONDecoder().decode(CleaningGardenPayload.self, from: data)
      var map: [String: [CleaningTreeInfo]] = [:]
      for day in payload.days {
        map[day.date] = day.trees
      }
      gardenState.parsedDays = map
    } catch {
      print("[NativeCleaningGarden] gardenData decode error: \(error)")
    }
    setupOnce()
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
      self?.emitHeight()
    }
  }

  private func emitHeight() {
    guard let hc = hostingController, bounds.width > 0 else { return }
    let size = hc.sizeThatFits(in: CGSize(width: bounds.width, height: .greatestFiniteMagnitude))
    onHeightChange?(["height": size.height])
  }

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .clear

    let swiftUIView = CleaningGardenContent(
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

@objc(NativeCleaningGardenManager)
class NativeCleaningGardenManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeCleaningGardenUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
