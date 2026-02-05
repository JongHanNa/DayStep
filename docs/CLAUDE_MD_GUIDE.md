# CLAUDE.md 작성 원칙 가이드

## 왜 CLAUDE.md가 중요한가

- **매 세션 자동 로드** — Claude Code가 가장 먼저 읽는 파일이자 최고 레버리지 지점
- **모든 하위 작업에 전파** — subagent, skill, plan 모드 등 모든 컨텍스트에 영향
- **짧을수록 강력** — 길어질수록 준수율이 떨어지고 핵심이 묻힘

## 적어야 하는 것

| 유형           | 기준                          | 예시                                  |
| -------------- | ----------------------------- | ------------------------------------- |
| 함정 (Gotcha)  | Claude가 틀리면 결과가 치명적 | Materialized View 사용 금지           |
| 기본 행동 억제 | Claude의 일반 원칙과 상충     | 커밋 전 허락 필수                     |
| 빌드/배포      | 코드에서 추론 불가능한 정보   | TestFlight 배포 순서, Vercel 환경변수 |
| 환경 분기      | 잘못 적용하면 프로덕션 사고   | .env.development vs .env.production   |
|                |                               |                                       |

## 적지 말아야 하는 것

| 유형                  | 이유                            | 대안                     |
| --------------------- | ------------------------------- | ------------------------ |
| Claude가 이미 아는 것 | 토큰 낭비, 노이즈 증가          | 삭제                     |
| 린터/포매터 규칙      | ESLint, Prettier가 처리         | .eslintrc, .prettierrc   |
| 특정 작업 전용 지식   | 대화의 <20%에서만 필요          | `.claude/skills/`로 분리 |
| 예제 코드 블록        | CLAUDE.md 비대화의 주범         | Skill에 상세 패턴 기록   |
| 일반적인 코딩 관행    | TypeScript 사용, 에러 핸들링 등 | 불필요                   |

## 핵심 원칙

### Less is More

- **60줄 이하 권장** (HumanLayer 실무 기준)
- 80줄 넘으면 Claude가 일부를 무시하기 시작
- 추가하기 전에 "이걸 빼면 실제로 무엇이 깨지는가?" 자문

### Living Document

- 이론적 필요가 아닌, **실제로 Claude가 틀린 것**만 추가
- 더 이상 필요 없는 규칙은 즉시 삭제
- 분기마다 리뷰하여 사문화된 규칙 제거

### 강조 표현 활용

- `IMPORTANT`, `YOU MUST`, `NEVER` — 준수율 유의미하게 향상
- 단, 남용하면 효과 감소 — 진짜 치명적인 것에만 사용

## Skills 분리 기준

| 조건                   | 위치              | 이유                       |
| ---------------------- | ----------------- | -------------------------- |
| 매 세션 필요           | CLAUDE.md         | 항상 로드됨                |
| 대화의 <20%에서만 필요 | `.claude/skills/` | 필요할 때만 자동 로드      |
| 500줄 이상             | 여러 Skill로 분할 | Skill도 비대하면 효과 감소 |

**SKILL.md 작성 팁**:

- `description`에 트리거 문구 포함 (예: "프론트엔드 파일 수정 시 사용")
- `user-invocable: false`로 설정하면 slash 커맨드 없이 Claude가 자동 로드

## 출처

- [HumanLayer — Tips for CLAUDE.md](https://humanlayer.dev/blog/claude-md)
- [Anthropic — Claude Code Best Practices](https://docs.anthropic.com/en/docs/claude-code/best-practices)
- [Gend.co — CLAUDE.md Writing Guide](https://gend.co/blog/claude-md-guide)