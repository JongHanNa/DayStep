# DayStep MCP Server

DayStep 앱을 위한 MCP (Model Context Protocol) 서버입니다.
ChatGPT, Claude, Cursor 등 MCP 지원 플랫폼에서 DayStep 데이터를 관리할 수 있습니다.

## 기능

### Tools (35개)

**Areas/Resources (6개)**
- `create_area_resource` - 책임/자원 생성
- `list_areas_resources` - 목록 조회
- `get_area_resource` - 상세 조회
- `update_area_resource` - 수정
- `delete_area_resource` - 삭제
- `archive_area_resource` - 보관

**Goals (6개)**
- `create_goal` - 목표 생성 (year_goal, quarter_goal 동적 계산)
- `list_goals` - 목록 조회
- `get_goal` - 상세 조회
- `update_goal` - 수정
- `delete_goal` - 삭제
- `set_goal_status` - 상태 변경

**Projects (6개)**
- `create_project` - 프로젝트 생성
- `list_projects` - 목록 조회
- `get_project` - 상세 조회 (할일 포함)
- `update_project` - 수정
- `delete_project` - 삭제
- `complete_project` - 완료 처리

**Todos (7개)**
- `create_todo` - 할일 생성 (반복, 일정 타입 지원)
- `list_todos` - 목록 조회
- `get_todo` - 상세 조회
- `update_todo` - 수정
- `delete_todo` - 삭제
- `complete_todo` - 완료 토글
- `reschedule_todo` - 일정 변경

**관계 및 특수 도구 (10개)**
- `link_todo_to_project` - 할일-프로젝트 연결
- `unlink_todo_from_project` - 연결 해제
- `get_today_summary` - 오늘 할일 요약
- `get_weekly_review` - 주간 리뷰
- `create_plan_from_template` - 템플릿에서 계획 생성
- `bulk_reschedule` - 일괄 재조정
- `search_items` - 통합 검색
- `get_inbox_items` - 인박스 항목 조회
- `get_overdue_todos` - 지연 할일 조회
- `get_statistics` - 통계 조회

### Resources (6개)
- `daystep://templates/list` - 템플릿 목록
- `daystep://summary/today` - 오늘 요약
- `daystep://summary/week` - 주간 요약
- `daystep://goals/current` - 현재 목표
- `daystep://projects/active` - 활성 프로젝트
- `daystep://stats/overview` - 통계 개요

### Prompts (6개)
- `daily_planning` - 일일 계획 가이드
- `weekly_review` - 주간 리뷰 가이드
- `goal_setting` - 목표 설정 가이드
- `project_breakdown` - 프로젝트 분해 가이드
- `inbox_processing` - 인박스 처리 가이드
- `time_blocking` - 시간 블로킹 가이드

## 인증

### 1단계: OAuth 인증 시작

브라우저에서 다음 URL 접속:
```
https://<project-ref>.supabase.co/functions/v1/mcp-server/auth/init?provider=google
```

또는 Kakao:
```
https://<project-ref>.supabase.co/functions/v1/mcp-server/auth/init?provider=kakao
```

### 2단계: 토큰 복사

로그인 후 표시되는 토큰을 복사합니다.

### 3단계: MCP 클라이언트 설정

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "daystep": {
      "url": "https://<project-ref>.supabase.co/functions/v1/mcp-server",
      "headers": {
        "Authorization": "Bearer <복사한-토큰>"
      }
    }
  }
}
```

**Cursor** (설정에서 MCP 서버 추가):
- URL: `https://<project-ref>.supabase.co/functions/v1/mcp-server`
- Headers: `Authorization: Bearer <복사한-토큰>`

## 사용 예시

```
"내일 오전 9시에 '팀 미팅 준비' 할일 추가해줘"
"이번 분기 목표로 '사이드 프로젝트 런칭' 만들어줘"
"오늘 할일 보여줘"
"매주 월/수/금 오전 7시에 운동 반복 일정 만들어줘"
"건강 관리 템플릿으로 계획 생성해줘"
```

## 동적 날짜 지원

- `today` - 오늘
- `tomorrow` - 내일
- `next_week` - 다음 주 시작일
- `next_month` - 다음 달 1일
- `quarter_end` - 분기 마지막 날
- `year_end` - 연말
- `current` - year_goal/quarter_goal에서 현재 연도/분기

## 배포

```bash
# 개발 환경
supabase functions deploy mcp-server --project-ref <dev-project-ref>

# 프로덕션 환경
supabase functions deploy mcp-server --project-ref <prod-project-ref>
```

## 환경 변수

- `SUPABASE_URL` - Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY` - 서비스 역할 키
- `MCP_JWT_SECRET` - MCP 토큰 서명 비밀 키 (선택, 미지정 시 서비스 키 사용)

## Rate Limiting

- `/auth/init`: 분당 5회 (IP 기준)
- `tools/call`: 분당 60회 (사용자 기준)

## 보안

- OAuth 인증을 통한 사용자 식별
- JWT 토큰 기반 세션 관리
- Supabase RLS를 통한 데이터 격리
- 삭제 작업 시 확인 절차 (force 옵션 필요)
