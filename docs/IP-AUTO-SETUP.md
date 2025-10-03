# 🌐 네트워크 IP 자동 설정 시스템

장소가 바뀌거나 네트워크 환경이 변경될 때 IP 주소를 자동으로 감지하고 설정하는 시스템입니다.

## 🎯 해결하는 문제

- **기존 문제**: 장소 변경 시 하드코딩된 IP 주소 때문에 모바일 앱이 개발 서버에 연결 실패
- **해결책**: 현재 네트워크 환경을 자동 감지하여 IP 주소를 동적으로 설정

## 🚀 자동 실행

다음 명령어들은 **자동으로 IP 설정**을 포함합니다:

```bash
# 개발 서버 시작 (IP 자동 설정 포함)
npm run dev

# 모바일 빌드 (IP 자동 설정 포함)
npm run build:mobile:fast
```

## 🔧 수동 실행

네트워크 환경이 변경되었을 때 수동으로 IP를 업데이트:

```bash
# IP 주소 자동 감지 및 설정
npm run setup:ip
```

## 🌐 동작 원리

### 1. IP 자동 감지
```bash
# macOS 네트워크 인터페이스에서 활성 IP 조회
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
```

### 2. 설정 파일 자동 업데이트

#### Capacitor 설정 (`mobile/capacitor.config.ts`)
```typescript
// 자동 업데이트됨
allowNavigation: ["localhost", "*.supabase.co", "https://*.supabase.co", "192.168.1.235:3000"],
url: "http://192.168.1.235:3000",
```

#### 환경 변수 (`.env.local`)
```bash
# 자동 생성/업데이트됨
NEXT_PUBLIC_LOCAL_IP=192.168.1.235
```

### 3. 코드에서 동적 사용
```typescript
// hooks/useServerSentEvents.ts
import { getDynamicServerUrl } from '@/lib/network-utils';

const baseUrl = Capacitor.isNativePlatform() 
  ? getDynamicServerUrl()  // 동적 IP 사용
  : 'http://localhost:3000';
```

## 📁 관련 파일들

### 핵심 파일
- `scripts/setup-dev-ip.js` - IP 자동 설정 스크립트 (Node.js)
- `lib/network-utils.ts` - 네트워크 유틸리티 (TypeScript)

### 자동 업데이트되는 파일
- `mobile/capacitor.config.ts` - Capacitor 설정
- `.env.local` - 환경 변수

### 사용하는 파일
- `hooks/useServerSentEvents.ts` - SSE 연결
- `package.json` - NPM 스크립트

## 🔍 IP 감지 로직

### 1차 시도 (일반적인 방법)
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
```

### 2차 시도 (대안 방법)
```bash
route get default | grep interface | awk '{print $2}' | xargs -I {} ifconfig {} | grep "inet " | awk '{print $2}' | head -1
```

### 3차 시도 (기본값)
IP 감지 실패 시 `192.168.1.100` 사용

## 🎯 사용 시나리오

### 시나리오 1: 집에서 개발
```bash
npm run dev
# 🌐 자동 감지된 로컬 IP: 192.168.1.235
# 🌐 Capacitor 설정 업데이트: 192.168.1.235:3000
# 🌐 환경 변수 설정: NEXT_PUBLIC_LOCAL_IP=192.168.1.235
```

### 시나리오 2: 카페에서 개발
```bash
npm run dev
# 🌐 자동 감지된 로컬 IP: 10.0.1.142
# 🌐 Capacitor 설정 업데이트: 10.0.1.142:3000
# 🌐 환경 변수 설정: NEXT_PUBLIC_LOCAL_IP=10.0.1.142
```

### 시나리오 3: 사무실에서 개발
```bash
npm run dev
# 🌐 자동 감지된 로컬 IP: 172.16.0.55
# 🌐 Capacitor 설정 업데이트: 172.16.0.55:3000
# 🌐 환경 변수 설정: NEXT_PUBLIC_LOCAL_IP=172.16.0.55
```

## 🤔 쉽게 말하면

네트워크가 바뀔 때마다 **자동으로 "주소 찾기"**를 해서, 모바일 앱이 항상 올바른 개발 서버에 연결될 수 있도록 해주는 시스템이에요!

- **기존**: 장소 바뀜 → 수동으로 IP 수정 → 모바일 재빌드 😩
- **개선**: 장소 바뀜 → 자동 IP 감지 → 바로 개발 가능 ✨

## 🚨 주의사항

1. **macOS 전용**: 현재 macOS의 `ifconfig` 명령어 기반
2. **개발 환경 전용**: HTTP 접근 허용 (cleartext: true)
3. **실행 권한**: `scripts/setup-dev-ip.js` 실행 권한 필요
4. **네트워크 의존**: 활성 네트워크 인터페이스가 필요

## 🔧 문제 해결

### IP 감지 실패 시
```bash
# 수동으로 현재 IP 확인
ifconfig | grep "inet " | grep -v 127.0.0.1

# 수동으로 IP 설정
export NEXT_PUBLIC_LOCAL_IP=192.168.1.xxx
npm run dev:direct  # IP 설정 없이 직접 실행
```

### 권한 오류 시
```bash
# 스크립트 실행 권한 부여
chmod +x scripts/setup-dev-ip.js
```

### 환경 변수 확인
```bash
# 현재 설정된 IP 확인
cat .env.local | grep NEXT_PUBLIC_LOCAL_IP
```

이제 어떤 네트워크 환경에서든 개발 서버를 시작하면 자동으로 올바른 IP가 설정됩니다! 🎉