/**
 * LiquidGlassFuelCard — Phase 2
 * iOS 26+: SwiftUI glassEffectID matched geometry morphing (컴팩트 ↔ 확장 패널)
 * iOS 25-: JS 폴백 (기존 LinearGradient 카드) 사용
 *
 * 핵심: ObservableObject + setupOnce() 패턴으로 UIHostingController 1회 생성
 *       → @Namespace 유지 → glassEffectID morphing 끊김 방지
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Observable State
class FuelCardState: ObservableObject {
  @Published var isExpanded: Bool = false
  @Published var noteTitle: String = ""
  @Published var noteContent: String = ""
  @Published var hasNote: Bool = false
}

// MARK: - SwiftUI View (iOS 26+)
@available(iOS 26.0, *)
struct LiquidGlassFuelCardContent: View {
  @ObservedObject var state: FuelCardState
  // @Namespace는 setupOnce()로 1회만 생성되는 UIHostingController 안에서 유지됨
  @Namespace private var morphNamespace

  var onExpand: (() -> Void)?
  var onCollapse: (() -> Void)?

  var body: some View {
    GlassEffectContainer {
      if state.isExpanded {
        expandedPanel
      } else {
        compactCard
      }
    }
    .animation(.spring(response: 0.4, dampingFraction: 0.8), value: state.isExpanded)
  }

  // MARK: Compact Card
  private var compactCard: some View {
    Button(action: {
      withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
        onExpand?()
      }
    }) {
      HStack(spacing: 12) {
        Image(systemName: "flame.fill")
          .foregroundColor(Color(hex: "#92400E"))
          .font(.system(size: 22))

        VStack(alignment: .leading, spacing: 2) {
          Text("나의 원동력")
            .font(.system(size: 18, weight: .semibold))
            .foregroundColor(Color(hex: "#92400E"))

          if state.hasNote && !state.noteTitle.isEmpty {
            Text(state.noteTitle)
              .font(.system(size: 14))
              .foregroundColor(Color(hex: "#92400E").opacity(0.8))
              .lineLimit(1)
          }
        }

        Spacer()

        Image(systemName: "chevron.down")
          .foregroundColor(Color(hex: "#92400E").opacity(0.6))
          .font(.system(size: 14, weight: .medium))
      }
      .padding(16)
    }
    .buttonStyle(.plain)
    .glassEffect(in: .rect(cornerRadius: 16))
    .glassEffectID("fuelcard", in: morphNamespace)
  }

  // MARK: Expanded Panel
  private var expandedPanel: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Image(systemName: "flame.fill")
          .foregroundColor(Color(hex: "#92400E"))
          .font(.system(size: 22))
        Text("나의 원동력")
          .font(.system(size: 18, weight: .semibold))
          .foregroundColor(Color(hex: "#92400E"))

        Spacer()

        Button(action: {
          withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
            onCollapse?()
          }
        }) {
          Image(systemName: "chevron.up")
            .foregroundColor(Color(hex: "#92400E").opacity(0.6))
            .font(.system(size: 14, weight: .medium))
            .padding(8)
        }
        .buttonStyle(.plain)
      }

      if state.hasNote {
        if !state.noteTitle.isEmpty {
          Text(state.noteTitle)
            .font(.system(size: 16, weight: .medium))
            .foregroundColor(Color(hex: "#92400E"))
        }
        Text(state.noteContent)
          .font(.system(size: 14))
          .foregroundColor(Color(hex: "#92400E").opacity(0.8))
          .fixedSize(horizontal: false, vertical: true)
      } else {
        Text("아직 원동력이 없어요.\nNotes에서 원동력을 기록해보세요.")
          .font(.system(size: 14))
          .foregroundColor(Color(hex: "#92400E").opacity(0.6))
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .padding(16)
    .glassEffect(in: .rect(cornerRadius: 20))
    .glassEffectID("fuelcard", in: morphNamespace)
  }
}

// MARK: - UIView Wrapper
class LiquidGlassFuelCardUIView: UIView {

  // RN Props
  @objc var onExpand: RCTDirectEventBlock?
  @objc var onCollapse: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let cardState = FuelCardState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setNoteTitle(_ value: NSString) {
    cardState.noteTitle = value as String
  }

  @objc func setNoteContent(_ value: NSString) {
    cardState.noteContent = value as String
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
      self?.emitHeight()
    }
  }

  @objc func setHasNote(_ value: Bool) {
    cardState.hasNote = value
    setupOnce()
  }

  @objc func setIsExpanded(_ value: Bool) {
    cardState.isExpanded = value
    // 타겟 높이를 빨리 보고 → RN에서 withSpring으로 애니메이션
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
      self?.emitHeight()
    }
  }

  // MARK: - 높이 측정 및 이벤트 발행
  private func emitHeight() {
    guard let hc = hostingController, bounds.width > 0 else { return }
    let size = hc.sizeThatFits(in: CGSize(width: bounds.width, height: .greatestFiniteMagnitude))
    onHeightChange?(["height": size.height])
  }

  // MARK: - 1회 초기화 (@Namespace 유지를 위해 UIHostingController 재생성 금지)
  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .clear

    guard #available(iOS 26.0, *) else {
      // iOS 25 이하: JS 폴백 (기존 FuelCard 렌더링)
      return
    }

    let swiftUIView = LiquidGlassFuelCardContent(
      state: cardState,
      onExpand: { [weak self] in
        self?.onExpand?([:])
      },
      onCollapse: { [weak self] in
        self?.onCollapse?([:])
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

    // 초기 렌더링 완료 후 높이 보고
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
      self?.emitHeight()
    }
  }
}

// MARK: - RCTViewManager
@objc(LiquidGlassFuelCardManager)
class LiquidGlassFuelCardManager: RCTViewManager {
  override func view() -> UIView! {
    return LiquidGlassFuelCardUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
