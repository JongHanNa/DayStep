/**
 * NativeBackgroundView — Phase 3
 * iOS 26+: UIGlassEffect (UIVisualEffect 서브클래스) 적용
 * iOS 25-: UIBlurEffect(systemUltraThinMaterial) 유지 (기존 동일)
 *
 * NOTE: UIGlassEffect API명은 iOS 26 SDK에서 실제 확인 필요.
 *       빌드 오류 시 SwiftUI Color.clear.glassEffect() 호스팅 방식으로 전환.
 */

import Foundation
import UIKit

// MARK: - UIView
class NativeBackgroundUIView: UIView {

  override init(frame: CGRect) {
    super.init(frame: frame)
    setupEffect()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupEffect()
  }

  private func setupEffect() {
    backgroundColor = .clear

    let effectView: UIVisualEffectView

    if #available(iOS 26.0, *) {
      // iOS 26: Liquid Glass 효과
      let glassEffect = UIGlassEffect()
      effectView = UIVisualEffectView(effect: glassEffect)
    } else {
      // iOS 25 이하: 기존 blur (변경 없음)
      effectView = UIVisualEffectView(
        effect: UIBlurEffect(style: .systemUltraThinMaterial)
      )
    }

    effectView.frame = bounds
    effectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(effectView)
  }
}

// MARK: - RCTViewManager
@objc(NativeBackgroundManager)
class NativeBackgroundManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeBackgroundUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
