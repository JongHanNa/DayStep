/**
 * NativeCleanupAccordion — iOS 26+ DisclosureGroup 기반 아코디언
 * CleanupScreen의 그룹 확장/축소를 네이티브 스프링 물리로 처리
 *
 * 패턴: ObservableObject + setupOnce() (LiquidGlassMotivationCard 참조)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct AccordionCategoryData: Codable, Identifiable {
  let key: String
  let title: String
  let count: Int

  var id: String { key }
}

struct AccordionGroupData: Codable, Identifiable {
  let groupTitle: String
  let shade: Double
  let categories: [AccordionCategoryData]

  var id: String { groupTitle }
}

// MARK: - Observable State

class CleanupAccordionState: ObservableObject {
  @Published var groups: [AccordionGroupData] = []
  @Published var primaryColor: String = "#6366F1"
  @Published var expandedIndices: Set<Int> = [0]
}

// MARK: - SF Symbol Mapping

private func sfSymbolName(for key: String) -> String {
  switch key {
  case "activeTodos": return "circle.dotted"
  case "pastDue": return "clock"
  case "completed": return "checkmark.circle"
  case "activeHabits": return "arrow.triangle.2.circlepath"
  case "pastRecurring": return "repeat"
  case "completedProjects": return "folder.badge.checkmark"
  case "onHoldProjects": return "pause.circle"
  case "allNotes": return "lightbulb"
  case "oldInteractions": return "calendar"
  default: return "circle"
  }
}

// MARK: - SwiftUI View

struct CleanupAccordionContent: View {
  @ObservedObject var state: CleanupAccordionState

  var onCategoryPress: ((String) -> Void)?
  var onGroupToggle: ((Int) -> Void)?

  var body: some View {
    VStack(spacing: 10) {
      ForEach(Array(state.groups.enumerated()), id: \.element.id) { index, group in
        let isExpanded = state.expandedIndices.contains(index)
        let dotColor = Color(hex: state.primaryColor).opacity(group.shade)
        let groupCount = group.categories.reduce(0) { $0 + $1.count }

        VStack(spacing: 0) {
          // Header
          Button(action: {
            onGroupToggle?(index)
          }) {
            HStack(spacing: 10) {
              Circle()
                .fill(dotColor)
                .frame(width: 10, height: 10)

              Text(group.groupTitle)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(Color(hex: "#0F172A"))

              Spacer()

              Text("\(groupCount)건")
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "#94A3B8"))

              Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color(hex: "#94A3B8"))
                .rotationEffect(.degrees(isExpanded ? 90 : 0))
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
          }
          .buttonStyle(.plain)

          // Body
          if isExpanded {
            if groupCount == 0 {
              Text("정리할 항목이 없어요")
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "#94A3B8"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else {
              ForEach(Array(group.categories.enumerated()), id: \.element.id) { catIndex, cat in
                Button(action: {
                  onCategoryPress?(cat.key)
                }) {
                  HStack(spacing: 10) {
                    Image(systemName: sfSymbolName(for: cat.key))
                      .font(.system(size: 16))
                      .foregroundColor(Color(hex: state.primaryColor))
                      .frame(width: 20)

                    Text(cat.title)
                      .font(.system(size: 14))
                      .foregroundColor(Color(hex: "#0F172A"))

                    Spacer()

                    Text("\(cat.count)건")
                      .font(.system(size: 13))
                      .foregroundColor(Color(hex: "#94A3B8"))

                    Image(systemName: "chevron.right")
                      .font(.system(size: 12))
                      .foregroundColor(Color(hex: "#CBD5E1"))
                  }
                  .padding(.vertical, 14)
                  .padding(.horizontal, 16)
                }
                .buttonStyle(.plain)

                if catIndex < group.categories.count - 1 {
                  Divider()
                    .padding(.leading, 46)
                }
              }
            }
          }
        }
        .cleanupCardStyle()
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: isExpanded)
      }
    }
  }
}

// MARK: - UIView Wrapper

class NativeCleanupAccordionUIView: UIView {

  // RN Event Blocks
  @objc var onCategoryPress: RCTDirectEventBlock?
  @objc var onGroupToggle: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let accordionState = CleanupAccordionState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setAccordionData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let groups = try JSONDecoder().decode([AccordionGroupData].self, from: data)
      accordionState.groups = groups
      setupOnce()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
        self?.emitHeight()
      }
    } catch {
      print("[NativeCleanupAccordion] JSON decode error: \(error)")
    }
  }

  @objc func setPrimaryColor(_ value: NSString) {
    accordionState.primaryColor = value as String
  }

  @objc func setExpandedGroups(_ value: NSArray) {
    var indices = Set<Int>()
    for item in value {
      if let num = item as? NSNumber {
        indices.insert(num.intValue)
      }
    }
    accordionState.expandedIndices = indices
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

    let swiftUIView = CleanupAccordionContent(
      state: accordionState,
      onCategoryPress: { [weak self] key in
        self?.onCategoryPress?(["categoryKey": key])
      },
      onGroupToggle: { [weak self] index in
        self?.onGroupToggle?(["groupIndex": index])
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

@objc(NativeCleanupAccordionManager)
class NativeCleanupAccordionManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeCleanupAccordionUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
