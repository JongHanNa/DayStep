//
//  CustomBridgeViewController.swift
//  App
//
//  커스텀 Capacitor Bridge: 로컬 플러그인 수동 등록 + JS 콘솔 포워딩
//

import UIKit
import WebKit
import Capacitor

class CustomBridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {

    // MARK: - Safe-Area v7: KVO 기반 contentOffset 자동 교정
    private var scrollOffsetObservation: NSKeyValueObservation?
    private var isKeyboardVisible = false

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()

        // PiPTimer 플러그인 수동 등록
        bridge?.registerPluginInstance(PiPTimerPlugin())
        NSLog("[CustomBridge] PiPTimerPlugin registered")

        // JS console → 네이티브 포워딩 스크립트 주입 (항상 활성화)
        let script = WKUserScript(source: consoleForwardingScript, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        webView?.configuration.userContentController.addUserScript(script)
        webView?.configuration.userContentController.add(self, name: "consoleLog")
        NSLog("[CustomBridge] JS console forwarding enabled")

        #if DEBUG
        // Safari Web Inspector 활성화 (iOS 16.4+) — Debug 전용
        if #available(iOS 16.4, *) {
            webView?.isInspectable = true
        }
        #endif
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // Root UIScrollView bounce 비활성화 (contentOffset 드리프트 방지)
        // Inner overflow-y-auto 컨테이너들은 독립적인 WKChildScrollView → 영향 없음
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.contentOffset = .zero

        // v7: 키보드 노티피케이션
        NotificationCenter.default.addObserver(
            self, selector: #selector(keyboardWillShow),
            name: UIResponder.keyboardWillShowNotification, object: nil
        )
        NotificationCenter.default.addObserver(
            self, selector: #selector(keyboardDidHide),
            name: UIResponder.keyboardDidHideNotification, object: nil
        )

        // v7: KVO - contentOffset 드리프트 자동 교정
        scrollOffsetObservation = webView?.scrollView.observe(
            \.contentOffset, options: [.new]
        ) { [weak self] scrollView, change in
            guard let self = self, !self.isKeyboardVisible else { return }
            guard let newOffset = change.newValue, newOffset != .zero else { return }
            NSLog("[v7] contentOffset drift correction: %@ -> .zero", NSValue(cgPoint: newOffset))
            scrollView.setContentOffset(.zero, animated: false)
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let top = view.safeAreaInsets.top
        NSLog("[SafeArea] viewDidLayoutSubviews: top=%.1f", top)
        webView?.evaluateJavaScript(
            "document.documentElement.style.setProperty('--cap-safe-top','\(top)px')"
        )
    }

    @objc private func keyboardWillShow(_ n: Notification) { isKeyboardVisible = true }
    @objc private func keyboardDidHide(_ n: Notification) {
        isKeyboardVisible = false
        if let sv = webView?.scrollView, sv.contentOffset != .zero {
            sv.setContentOffset(.zero, animated: false)
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "consoleLog",
              let body = message.body as? [String: String],
              let level = body["level"],
              let content = body["message"] else { return }

        let prefix: String
        switch level {
        case "error": prefix = "[JS ERROR]"
        case "warn":  prefix = "[JS WARN]"
        case "info":  prefix = "[JS INFO]"
        case "debug": prefix = "[JS DEBUG]"
        default:      prefix = "[JS LOG]"
        }
        NSLog("%@ %@", prefix, content)
    }

    // MARK: - Console Forwarding Script

    private var consoleForwardingScript: String {
        """
        (function() {
            var levels = ['log', 'warn', 'error', 'info', 'debug'];
            levels.forEach(function(level) {
                var original = console[level];
                console[level] = function() {
                    var args = Array.prototype.slice.call(arguments);
                    var message = args.map(function(arg) {
                        if (arg === null) return 'null';
                        if (arg === undefined) return 'undefined';
                        if (typeof arg === 'object') {
                            try { return JSON.stringify(arg, null, 2); }
                            catch(e) { return String(arg); }
                        }
                        return String(arg);
                    }).join(' ');
                    try {
                        window.webkit.messageHandlers.consoleLog.postMessage({
                            level: level,
                            message: message
                        });
                    } catch(e) {}
                    original.apply(console, arguments);
                };
            });
        })();
        (function() {
            if (window.location.protocol !== 'capacitor:') return;

            var observer = new MutationObserver(function() {
                var root = document.documentElement;
                var capSafeTop = getComputedStyle(root).getPropertyValue('--cap-safe-top');

                var probe = document.createElement('div');
                probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
                document.body.appendChild(probe);
                var envTop = probe.offsetHeight;
                document.body.removeChild(probe);

                var dndEl = document.querySelector('[id^="DndLiveRegion"]');
                var dndPos = dndEl ? getComputedStyle(dndEl).position : 'N/A';

                console.log('[SafeArea-Diag] --cap-safe-top=' + capSafeTop
                    + ' | env()=' + envTop + 'px'
                    + ' | DndLiveRegion pos=' + dndPos
                    + ' | html.capacitor=' + root.classList.contains('capacitor'));
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(function() {
                var root = document.documentElement;
                console.log('[SafeArea-Init] --cap-safe-top='
                    + getComputedStyle(root).getPropertyValue('--cap-safe-top')
                    + ' | html.capacitor=' + root.classList.contains('capacitor'));
            }, 2000);
        })();
        """
    }
}
