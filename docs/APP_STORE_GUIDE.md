# DayStep App Store 출시 가이드

## 현재 준비 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Bundle ID (`com.daystep.app`) | ✅ | |
| Apple Developer Team | ✅ | `5SSJ3GPKAR` |
| 프로덕션 Scheme (DayStepProd) | ✅ | Release 모드 |
| 앱 버전 | ✅ | 1.0 (build 1) |
| 앱 아이콘 | ✅ | |
| 최소 iOS 버전 | ✅ | 15.1 |

---

## 출시 프로세스

### 1단계: Apple Developer Program 가입 확인

- [developer.apple.com/programs](https://developer.apple.com/programs/) — 연간 $99
- Development Team ID(`5SSJ3GPKAR`)가 있으므로 가입 완료 상태일 가능성 높음

### 2단계: App Store Connect에서 앱 등록

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) 접속
2. "내 앱" → "+" → "신규 앱"
3. 입력 정보:

| 항목 | 값 |
|------|-----|
| 플랫폼 | iOS |
| 앱 이름 | DayStep |
| 기본 언어 | 한국어 |
| 번들 ID | `com.daystep.app` |
| SKU | `daystep-ios` (자유 지정) |

### 3단계: 앱 메타데이터 준비

| 항목 | 설명 | 필수 |
|------|------|------|
| 스크린샷 | 6.9인치(1260x2736) 필수, 나머지 자동 스케일링 | O |
| 앱 설명 | 최대 4000자 | O |
| 키워드 | 100자 이내, 쉼표 구분 (예: ADHD,할일,루틴,집중) | O |
| 카테고리 | 주: Productivity 또는 Health & Fitness | O |
| 개인정보 처리방침 URL | 웹페이지 필요 | O |
| 지원 URL | 고객 지원 페이지 | O |
| 연령 등급 | 설문 응답으로 자동 결정 | O |
| 프로모션 텍스트 | 170자, 심사 없이 수시 변경 가능 | 선택 |
| 부제목 | 30자 | 선택 |

### 4단계: 코드 서명 설정

현재 `iPhone Developer`(개발용)로 설정되어 있어 배포용 전환 필요.

**Xcode 자동 서명 (권장):**
1. Xcode → DayStepRN 타겟 → Signing & Capabilities
2. "Automatically manage signing" 체크
3. Team 선택
4. Xcode가 Distribution 인증서/프로파일 자동 생성

### 5단계: Archive & 업로드

1. Xcode에서 **DayStepProd** scheme 선택
2. 기기를 **"Any iOS Device (arm64)"** 선택
3. 메뉴: **Product → Archive**
4. Archive 완료 → Organizer 창 열림
5. **"Distribute App"** → **"App Store Connect"** 선택
6. **"Upload"** → 옵션 확인 → 업로드

### 6단계: 심사 제출

1. App Store Connect에서 업로드된 빌드 선택
2. 메타데이터 모두 채우기 (3단계 항목)
3. **"심사를 위해 제출"** 클릭
4. 로그인 필요 시 **심사용 테스트 계정 정보** 입력

### 7단계: 심사 & 출시

| 단계 | 소요 시간 |
|------|----------|
| 자동 심사 (기술 검토) | 수 분 ~ 수 시간 |
| 수동 심사 (사람 검토) | 보통 24~48시간 |
| 승인 후 출시 | 즉시 또는 수동 출시 선택 |

---

## 심사 전 체크리스트

- [ ] 개인정보 처리방침 URL 준비
- [ ] 지원 URL 준비
- [ ] 스크린샷 촬영 (6.9인치 필수)
- [ ] 앱 설명 작성
- [ ] 로그인 필요 시 심사용 테스트 계정 준비
- [ ] 크래시 없이 주요 기능 동작 확인
- [ ] 결제 기능 있으면 In-App Purchase 등록

---

## 스크린샷 가이드

### 필수 사이즈

| 디바이스 | 해상도 (Portrait) | 비고 |
|---------|------------------|------|
| **iPhone 6.9인치** | **1260 x 2736 px** | 필수. 다른 iPhone 사이즈는 자동 스케일링 |
| iPad 13인치 | 2064 x 2752 px | iPad 앱인 경우만 필수 |

- 파일 형식: PNG (권장) 또는 JPEG
- 투명도(알파 채널) 금지
- 로컬라이제이션당 최소 1장, 최대 10장

### 자동 촬영: Maestro (권장)

앱 코드 수정 없이 YAML 파일 하나로 모든 화면 스크린샷 자동 촬영.

**설치:**
```bash
brew install maestro
```

**Flow 파일 작성** (`.maestro/screenshots.yaml`):
```yaml
appId: com.daystep.app.dev
---
- launchApp
- assertVisible: "Home"
- takeScreenshot: "01_home"
- tapOn: "Planner"
- takeScreenshot: "02_planner"
- tapOn: "Execute"
- takeScreenshot: "03_execute"
- tapOn: "Notes"
- takeScreenshot: "04_notes"
- tapOn: "Settings"
- takeScreenshot: "05_settings"
```

**상태바 정리 후 실행:**
```bash
# 상태바를 깔끔하게
xcrun simctl status_bar booted override \
  --time "9:41" \
  --batteryState charged \
  --batteryLevel 100 \
  --cellularMode active \
  --cellularBars 4

# 스크린샷 촬영
maestro test .maestro/screenshots.yaml --test-output-dir ./screenshots
```

**수동 촬영** (간단한 경우):
```bash
xcrun simctl io booted screenshot screenshot.png
```
