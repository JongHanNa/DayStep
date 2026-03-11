/**
 * LiquidGlassTabBar — Phase 3
 * iOS 26+: 단일 뷰 구조 — 탭바 아이콘 항상 고정, 패널만 슬라이드업
 * iOS 25-: JS 폴백 (GlassBackground) 사용 — 이 파일의 뷰는 렌더링 안됨
 *
 * 핵심: tabIconRow는 단일 인스턴스로 항상 존재
 *       패널 콘텐츠가 탭바 뒤에서 .transition(.move(edge: .bottom))으로 슬라이드
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Tab Data
struct TabItem {
  let name: String
  let sfSymbol: String
}

// MARK: - Menu Item Data
struct MoreMenuItem: Equatable {
  let label: String
  let sfSymbol: String
  let screenName: String
  let isActive: Bool
}

// MARK: - Observable State (UIHostingController 재생성 방지)
class TabBarState: ObservableObject {
  @Published var tabs: [TabItem] = []
  @Published var selectedIndex: Int = 0
  @Published var primaryColor: Color = Color(hex: "#F97316")
  /// Timer progress 0~1 when active, -1 when inactive
  @Published var timerProgress: Double = -1
  /// MorePanel 확장 상태
  @Published var isExpanded: Bool = false
  /// MorePanel 메뉴 아이템
  @Published var menuItems: [MoreMenuItem] = []
  /// 그리드 라벨 표시 여부
  @Published var showLabels: Bool = true
}

// MARK: - SwiftUI View (iOS 26+)
@available(iOS 26.0, *)
struct LiquidGlassTabBarContent: View {
  @ObservedObject var state: TabBarState
  var onTabPress: ((Int) -> Void)?
  var onMenuItemPress: ((String) -> Void)?
  var onToggleLabels: ((Bool) -> Void)?
  var onHeightChange: ((CGFloat) -> Void)?

  @State private var pillScale: CGFloat = 1.0
  @State private var pillWhite: CGFloat = 0.0

  var body: some View {
    ZStack(alignment: .bottom) {
      // 패널 콘텐츠 (조건부 — 탭바 뒤에서 슬라이드업)
      if state.isExpanded {
        VStack(spacing: 0) {
          headerView
          menuGrid
        }
        .padding(.bottom, 50)
        // transition 제거 — RN clipsToBounds가 시각적 슬라이드 제공
      }

      // 탭바 아이콘 행 (항상 존재, ZStack .bottom 정렬 = 위치 불변)
      tabIconRow
        .background {
          selectionPillBackground
            .opacity(state.isExpanded ? 0 : 1)
            // animation 제거 — isExpanded 변경 시 레이아웃 영향 방지
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.75), value: state.selectedIndex)
        .onChange(of: state.selectedIndex) { _ in
          withAnimation(.easeOut(duration: 0.15)) {
            pillScale = 1.4
            pillWhite = 0.15
          }
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.5)) {
              pillScale = 1.0
              pillWhite = 0.0
            }
          }
        }
        .frame(height: 44)
        .padding(.bottom, 6)
    }
    .frame(maxWidth: .infinity)
    .frame(minHeight: 56)
    .glassEffect(in: RoundedRectangle(cornerRadius: 32))
    .background {
      GeometryReader { geo in
        Color.clear
          .onAppear { emitHeight(geo.size.height) }
          .onChange(of: geo.size.height) { newH in emitHeight(newH) }
      }
    }
  }

  private func emitHeight(_ h: CGFloat) {
    onHeightChange?(h)
  }

  // MARK: - Header View (확장 시 상단)
  private var headerView: some View {
    HStack {
      Text("더 보기")
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(Color(red: 0.122, green: 0.161, blue: 0.216))

      Spacer()

    }
    .padding(.horizontal, 16)
    .padding(.top, 14)
    .padding(.bottom, 8)
  }

  // MARK: - Selection Pill Background (collapsed 전용)
  private var selectionPillBackground: some View {
    GeometryReader { geo in
      let count = max(state.tabs.count, 1)
      let tabWidth = geo.size.width / CGFloat(count)
      RoundedRectangle(cornerRadius: 22)
        .fill(Color.white.opacity(pillWhite))
        .glassEffect(in: RoundedRectangle(cornerRadius: 22))
        .frame(width: tabWidth - 8, height: geo.size.height)
        .scaleEffect(pillScale)
        .offset(x: tabWidth * CGFloat(state.selectedIndex) + 4, y: 0)
    }
  }

  // MARK: - Menu Grid (5열 SF Symbol)
  private var menuGrid: some View {
    let columns = 5
    let rows = stride(from: 0, to: state.menuItems.count, by: columns).map { startIdx in
      Array(state.menuItems[startIdx..<min(startIdx + columns, state.menuItems.count)])
    }

    return VStack(spacing: 8) {
      ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
        HStack(spacing: 0) {
          ForEach(Array(row.enumerated()), id: \.offset) { _, item in
            Button {
              onMenuItemPress?(item.screenName)
            } label: {
              VStack(spacing: state.showLabels ? 4 : 0) {
                Image(systemName: item.sfSymbol)
                  .font(.system(size: 24, weight: .regular))
                  .foregroundColor(
                    item.isActive
                      ? state.primaryColor
                      : Color(red: 0.612, green: 0.639, blue: 0.686)
                  )
                  .frame(height: 24)

                if state.showLabels {
                  Text(item.label)
                    .font(.system(size: 10))
                    .foregroundColor(
                      item.isActive
                        ? state.primaryColor
                        : Color(red: 0.420, green: 0.451, blue: 0.502)
                    )
                    .lineLimit(1)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
              }
              .frame(maxWidth: .infinity)
              .padding(.vertical, state.showLabels ? 8 : 6)
            }
            .buttonStyle(.plain)
          }

          // 빈 셀 채우기
          if row.count < columns {
            ForEach(0..<(columns - row.count), id: \.self) { _ in
              Color.clear
                .frame(maxWidth: .infinity)
                .padding(.vertical, state.showLabels ? 8 : 6)
            }
          }
        }
      }
    }
    .animation(.easeInOut(duration: 0.25), value: state.showLabels)
  }

  // MARK: - Tab Icon Row (공통)
  private var tabIconRow: some View {
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
  }
}

// MARK: - UIView Wrapper
class LiquidGlassTabBarUIView: UIView {

  // RN Props
  @objc var onTabPress: RCTDirectEventBlock?
  @objc var onMenuItemPress: RCTDirectEventBlock?
  @objc var onToggleLabels: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let tabState = TabBarState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false
  private var collapseWorkItem: DispatchWorkItem?

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

  @objc func setIsExpanded(_ value: Bool) {
    // 기존 축소 예약 취소 (빠른 토글 대응)
    collapseWorkItem?.cancel()
    collapseWorkItem = nil

    if value {
      // 확장: 즉시 SwiftUI 레이아웃 변경
      tabState.isExpanded = true
      hostingController?.view.invalidateIntrinsicContentSize()

      DispatchQueue.main.async { [weak self] in
        guard let self = self, let hc = self.hostingController, self.bounds.width > 0 else { return }
        let target = hc.sizeThatFits(in: CGSize(width: self.bounds.width, height: .greatestFiniteMagnitude))
        self.onHeightChange?(["height": target.height])
      }
    } else {
      // 축소: RN에 축소 높이 즉시 보고 → RN 애니메이션 시작
      // SwiftUI 콘텐츠는 350ms 후 제거 → 그 동안 clipsToBounds가 점진적 클리핑
      onHeightChange?(["height": 56])

      let workItem = DispatchWorkItem { [weak self] in
        self?.tabState.isExpanded = false
        self?.hostingController?.view.invalidateIntrinsicContentSize()
      }
      collapseWorkItem = workItem
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.35, execute: workItem)
    }
  }

  @objc func setMenuItems(_ value: NSArray) {
    var items: [MoreMenuItem] = []
    for item in value {
      guard
        let dict = item as? [String: Any],
        let label = dict["label"] as? String,
        let sfSymbol = dict["sfSymbol"] as? String,
        let screenName = dict["screenName"] as? String
      else { continue }
      let isActive = dict["isActive"] as? Bool ?? false
      items.append(MoreMenuItem(label: label, sfSymbol: sfSymbol, screenName: screenName, isActive: isActive))
    }
    tabState.menuItems = items
    setupOnce()
  }

  @objc func setShowLabels(_ value: Bool) {
    tabState.showLabels = value
  }

  // MARK: - 1회 초기화 (@Namespace 유지를 위해 UIHostingController 재생성 금지)
  private func setupOnce() {
    guard !hasSetUp, !tabState.tabs.isEmpty else { return }
    hasSetUp = true
    backgroundColor = .clear
    clipsToBounds = true  // RN 컨테이너가 애니메이션으로 높이 확장 → 점진적 클리핑 해제

    guard #available(iOS 26.0, *) else {
      // iOS 25 이하: JS 폴백 사용 (이 뷰는 비어있음)
      return
    }

    let swiftUIView = LiquidGlassTabBarContent(
      state: tabState,
      onTabPress: { [weak self] index in
        self?.onTabPress?(["index": index])
      },
      onMenuItemPress: { [weak self] screenName in
        self?.onMenuItemPress?(["screenName": screenName])
      },
      onToggleLabels: { [weak self] showLabels in
        self?.onToggleLabels?(["showLabels": showLabels])
      },
      onHeightChange: { [weak self] height in
        self?.onHeightChange?(["height": height])
      }
    )

    let hc = UIHostingController(rootView: AnyView(swiftUIView))
    hc.view.backgroundColor = .clear
    hc.safeAreaRegions = []   // RN이 이미 safe area 처리
    hostingController = hc

    addSubview(hc.view)
    hc.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      hc.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      hc.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      // top 앵커 제거 — 호스팅 컨트롤러가 intrinsicContentSize 기반 자유 높이 결정
      // bottom만 핀 → 확장 시 위로 초과, clipsToBounds가 점진적 클리핑
      hc.view.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  override var intrinsicContentSize: CGSize {
    guard let hc = hostingController, bounds.width > 0 else {
      return CGSize(width: UIView.noIntrinsicMetric, height: 56)
    }
    let size = hc.sizeThatFits(in: CGSize(width: bounds.width, height: .greatestFiniteMagnitude))
    return CGSize(width: UIView.noIntrinsicMetric, height: size.height)
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
