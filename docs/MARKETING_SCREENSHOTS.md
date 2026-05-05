# DayStep App Store 마케팅 스크린샷 — 기술 아키텍처

## 전체 파이프라인 요약

```
Metro 번들러 → XCUITest (시뮬레이터) → xcresult → 추출 → render.js (Playwright) → App Store PNG
```

---

## 1단계: 인증 바이패스 (네이티브 → JS)

**목적**: UITest에서 로그인 없이 앱 전체 화면 접근

```
AppDelegate.swift                    authStore.ts
─────────────────                    ─────────────
--uitesting 감지 →                   initialize() 실행 →
MMKV("daystep-rn")에                 storage.getBoolean('uitest_mode')
uitest_mode=true 저장                → true면 isAuthenticated=true 설정
                                     → uitest_active=true 설정 (앱 전역용)
                                     → Supabase 세션 체크 건너뜀
```

**관련 파일**:
- `apps/mobile-rn/ios/DayStepRN/AppDelegate.swift` — `injectUITestSession()`
- `apps/mobile-rn/src/stores/authStore.ts` — `initialize()` 내 uitest_mode 체크

## 2단계: Debug UI 억제

| 대상 | 해결 방법 | 파일 |
|------|----------|------|
| "Downloading..." 배너 | `RCTDevLoadingViewSetEnabled(false)` | `AppDelegate.swift` |
| LogBox 경고 배너 | `LogBox.ignoreAllLogs(true)` | `App.tsx` |
| 스크린타임 모달 | `uitest_active` 플래그 체크 → return | `SleepGardenScreen.tsx` |

## 3단계: XCUITest 스크린샷 캡처

**파일**: `apps/mobile-rn/ios/DayStepRNUITests/DayStepRNUITests.swift`

**흐름**:
1. `setUp()`: `XCUIApplication()` 생성 → `--uitesting` launch argument 추가 → 앱 실행
2. `testScreenshots()`: 6개 화면 순회
   - Home → Planner → Execute (탭 전환)
   - Home → feature_sleep → SleepGarden (서브스크린, swipeRight로 복귀)
   - Home → feature_cleaning → Cleaning
   - Home → feature_projects → Projects
3. 각 화면에서 `saveScreenshot("이름")` → `XCTAttachment`로 xcresult에 저장

**핵심 기법**:
- `findElement()` 헬퍼: RN Pressable이 XCUITest에서 `button` 또는 `other`로 인식되므로 둘 다 탐색
- `accessibilityRole="button"` + `testID`: CustomTabBar, GroupSection의 feature 아이템에 설정
- `app.swipeRight()`: RN은 네이티브 UINavigationBar 미사용 → 스와이프 백 제스처로 복귀

## 4단계: 스크린샷 추출

```bash
# XCUITest 실행
xcodebuild -workspace DayStepRN.xcworkspace -scheme DayStepRN \
  -destination 'platform=iOS Simulator,id=...' \
  -only-testing:DayStepRNUITests/DayStepRNUITests/testScreenshots \
  -resultBundlePath /tmp/daystep-test.xcresult test

# xcresult에서 PNG 추출
xcrun xcresulttool export attachments \
  --path /tmp/daystep-test.xcresult \
  --output-path /tmp/daystep-screenshots

# manifest.json 기반으로 파일명 정리 → screenshots/screenshots/ 에 복사
```

**왜 xcresult 추출?**: XCUITest 러너는 샌드박스에서 실행되어 파일 시스템 직접 쓰기 불가. `XCTAttachment`로 xcresult 번들에 저장 후 `xcresulttool export attachments`로 추출.

## 5단계: 마케팅 렌더링

**파일**: `apps/mobile-rn/screenshots/marketing/render.js` (Playwright + Chromium)

```
slide-data.json → base-template.html → Playwright 렌더링 → 1284x2778 PNG
```

- `slide-data.json`: 6장 슬라이드 정의 (타이틀, 부제, 배경 그라데이션, 스크린샷 파일명)
- `base-template.html`: iPhone 목업 프레임 + 그라데이션 배경 + 타이틀 텍스트
- 원본 스크린샷을 base64로 변환 → HTML에 인라인 → Playwright로 렌더링
- 출력: `screenshots/marketing/output/appstore_*.png` (App Store 6.7" 규격)

## 전체 파일 구조

```
apps/mobile-rn/
├── ios/
│   ├── DayStepRN/
│   │   ├── AppDelegate.swift          ← uitest 플래그 + DevLoadingView 비활성화
│   │   └── DayStepRN-Bridging-Header.h ← RCTDevLoadingViewSetEnabled import
│   └── DayStepRNUITests/
│       ├── DayStepRNUITests.swift      ← 6화면 캡처 테스트
│       └── SnapshotHelper.swift        ← Fastlane 호환 (현재 미사용)
├── src/
│   ├── stores/authStore.ts             ← uitest_mode/uitest_active 인증 바이패스
│   ├── screens/SleepGardenScreen.tsx   ← uitest 시 모달 억제
│   ├── components/
│   │   ├── home/GroupSection.tsx        ← feature 아이템 testID + accessibilityRole
│   │   └── navigation/CustomTabBar.tsx ← 탭 버튼 testID + accessibilityRole
│   └── App.tsx                         ← uitest 시 LogBox 비활성화
└── screenshots/
    ├── screenshots/                    ← 원본 캡처 PNG (6장)
    └── marketing/
        ├── render.js                   ← Playwright 렌더러
        ├── templates/
        │   ├── base-template.html      ← iPhone 목업 HTML 템플릿
        │   └── slide-data.json         ← 슬라이드 메타데이터
        └── output/                     ← 최종 App Store 마케팅 이미지
```

## 원커맨드 실행

```bash
cd apps/mobile-rn/ios

# 1. Metro 번들러 실행 (별도 터미널)
npm run start:rn

# 2. UITest → 스크린샷 캡처
xcodebuild -workspace DayStepRN.xcworkspace -scheme DayStepRN \
  -destination 'platform=iOS Simulator,id=4634FEE4-74E5-40C5-9137-71B18B872863' \
  -only-testing:DayStepRNUITests/DayStepRNUITests/testScreenshots \
  -disable-concurrent-destination-testing \
  -resultBundlePath /tmp/daystep-test.xcresult test

# 3. 스크린샷 추출 → 프로젝트 복사
xcrun xcresulttool export attachments --path /tmp/daystep-test.xcresult --output-path /tmp/daystep-screenshots
# (manifest.json으로 파일명 정리 후 screenshots/screenshots/에 복사)

# 4. 마케팅 렌더링
cd ../screenshots/marketing && node render.js
```
