# ChatGPT Actions 설정 가이드

DayStep MCP 서버를 ChatGPT GPTs Actions로 연결하여 ChatGPT에서 할일/프로젝트 관리

---

## 1단계: Supabase 환경 변수 설정

### Supabase Dashboard → Edge Functions → mcp-server → Settings

| 환경 변수 | 값 | 설명 |
|----------|---|------|
| `MCP_JWT_SECRET` | (32자 이상 랜덤 문자열) | JWT 서명용 시크릿 (필수) |
| `CHATGPT_CLIENT_ID` | `chatgpt-daystep` | OAuth client_id |
| `CHATGPT_CLIENT_SECRET` | (선택, 랜덤 문자열) | OAuth client_secret |

**MCP_JWT_SECRET 생성 방법**:
```bash
openssl rand -base64 32
```

> **참고**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 Supabase가 자동 주입

### 환경별 Base URL

| 환경 | URL |
|-----|-----|
| **개발** | `https://simbmdvtiukdbjxeepic.supabase.co/functions/v1/mcp-server` |
| **프로덕션** | `https://iqiwjorjyryxhcgucmnj.supabase.co/functions/v1/mcp-server` |

---

## 2단계: ChatGPT GPT Builder 설정

### 2-1. GPT 생성

1. https://chat.openai.com/gpts/editor 접속
2. "Create a GPT" 클릭
3. 이름/설명 입력 (예: "DayStep - 할일 관리")

### 2-2. Actions 추가

**Configure 탭 → Actions → Create new action**

#### Schema (Import from URL)

**개발 환경**:
```
https://simbmdvtiukdbjxeepic.supabase.co/functions/v1/mcp-server/openapi.json
```

**프로덕션 환경**:
```
https://iqiwjorjyryxhcgucmnj.supabase.co/functions/v1/mcp-server/openapi.json
```

위 URL 입력 후 **Import** 클릭

#### Authentication 설정

| 필드 | 값 |
|-----|---|
| **Authentication Type** | OAuth |
| **Client ID** | `chatgpt-daystep` |
| **Client Secret** | (1단계에서 설정한 값, 또는 빈칸) |
| **Authorization URL** | `https://{PROJECT_REF}.supabase.co/functions/v1/mcp-server/oauth/authorize` |
| **Token URL** | `https://{PROJECT_REF}.supabase.co/functions/v1/mcp-server/oauth/token` |
| **Scope** | `projects:read projects:write todos:read todos:write` |
| **Token Exchange Method** | `POST request` |

**환경별 URL**:

| 환경 | Authorization URL | Token URL |
|-----|------------------|-----------|
| 개발 | `https://simbmdvtiukdbjxeepic.supabase.co/functions/v1/mcp-server/oauth/authorize` | `https://simbmdvtiukdbjxeepic.supabase.co/functions/v1/mcp-server/oauth/token` |
| 프로덕션 | `https://iqiwjorjyryxhcgucmnj.supabase.co/functions/v1/mcp-server/oauth/authorize` | `https://iqiwjorjyryxhcgucmnj.supabase.co/functions/v1/mcp-server/oauth/token` |

### 2-3. Callback URL 확인

Authentication 설정 완료 후 ChatGPT가 생성하는 **Callback URL** 복사
(형식: `https://chat.openai.com/aip/g-XXXXXX/oauth/callback`)

> 현재 구현에서는 모든 redirect_uri를 허용하므로 별도 등록 불필요

### 2-4. GPT Instructions (선택)

```
You are a DayStep assistant that helps users manage their todos and projects.

When the user asks to:
- Create a todo → Use POST /api/v1/todos
- List todos → Use GET /api/v1/todos with date filter
- Complete a todo → Use POST /api/v1/todos/{id}/complete
- Create a project with todos → Use POST /api/v1/projects/with-todos

Always ask for clarification if the date or details are unclear.
For project planning, suggest breaking down into 5-minute actionable subtasks.
```

---

## 3단계: 테스트

### GPT에서 테스트

1. GPT 저장 후 "Try it" 클릭
2. "내 오늘 할일 보여줘" 입력
3. Google 로그인 창 → 인증
4. 할일 목록 응답 확인

### CLI 테스트 (개발자용)

```bash
# OpenAPI 스키마 확인
curl https://simbmdvtiukdbjxeepic.supabase.co/functions/v1/mcp-server/openapi.json | jq .

# OAuth 플로우 시작 (브라우저에서 열기)
open "https://simbmdvtiukdbjxeepic.supabase.co/functions/v1/mcp-server/oauth/authorize?client_id=chatgpt-daystep&redirect_uri=https://example.com/callback&response_type=code&state=test123"
```

---

## 문제 해결

| 증상 | 원인 | 해결 |
|-----|-----|-----|
| 401 Unauthorized | 토큰 만료 또는 환경변수 미설정 | Supabase 환경변수 확인 |
| Invalid client_id | CHATGPT_CLIENT_ID 불일치 | 환경변수와 GPT 설정 일치 확인 |
| Schema import 실패 | OpenAPI URL 접근 불가 | 배포 상태 확인, URL 정확성 확인 |
| Google 로그인 후 에러 | OAuth 쿠키 만료 | 10분 내 인증 완료, 다시 시도 |
| 302 루프 | redirect_uri 불일치 | ChatGPT Callback URL 확인 |

---

## API 엔드포인트

### Todos

| 메소드 | 경로 | 설명 |
|-------|-----|------|
| GET | `/api/v1/todos` | 할일 목록 (date, completed 필터) |
| POST | `/api/v1/todos` | 할일 생성 |
| GET | `/api/v1/todos/{id}` | 할일 상세 |
| PATCH | `/api/v1/todos/{id}` | 할일 수정 |
| DELETE | `/api/v1/todos/{id}` | 할일 삭제 |
| POST | `/api/v1/todos/{id}/complete` | 할일 완료/미완료 토글 |

### Projects

| 메소드 | 경로 | 설명 |
|-------|-----|------|
| GET | `/api/v1/projects` | 프로젝트 목록 (status 필터) |
| POST | `/api/v1/projects` | 프로젝트 생성 |
| GET | `/api/v1/projects/{id}` | 프로젝트 상세 |
| PATCH | `/api/v1/projects/{id}` | 프로젝트 수정 |
| DELETE | `/api/v1/projects/{id}` | 프로젝트 삭제 |
| POST | `/api/v1/projects/{id}/complete` | 프로젝트 완료 |
| POST | `/api/v1/projects/with-todos` | 프로젝트+할일 일괄 생성 |

---

## 검증 체크리스트

- [ ] Supabase 환경변수 설정 완료 (MCP_JWT_SECRET 필수)
- [ ] GPT Builder에서 Schema import 성공
- [ ] OAuth Authentication 설정 완료
- [ ] 테스트 대화에서 Google 로그인 성공
- [ ] 할일 조회/생성 동작 확인

---

## 배포 명령어

```bash
# 개발 DB
npx supabase functions deploy mcp-server --project-ref simbmdvtiukdbjxeepic --no-verify-jwt

# 프로덕션 DB
npx supabase functions deploy mcp-server --project-ref iqiwjorjyryxhcgucmnj --no-verify-jwt
```

> `--no-verify-jwt` 필수 (공개 OAuth 엔드포인트용)
