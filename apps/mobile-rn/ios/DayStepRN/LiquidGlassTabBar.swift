/**
 * LiquidGlassTabBar — Phase 1
 * iOS 26+: SwiftUI .glassEffect(in: .capsule) 네이티브 탭바
 * iOS 25-: JS 폴백 (GlassBackground) 사용 — 이 파일의 뷰는 렌더링 안됨
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Tab Data
struct TabItem {
  let name: String
  let sfSymbol: String
}

// MARK: - Observable State (UIHostingController 재생성 방지)
class TabBarState: ObservableObject {
  @Published var tabs: [TabItem] = []
  @Published var selectedIndex: Int = 0
  @Published var primaryColor: Color = Color(hex: "#F97316")
}

// MARK: - SwiftUI View (iOS 26+)
@available(iOS 26.0, *)
struct LiquidGlassTabBarContent: View {
  @ObservedObject var state: TabBarState
  var onTabPress: ((Int) -> Void)?

  var body: some View {
    HStack(spacing: 0) {
      ForEach(Array(state.tabs.enumerated()), id: \.offset) { index, tab in
        Button {
          onTabPress?(index)
        } label: {
          VStack(spacing: 4) {
            Image(systemName: tab.sfSymbol)
              .font(.system(
                size: 22,
                weight: index == state.selectedIndex ? .semibold : .regular
              ))
              .foregroundColor(
                index == state.selectedIndex
                  ? state.primaryColor
                  : Color(red: 0.612, green: 0.639, blue: 0.686)
              )
              .frame(height: 24)
              .animation(
                .spring(response: 0.3, dampingFraction: 0.8),
                value: state.selectedIndex
              )

            if index == state.selectedIndex {
              Capsule()
                .fill(state.primaryColor)
                .frame(width: 20, height: 3)
                .transition(.scale.combined(with: .opacity))
            } else {
              Color.clear.frame(height: 3)
            }
          }
          .frame(maxWidth: .infinity)
          .padding(.vertical, 10)
          .animation(
            .spring(response: 0.3, dampingFraction: 0.8),
            value: state.selectedIndex
          )
        }
        .buttonStyle(.plain)
      }
    }
    .frame(maxWidth: .infinity)
    .glassEffect(in: .capsule)
  }
}

// MARK: - UIView Wrapper
class LiquidGlassTabBarUIView: UIView {

  // RN Props
  @objc var onTabPress: RCTDirectEventBlock?

  private let tabState = TabBarState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters (RN 메인 스레드에서 호출)

  @objc func setTabs(_ value: NSArray) {
    var items: [TabItem] = []
    for item in value {
      guard
        let dict = item as? [String: Any],
        let name = dict["name"] as? String,
        let sfSymbol = dict["sfSymbol"] as? String
      else { continue }
      items.append(TabItem(name: name, sfSymbol: sfSymbol))
    }
    tabState.tabs = items
    setupOnce()
  }

  @objc func setSelectedIndex(_ value: NSNumber) {
    tabState.selectedIndex = value.intValue
  }

  @objc func setPrimaryColor(_ value: NSString) {
    tabState.primaryColor = Color(hex: value as String)
  }

  // MARK: - 1회 초기화
  private func setupOnce() {
    guard !hasSetUp, !tabState.tabs.isEmpty else { return }
    hasSetUp = true
    backgroundColor = .clear

    guard #available(iOS 26.0, *) else {
      // iOS 25 이하: JS 폴백 사용 (이 뷰는 비어있음)
      return
    }

    let swiftUIView = LiquidGlassTabBarContent(state: tabState) { [weak self] index in
      self?.onTabPress?(["index": index])
    }

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
@objc(LiquidGlassTabBarManager)
class LiquidGlassTabBarManager: RCTViewManager {
  override func view() -> UIView! {
    return LiquidGlassTabBarUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
