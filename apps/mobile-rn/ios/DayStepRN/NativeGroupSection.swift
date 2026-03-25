/**
 * NativeGroupSection — iOS 26+ 네이티브 그룹 섹션 (2열 카드 그리드)
 * 홈화면 3개 그룹(계획 세우기, 생각과기억, 일상돌보기)을 glass 카드로 렌더링
 *
 * 패턴: ObservableObject + setupOnce() (NativeCleanupAccordion 참조)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct GroupSectionItemData: Codable, Identifiable {
  let id: String
  let label: String
  let description: String
  let sfSymbol: String
  let isPro: Bool
}

// MARK: - Observable State

class GroupSectionState: ObservableObject {
  @Published var items: [GroupSectionItemData] = []
  @Published var title: String = ""
  @Published var dotColor: String = "#6366F1"
  @Published var primaryColor: String = "#6366F1"
}

// MARK: - SF Symbol Mapping

private func sfSymbolName(for id: String) -> String {
  switch id {
  case "daily-planner": return "calendar"
  case "monthly-planner": return "calendar.badge.clock"
  case "projects": return "folder"
  case "ai-chat": return "sparkles"
  case "guide": return "link"
  case "data-cleanup": return "trash"
  case "motivation": return "lightbulb"
  case "record": return "pencil.line"
  case "sleep": return "moon.fill"
  case "activity": return "chart.bar"
  case "adhd-understanding": return "brain.head.profile"
  default: return "circle"
  }
}

// MARK: - SwiftUI View

struct GroupSectionContent: View {
  @ObservedObject var state: GroupSectionState

  var onItemPress: ((String) -> Void)?

  private let columns = [
    GridItem(.flexible(), spacing: 10),
    GridItem(.flexible(), spacing: 10),
  ]

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      // 헤더: 도트 + 제목
      HStack(spacing: 8) {
        Circle()
          .fill(Color(hex: state.dotColor))
          .frame(width: 10, height: 10)

        Text(state.title)
          .font(.system(size: 16, weight: .semibold))
          .foregroundColor(Color(hex: "#1F2937"))
      }
      .padding(.bottom, 8)

      // 구분선
      Rectangle()
        .fill(Color(hex: state.dotColor).opacity(0.2))
        .frame(height: 1)
        .padding(.bottom, 12)

      // 2열 그리드
      LazyVGrid(columns: columns, spacing: 10) {
        ForEach(state.items) { item in
          Button(action: {
            onItemPress?(item.id)
          }) {
            VStack(alignment: .leading, spacing: 10) {
              // 아이콘 박스
              ZStack {
                RoundedRectangle(cornerRadius: 12)
                  .fill(Color(hex: state.primaryColor).opacity(0.08))
                  .frame(width: 40, height: 40)

                Image(systemName: item.sfSymbol.isEmpty ? sfSymbolName(for: item.id) : item.sfSymbol)
                  .font(.system(size: 20))
                  .foregroundColor(Color(hex: state.primaryColor))
              }

              // 라벨
              Text(item.label)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(hex: "#1F2937"))
                .lineLimit(1)

              // 설명
              Text(item.description)
                .font(.system(size: 12))
                .foregroundColor(Color(hex: "#9CA3AF"))
                .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .overlay(alignment: .topTrailing) {
              // PRO 뱃지
              if item.isPro {
                HStack(spacing: 2) {
                  Image(systemName: "crown.fill")
                    .font(.system(size: 8))
                    .foregroundColor(Color(hex: state.primaryColor))
                  Text("PRO")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(Color(hex: state.primaryColor))
                }
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color(hex: "#FEF3C7"))
                .cornerRadius(8)
                .padding(8)
              }
            }
          }
          .buttonStyle(.plain)
          .cleanupCardStyle()
        }
      }
    }
    .animation(.spring(response: 0.35, dampingFraction: 0.85), value: state.items.count)
  }
}

// MARK: - UIView Wrapper

class NativeGroupSectionUIView: UIView {

  @objc var onItemPress: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let sectionState = GroupSectionState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setSectionData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let items = try JSONDecoder().decode([GroupSectionItemData].self, from: data)
      sectionState.items = items
      setupOnce()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
        self?.emitHeight()
      }
    } catch {
      print("[NativeGroupSection] JSON decode error: \(error)")
    }
  }

  @objc func setTitle(_ value: NSString) {
    sectionState.title = value as String
  }

  @objc func setDotColor(_ value: NSString) {
    sectionState.dotColor = value as String
  }

  @objc func setPrimaryColor(_ value: NSString) {
    sectionState.primaryColor = value as String
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

    let swiftUIView = GroupSectionContent(
      state: sectionState,
      onItemPress: { [weak self] itemId in
        self?.onItemPress?(["itemId": itemId])
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

@objc(NativeGroupSectionManager)
class NativeGroupSectionManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeGroupSectionUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
