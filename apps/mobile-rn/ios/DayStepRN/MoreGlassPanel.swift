/**
 * MoreGlassPanel — iOS 26+ SwiftUI Glass Panel Overlay
 * 네이티브 탭바 위에 오버레이로 표시되는 More 메뉴 패널
 * glassEffect로 Liquid Glass 시각 효과 적용
 *
 * LiquidGlassTabBar.swift에서 패널 부분만 추출 + 독립 컴포넌트화
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Observable State
class MorePanelState: ObservableObject {
  @Published var menuItems: [MoreMenuItem] = []
  @Published var showLabels: Bool = true
  @Published var primaryColor: Color = Color(hex: "#F97316")
}

// MARK: - SwiftUI View (iOS 26+)
@available(iOS 26.0, *)
struct MoreGlassPanelContent: View {
  @ObservedObject var state: MorePanelState
  var onMenuItemPress: ((String) -> Void)?
  var onToggleLabels: ((Bool) -> Void)?
  var onDismiss: (() -> Void)?

  var body: some View {
    VStack(spacing: 0) {
      // 헤더: "더 보기" + 이름 토글
      HStack {
        Text("더 보기")
          .font(.system(size: 15, weight: .semibold))
          .foregroundColor(Color(red: 0.122, green: 0.161, blue: 0.216))

        Spacer()

        HStack(spacing: 6) {
          Text("이름")
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(state.showLabels ? state.primaryColor : Color(red: 0.612, green: 0.639, blue: 0.686))

          Toggle("", isOn: Binding(
            get: { state.showLabels },
            set: { newVal in onToggleLabels?(newVal) }
          ))
          .toggleStyle(SwitchToggleStyle(tint: state.primaryColor))
          .scaleEffect(0.75)
          .frame(width: 40)
        }
      }
      .padding(.horizontal, 16)
      .padding(.top, 14)
      .padding(.bottom, 8)

      // 5열 아이콘 그리드
      menuGrid
        .padding(.bottom, 12)
    }
    .frame(maxWidth: .infinity)
    .glassEffect(in: RoundedRectangle(cornerRadius: 24))
    .animation(.spring(response: 0.3, dampingFraction: 0.8), value: state.showLabels)
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
  }
}

// MARK: - UIView Wrapper
class MoreGlassPanelUIView: UIView {

  // RN Props
  @objc var onMenuItemPress: RCTDirectEventBlock?
  @objc var onToggleLabels: RCTDirectEventBlock?
  @objc var onDismiss: RCTDirectEventBlock?

  private let panelState = MorePanelState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

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
    panelState.menuItems = items
    setupOnce()
  }

  @objc func setShowLabels(_ value: Bool) {
    panelState.showLabels = value
  }

  @objc func setPrimaryColor(_ value: NSString) {
    panelState.primaryColor = Color(hex: value as String)
  }

  // MARK: - 1회 초기화
  private func setupOnce() {
    guard !hasSetUp, !panelState.menuItems.isEmpty else { return }
    hasSetUp = true
    backgroundColor = .clear

    guard #available(iOS 26.0, *) else {
      return
    }

    let swiftUIView = MoreGlassPanelContent(
      state: panelState,
      onMenuItemPress: { [weak self] screenName in
        self?.onMenuItemPress?(["screenName": screenName])
      },
      onToggleLabels: { [weak self] showLabels in
        self?.onToggleLabels?(["showLabels": showLabels])
      },
      onDismiss: { [weak self] in
        self?.onDismiss?([:])
      }
    )

    let hc = UIHostingController(rootView: AnyView(swiftUIView))
    hc.view.backgroundColor = .clear
    hc.safeAreaRegions = []
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
    guard let hc = hostingController, bounds.width > 0 else {
      return CGSize(width: UIView.noIntrinsicMetric, height: 200)
    }
    let size = hc.sizeThatFits(in: CGSize(width: bounds.width, height: .greatestFiniteMagnitude))
    return CGSize(width: UIView.noIntrinsicMetric, height: size.height)
  }
}

// MARK: - RCTViewManager
@objc(MoreGlassPanelManager)
class MoreGlassPanelManager: RCTViewManager {
  override func view() -> UIView! {
    return MoreGlassPanelUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
