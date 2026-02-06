//
//  PomodoroLiveActivity.swift
//  DayStepWidget
//
//  Pomodoro Timer Live Activity for Dynamic Island and Lock Screen
//

import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.2, *)
struct PomodoroLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: GenericAttributes.self) { context in
            // Lock Screen / Banner UI
            PomodoroLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Dynamic Island
                DynamicIslandExpandedRegion(.leading) {
                    PomodoroExpandedLeading(context: context)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    PomodoroExpandedTrailing(context: context)
                }
                DynamicIslandExpandedRegion(.center) {
                    PomodoroExpandedCenter(context: context)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    PomodoroExpandedBottom(context: context)
                }
            } compactLeading: {
                // Compact Leading - Icon
                PomodoroCompactLeading(context: context)
            } compactTrailing: {
                // Compact Trailing - Time
                PomodoroCompactTrailing(context: context)
            } minimal: {
                // Minimal - Just icon
                PomodoroMinimal(context: context)
            }
            .widgetURL(URL(string: "daystep://pomodoro"))
            .keylineTint(Color.purple)
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct PomodoroLockScreenView: View {
    let context: ActivityViewContext<GenericAttributes>

    private var remainingTime: String {
        context.state.values["remainingTime"] ?? "00:00"
    }

    private var progress: Double {
        Double(context.state.values["progress"] ?? "0") ?? 0
    }

    private var sessionType: String {
        context.state.values["sessionType"] ?? "focus"
    }

    private var startTime: String {
        context.state.values["startTime"] ?? ""
    }

    private var endTime: String {
        context.state.values["endTime"] ?? ""
    }

    private var todoName: String? {
        context.state.values["todoName"]
    }

    private var isCompleted: Bool {
        context.state.values["isCompleted"] == "true"
    }

    // Unix timestamp (ms) → Date 변환 (timerInterval용)
    private var endTimeMs: Double? {
        guard let str = context.state.values["endTimeMs"],
              let ms = Double(str) else { return nil }
        return ms
    }

    private var endDate: Date? {
        guard let ms = endTimeMs else { return nil }
        return Date(timeIntervalSince1970: ms / 1000.0)
    }

    private var sessionTypeText: String {
        switch sessionType {
        case "focus": return "포커스"
        case "short_break": return "짧은 휴식"
        case "long_break": return "긴 휴식"
        default: return "포커스"
        }
    }

    private var sessionColor: Color {
        switch sessionType {
        case "focus": return .purple
        case "short_break": return .green
        case "long_break": return .blue
        default: return .purple
        }
    }

    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                Image(systemName: sessionType == "focus" ? "bolt.fill" : "cup.and.saucer.fill")
                    .foregroundColor(sessionColor)
                Text("DayStep \(sessionTypeText)")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                if isCompleted {
                    Text("완료!")
                        .font(.caption)
                        .foregroundColor(.green)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.2))
                        .cornerRadius(8)
                }
            }

            // Progress Bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 12)

                    RoundedRectangle(cornerRadius: 8)
                        .fill(sessionColor)
                        .frame(width: geometry.size.width * progress, height: 12)
                }
            }
            .frame(height: 12)

            // Time Display - iOS 자동 카운트다운
            HStack {
                if let endDate = endDate, endDate > Date() {
                    Text(timerInterval: Date()...endDate, countsDown: true)
                        .font(.system(size: 36, weight: .bold, design: .monospaced))
                        .monospacedDigit()
                        .foregroundColor(.primary)
                } else {
                    Text(remainingTime)
                        .font(.system(size: 36, weight: .bold, design: .monospaced))
                        .foregroundColor(.primary)
                }
            }

            // Time Range & Todo
            HStack {
                if !startTime.isEmpty && !endTime.isEmpty {
                    Text("\(startTime) → \(endTime)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }

            if let todoName = todoName, !todoName.isEmpty {
                HStack {
                    Image(systemName: "checklist")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(todoName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                    Spacer()
                }
            }
        }
        .padding()
        .activityBackgroundTint(Color(UIColor.systemBackground))
        .activitySystemActionForegroundColor(sessionColor)
    }
}

// MARK: - Dynamic Island Expanded Views

@available(iOS 16.2, *)
struct PomodoroExpandedLeading: View {
    let context: ActivityViewContext<GenericAttributes>

    private var sessionType: String {
        context.state.values["sessionType"] ?? "focus"
    }

    private var sessionColor: Color {
        switch sessionType {
        case "focus": return .purple
        case "short_break": return .green
        case "long_break": return .blue
        default: return .purple
        }
    }

    var body: some View {
        Image(systemName: sessionType == "focus" ? "bolt.fill" : "cup.and.saucer.fill")
            .font(.title2)
            .foregroundColor(sessionColor)
    }
}

@available(iOS 16.2, *)
struct PomodoroExpandedTrailing: View {
    let context: ActivityViewContext<GenericAttributes>

    private var remainingTime: String {
        context.state.values["remainingTime"] ?? "00:00"
    }

    private var endDate: Date? {
        guard let str = context.state.values["endTimeMs"],
              let ms = Double(str) else { return nil }
        return Date(timeIntervalSince1970: ms / 1000.0)
    }

    var body: some View {
        if let endDate = endDate, endDate > Date() {
            Text(timerInterval: Date()...endDate, countsDown: true)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
                .monospacedDigit()
                .foregroundColor(.white)
        } else {
            Text(remainingTime)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
        }
    }
}

@available(iOS 16.2, *)
struct PomodoroExpandedCenter: View {
    let context: ActivityViewContext<GenericAttributes>

    private var sessionType: String {
        context.state.values["sessionType"] ?? "focus"
    }

    private var sessionTypeText: String {
        switch sessionType {
        case "focus": return "포커스 세션"
        case "short_break": return "짧은 휴식"
        case "long_break": return "긴 휴식"
        default: return "포커스 세션"
        }
    }

    var body: some View {
        Text(sessionTypeText)
            .font(.caption)
            .foregroundColor(.white.opacity(0.8))
    }
}

@available(iOS 16.2, *)
struct PomodoroExpandedBottom: View {
    let context: ActivityViewContext<GenericAttributes>

    private var progress: Double {
        Double(context.state.values["progress"] ?? "0") ?? 0
    }

    private var sessionType: String {
        context.state.values["sessionType"] ?? "focus"
    }

    private var startTime: String {
        context.state.values["startTime"] ?? ""
    }

    private var endTime: String {
        context.state.values["endTime"] ?? ""
    }

    private var todoName: String? {
        context.state.values["todoName"]
    }

    private var sessionColor: Color {
        switch sessionType {
        case "focus": return .purple
        case "short_break": return .green
        case "long_break": return .blue
        default: return .purple
        }
    }

    var body: some View {
        VStack(spacing: 8) {
            // Progress Bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.3))
                        .frame(height: 6)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(sessionColor)
                        .frame(width: geometry.size.width * progress, height: 6)
                }
            }
            .frame(height: 6)

            // Time Range
            HStack {
                if !startTime.isEmpty && !endTime.isEmpty {
                    Text("\(startTime) → \(endTime)")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.7))
                }
                Spacer()
                if let todoName = todoName, !todoName.isEmpty {
                    Text(todoName)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(1)
                }
            }
        }
    }
}

