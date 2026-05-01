/**
 * NativeFeedbackSection — iOS 네이티브 DisclosureGroup 기반 피드백 섹션
 *
 * 용도:
 *   - FeedbackBoardScreen의 상태별 섹션(검토중/진행중/완료/보류)을 네이티브 스프링 물리로 렌더
 *   - collapsible=true면 DisclosureGroup(완료/보류), false면 항상 펼침(검토중/진행중)
 *   - 각 섹션 말미에 "비공개 · N건" dimmed row 포함
 *
 * 패턴 참조: NativeCleanupAccordion.swift
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct FeedbackItemData: Codable, Identifiable {
  let id: String
  let type: String          // "bug" | "feature"
  let title: String
  let statusBadge: String   // "v1.5.0 예정" / "3일 전" / "v1.4.2 반영" 등
  let hasUnread: Bool       // admin 응답이 새로 도착했는지
  let versionTag: String?
}

// MARK: - Observable State

class FeedbackSectionState: ObservableObject {
  @Published var sectionKey: String = "review"
  @Published var title: String = ""
  @Published var statusColor: String = "#8E8E93"
  @Published var primaryColor: String = "#3B82F6"
  @Published var myCount: Int = 0
  @Published var privateCount: Int = 0
  @Published var items: [FeedbackItemData] = []
  @Published var collapsible: Bool = false
  @Published var isExpanded: Bool = true
}

// MARK: - SwiftUI Views

struct FeedbackSectionContent: View {
  @ObservedObject var state: FeedbackSectionState

  var onItemPress: ((String) -> Void)?
  var onExpandedChange: ((Bool) -> Void)?

  var body: some View {
    VStack(spacing: 0) {
      if state.collapsible {
        // DisclosureGroup: 완료/보류 — 기본 접힘
        DisclosureGroup(
          isExpanded: Binding(
            get: { state.isExpanded },
            set: { newValue in
              state.isExpanded = newValue
              onExpandedChange?(newValue)
            }
          )
        ) {
          FeedbackItemsList(state: state, onItemPress: onItemPress)
            .padding(.top, 4)
        } label: {
          FeedbackSectionHeaderLabel(state: state)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color.white)
        .cornerRadius(14)
      } else {
        // 항상 펼침: 검토중/진행중
        VStack(alignment: .leading, spacing: 0) {
          // Section header (outside card)
          HStack(spacing: 8) {
            Circle()
              .fill(Color(hex: state.statusColor))
              .frame(width: 8, height: 8)
            Text(state.title)
              .font(.system(size: 12, weight: .semibold))
              .foregroundColor(Color(hex: "#3A3A3C"))
              .textCase(.uppercase)
            Text("\(state.myCount)")
              .font(.system(size: 12, weight: .medium))
              .foregroundColor(Color(hex: "#AEAEB2"))
            Spacer()
          }
          .padding(.horizontal, 20)
          .padding(.bottom, 8)

          // Items container
          VStack(spacing: 0) {
            FeedbackItemsList(state: state, onItemPress: onItemPress)
          }
          .background(Color.white)
          .cornerRadius(14)
          .padding(.horizontal, 16)
        }
      }
    }
  }
}

/// DisclosureGroup 헤더 라벨 (완료/보류 섹션용)
struct FeedbackSectionHeaderLabel: View {
  @ObservedObject var state: FeedbackSectionState

  var body: some View {
    HStack(spacing: 10) {
      Circle()
        .fill(Color(hex: state.statusColor))
        .frame(width: 8, height: 8)
      Text(state.title)
        .font(.system(size: 15, weight: .medium))
        .foregroundColor(Color(hex: "#0A0A0A"))
      Spacer()
      if state.privateCount > 0 {
        Text("\(state.myCount) · 비공개 \(state.privateCount)건")
          .font(.system(size: 12, weight: .medium))
          .foregroundColor(Color(hex: "#AEAEB2"))
      } else {
        Text("\(state.myCount)")
          .font(.system(size: 12, weight: .medium))
          .foregroundColor(Color(hex: "#AEAEB2"))
      }
    }
  }
}

/// 아이템 리스트 + 비공개 dimmed row
struct FeedbackItemsList: View {
  @ObservedObject var state: FeedbackSectionState
  var onItemPress: ((String) -> Void)?

  var body: some View {
    VStack(spacing: 0) {
      if state.items.isEmpty && state.privateCount == 0 {
        Text("아직 제보가 없어요")
          .font(.system(size: 13))
          .foregroundColor(Color(hex: "#AEAEB2"))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 20)
      } else {
        ForEach(Array(state.items.enumerated()), id: \.element.id) { index, item in
          Button(action: { onItemPress?(item.id) }) {
            FeedbackItemRow(item: item, primaryColor: state.primaryColor)
          }
          .buttonStyle(.plain)

          if index < state.items.count - 1 {
            Divider().padding(.leading, 16)
          }
        }

        // 비공개 · N건 dimmed row
        if state.privateCount > 0 {
          if !state.items.isEmpty {
            Divider().padding(.leading, 16)
          }
          FeedbackPrivateRow(count: state.privateCount)
        }
      }
    }
  }
}

struct FeedbackItemRow: View {
  let item: FeedbackItemData
  let primaryColor: String

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      VStack(alignment: .leading, spacing: 6) {
        // Top: type tag + status badge
        HStack(spacing: 8) {
          Text(item.type == "bug" ? "버그" : "기능")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(
              item.type == "bug" ? Color(hex: "#DC2626") : Color(hex: primaryColor)
            )
            .padding(.horizontal, 7)
            .padding(.vertical, 2)
            .background(
              (item.type == "bug"
                ? Color(hex: "#DC2626")
                : Color(hex: primaryColor))
                .opacity(0.1)
            )
            .cornerRadius(4)
          Spacer()
          Text(item.statusBadge)
            .font(.system(size: 13))
            .foregroundColor(Color(hex: "#8E8E93"))
        }
        // Title
        Text(item.title)
          .font(.system(size: 17, weight: .medium))
          .foregroundColor(Color(hex: "#0A0A0A"))
          .lineLimit(2)
          .multilineTextAlignment(.leading)
      }

      if item.hasUnread {
        Circle()
          .fill(Color(hex: primaryColor))
          .frame(width: 10, height: 10)
          .padding(.top, 6)
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
    .contentShape(Rectangle())
  }
}

struct FeedbackPrivateRow: View {
  let count: Int

  var body: some View {
    HStack(spacing: 10) {
      ZStack {
        Circle()
          .fill(Color(hex: "#8E8E93").opacity(0.2))
          .frame(width: 18, height: 18)
        Image(systemName: "lock.fill")
          .font(.system(size: 9, weight: .medium))
          .foregroundColor(Color(hex: "#8E8E93"))
      }
      Text("비공개 · ")
        .font(.system(size: 13))
        .foregroundColor(Color(hex: "#8E8E93"))
      +
      Text("\(count)건")
        .font(.system(size: 13, weight: .medium))
        .foregroundColor(Color(hex: "#8E8E93"))

      Spacer()

      Text("작성자+관리자만 열람")
        .font(.system(size: 11))
        .foregroundColor(Color(hex: "#AEAEB2"))
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .background(Color(hex: "#8E8E93").opacity(0.04))
  }
}

// MARK: - UIView Wrapper

class NativeFeedbackSectionUIView: UIView {

  @objc var onItemPress: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?
  @objc var onExpandedChange: RCTDirectEventBlock?

  private let state = FeedbackSectionState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setSectionKey(_ value: NSString) {
    state.sectionKey = value as String
  }

  @objc func setTitle(_ value: NSString) {
    state.title = value as String
  }

  @objc func setStatusColor(_ value: NSString) {
    state.statusColor = value as String
  }

  @objc func setPrimaryColor(_ value: NSString) {
    state.primaryColor = value as String
  }

  @objc func setMyCount(_ value: NSNumber) {
    state.myCount = value.intValue
  }

  @objc func setPrivateCount(_ value: NSNumber) {
    state.privateCount = value.intValue
  }

  @objc func setCollapsible(_ value: Bool) {
    state.collapsible = value
  }

  @objc func setInitiallyExpanded(_ value: Bool) {
    state.isExpanded = value
  }

  @objc func setItems(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let items = try JSONDecoder().decode([FeedbackItemData].self, from: data)
      state.items = items
      setupOnce()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
        self?.emitHeight()
      }
    } catch {
      print("[NativeFeedbackSection] JSON decode error: \(error)")
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

    let swiftUIView = FeedbackSectionContent(
      state: state,
      onItemPress: { [weak self] id in
        self?.onItemPress?(["id": id])
      },
      onExpandedChange: { [weak self] expanded in
        self?.onExpandedChange?(["expanded": expanded])
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
          self?.emitHeight()
        }
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

@objc(NativeFeedbackSectionManager)
class NativeFeedbackSectionManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeFeedbackSectionUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
