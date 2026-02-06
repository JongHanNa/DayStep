import UIKit
import Capacitor
import UserNotifications
import WidgetKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // 알림 센터 델리게이트 설정
        UNUserNotificationCenter.current().delegate = self

        // 🆕 Capacitor Console API 활성화 (WKWebView → Xcode 콘솔)
        #if DEBUG
        CAPLog.enableLogging = true
        #endif

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.

        // iOS 고무줄 효과(bounce scrolling) 활성화 + 배경색 초기화
        if let rootVC = window?.rootViewController as? CAPBridgeViewController {
            rootVC.webView?.scrollView.bounces = true
            rootVC.webView?.scrollView.alwaysBounceVertical = true

            // 다크모드 overscroll 대응: 초기 배경색 설정
            // 실제 테마는 JavaScript에서 ThemeBridgePlugin을 통해 업데이트됨
            // 여기서는 시스템 다크모드를 기준으로 초기값 설정 (깜빡임 방지)
            if #available(iOS 13.0, *) {
                let isDark = UITraitCollection.current.userInterfaceStyle == .dark
                let bgColor = isDark
                    ? UIColor(red: 0.071, green: 0.071, blue: 0.071, alpha: 1) // #121212
                    : UIColor(red: 0.961, green: 0.961, blue: 0.965, alpha: 1) // #f5f5f7
                rootVC.webView?.backgroundColor = bgColor
                rootVC.webView?.scrollView.backgroundColor = bgColor
            }

            // 🆕 PiP 타이머 플러그인 수동 등록 (한 번만 실행)
            if rootVC.bridge?.plugin(withName: "PiPTimer") == nil {
                rootVC.bridge?.registerPluginInstance(PiPTimerPlugin())
                print("[AppDelegate] ✅ PiPTimerPlugin registered")
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

