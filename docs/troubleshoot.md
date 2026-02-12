# 빌드 트러블슈팅 가이드

이 가이드는 DayStep 프로젝트의 빌드 과정에서 발생할 수 있는 일반적인 문제들과 해결 방법을 제공합니다.

## 🔧 기본 문제 해결 단계

### 1. 환경 검증

```bash
# 전체 환경 검증
npm run validate:env

# Node.js 버전 확인
node --version  # v18.0.0 이상 필요

# npm 버전 확인
npm --version

# Capacitor 환경 검증
npm run mobile:doctor
```

### 2. 의존성 문제 해결

```bash
# node_modules 정리 후 재설치
rm -rf node_modules package-lock.json
npm install

# 캐시 정리
npm cache clean --force

# 모바일 의존성 재설치
cd mobile
rm -rf node_modules package-lock.json
npm install
cd ..
```

## 🚨 일반적인 문제와 해결 방법

### Node.js 버전 문제

**증상**: `error: engine node is incompatible`
**해결**:

```bash
# nvm을 사용하여 올바른 Node.js 버전 설치
nvm install 20
nvm use 20

# 또는 Node.js 공식 사이트에서 v20.x LTS 다운로드
```

### 메모리 부족 오류

**증상**: `JavaScript heap out of memory`
**해결**:

```bash
# Node.js 메모리 제한 증가
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# 또는 스크립트에 직접 적용
node --max-old-space-size=4096 ./node_modules/.bin/next build
```

### TypeScript 컴파일 오류

**증상**: `Type error: Cannot find module`
**해결**:

```bash
# TypeScript 버전 확인
npx tsc --version

# 타입 정의 재설치
npm install --save-dev @types/node @types/react @types/react-dom

# 수동 타입 체크
npx tsc --noEmit
```

## 📱 모바일 빌드 문제

### Capacitor 설정 문제

**증상**: `Capacitor could not find the web assets directory`
**해결**:

```bash
# 웹 빌드 먼저 실행
npm run build:mobile

# Capacitor 동기화
npm run mobile:sync

# 문제 지속 시 Capacitor 재설치
cd mobile
npx cap clean
npx cap sync
```

### iOS 빌드 문제

**증상**: `xcodebuild: error: The workspace does not contain a scheme`
**해결**:

```bash
# Xcode 프로젝트 정리
cd mobile/ios/App
rm -rf build/
rm -rf DerivedData/

# Capacitor iOS 재설치
cd ../../
npx cap clean ios
npx cap add ios
npx cap sync ios
```

### Android 빌드 문제

**증상**: `Could not resolve all files for configuration ':app:implementation'`
**해결**:

```bash
# Android Gradle 캐시 정리
cd mobile/android
./gradlew clean

# Capacitor Android 재설치
cd ../
npx cap clean android
npx cap add android
npx cap sync android
```

## 🌐 웹 빌드 문제

### Next.js 빌드 오류

**증상**: `Error: Cannot resolve module`
**해결**:

```bash
# Next.js 캐시 정리
rm -rf .next

# 환경별 빌드 테스트
BUILD_TARGET=web npm run build
BUILD_TARGET=mobile npm run build

# 번들 분석으로 문제 파악
npm run analyze:bundle
```

### 환경 변수 문제

**증상**: `process.env.VARIABLE is undefined`
**해결**:

```bash
# .env.local 파일 확인
cat .env.local

# 환경 변수 설정 확인
printenv | grep BUILD_TARGET

# Next.js 환경 변수 로드 확인 (next.config.ts의 env 섹션)
```

## 🔍 디버깅 도구

### 상세 로그 활성화

```bash
# Next.js 디버그 모드
DEBUG=* npm run build

# Capacitor 디버그 모드
DEBUG=capacitor* npm run mobile:build

# npm 상세 로그
npm run build --loglevel=verbose
```

### 빌드 성능 분석

```bash
# 빌드 시간 측정
time npm run build:web
time npm run build:mobile

# 번들 크기 분석
npm run analyze:bundle
npm run analyze:mobile

# 메모리 사용량 모니터링
node --trace-gc ./node_modules/.bin/next build
```

### 의존성 분석

```bash
# 취약점 검사
npm audit
npm audit fix

# 오래된 패키지 확인
npm outdated

# 패키지 크기 분석
npx bundlephobia [package-name]
```

## 📊 성능 최적화

### 빌드 속도 개선

```bash
# 병렬 빌드 활성화 (package.json에서 설정)
export NODE_OPTIONS="--max-old-space-size=4096"

# TypeScript 증분 컴파일 활성화
# tsconfig.json에서 "incremental": true 설정

# Next.js 캐시 활용
# .next/cache 디렉토리 보존
```

### 번들 크기 최적화

```bash
# Tree shaking 확인
npm run analyze:bundle

# 동적 import 사용 확인
# components/lazy/LazyComponents.tsx 참조

# 이미지 최적화 확인
# next.config.ts의 images 설정 확인
```

## 🆘 추가 도움

### 로그 수집

문제 신고 시 다음 정보를 포함하세요:

```bash
# 시스템 정보
node --version
npm --version
npm ls --depth=0

# 환경 정보
npm run validate:env

# 오류 로그
npm run build 2>&1 | tee build.log
```

### 연락처

- GitHub Issues: [프로젝트 리포지토리]/issues
- 문서: README.md 참조

## 📋 체크리스트

빌드 문제 해결 전 확인사항:

- [ ] Node.js v18+ 설치 확인
- [ ] npm 최신 버전 사용
- [ ] node_modules 재설치 시도
- [ ] 환경 변수 올바른 설정
- [ ] .env.local 파일 존재 확인
- [ ] 디스크 공간 충분 (최소 2GB)
- [ ] 메모리 충분 (최소 4GB)
- [ ] 방화벽/바이러스 프로그램 예외 설정

문제가 계속 발생하면 위의 로그 수집 방법으로 상세 정보를 수집하여 이슈를 등록해주세요.
