/**
 * NativeTimelineAccordion — iOS 26+ 타임라인 (DisclosureGroup 스타일)
 * 날짜별 섹션, 타임라인 레일+도트, glassEffect
 *
 * 패턴: ObservableObject + setupOnce() (NativeCleanupAccordion 참조)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct TimelineMotivationData: Codable, Identifiable {
  let id: String
  let title: String
  let content: String
  let emotion_tag: String
  let is_banner_pinned: Bool
  let created_at: String
  let todo_count: Int
}

struct TimelineSectionData: Codable, Identifiable {
  let key: String
  let label: String
  let motivations: [TimelineMotivationData]

  var id: String { key }
}

// MARK: - Observable State

class TimelineAccordionState: ObservableObject {
  @Published var sections: [TimelineSectionData] = []
  @Published var primaryColor: String = "#6366F1"
  @Published var expandedMotivationIds: Set<String> = []
}

// MARK: - Emotion Color Mapping

private func emotionDotColor(for tag: String) -> Color {
  switch tag {
  case "joy": return Color(hex: "#E11D48")
  case "gratitude": return Color(hex: "#2563EB")
  case "awakening": return Color(hex: "#EA580C")
  case "determination": return Color(hex: "#9333EA")
  default: return Color(hex: "#D1D5DB")
  }
}

// MARK: - Conditional Glass Modifier

extension View {
  @ViewBuilder
  func timelineCardStyle() -> some View {
    if #available(iOS 26.0, *) {
      self.glassEffect(in: .rect(cornerRadius: 14))
    } else {
      self
        .background(Color.white)
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.04), radius: 6, y: 1)
    }
  }
}

// MARK: - Time Formatter

private func formatTime(_ isoString: String) -> String {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  guard let date = formatter.date(from: isoString) else {
    // Fallback without fractional seconds
    formatter.formatOptions = [.withInternetDateTime]
    guard let date = formatter.date(from: isoString) else { return "" }
    return formatTimeFromDate(date)
  }
  return formatTimeFromDate(date)
}

private func formatTimeFromDate(_ date: Date) -> String {
  let df = DateFormatter()
  df.locale = Locale(identifier: "ko_KR")
  df.dateFormat = "a h:mm"
  return df.string(from: date)
}

// MARK: - Motivation Card View

struct TimelineMotivationCardView: View {
  let note: TimelineMotivationData
  let isExpanded: Bool
  let primaryColor: String

  var onToggle: ((String) -> Void)?
  var onEdit: ((String) -> Void)?
  var onLongPress: ((String, String) -> Void)?

  var body: some View {
    Button(action: {
      onToggle?(note.id)
    }) {
      VStack(alignment: .leading, spacing: 6) {
        // Header: time + title
        HStack(spacing: 8) {
          Text(formatTime(note.created_at))
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(Color(hex: "#9CA3AF"))

          if !note.title.isEmpty {
            Text(note.title)
              .font(.system(size: 14, weight: .semibold))
              .foregroundColor(Color(hex: "#374151"))
              .lineLimit(1)
          }

          Spacer()
        }

        // Content
        if isExpanded {
          Text(note.content)
            .font(.system(size: 14))
            .foregroundColor(Color(hex: "#4B5563"))
            .lineSpacing(3)
        } else {
          Text(note.content)
            .font(.system(size: 14))
            .foregroundColor(Color(hex: "#4B5563"))
            .lineLimit(2)
            .lineSpacing(3)
        }

        // Expanded: todos + edit
        if isExpanded {
          if note.todo_count > 0 {
            HStack(spacing: 4) {
              Image(systemName: "link")
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "#6B7280"))
              Text("연결된 할일 \(note.todo_count)개")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color(hex: "#6B7280"))
            }
            .padding(.top, 4)
          }

          Button(action: {
            onEdit?(note.id)
          }) {
            HStack(spacing: 6) {
              Image(systemName: "pencil")
                .font(.system(size: 12, weight: .medium))
              Text("편집")
                .font(.system(size: 14, weight: .semibold))
            }
            .foregroundColor(Color(hex: primaryColor))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Color(hex: "#F3F4F6"))
            .cornerRadius(12)
          }
          .buttonStyle(.plain)
          .padding(.top, 6)
        }
      }
      .padding(14)
    }
    .buttonStyle(.plain)
    .timelineCardStyle()
    .contextMenu {
      Button(action: {
        onLongPress?(note.id, "pin")
      }) {
        Label(note.is_banner_pinned ? "배너 해제" : "배너 고정",
              systemImage: note.is_banner_pinned ? "pin.slash" : "pin")
      }
      Button(role: .destructive, action: {
        onLongPress?(note.id, "delete")
      }) {
        Label("삭제", systemImage: "trash")
      }
    }
  }
}

// MARK: - Main Content View

struct TimelineAccordionContent: View {
  @ObservedObject var state: TimelineAccordionState

  var onMotivationToggle: ((String) -> Void)?
  var onMotivationEdit: ((String) -> Void)?
  var onMotivationLongPress: ((String, String) -> Void)?

  var body: some View {
    VStack(alignment: .leading, spacing: 20) {
      ForEach(state.sections) { section in
        VStack(alignment: .leading, spacing: 12) {
          // Date header
          Text(section.label)
            .font(.system(size: 15, weight: .bold))
            .foregroundColor(Color(hex: "#1F2937"))
            .padding(.leading, 4)

          // Timeline rail + cards
          HStack(alignment: .top, spacing: 0) {
            // Rail column
            VStack(spacing: 0) {
              ForEach(Array(section.motivations.enumerated()), id: \.element.id) { index, note in
                VStack(spacing: 0) {
                  // Dot
                  Circle()
                    .fill(emotionDotColor(for: note.emotion_tag))
                    .frame(width: 10, height: 10)
                    .padding(.top, 14)

                  // Rail line (not for last)
                  if index < section.motivations.count - 1 {
                    Rectangle()
                      .fill(Color(hex: "#E5E7EB"))
                      .frame(width: 2)
                      .frame(minHeight: 40)
                  }
                }
              }
            }
            .frame(width: 20)

            // Cards column
            VStack(spacing: 8) {
              ForEach(section.motivations) { note in
                let isExpanded = state.expandedMotivationIds.contains(note.id)
                TimelineMotivationCardView(
                  note: note,
                  isExpanded: isExpanded,
                  primaryColor: state.primaryColor,
                  onToggle: onMotivationToggle,
                  onEdit: onMotivationEdit,
                  onLongPress: onMotivationLongPress
                )
                .animation(.spring(response: 0.4, dampingFraction: 0.8), value: isExpanded)
              }
            }
            .padding(.leading, 4)
          }
        }
      }
    }
    .padding(.horizontal, 16)
  }
}

// MARK: - UIView Wrapper

class NativeTimelineAccordionUIView: UIView {

  // RN Event Blocks
  @objc var onMotivationToggle: RCTDirectEventBlock?
  @objc var onMotivationEdit: RCTDirectEventBlock?
  @objc var onMotivationLongPress: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let timelineState = TimelineAccordionState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setTimelineData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let sections = try JSONDecoder().decode([TimelineSectionData].self, from: data)
      timelineState.sections = sections
      setupOnce()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
        self?.emitHeight()
      }
    } catch {
      print("[NativeTimelineAccordion] JSON decode error: \(error)")
    }
  }

  @objc func setPrimaryColor(_ value: NSString) {
    timelineState.primaryColor = value as String
  }

  @objc func setExpandedNoteIds(_ value: NSArray) {
    var ids = Set<String>()
    for item in value {
      if let str = item as? String {
        ids.insert(str)
      }
    }
    timelineState.expandedMotivationIds = ids
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

    let swiftUIView = TimelineAccordionContent(
      state: timelineState,
      onMotivationToggle: { [weak self] noteId in
        self?.onMotivationToggle?(["motivationId": noteId])
      },
      onMotivationEdit: { [weak self] noteId in
        self?.onMotivationEdit?(["motivationId": noteId])
      },
      onMotivationLongPress: { [weak self] noteId, action in
        self?.onMotivationLongPress?(["motivationId": noteId, "action": action])
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

@objc(NativeTimelineAccordionManager)
class NativeTimelineAccordionManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeTimelineAccordionUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
