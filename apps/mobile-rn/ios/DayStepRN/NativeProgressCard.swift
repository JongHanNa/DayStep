/**
 * NativeProgressCard — iOS 26+ 진행률 카드
 * SwiftUI Circle trim 기반 프로그레스 링 + glass 카드
 *
 * 패턴: ObservableObject + setupOnce() (LiquidGlassFuelCard 참조)
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Observable State

class ProgressCardState: ObservableObject {
  @Published var completed: Int = 0
  @Published var total: Int = 0
  @Published var progress: CGFloat = 0
  @Published var primaryColor: String = "#6366F1"
  @Published var progressText: String = ""
}

// MARK: - SwiftUI View

struct ProgressCardContent: View {
  @ObservedObject var state: ProgressCardState

  var body: some View {
    HStack(spacing: 16) {
      // 좌측: 텍스트
      VStack(alignment: .leading, spacing: 4) {
        Text("오늘의 진행률")
          .font(.system(size: 18, weight: .semibold))
          .foregroundColor(Color(hex: "#1E293B"))

        Text(state.total > 0
          ? "\(state.completed)개 완료 / \(state.total)개 중"
          : "오늘의 할일을 추가해보세요")
          .font(.system(size: 14))
          .foregroundColor(Color(hex: "#64748B"))

        // 프로그레스 바
        if state.total > 0 {
          GeometryReader { geo in
            ZStack(alignment: .leading) {
              RoundedRectangle(cornerRadius: 4)
                .fill(Color(hex: "#F1F5F9"))
                .frame(height: 8)

              RoundedRectangle(cornerRadius: 4)
                .fill(Color(hex: state.primaryColor))
                .frame(width: geo.size.width * state.progress, height: 8)
            }
          }
          .frame(height: 8)
          .padding(.top, 8)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      // 우측: 프로그레스 링
      ZStack {
        Circle()
          .stroke(Color(hex: "#F1F5F9"), lineWidth: 6)

        Circle()
          .trim(from: 0, to: state.progress)
          .stroke(
            Color(hex: state.primaryColor),
            style: StrokeStyle(lineWidth: 6, lineCap: .round)
          )
          .rotationEffect(.degrees(-90))
          .animation(.spring(response: 0.6, dampingFraction: 0.8), value: state.progress)

        VStack(spacing: 0) {
          Text("\(state.completed)")
            .font(.system(size: 20, weight: .bold))
            .foregroundColor(Color(hex: "#1E293B"))
          Text("/\(state.total)")
            .font(.system(size: 12))
            .foregroundColor(Color(hex: "#94A3B8"))
        }
      }
      .frame(width: 80, height: 80)
    }
    .padding(16)
    .cleanupCardStyle()
  }
}

// MARK: - UIView Wrapper

class NativeProgressCardUIView: UIView {

  @objc var onHeightChange: RCTDirectEventBlock?

  private let cardState = ProgressCardState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setCompleted(_ value: NSNumber) {
    cardState.completed = value.intValue
    setupOnce()
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
      self?.emitHeight()
    }
  }

  @objc func setTotal(_ value: NSNumber) {
    cardState.total = value.intValue
  }

  @objc func setProgress(_ value: NSNumber) {
    cardState.progress = CGFloat(value.floatValue)
  }

  @objc func setPrimaryColor(_ value: NSString) {
    cardState.primaryColor = value as String
  }

  @objc func setProgressText(_ value: NSString) {
    cardState.progressText = value as String
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

    let swiftUIView = ProgressCardContent(state: cardState)

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

@objc(NativeProgressCardManager)
class NativeProgressCardManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeProgressCardUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
