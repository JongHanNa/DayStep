import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import MMKV
import GoogleSignIn

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // UI Test 모드: --uitesting launch argument 감지 시 MMKV에 세션 주입
    if ProcessInfo.processInfo.arguments.contains("--uitesting") {
      injectUITestSession()
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "DayStepRN",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return GIDSignIn.sharedInstance.handle(url)
  }

  /// UI Test용 인증 세션을 MMKV에 주입
  /// UITEST_SESSION 환경변수: JSON 문자열 (Supabase 세션)
  /// UITEST_SESSION_KEY 환경변수: MMKV 키 이름 (예: "sb-xxxxx-auth-token")
  private func injectUITestSession() {
    guard let sessionJSON = ProcessInfo.processInfo.environment["UITEST_SESSION"],
          let sessionKey = ProcessInfo.processInfo.environment["UITEST_SESSION_KEY"] else {
      return
    }

    MMKV.initialize(rootDir: nil)
    guard let mmkv = MMKV(mmapID: "daystep-session") else { return }
    mmkv.set(sessionJSON, forKey: sessionKey)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
