import Foundation
import Capacitor
import UIKit

/**
 * ThemeBridgePlugin - JavaScript에서 iOS WebView 배경색을 제어하는 Capacitor 플러그인
 *
 * 용도: 다크모드 전환 시 iOS overscroll(고무줄 효과) 영역의 배경색 동기화
 */
@objc(ThemeBridgePlugin)
public class ThemeBridgePlugin: CAPPlugin {

    // 마지막으로 설정된 색상 저장 (포그라운드 복귀 시 재설정용)
    private var lastColor: UIColor?

    // 플러그인 로드 시 앱 활성화 알림 구독
    public override func load() {
        // didBecomeActiveNotification 사용 (willEnterForeground보다 늦은 시점)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    // 앱 활성화 시 배경색 재설정 (100ms 지연)
    @objc private func handleAppDidBecomeActive() {
        guard let color = lastColor else { return }

        // WebView 복원이 완료된 후 배경색 설정 (100ms 지연)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            guard let webView = self?.bridge?.webView else { return }
            webView.backgroundColor = color
            webView.scrollView.backgroundColor = color
        }
    }

    /**
     * WebView의 scrollView 배경색을 설정합니다.
     *
     * @param color - HEX 색상 코드 (예: "#121212", "#FFFFFF")
     */
    @objc func setScrollViewBackgroundColor(_ call: CAPPluginCall) {
        guard let colorHex = call.getString("color") else {
            call.reject("색상 값이 필요합니다")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.bridge?.webView else {
                call.reject("WebView를 찾을 수 없습니다")
                return
            }

            let color = UIColor(hex: colorHex) ?? UIColor.white

            // 마지막 색상 저장 (포그라운드 복귀 시 재설정용)
            self?.lastColor = color

            // WebView 배경색 설정
            webView.backgroundColor = color
            webView.scrollView.backgroundColor = color

            // 성공 응답
            call.resolve([
                "success": true,
                "color": colorHex
            ])
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}

// MARK: - UIColor HEX 확장
extension UIColor {
    convenience init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0

        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
            return nil
        }

        let length = hexSanitized.count

        if length == 6 {
            let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
            let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
            let b = CGFloat(rgb & 0x0000FF) / 255.0

            self.init(red: r, green: g, blue: b, alpha: 1.0)
        } else if length == 8 {
            let r = CGFloat((rgb & 0xFF000000) >> 24) / 255.0
            let g = CGFloat((rgb & 0x00FF0000) >> 16) / 255.0
            let b = CGFloat((rgb & 0x0000FF00) >> 8) / 255.0
            let a = CGFloat(rgb & 0x000000FF) / 255.0

            self.init(red: r, green: g, blue: b, alpha: a)
        } else {
            return nil
        }
    }
}
