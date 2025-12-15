import UIKit
import Capacitor

class CustomWebViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // iOS 고무줄 효과(bounce scrolling) 활성화
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
    }
}
