import UIKit
internal import Expo
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import MMKV
import GoogleSignIn

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // UI Test 모드: --uitesting launch argument 감지 시 MMKV에 세션 주입
    if ProcessInfo.processInfo.arguments.contains("--uitesting") {
      injectUITestSession()
    }

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "DayStepRN",
      in: window,
      launchOptions: launchOptions
    )

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    // 1) Google Sign-In OAuth 콜백
    if GIDSignIn.sharedInstance.handle(url) {
      return true
    }
    // 2) React Native Linking (daystep:// 딥링크 — 위젯 탭 등)
    if RCTLinkingManager.application(app, open: url, options: options) {
      return true
    }
    return super.application(app, open: url, options: options)
  }

  /// UI Test 모드: MMKV에 uitest_mode 플래그 저장
  /// authStore에서 이 플래그를 읽어 인증을 건너뜀
  private func injectUITestSession() {
    MMKV.initialize(rootDir: nil)
    // daystep-rn (Zustand용 MMKV)에 플래그 저장
    guard let mmkv = MMKV(mmapID: "daystep-rn") else { return }
    mmkv.set(true, forKey: "uitest_mode")

    // Debug 빌드의 "Downloading..." 배너 비활성화
    RCTDevLoadingViewSetEnabled(false)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
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
