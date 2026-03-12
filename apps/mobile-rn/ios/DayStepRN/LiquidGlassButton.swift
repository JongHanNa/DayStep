/**
 * LiquidGlassButton — 네이티브 글라스 버튼
 * iOS 26+: SwiftUI Button + .glassEffect(in: .circle)
 * iOS 25-: JS 폴백 (RN 래퍼에서 처리)
 *
 * 패턴: LiquidGlassFuelCard.swift 참고 (SwiftUI → UIHostingController → RCTViewManager)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Observable State
class GlassButtonState: ObservableObject {
  @Published var systemIconName: String = "ellipsis"
  @Published var iconColor: String = "#6B7280"
  @Published var iconSize: CGFloat = 20
  @Published var buttonSize: CGFloat = 40
}

// MARK: - SwiftUI View (iOS 26+)
@available(iOS 26.0, *)
struct LiquidGlassButtonContent: View {
  @ObservedObject var state: GlassButtonState
  var onPress: (() -> Void)?

  var body: some View {
    Button(action: {
      onPress?()
    }) {
      Image(systemName: state.systemIconName)
        .font(.system(size: state.iconSize))
        .foregroundStyle(Color(hex: state.iconColor))
    }
    .buttonStyle(.plain)
    .glassEffect(.regular, in: .circle)
    .frame(width: state.buttonSize, height: state.buttonSize)
  }
}

// MARK: - UIView Wrapper
class LiquidGlassButtonUIView: UIView {

  // RN Props
  @objc var onButtonPress: RCTDirectEventBlock?

  private let buttonState = GlassButtonState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setSystemIconName(_ value: NSString) {
    buttonState.systemIconName = value as String
    setupOnce()
  }

  @objc func setIconColor(_ value: NSString) {
    buttonState.iconColor = value as String
  }

  @objc func setSize(_ value: NSNumber) {
    let size = CGFloat(value.doubleValue)
    buttonState.buttonSize = size
    buttonState.iconSize = size * 0.5
  }

  // MARK: - 1회 초기화 (UIHostingController 재생성 금지)
  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .clear

    guard #available(iOS 26.0, *) else {
      // iOS 25 이하: JS 폴백 (RN 래퍼에서 처리)
      return
    }

    let swiftUIView = LiquidGlassButtonContent(
      state: buttonState,
      onPress: { [weak self] in
        self?.onButtonPress?([:])
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
  }
}

// MARK: - RCTViewManager
@objc(LiquidGlassButtonManager)
class LiquidGlassButtonManager: RCTViewManager {
  override func view() -> UIView! {
    return LiquidGlassButtonUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
