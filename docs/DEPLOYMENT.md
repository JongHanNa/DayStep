# Vercel 배포 가이드

이 문서는 DayStep 애플리케이션을 Vercel에 배포하는 방법을 설명합니다.

## 사전 준비

### 1. 필수 환경 변수

Vercel 대시보드에서 다음 환경 변수를 설정해야 합니다:

```bash
# Supabase Configuration (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anonymous_key

# SEO Configuration (필수)
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

### 2. Supabase 설정 확인

- Supabase 프로젝트가 생성되어 있어야 합니다
- Authentication 설정에서 Site URL을 Vercel 도메인으로 설정
- OAuth 제공자 (Google, Kakao) 리디렉션 URL 업데이트 필요

## 배포 단계

### 1. GitHub 레포지토리 연결

```bash
# 현재 프로젝트를 GitHub에 푸시
git add .
git commit -m "feat: 배포 준비 완료"
git push origin main
```

### 2. Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/dashboard)에 접속
2. "New Project" 클릭
3. GitHub 레포지토리 선택 (JongHanNa/DayStep)
4. Framework: Next.js 자동 감지 확인
5. Build Command: `npm run build` (기본값)
6. Output Directory: `.next` (기본값)
7. Install Command: `npm install` (기본값)

### 3. 환경 변수 설정

Vercel 대시보드 → Project Settings → Environment Variables에서:

```
NEXT_PUBLIC_SUPABASE_URL = https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = [your-anon-key]
NEXT_PUBLIC_SITE_URL = https://[your-project].vercel.app
```

### 4. Supabase OAuth 설정 업데이트

#### Google OAuth

- Google Cloud Console에서 승인된 리디렉션 URI에 추가:
  - `https://[your-project].vercel.app/auth/callback`
  - `https://[your-supabase-project].supabase.co/auth/v1/callback`

#### Kakao OAuth

- Kakao Developers에서 Redirect URI에 추가:
  - `https://[your-project].vercel.app/auth/kakao-callback`

#### Supabase Auth Settings

- Supabase Dashboard → Authentication → Settings에서:
  - Site URL: `https://[your-project].vercel.app`
  - Redirect URLs에 추가:
    - `https://[your-project].vercel.app/auth/callback`
    - `https://[your-project].vercel.app/auth/kakao-callback`

## 배포 후 확인사항

### 1. 기본 기능 테스트

- [ ] 메인 페이지 로딩
- [ ] 로그인/로그아웃 (Google, Kakao)
- [ ] 할일 CRUD 기능
- [ ] 다짐 CRUD 기능
- [ ] 보관함 기능
- [ ] 다크모드 전환
- [ ] 반응형 디자인

### 2. SEO 확인

- [ ] robots.txt: `https://your-domain.vercel.app/robots.txt`
- [ ] sitemap.xml: `https://your-domain.vercel.app/sitemap.xml`
- [ ] 메타 태그 확인 (소셜 미디어 미리보기)

### 3. 성능 확인

- [ ] Lighthouse 점수 (90+ 목표)
- [ ] Core Web Vitals
- [ ] 페이지 로딩 속도

## 도메인 연결 (선택사항)

커스텀 도메인을 사용하려면:

1. Vercel Dashboard → Project → Settings → Domains
2. 도메인 추가 및 DNS 설정
3. 환경 변수 `NEXT_PUBLIC_SITE_URL` 업데이트
4. Supabase 및 OAuth 설정에서 도메인 업데이트

## 트러블슈팅

### 빌드 에러

- `npm run build` 로컬에서 테스트
- TypeScript 에러 확인
- 환경 변수 누락 확인

### 인증 에러

- Supabase Site URL 확인
- OAuth 제공자 리디렉션 URL 확인
- 환경 변수 정확성 확인

### 데이터베이스 연결 에러

- Supabase 프로젝트 상태 확인
- API 키 유효성 확인
- 네트워크 접근 권한 확인

## 참고 링크

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Auth Guides](https://supabase.com/docs/guides/auth)
