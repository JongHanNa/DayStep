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

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()

        // PiPTimer 플러그인 수동 등록
        bridge?.registerPluginInstance(PiPTimerPlugin())
        print("[CustomBridge] ✅ PiPTimerPlugin registered manually")

        #if DEBUG
        // Safari Web Inspector 활성화 (iOS 16.4+)
        if #available(iOS 16.4, *) {
            webView?.isInspectable = true
        }

        // JS console → 네이티브 포워딩 스크립트 주입
        // capacitorDidLoad()에서 주입 → URL 로드 전에 확실히 등록됨
        let script = WKUserScript(source: consoleForwardingScript, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        webView?.configuration.userContentController.addUserScript(script)
        webView?.configuration.userContentController.add(self, name: "consoleLog")
        print("[CustomBridge] ✅ JS console forwarding enabled")
        #endif
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // bounce scrolling 활성화
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        #if DEBUG
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
        print("\(prefix) \(content)")
        #endif
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
        """
    }
}
