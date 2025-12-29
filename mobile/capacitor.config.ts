/// <reference types="@capacitor/keyboard" />

import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

// 빌드 환경에 따라 Bundle ID 자동 설정
// CAPACITOR_ENV: build-mobile-dev.js → 'development', build-mobile-prod.js → 'production'
const isDevelopment = process.env.CAPACITOR_ENV === 'development';
const appId = isDevelopment ? "com.daystep.app.dev" : "com.daystep.app";
const appName = isDevelopment ? "DevDayStep" : "DayStep";

const config: CapacitorConfig & { packageClassList?: string[] } = {
  appId,
  appName,
  webDir: "../out",
  // 🔇 로그 레벨 조정 (디버그 로그 간소화)
  loggingBehavior: "debug", // "debug" | "production" | "none"
  hideLogs: false, // JavaScript 로그를 Xcode 콘솔에 표시
  
  // iOS 전용 설정
  ios: {
    // Capacitor 네이티브 브리지 로그 최소화
    scheme: "capacitor",
    // 상태바 투명도 방지 - Safe Area 수동 제어
    contentInset: "never",
    // 로그 출력 최소화를 위한 설정
    allowsLinkPreview: false,
    // 🎈 iOS 고무줄 효과 명시적 활성화 (중요!)
    // Perplexity는 기본 활성화라고 했지만 실제로는 명시적 설정이 필요할 수 있음
    // @ts-ignore - Capacitor 버전별 타입 불일치 무시
    webView: {
      disallowOverscroll: false
    }
  },
  server: {
    androidScheme: "capacitor",
    iosScheme: "capacitor",
    allowNavigation: ["localhost", "*.supabase.co", "https://*.supabase.co", "192.168.219.104:3000"],
    cleartext: true, // HTTP 허용 (개발 전용)
    // url 주석 처리 - 정적 빌드 파일 사용 (독립 실행)
    // url: "http://192.168.219.104:3000",
  },
  plugins: {
    // 🎹 키보드 플러그인 설정 - 수동 조정 모드 (iOS 시뮬레이터 호환성)
    Keyboard: {
      resize: KeyboardResize.None,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
    // 🚀 네이티브 HTTP 플러그인 활성화 (WebView fetch 우회)
    CapacitorHttp: {
      enabled: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    StatusBar: {
      style: "light",
      backgroundColor: "#ffffff",
      // 상태바 투명도 방지 - 웹뷰 위에 겹치지 않도록 설정
      overlaysWebView: false,
    },
    SocialLogin: {
      google: {
        iosClientId:
          "757915574433-ksm0oaisr0e8heoi4c1ffld3v0jvqkr5.apps.googleusercontent.com",
      },
    },
    // 🔔 공식 Capacitor 로컬 알림 플러그인
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
  },
  includePlugins: [
    "@capgo/capacitor-social-login",
    "@capacitor/preferences",
    "@capacitor/local-notifications",
    "@capacitor-community/contacts",
    "@daystep/widget-bridge",
    "@daystep/contact-groups",
    "@daystep/theme-bridge", // 다크모드 WebView 배경색 동기화
    "@revenuecat/purchases-capacitor", // Revenue Cat 구독 결제 플러그인
    "capacitor-live-activity" // Live Activities (포모도로 타이머)
  ],
  // 커뮤니티 연락처 플러그인 + 로컬 ContactGroups 플러그인 + Revenue Cat 동시 사용
  packageClassList: [
    "SocialLoginPlugin",
    "PreferencesPlugin",
    "LocalNotificationsPlugin",
    "ContactsPlugin",
    "WidgetBridgePlugin",
    "ContactGroupsPlugin",
    "PurchasesPlugin", // Revenue Cat 클래스
    "ThemeBridgePlugin" // 다크모드 WebView 배경색 동기화
  ],
};

export default config;
