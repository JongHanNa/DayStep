/**
 * NativeMissionCard — iOS 26+ 오늘의 미션 카드
 * 미션 있음: 제목 + 시간 + "지금 시작하기" CTA
 * 미션 없음: "오늘 계획 세우기" CTA
 *
 * 패턴: ObservableObject + setupOnce()
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Model

struct MissionData: Codable {
  let missionTitle: String
  let timeRange: String?
  let hasMission: Bool
}

// MARK: - Observable State

class MissionCardState: ObservableObject {
  @Published var missionTitle: String = ""
  @Published var timeRange: String? = nil
  @Published var hasMission: Bool = false
  @Published var primaryColor: String = "#6366F1"
}

// MARK: - SwiftUI View

struct MissionCardContent: View {
  @ObservedObject var state: MissionCardState

  var onExecutePress: (() -> Void)?
  var onPlannerPress: (() -> Void)?

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      // 헤더
      HStack(spacing: 8) {
        Image(systemName: "target")
          .font(.system(size: 20))
          .foregroundColor(Color(hex: state.primaryColor))

        Text("오늘의 미션")
          .font(.system(size: 16, weight: .semibold))
          .foregroundColor(Color(hex: "#1F2937"))
      }

      if state.hasMission {
        // 미션 있음
        Text(state.missionTitle)
          .font(.system(size: 18, weight: .bold))
          .foregroundColor(Color(hex: "#111827"))

        if let timeRange = state.timeRange, !timeRange.isEmpty {
          Text(timeRange)
            .font(.system(size: 14))
            .foregroundColor(Color(hex: "#6B7280"))
        }

        // CTA: 지금 시작하기
        Button(action: {
          onExecutePress?()
        }) {
          HStack(spacing: 4) {
            Text("지금 시작하기")
              .font(.system(size: 14, weight: .semibold))
              .foregroundColor(.white)

            Image(systemName: "arrow.right")
              .font(.system(size: 14, weight: .medium))
              .foregroundColor(.white)
          }
          .frame(maxWidth: .infinity)
          .padding(.vertical, 12)
          .background(Color(hex: state.primaryColor))
          .cornerRadius(12)
        }
        .buttonStyle(.plain)
      } else {
        // 미션 없음
        Text("오늘 할 일을 계획해보세요")
          .font(.system(size: 14))
          .foregroundColor(Color(hex: "#6B7280"))

        // CTA: 오늘 계획 세우기
        Button(action: {
          onPlannerPress?()
        }) {
          HStack(spacing: 4) {
            Image(systemName: "calendar.badge.plus")
              .font(.system(size: 14))
              .foregroundColor(Color(hex: "#6B7280"))

            Text("오늘 계획 세우기")
              .font(.system(size: 14, weight: .semibold))
              .foregroundColor(Color(hex: "#4B5563"))
          }
          .frame(maxWidth: .infinity)
          .padding(.vertical, 12)
          .background(Color(hex: "#F3F4F6"))
          .cornerRadius(12)
        }
        .buttonStyle(.plain)
      }
    }
    .padding(16)
    .cleanupCardStyle()
  }
}

// MARK: - UIView Wrapper

class NativeMissionCardUIView: UIView {

  @objc var onExecutePress: RCTDirectEventBlock?
  @objc var onPlannerPress: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let cardState = MissionCardState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setMissionData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let mission = try JSONDecoder().decode(MissionData.self, from: data)
      cardState.hasMission = mission.hasMission
      cardState.missionTitle = mission.missionTitle
      cardState.timeRange = mission.timeRange
      setupOnce()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
        self?.emitHeight()
      }
    } catch {
      print("[NativeMissionCard] JSON decode error: \(error)")
    }
  }

  @objc func setPrimaryColor(_ value: NSString) {
    cardState.primaryColor = value as String
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

    let swiftUIView = MissionCardContent(
      state: cardState,
      onExecutePress: { [weak self] in
        self?.onExecutePress?([:])
      },
      onPlannerPress: { [weak self] in
        self?.onPlannerPress?([:])
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

@objc(NativeMissionCardManager)
class NativeMissionCardManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeMissionCardUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
