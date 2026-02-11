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
        NSLog("[CustomBridge] PiPTimerPlugin registered")

        // JS console → 네이티브 포워딩 스크립트 주입 (항상 활성화)
        let script = WKUserScript(source: consoleForwardingScript, injectionTime: .atDocumentStart, forMainFrameOnly: true)
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

        // v7: overlaysWebView=false → 상태바 영역은 네이티브 view가 담당
        // 상태바 배경색 설정 (라이트모드 기본값, ThemeBridge가 다크모드 동기화)
        view.backgroundColor = UIColor(red: 0.96, green: 0.96, blue: 0.97, alpha: 1.0) // #f5f5f7 (base-100 light)

        // Root UIScrollView bounce 비활성화
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.contentOffset = .zero

        // Safe Area 이중 오프셋 방지
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.contentInset = .zero
        webView?.scrollView.scrollIndicatorInsets = .zero

        // 키보드 노티피케이션 (contentOffset 교정용)
        NotificationCenter.default.addObserver(
            self, selector: #selector(keyboardDidHide),
            name: UIResponder.keyboardDidHideNotification, object: nil
        )

        // 진단 로그: overlaysWebView 상태 확인
        let safeTop = view.safeAreaInsets.top
        NSLog("[v7] overlaysWebView=false | view.safeAreaInsets.top=%.1f | view.bg=%@",
              safeTop, String(describing: view.backgroundColor))
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // 안전망: scrollIntoView() 등으로 밀린 contentOffset 리셋
        if let sv = webView?.scrollView, sv.contentOffset != .zero {
            sv.setContentOffset(.zero, animated: false)
        }
        // 진단 로그: safe area, contentInset, contentOffset 확인
        let top = view.safeAreaInsets.top
        let ci = webView?.scrollView.contentInset ?? .zero
        let aci = webView?.scrollView.adjustedContentInset ?? .zero
        let co = webView?.scrollView.contentOffset ?? .zero
        NSLog("[SafeArea] top=%.1f ci=%@ aci=%@ offset=(%.1f,%.1f)",
              top,
              NSValue(uiEdgeInsets: ci),
              NSValue(uiEdgeInsets: aci),
              co.x, co.y)
    }

    @objc private func keyboardDidHide(_ n: Notification) {
        // 키보드 닫힌 후 contentOffset 리셋
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
        /* Phase 1: Console forwarding */
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
        /* Phase 2: Capacitor initialization (atDocumentStart) */
        (function() {
            var root = document.documentElement;
            /* 1. Add .capacitor class immediately */
            root.classList.add('capacitor');
            /* 2. MutationObserver: protect .capacitor class from React hydration */
            var mo = new MutationObserver(function(muts) {
                for (var i = 0; i < muts.length; i++) {
                    if (muts[i].attributeName === 'class' && !root.classList.contains('capacitor')) {
                        root.classList.add('capacitor');
                    }
                }
            });
            mo.observe(root, { attributes: true, attributeFilter: ['class'] });
            /* 3. Inject native <style> tag for --cap-safe-top (backup for CSS rule) */
            function injectStyle() {
                if (document.getElementById('cap-safe-area-native')) return;
                var s = document.createElement('style');
                s.id = 'cap-safe-area-native';
                s.textContent = 'html.capacitor{--cap-safe-top:0px}';
                (document.head || document.documentElement).appendChild(s);
            }
            if (document.head) {
                injectStyle();
            } else {
                /* <head> not yet parsed at atDocumentStart — wait for it */
                var headObs = new MutationObserver(function() {
                    if (document.head) { headObs.disconnect(); injectStyle(); }
                });
                headObs.observe(root, { childList: true, subtree: true });
            }
        })();
        /* Phase 3: Diagnostic log v9 (delayed) */
        (function() {
            setTimeout(function() {
                var root = document.documentElement;
                var style = getComputedStyle(root);
                var saEl = document.querySelector('.safe-area-top');
                console.log('[v9-Init]'
                    + ' | frame=' + (window.self === window.top ? 'main' : 'sub')
                    + ' | href=' + window.location.href
                    + ' | --cap-safe-top=' + style.getPropertyValue('--cap-safe-top')
                    + ' | html.capacitor=' + root.classList.contains('capacitor')
                    + ' | native-style-tag=' + !!document.getElementById('cap-safe-area-native')
                    + ' | safe-area-padding=' + (saEl ? getComputedStyle(saEl).paddingTop : 'N/A'));
            }, 2000);
        })();
        """
    }
}
