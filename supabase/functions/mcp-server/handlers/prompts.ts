/**
 * Prompts 핸들러
 *
 * MCP Prompts 프로토콜 구현
 * - prompts/list: 사용 가능한 프롬프트 목록
 * - prompts/get: 프롬프트 내용 조회
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { McpPrompt, McpToolCallResult } from '../types/mcp.ts';
import type { DateContext } from '../utils/date.ts';
import { formatDateKorean } from '../utils/response.ts';

// ============================================================================
// 프롬프트 정의
// ============================================================================

export const MCP_PROMPTS: McpPrompt[] = [
  {
    name: 'adhd_planning_guide',
    description: 'ADHD 친화적 계획 수립 가이드. 막연하고 어려운 일을 구체적인 행동으로 쪼개는 방법.',
    arguments: [
      {
        name: 'task_description',
        description: '계획이 필요한 일 (예: 송도 IT 취업, 보고서 작성)',
        required: true,
      },
      {
        name: 'deadline',
        description: '마감일 (예: 2025-02-15)',
        required: false,
      },
    ],
  },
];

// ============================================================================
// 핸들러
// ============================================================================

/**
 * prompts/list 처리
 */
export function handlePromptsList(): { prompts: McpPrompt[] } {
  return { prompts: MCP_PROMPTS };
}

/**
 * prompts/get 처리
 */
export async function handlePromptsGet(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  args: Record<string, string>,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  switch (name) {
    case 'adhd_planning_guide':
      return getAdhdPlanningGuidePrompt(args, dateContext);

    default:
      return {
        content: [{ type: 'text', text: `알 수 없는 프롬프트: ${name}` }],
        isError: true,
      };
  }
}

// ============================================================================
// 프롬프트 구현
// ============================================================================

/**
 * ADHD 친화적 계획 수립 가이드 프롬프트
 */
function getAdhdPlanningGuidePrompt(
  args: Record<string, string>,
  dateContext: DateContext
): McpToolCallResult {
  const taskDescription = args.task_description || '계획이 필요한 일';
  const deadline = args.deadline || '';

  const deadlineText = deadline
    ? `\n마감일: ${formatDateKorean(deadline)}`
    : '';

  const prompt = `# 🧠 ADHD 친화적 계획 수립 가이드

목표: ${taskDescription}${deadlineText}
오늘 날짜: ${formatDateKorean(dateContext.today)}

---

## 🎯 CAPS 메서드

ADHD에 효과적인 계획 수립 방법론입니다:

### C - Chunk (쪼개기)
큰 작업을 **5-15분** 단위의 작은 행동으로 쪼개세요.

❌ "취업 준비하기" (모호함, 압도적)
✅ "잡코리아에서 송도 IT 회사 3개 찾아 북마크하기" (구체적, 5분)

### A - Anchor (첫 행동 명시)
각 할일의 **첫 물리적 행동**을 명시하세요.

❌ "이력서 작성하기"
✅ "노트북 열고 → 잡코리아 이력서 템플릿 페이지 접속하기"

### P - Pressure (마감 압박)
각 할일에 **마감일/마감 시간**을 부여하세요.
${deadline ? `\n현재 마감일(${formatDateKorean(deadline)})에서 역산해서 각 단계 기한을 정하세요.` : ''}

### S - Start Ritual (시작 의식)
작업 시작 전 **간단한 의식**을 정하세요.
- 물 한 잔 마시기
- 타이머 25분 설정하기
- 핸드폰 방해금지 모드 켜기

---

## 📝 플래닝 질문 가이드

다음 질문에 답해주세요:

### 1. 최종 결과물
"${taskDescription}"이(가) 완료되면 어떤 상태인가요?
(예: 면접 일정이 잡힌 상태, 보고서가 제출된 상태)

### 2. 현재 상태
지금까지 무엇을 했나요? 어디서 막혀있나요?

### 3. 가장 작은 첫 단계
**지금 당장** 5분 안에 할 수 있는 가장 작은 행동은?

### 4. 알고 있는 단계들
떠오르는 해야 할 일들을 나열해주세요.
(순서 상관없이, 떠오르는 대로)

### 5. 불확실한 부분
잘 모르거나 확인이 필요한 것은?
(예: 지원 자격, 필요 서류, 담당자 연락처)

---

## 🛠️ 계획 생성 도구

플래닝이 완료되면 다음 도구로 DayStep에 등록하세요:

\`\`\`
create_project_with_todos
\`\`\`

**입력 예시:**
\`\`\`json
{
  "project": {
    "title": "${taskDescription}",
    "description": "AI 플래닝 결과",
    "icon": "🎯",
    "color": "#4ECDC4"
  },
  "todos": [
    {
      "title": "잡코리아에서 송도 IT 회사 5개 북마크하기",
      "start_time": "today",
      "schedule_type": "anytime",
      "priority": "high",
      "anytime_duration": 15
    },
    {
      "title": "이력서 템플릿 다운로드 받기",
      "start_time": "today",
      "schedule_type": "anytime",
      "priority": "medium",
      "anytime_duration": 10
    }
  ]
}
\`\`\`

---

## 💡 ADHD 친화적 팁

1. **완벽주의 버리기**: 80% 완성된 것이 0%보다 낫습니다
2. **5분 규칙**: 일단 5분만 시작하세요. 대부분 계속하게 됩니다
3. **환경 세팅**: 방해 요소 제거, 필요한 것만 책상에
4. **보상 설정**: 작은 완료마다 자신에게 보상하세요
5. **실패 허용**: 계획대로 안 되어도 괜찮아요. 재조정하면 됩니다

---

자, 이제 "${taskDescription}"를 구체적인 행동들로 쪼개볼까요? 🚀`;

  return {
    content: [{ type: 'text', text: prompt }],
    isError: false,
  };
}
