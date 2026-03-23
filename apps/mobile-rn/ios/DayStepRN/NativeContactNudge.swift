/**
 * NativeContactNudge — iOS 26+ 연락 추천 리스트
 * 각 셀: 우선순위 dot + 이름/닉네임 + 일수 + 관계 태그 + "안부" 버튼
 *
 * 패턴: ObservableObject + setupOnce()
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct ContactPersonData: Codable {
  let name: String
  let nickname: String?
  let relationships: [String]
}

struct ContactRecommendationData: Codable, Identifiable {
  let person: ContactPersonData
  let daysSinceContact: Int
  let priority: String // "high" | "medium" | "normal"

  var id: String { person.name }
}

// MARK: - Observable State

class ContactNudgeState: ObservableObject {
  @Published var contacts: [ContactRecommendationData] = []
  @Published var primaryColor: String = "#6366F1"
}

// MARK: - Priority Color

private func priorityColor(for priority: String) -> Color {
  switch priority {
  case "high": return Color(hex: "#EF4444")
  case "medium": return Color(hex: "#F97316")
  default: return Color(hex: "#22C55E")
  }
}

// MARK: - SwiftUI View

struct ContactNudgeContent: View {
  @ObservedObject var state: ContactNudgeState

  var onContactPress: ((String) -> Void)?

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      // 헤더
      HStack(spacing: 8) {
        Text("연락할 사람")
          .font(.system(size: 18, weight: .semibold))
          .foregroundColor(Color(hex: "#1F2937"))

        if !state.contacts.isEmpty {
          Text("\(state.contacts.count)")
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(Color(hex: state.primaryColor))
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(Color(hex: state.primaryColor).opacity(0.1))
            .cornerRadius(10)
        }
      }

      if state.contacts.isEmpty {
        // 빈 상태
        VStack(spacing: 8) {
          Image(systemName: "heart.circle")
            .font(.system(size: 32))
            .foregroundColor(Color(hex: state.primaryColor).opacity(0.3))

          Text("소중한 사람을 등록하면\n연락 리마인더를 받을 수 있어요")
            .font(.system(size: 14))
            .foregroundColor(Color(hex: "#9CA3AF"))
            .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .cleanupCardStyle()
      } else {
        // 연락처 리스트
        ForEach(state.contacts) { contact in
          HStack(spacing: 12) {
            // 좌측: 정보
            VStack(alignment: .leading, spacing: 4) {
              // 이름 + 우선순위 dot
              HStack(spacing: 8) {
                Circle()
                  .fill(priorityColor(for: contact.priority))
                  .frame(width: 8, height: 8)

                Text(contact.person.name + (contact.person.nickname.map { " (\($0))" } ?? ""))
                  .font(.system(size: 14, weight: .semibold))
                  .foregroundColor(Color(hex: "#1F2937"))
              }

              // 일수
              Text(contact.daysSinceContact >= 999
                ? "아직 연락한 기록이 없어요"
                : "\(contact.daysSinceContact)일 전 마지막 연락")
                .font(.system(size: 12))
                .foregroundColor(Color(hex: "#9CA3AF"))
                .padding(.leading, 16)

              // 관계 태그
              if !contact.person.relationships.isEmpty {
                HStack(spacing: 4) {
                  ForEach(contact.person.relationships, id: \.self) { rel in
                    Text(rel)
                      .font(.system(size: 12))
                      .foregroundColor(Color(hex: state.primaryColor).opacity(0.7))
                      .padding(.horizontal, 6)
                      .padding(.vertical, 2)
                      .background(Color(hex: state.primaryColor).opacity(0.08))
                      .cornerRadius(8)
                  }
                }
                .padding(.leading, 16)
              }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // 우측: 안부 버튼
            Button(action: {
              onContactPress?(contact.person.name)
            }) {
              HStack(spacing: 4) {
                Image(systemName: "square.and.pencil")
                  .font(.system(size: 12))
                  .foregroundColor(Color(hex: state.primaryColor))

                Text("소식기록")
                  .font(.system(size: 12, weight: .medium))
                  .foregroundColor(Color(hex: state.primaryColor))
              }
              .padding(.horizontal, 12)
              .padding(.vertical, 8)
              .background(Color(hex: state.primaryColor).opacity(0.1))
              .cornerRadius(10)
            }
            .buttonStyle(.plain)
          }
          .padding(14)
          .cleanupCardStyle()
        }
      }
    }
  }
}

// MARK: - UIView Wrapper

class NativeContactNudgeUIView: UIView {

  @objc var onContactPress: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let nudgeState = ContactNudgeState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setPrimaryColor(_ value: NSString) {
    nudgeState.primaryColor = value as String
  }

  @objc func setContactsData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let contacts = try JSONDecoder().decode([ContactRecommendationData].self, from: data)
      nudgeState.contacts = contacts
      setupOnce()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
        self?.emitHeight()
      }
    } catch {
      print("[NativeContactNudge] JSON decode error: \(error)")
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

    let swiftUIView = ContactNudgeContent(
      state: nudgeState,
      onContactPress: { [weak self] personName in
        self?.onContactPress?(["personName": personName])
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

@objc(NativeContactNudgeManager)
class NativeContactNudgeManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeContactNudgeUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