// MARK: - Compact Views

@available(iOS 16.2, *)
struct PomodoroCompactLeading: View {
    let context: ActivityViewContext<GenericAttributes>

    private var sessionType: String {
        context.state.values["sessionType"] ?? "focus"
    }

    private var sessionColor: Color {
        switch sessionType {
        case "focus": return .purple
        case "short_break": return .green
        case "long_break": return .blue
        default: return .purple
        }
    }

    var body: some View {
        Image(systemName: sessionType == "focus" ? "bolt.fill" : "cup.and.saucer.fill")
            .foregroundColor(sessionColor)
    }
}

@available(iOS 16.2, *)
struct PomodoroCompactTrailing: View {
    let context: ActivityViewContext<GenericAttributes>

    private var remainingTime: String {
        context.state.values["remainingTime"] ?? "00:00"
    }

    private var endDate: Date? {
        guard let str = context.state.values["endTimeMs"],
              let ms = Double(str) else { return nil }
        return Date(timeIntervalSince1970: ms / 1000.0)
    }

    var body: some View {
        if let endDate = endDate, endDate > Date() {
            Text(timerInterval: Date()...endDate, countsDown: true)
                .font(.system(size: 14, weight: .semibold, design: .monospaced))
                .monospacedDigit()
                .foregroundColor(.white)
        } else {
            Text(remainingTime)
                .font(.system(size: 14, weight: .semibold, design: .monospaced))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Minimal View

@available(iOS 16.2, *)
struct PomodoroMinimal: View {
    let context: ActivityViewContext<GenericAttributes>

    private var sessionType: String {
        context.state.values["sessionType"] ?? "focus"
    }

    private var sessionColor: Color {
        switch sessionType {
        case "focus": return .purple
        case "short_break": return .green
        case "long_break": return .blue
        default: return .purple
        }
    }

    var body: some View {
        Image(systemName: sessionType == "focus" ? "bolt.fill" : "cup.and.saucer.fill")
            .foregroundColor(sessionColor)
    }
}

// MARK: - Preview

@available(iOS 16.2, *)
struct PomodoroLiveActivity_Previews: PreviewProvider {
    static var previews: some View {
        // Preview using GenericAttributes
        let attributes = GenericAttributes(
            id: "pomodoro-preview",
            staticValues: ["appName": "DayStep"]
        )
        let contentState = GenericAttributes.ContentState(values: [
            "remainingTime": "24:48",
            "progress": "0.85",
            "sessionType": "focus",
            "startTime": "17:05",
            "endTime": "17:30",
            "todoName": "프로젝트 작업하기",
            "isCompleted": "false"
        ])

        attributes
            .previewContext(contentState, viewKind: .content)
            .previewDisplayName("Lock Screen")
    }
}
