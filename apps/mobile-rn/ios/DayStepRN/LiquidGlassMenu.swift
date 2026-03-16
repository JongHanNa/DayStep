/**
 * LiquidGlassMenu — SwiftUI Menu 기반 리퀴드 글라스 메뉴
 * iOS 26+: SwiftUI Menu → 리퀴드 글라스 스타일 자동 적용
 * iOS 25-: JS 폴백 (RN 래퍼에서 ActionSheetIOS 처리)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Observable State
class GlassMenuState: ObservableObject {
  @Published var systemIconName: String = "ellipsis"
  @Published var iconColor: String = "#6B7280"
  @Published var iconSize: CGFloat = 20
  @Published var buttonSize: CGFloat = 40
  @Published var menuItems: [[String: String]] = []
}

// MARK: - SwiftUI View (iOS 26+)
@available(iOS 26.0, *)
struct LiquidGlassMenuContent: View {
  @ObservedObject var state: GlassMenuState

  var onMenuItemSelect: ((String) -> Void)?

  var body: some View {
    Menu {
      ForEach(Array(state.menuItems.enumerated()), id: \.offset) { _, item in
        let title = item["title"] ?? ""
        let key = item["key"] ?? ""
        Button(title) {
          onMenuItemSelect?(key)
        }
      }
    } label: {
      Image(systemName: state.systemIconName)
        .font(.system(size: state.iconSize))
        .foregroundStyle(Color(hex: state.iconColor))
        .frame(width: state.buttonSize, height: state.buttonSize)
    }
    .contentShape(.circle)
    .glassEffect(.regular, in: .circle)
  }
}

// MARK: - UIView Wrapper
class LiquidGlassMenuUIView: UIView {

  // RN Props
  @objc var onMenuItemSelect: RCTDirectEventBlock?

  private let menuState = GlassMenuState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setSystemIconName(_ value: NSString) {
    menuState.systemIconName = value as String
    setupOnce()
  }

  @objc func setIconColor(_ value: NSString) {
    menuState.iconColor = value as String
  }

  @objc func setSize(_ value: NSNumber) {
    let size = CGFloat(value.doubleValue)
    menuState.buttonSize = size
    menuState.iconSize = size * 0.5
  }

  @objc func setMenuItems(_ value: NSArray) {
    if let items = value as? [[String: String]] {
      menuState.menuItems = items
    }
  }

  // MARK: - 1회 초기화
  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .clear

    guard #available(iOS 26.0, *) else {
      // iOS 25 이하: JS 폴백 (RN 래퍼에서 ActionSheetIOS)
      return
    }

    let swiftUIView = LiquidGlassMenuContent(
      state: menuState,
      onMenuItemSelect: { [weak self] key in
        self?.onMenuItemSelect?(["key": key])
      }
    )

    let hc = UIHostingController(rootView: AnyView(swiftUIView))
    hc.view.backgroundColor = .clear
    hostingController = hc

    addSubview(hc.view)
    hc.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      hc.view.topAnchor.constraint(equalTo: topAnchor),
      hc.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      hc.view.bottomAnchor.constraint(equalTo: bottomAnchor),
      hc.view.leadingAnchor.constraint(equalTo: leadingAnchor),
    ])
  }
}

// MARK: - RCTViewManager
@objc(LiquidGlassMenuManager)
class LiquidGlassMenuManager: RCTViewManager {
  override func view() -> UIView! {
    return LiquidGlassMenuUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
