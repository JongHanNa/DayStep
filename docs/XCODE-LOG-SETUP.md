# Xcode에서 Capacitor 로그 줄이기 설정

## 🔇 네이티브 통신 로그 간소화 방법

### 1. Xcode에서 Environment Variables 설정

**단계**:
1. Xcode에서 iOS 프로젝트 열기
2. Product > Scheme > Edit Scheme... 선택
3. Run > Arguments 탭 선택
4. Environment Variables 섹션에서 추가:

```
CAPACITOR_LOG_LEVEL = ERROR
OS_ACTIVITY_MODE = disable
```

### 2. Build Settings에서 로그 레벨 조정

**단계**:
1. 프로젝트 선택 > Build Settings
2. Search에 "GCC_PREPROCESSOR_DEFINITIONS" 입력
3. Debug 설정에 추가:

```
CAPACITOR_LOG_LEVEL=1
```

### 3. 시뮬레이터 디바이스 로그 필터링

**Console.app 사용**:
1. Applications > Utilities > Console 열기
2. 시뮬레이터 디바이스 선택
3. Search 필터에 입력:
   - 보고 싶은 로그: `process:DayStep`
   - 제외하고 싶은 로그: `NOT CONTAINS "LocalNotifications"`

### 4. 현재 적용된 설정

**capacitor.config.ts**:
- `loggingBehavior: "production"` → 기본 로그 간소화

**debugUtils.ts**:
- 개발자 콘솔에서 실시간 로그 제어 가능
- `debugUtils.disableCapacitorLogs()` 사용

## 🎯 효과

**이전**:
```
⚡️  To Native ->  LocalNotifications getPending 3086763
num of pending notifications 15
[<UNNotificationRequest: 0x600000c21ad0...]
```

**이후**: 에러와 중요 정보만 출력

## 💡 실시간 개발 팁

브라우저 개발자 도구에서:
```javascript
// 모든 디버그 로그 끄기
debugUtils.disableAllLogs()

// 특정 로그만 켜기
debugUtils.enableNotificationLogs()
```