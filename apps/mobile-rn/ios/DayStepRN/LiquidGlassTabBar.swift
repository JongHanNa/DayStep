/**
 * LiquidGlassTabBar — Phase 1
 * iOS 26+: SwiftUI .glassEffect(in: RoundedRectangle) 네이티브 탭바
 *          RN Animated.View가 높이 변경 → Spacer 자동 확장 → 글래스 효과도 확장
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
  /// Timer progress 0~1 when active, -1 when inactive
  @Published var timerProgress: Double = -1
}

// MARK: - SwiftUI View (iOS 26+)
@available(iOS 26.0, *)
struct LiquidGlassTabBarContent: View {
  @ObservedObject var state: TabBarState
  var onTabPress: ((Int) -> Void)?

  var body: some View {
    ZStack(alignment: .bottom) {
      Color.clear  // glass 효과 영역 확보 (확장 시 전체 커버)

      // 하단 탭 아이콘 행 (항상 하단 고정)
      HStack(spacing: 0) {
        ForEach(Array(state.tabs.enumerated()), id: \.offset) { index, tab in
          let isSelected = index == state.selectedIndex
          let iconColor = isSelected
            ? state.primaryColor
            : Color(red: 0.612, green: 0.639, blue: 0.686)
          let showTimerRing = index == 2 && state.timerProgress >= 0

          Button {
            onTabPress?(index)
          } label: {
            VStack(spacing: 4) {
              if showTimerRing {
                ZStack {
                  Circle()
                    .stroke(Color(red: 0.898, green: 0.906, blue: 0.922), lineWidth: 3)
                    .frame(width: 24, height: 24)
                  Circle()
                    .trim(from: 0, to: CGFloat(min(max(state.timerProgress, 0), 1)))
                    .stroke(iconColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: 24, height: 24)
                }
                .frame(height: 24)
                .animation(
                  .spring(response: 0.3, dampingFraction: 0.8),
                  value: state.timerProgress
                )
              } else {
                Image(systemName: tab.sfSymbol)
                  .font(.system(
                    size: 22,
                    weight: isSelected ? .semibold : .regular
                  ))
                  .foregroundColor(iconColor)
                  .frame(height: 24)
                  .animation(
                    .spring(response: 0.3, dampingFraction: 0.8),
                    value: state.selectedIndex
                  )
              }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
          }
          .buttonStyle(.plain)
          .accessibilityIdentifier("tab_\(tab.name)")
        }
      }
      .background {
        GeometryReader { geo in
          let count = max(state.tabs.count, 1)
          let tabWidth = geo.size.width / CGFloat(count)
          RoundedRectangle(cornerRadius: 18)
            .fill(.clear)
            .glassEffect(in: RoundedRectangle(cornerRadius: 18))
            .frame(width: tabWidth - 8, height: geo.size.height - 2)
            .offset(x: tabWidth * CGFloat(state.selectedIndex) + 4, y: 1)
        }
      }
      .animation(.spring(response: 0.35, dampingFraction: 0.75), value: state.selectedIndex)
      .frame(height: 44)
      .padding(.bottom, 8)  // top: 4, bottom: 8 → 시각적 중앙 (약간 아래로)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .glassEffect(in: RoundedRectangle(cornerRadius: 32))
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

  @objc func setTimerProgress(_ value: NSNumber) {
    tabState.timerProgress = value.doubleValue
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
    hc.safeAreaRegions = []   // RN이 이미 safe area 처리
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
