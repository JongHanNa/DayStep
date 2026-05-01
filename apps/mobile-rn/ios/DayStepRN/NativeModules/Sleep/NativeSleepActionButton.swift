/**
 * NativeSleepActionButton — 기상하기 네이티브 글라스 버튼
 * iOS 26+: SwiftUI Button + .glassEffect + 텍스트
 * iOS 25-: JS 폴백 (RN 래퍼에서 처리)
 *
 * 패턴: NativeButton.swift 참고
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Observable State
class SleepActionButtonState: ObservableObject {
  @Published var title: String = "기상하기"
  @Published var backgroundColor: String = "#22C55E"
  @Published var titleColor: String = "#FFFFFF"
}

// MARK: - SwiftUI View (iOS 26+)
@available(iOS 26.0, *)
struct NativeSleepActionButtonContent: View {
  @ObservedObject var state: SleepActionButtonState
  var onPress: (() -> Void)?

  var body: some View {
    Button(action: {
      onPress?()
    }) {
      Text(state.title)
        .font(.system(size: 18, weight: .bold))
        .foregroundStyle(Color(hex: state.titleColor))
        .padding(.horizontal, 48)
        .padding(.vertical, 16)
    }
    .buttonStyle(.plain)
    .glassEffect(.regular, in: .capsule)
  }
}

// MARK: - UIView Wrapper
class NativeSleepActionButtonUIView: UIView {

  @objc var onButtonPress: RCTDirectEventBlock?

  private let buttonState = SleepActionButtonState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  @objc func setTitle(_ value: NSString) {
    buttonState.title = value as String
    setupOnce()
  }

  @objc func setButtonColor(_ value: NSString) {
    buttonState.backgroundColor = value as String
  }

  @objc func setTitleColor(_ value: NSString) {
    buttonState.titleColor = value as String
  }

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .clear

    guard #available(iOS 26.0, *) else { return }

    let swiftUIView = NativeSleepActionButtonContent(
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

  override var intrinsicContentSize: CGSize {
    return hostingController?.view.intrinsicContentSize ?? CGSize(width: 200, height: 52)
  }
}

// MARK: - RCTViewManager
@objc(NativeSleepActionButtonManager)
class NativeSleepActionButtonManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeSleepActionButtonUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
