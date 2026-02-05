# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 정보

**저장소**: DayStep - 할일 관리 및 템플릿 기반 생산성 앱
**배포**: 웹 (Vercel) + iOS/Android 네이티브 앱

## 빌드 및 배포

**TestFlight 배포 프로세스**:
1. 빌드 실행: `npm run build:mobile` 또는 `npm run build:mobile:prod`
2. Xcode 열기: `npx cap open ios`
3. Archive 생성: Product → Archive (Any iOS Device 선택)
4. App Store Connect 업로드: Distribute App → Upload
5. TestFlight 설정: App Store Connect에서 테스터 추가

**Materialized View 사용 금지:**
- `inbox_todos`, `inbox_projects`, `inbox_goals` Materialized View 조회 금지
- 캐시된 스냅샷 반환 → DELETE/UPDATE 후 자동 갱신 안됨
- **필수**: `todos`, `projects`, `goals` 테이블 직접 조회 + 클라이언트 필터링
- 스키마 검증: Supabase MCP로 확인

## 환경 설정

**환경 파일 분리**:
- `.env.development` → 개발 DB (DayStep)
- `.env.production` → 프로덕션 DB (DayStep Production)

**Vercel 배포**:
- ⚠️ Vercel은 `.env.production` 파일을 사용하지 않음
- ✅ Vercel Dashboard → Settings → Environment Variables에서 설정
- **Production**: main 브랜치 → 프로덕션 DB → `daystep.vercel.app`
- **Preview**: develop/feature 브랜치 → 개발 DB → 자동 생성 URL
- 📖 상세 가이드: `docs/VERCEL_DEPLOYMENT.md` 참조

## MCP 서버

### DayStep MCP 서버 배포

```bash
npx supabase functions deploy mcp-server --project-ref <PROJECT_REF> --no-verify-jwt
```
⚠️ `--no-verify-jwt` 필수 (공개 OAuth 엔드포인트용, 없으면 401 오류)

## 핵심 아키텍처 패턴

### 인증 시스템
- **웹**: Supabase Auth + OAuth (Google, Kakao)
- **모바일**: Capacitor 플러그인 + JWT 토큰
- **백업**: Capacitor Preferences (key: `supabase_auth_session`)

---

## Claude Code 개발 가이드

### 기본 규칙

- **한글로 대답하세요**
- **커밋은 사용자에게 허락 확인 받고 하세요**
- **CLAUDE.md 업데이트 시 핵심만 작성, 예제 코드는 최소화하세요**

### 환경별 절대원칙

**절대 금지**:
- ❌ 한 환경의 빌드 오류로 다른 환경 코드 삭제/수정
- ❌ 모바일 오류 → 웹 코드 수정 | 웹 오류 → 모바일 코드 수정

**반응형 우선**: UI 크기/간격/폰트 → Tailwind Responsive (`sm:`, `md:`) 사용, DevTools 테스트 가능
**BUILD_TARGET**: Capacitor 전용/SSR 분기만 사용, DevTools 불가하므로 실제 빌드 필요
