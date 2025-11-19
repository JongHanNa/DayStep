# Vercel 배포 가이드

## 환경 변수 설정

Vercel 배포 시 프로덕션 DB를 사용하려면 Vercel 대시보드에서 환경 변수를 설정해야 합니다.

### 설정 방법

1. **Vercel Dashboard 접속**
   - https://vercel.com
   - DayStep 프로젝트 선택

2. **Environment Variables 설정**
   - Settings → Environment Variables 메뉴
   - 아래 변수들을 **Production** 환경에만 추가

### 필수 환경 변수

```bash
# DayStep Production DB (프로덕션 데이터베이스)
NEXT_PUBLIC_SUPABASE_URL=https://iqiwjorjyryxhcgucmnj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxaXdqb3JqeXJ5eGhjZ3VjbW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDkzMjIsImV4cCI6MjA3ODkyNTMyMn0.qbJ_vfQ5S4sYRBWJIU39P7tVnKQU6Jbmo9FDEpt0GQ4

# Site URL (프로덕션 도메인)
NEXT_PUBLIC_SITE_URL=https://daystep.vercel.app

# 빌드 설정
BUILD_TARGET=web
NODE_ENV=production
```

### 환경 선택

각 환경 변수에 대해 적용할 환경을 선택하세요:
- ✅ **Production**: 프로덕션 배포 (main 브랜치)
- ⬜ Preview: 미리보기 배포 (develop 브랜치)
- ⬜ Development: 로컬 개발

**중요**: Preview/Development는 체크하지 마세요! (개발 DB를 사용해야 함)

## 배포 확인

### 1. 환경 변수 설정 후
- Vercel에서 자동으로 재배포됩니다
- 또는 수동으로 "Redeploy" 버튼 클릭

### 2. 배포 완료 확인
```bash
# 브라우저 개발자 도구 콘솔에서 확인
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
# 출력: https://iqiwjorjyryxhcgucmnj.supabase.co (프로덕션 DB)
```

### 3. DB 연결 확인
- 배포된 사이트에서 로그인 시도
- Supabase Dashboard → DayStep Production → Authentication
- 새 사용자가 프로덕션 DB에 생성되는지 확인

## 문제 해결

### 여전히 개발 DB를 참조하는 경우

1. **환경 변수 확인**
   - Vercel Dashboard → Settings → Environment Variables
   - Production 환경에 올바른 값이 설정되었는지 확인

2. **재배포**
   - Deployments 탭 → 최신 배포 선택
   - 우측 상단 ⋯ 메뉴 → "Redeploy"

3. **빌드 로그 확인**
   - Deployments → 배포 선택 → Building 로그
   - 환경 변수가 올바르게 로드되었는지 확인

### 개발 환경 확인

로컬 개발 시 `.env.development` 파일이 자동으로 사용됩니다:

```bash
npm run dev:web   # 개발 DB 사용
npm run build     # 프로덕션 빌드 (로컬에서는 .env.production 사용)
```

## 환경별 DB 요약

| 환경 | DB | Supabase 프로젝트 | 환경 파일 |
|------|----|--------------------|-----------|
| 로컬 개발 | 개발 DB | DayStep | `.env.development` |
| Vercel Production | 프로덕션 DB | DayStep Production | Vercel 환경 변수 |
| Vercel Preview (develop) | 개발 DB | DayStep | Vercel 환경 변수 |
| 로컬 프로덕션 빌드 | 프로덕션 DB | DayStep Production | `.env.production` |
| iOS/Android | 개발 DB | DayStep | `.env.development` |

---

## Preview 환경 설정 (develop 브랜치)

### Preview 환경이란?

Vercel의 Preview 환경은 main 이외의 브랜치(develop, feature/* 등)를 자동으로 배포하는 환경입니다.

**특징**:
- ✅ develop 브랜치 푸시 → 자동 Preview 배포 생성
- ✅ 자동 생성 URL: `https://daystep-git-develop-[username].vercel.app`
- ✅ Pull Request마다 고유한 배포 URL 생성
- ⚠️ 커스텀 도메인 연결은 Pro 플랜 이상 필요

### Preview 환경 변수 설정

develop 브랜치에서 개발 DB를 사용하도록 설정합니다.

1. **Vercel Dashboard 접속**
   - Settings → Environment Variables

2. **Preview 환경 변수 추가**
   - **Preview 환경만** 체크 (Production 체크 해제)
   - 다음 변수 추가:

```bash
# DayStep 개발 DB (Development Database)
NEXT_PUBLIC_SUPABASE_URL=https://simbmdvtiukdbjxeepic.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpbWJtZHZ0aXVrZGJqeGVlcGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzY4NjAsImV4cCI6MjA2ODg1Mjg2MH0.ZGpXzwPyOZFFhKZcVGHsMwjQXwSLsE4GxhW2i6Lv-Kk

# Site URL (Preview URL은 자동 생성)
NEXT_PUBLIC_SITE_URL=https://daystep-git-develop-[username].vercel.app

# 빌드 설정
BUILD_TARGET=web
```

**주의**: `NEXT_PUBLIC_SITE_URL`의 `[username]` 부분은 실제 배포 후 자동 생성된 URL로 대체하세요.

### Preview 배포 URL 확인

1. develop 브랜치에 코드 푸시
2. Vercel Dashboard → Deployments
3. develop 브랜치 배포 찾기
4. 자동 생성된 URL 확인 (예: `https://daystep-git-develop-jonghanna.vercel.app`)

### Preview 환경 활용

**팀 협업**:
- develop 브랜치: 개발 DB로 통합 테스트
- feature 브랜치: 독립적인 Preview 배포로 기능 검증
- Pull Request: PR마다 고유 URL로 리뷰어가 직접 테스트

**환경별 URL 패턴**:
- Production: `https://daystep.vercel.app`
- Preview (develop): `https://daystep-git-develop-[username].vercel.app`
- Preview (feature): `https://daystep-git-feature-name-[username].vercel.app`
- Preview (PR): `https://daystep-[hash]-[username].vercel.app`

### Pro 플랜 기능 (선택사항)

Pro 플랜($20/월)으로 업그레이드하면:
- ✅ Preview 배포에 커스텀 도메인 연결 가능 (예: `dev.daystep.com`)
- ✅ 패스워드 보호 기능
- ✅ 팀 협업 기능 강화
- ✅ 고급 분석 및 모니터링

---

## 보안 주의사항

- ⚠️ ANON KEY는 공개 가능한 키입니다 (클라이언트 사이드 사용)
- ⚠️ `.env.production` 파일은 `.gitignore`에 포함되어야 합니다
- ⚠️ Vercel 환경 변수는 팀원과만 공유하세요
- ⚠️ Preview 배포 URL도 민감한 데이터 포함 가능 - 팀원과만 공유
