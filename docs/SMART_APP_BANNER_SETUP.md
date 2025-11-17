# Smart App Banner 및 App Links 설정 가이드

## 개요

이 문서는 DayStep 앱의 Smart App Banner와 Universal Links/App Links 설정 방법을 설명합니다.

## 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
# App Store Configuration
NEXT_PUBLIC_IOS_APP_ID=123456789                    # iOS App Store ID
NEXT_PUBLIC_ANDROID_PACKAGE_NAME=com.daystep.app    # Android 패키지명
IOS_TEAM_ID=YOUR_TEAM_ID                           # Apple Developer Team ID
ANDROID_SHA256_FINGERPRINT=YOUR_SHA256_FINGERPRINT  # Android 앱 서명 SHA256
```

## iOS 설정 (Universal Links)

### 1. Apple Developer Console 설정

1. App ID 설정에서 "Associated Domains" 활성화
2. Provisioning Profile 재생성

### 2. Xcode 프로젝트 설정

1. Capabilities → Associated Domains 추가
2. 도메인 추가: `applinks:daystep.app`

### 3. 서버 설정

- `/.well-known/apple-app-site-association` 파일이 자동으로 제공됨
- API 라우트: `/api/apple-app-site-association`

## Android 설정 (App Links)

### 1. AndroidManifest.xml 설정

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="daystep.app" />
</intent-filter>
```

### 2. SHA256 인증서 지문 얻기

```bash
keytool -list -v -keystore release.keystore
```

### 3. 서버 설정

- `/.well-known/assetlinks.json` 파일이 자동으로 제공됨
- API 라우트: `/api/assetlinks`

## 커스텀 URL 스킴 설정

### iOS (Info.plist)

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>daystep</string>
        </array>
    </dict>
</array>
```

### Android (AndroidManifest.xml)

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="daystep" />
</intent-filter>
```

## 테스트 방법

### 1. Smart App Banner (iOS Safari)

- iOS Safari에서 https://daystep.vercel.app 접속
- 상단에 앱 배너가 표시되는지 확인

### 2. App Links 테스트

- 앱이 설치된 상태에서 https://daystep.vercel.app/todos 링크 클릭
- 앱이 자동으로 열리는지 확인

### 3. SmartCTA 컴포넌트 테스트

- `/test-smart-cta` 페이지 방문
- 플랫폼별로 다른 CTA 버튼 확인

## 구현된 기능

### 1. SmartCTA 컴포넌트

- 플랫폼 자동 감지 (iOS/Android/Web)
- 앱 설치 여부 확인
- 조건부 CTA 표시

### 2. Smart App Banner

- iOS: `apple-itunes-app` 메타 태그
- Android: App Links 메타 태그
- Open Graph App Links

### 3. Universal Links / App Links

- 동적 설정 파일 제공
- API 라우트를 통한 유연한 관리
- 환경 변수 기반 설정

## 주의사항

1. **프로덕션 배포 전 필수 사항**
   - 실제 App Store ID로 변경
   - 실제 Android 패키지명으로 변경
   - Team ID 및 SHA256 지문 설정

2. **HTTPS 필수**
   - Universal Links와 App Links는 HTTPS에서만 작동
   - 로컬 테스트 시 ngrok 등 사용 권장

3. **캐시 이슈**
   - iOS는 apple-app-site-association 파일을 캐시함
   - 변경사항 적용에 시간이 걸릴 수 있음

## 문제 해결

### Smart Banner가 표시되지 않는 경우

1. 메타 태그가 올바르게 렌더링되는지 확인
2. App Store ID가 올바른지 확인
3. Safari 설정에서 Smart App Banner가 활성화되어 있는지 확인

### App Links가 작동하지 않는 경우

1. HTTPS 연결인지 확인
2. 인증서 지문이 올바른지 확인
3. 앱의 intent-filter 설정 확인

### 앱 설치 감지가 작동하지 않는 경우

1. 커스텀 URL 스킴이 올바르게 설정되었는지 확인
2. 브라우저 권한 설정 확인
3. 시크릿 모드에서는 작동하지 않을 수 있음
