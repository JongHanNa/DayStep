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
    name: 'daily_planning',
    description: '오늘 하루 계획을 세우는 가이드',
    arguments: [
      {
        name: 'focus_area',
        description: '집중할 영역 (선택사항)',
        required: false,
      },
    ],
  },
  {
    name: 'weekly_review',
    description: '주간 리뷰를 진행하는 가이드',
    arguments: [],
  },
  {
    name: 'goal_setting',
    description: '목표 설정을 돕는 가이드',
    arguments: [
      {
        name: 'period',
        description: '목표 기간 (year, quarter)',
        required: false,
      },
    ],
  },
  {
    name: 'project_breakdown',
    description: '프로젝트를 할일로 분해하는 가이드',
    arguments: [
      {
        name: 'project_name',
        description: '분해할 프로젝트 이름',
        required: true,
      },
    ],
  },
  {
    name: 'inbox_processing',
    description: '인박스 정리를 돕는 가이드',
    arguments: [],
  },
  {
    name: 'time_blocking',
    description: '시간 블로킹 일정을 만드는 가이드',
    arguments: [
      {
        name: 'date',
        description: '일정을 만들 날짜 (기본: 오늘)',
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
    case 'daily_planning':
      return getDailyPlanningPrompt(supabase, userId, args, dateContext);

    case 'weekly_review':
      return getWeeklyReviewPrompt(supabase, userId, dateContext);

    case 'goal_setting':
      return getGoalSettingPrompt(args, dateContext);

    case 'project_breakdown':
      return getProjectBreakdownPrompt(args);

    case 'inbox_processing':
      return getInboxProcessingPrompt(supabase, userId);

    case 'time_blocking':
      return getTimeBlockingPrompt(supabase, userId, args, dateContext);

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
 * 일일 계획 프롬프트
 */
async function getDailyPlanningPrompt(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, string>,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const focusArea = args.focus_area || '';

  // 오늘 할일 조회
  const todayStart = new Date(dateContext.today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const { data: existingTodos } = await supabase
    .from('todos')
    .select('id, title')
    .eq('user_id', userId)
    .gte('start_time', todayStart.toISOString())
    .lt('start_time', todayEnd.toISOString());

  // 지연된 할일 조회
  const { data: overdueTodos } = await supabase
    .from('todos')
    .select('id, title')
    .eq('user_id', userId)
    .eq('completed', false)
    .lt('start_time', todayStart.toISOString())
    .limit(5);

  const existingCount = (existingTodos || []).length;
  const overdueCount = (overdueTodos || []).length;

  let prompt = `# 📅 일일 계획 가이드

오늘 날짜: ${formatDateKorean(dateContext.today)}

## 현재 상태
- 오늘 할일: ${existingCount}개
- 지연된 할일: ${overdueCount}개
${focusArea ? `- 집중 영역: ${focusArea}` : ''}

## 질문 가이드

1. **가장 중요한 일 (MIT - Most Important Task)**
   오늘 반드시 완료해야 할 가장 중요한 일 1-3개는 무엇인가요?

2. **시간 배분**
   - 집중 작업 시간대는 언제인가요?
   - 회의나 약속이 있나요?
   - 휴식 시간은 언제 갖나요?

3. **에너지 관리**
   - 오늘 컨디션은 어떤가요?
   - 어려운 일은 에너지가 높은 시간에 배치했나요?

${overdueCount > 0 ? `
4. **지연된 할일 처리**
   ${overdueCount}개의 지연된 할일이 있습니다.
   - 오늘로 재조정할 것
   - 다른 날로 미룰 것
   - 삭제할 것
   으로 분류해주세요.
` : ''}

## 추천 액션

다음 도구를 사용하여 계획을 세울 수 있습니다:
- \`create_todo\`: 새 할일 생성
- \`reschedule_todo\`: 할일 일정 변경
- \`get_today_summary\`: 오늘 요약 확인
- \`bulk_reschedule\`: 여러 할일 일괄 조정

오늘 하루도 생산적인 하루 되세요! 🚀`;

  return {
    content: [{ type: 'text', text: prompt }],
    isError: false,
  };
}

/**
 * 주간 리뷰 프롬프트
 */
async function getWeeklyReviewPrompt(
  supabase: SupabaseClient,
  userId: string,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  // 이번 주 통계 조회
  const today = new Date(dateContext.today);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const { data: todos } = await supabase
    .from('todos')
    .select('id, completed')
    .eq('user_id', userId)
    .gte('start_time', weekStart.toISOString())
    .lt('start_time', weekEnd.toISOString());

  const allTodos = todos || [];
  const completed = allTodos.filter((t) => t.completed).length;
  const rate = allTodos.length > 0 ? Math.round((completed / allTodos.length) * 100) : 0;

  const prompt = `# 📊 주간 리뷰 가이드

기간: ${formatDateKorean(weekStart.toISOString())} ~ ${formatDateKorean(new Date(weekEnd.getTime() - 86400000).toISOString())}

## 이번 주 요약
- 총 할일: ${allTodos.length}개
- 완료: ${completed}개
- 완료율: ${rate}%

## 리뷰 질문

### 1. 성취 돌아보기
- 이번 주 가장 큰 성취는 무엇인가요?
- 완료하지 못한 중요한 일이 있나요? 왜 그랬나요?
- 예상치 못한 일들이 있었나요?

### 2. 학습과 개선
- 이번 주에 배운 것은 무엇인가요?
- 더 잘할 수 있었던 부분이 있나요?
- 시간 관리에서 개선할 점은?

### 3. 다음 주 계획
- 다음 주 가장 중요한 목표 3가지는?
- 피해야 할 실수나 함정은?
- 필요한 준비물이나 리소스는?

### 4. 프로젝트/목표 점검
- 진행 중인 프로젝트들의 상태는?
- 분기/연간 목표 대비 진행률은?
- 조정이 필요한 부분은?

## 추천 액션

- \`get_weekly_review\`: 상세 주간 리뷰 데이터 확인
- \`get_statistics\`: 통계 확인
- \`list_projects\`: 프로젝트 목록 확인
- \`list_goals\`: 목표 목록 확인

좋은 한 주 마무리하시고, 더 나은 다음 주를 준비하세요! 💪`;

  return {
    content: [{ type: 'text', text: prompt }],
    isError: false,
  };
}

/**
 * 목표 설정 프롬프트
 */
function getGoalSettingPrompt(
  args: Record<string, string>,
  dateContext: DateContext
): McpToolCallResult {
  const period = args.period || 'quarter';

  const periodLabel = period === 'year' ? '연간' : '분기';
  const periodRange =
    period === 'year'
      ? `${dateContext.year}년`
      : `${dateContext.year}년 ${dateContext.quarter}`;

  const prompt = `# 🎯 ${periodLabel} 목표 설정 가이드

기간: ${periodRange}

## SMART 목표 설정

목표를 세울 때 SMART 원칙을 적용하세요:

- **S**pecific (구체적): 명확하고 구체적인 목표
- **M**easurable (측정 가능): 진행 상황을 측정할 수 있는 지표
- **A**chievable (달성 가능): 도전적이지만 현실적인 목표
- **R**elevant (관련성): 삶의 방향과 일치하는 목표
- **T**ime-bound (기한): 명확한 기한이 있는 목표

## 영역별 목표 점검

다음 영역에서 목표를 설정해보세요:

1. **커리어/일** - 직업적 성장, 스킬 개발
2. **건강** - 운동, 식습관, 수면
3. **관계** - 가족, 친구, 네트워크
4. **재무** - 저축, 투자, 수입
5. **개인 성장** - 학습, 취미, 마음 건강

## 질문 가이드

1. 이 ${periodLabel} 가장 원하는 변화는 무엇인가요?
2. 그 변화가 이루어지면 어떤 모습일까요?
3. 현재 상태와 목표 사이의 간격은 얼마인가요?
4. 목표를 향한 첫 걸음은 무엇인가요?
5. 어떤 장애물이 예상되나요? 어떻게 극복할 수 있나요?

## 추천 액션

- \`create_goal\`: 새 목표 생성
- \`list_goals\`: 기존 목표 확인
- \`create_plan_from_template\`: 템플릿으로 빠르게 시작

목표 설정이 완료되면, 목표를 프로젝트와 할일로 분해하세요! 🌟`;

  return {
    content: [{ type: 'text', text: prompt }],
    isError: false,
  };
}

/**
 * 프로젝트 분해 프롬프트
 */
function getProjectBreakdownPrompt(args: Record<string, string>): McpToolCallResult {
  const projectName = args.project_name || '프로젝트';

  const prompt = `# 📁 프로젝트 분해 가이드

프로젝트: ${projectName}

## 분해 원칙

### 1. 다음 행동 명확히 하기
모든 할일은 즉시 시작할 수 있는 구체적인 행동이어야 합니다.

❌ "보고서 작성하기" (모호함)
✅ "보고서 목차 초안 작성하기" (구체적)

### 2. 2시간 규칙
하나의 할일은 2시간 이내에 완료할 수 있어야 합니다.
더 오래 걸린다면 더 작은 단위로 나누세요.

### 3. 의존성 파악
어떤 할일이 다른 할일보다 먼저 완료되어야 하는지 파악하세요.

## 분해 질문

1. 이 프로젝트의 최종 결과물은 무엇인가요?
2. 그 결과물을 만들기 위한 주요 단계는?
3. 각 단계에서 해야 할 구체적인 행동은?
4. 가장 먼저 해야 할 일은 무엇인가요?
5. 다른 사람의 도움이 필요한 부분은?
6. 마감 기한은 언제인가요?

## 할일 작성 팁

- 동사로 시작하세요: "작성하다", "검토하다", "연락하다"
- 결과물을 명시하세요: "~를 완료하다", "~를 제출하다"
- 맥락을 포함하세요: "노트북으로", "카페에서", "@회의실"

## 추천 액션

- \`create_todo\`: 분해된 할일 생성
- \`link_todo_to_project\`: 할일을 프로젝트에 연결
- \`get_project\`: 프로젝트 상세 정보 확인

작은 단계로 나누면 큰 프로젝트도 해낼 수 있습니다! 🎯`;

  return {
    content: [{ type: 'text', text: prompt }],
    isError: false,
  };
}

/**
 * 인박스 처리 프롬프트
 */
async function getInboxProcessingPrompt(
  supabase: SupabaseClient,
  userId: string
): Promise<McpToolCallResult> {
  // 정리되지 않은 할일 조회
  const { data: unlinkedTodos } = await supabase
    .from('todos')
    .select(`id, title, todo_projects(project_id)`)
    .eq('user_id', userId)
    .eq('completed', false)
    .order('created_at', { ascending: false })
    .limit(20);

  const orphanTodos = (unlinkedTodos || []).filter(
    (t: any) => !t.todo_projects || t.todo_projects.length === 0
  );

  const prompt = `# 📥 인박스 처리 가이드

## 현재 상태
- 정리되지 않은 할일: ${orphanTodos.length}개

## 2분 규칙

각 항목에 대해 다음 질문을 하세요:

1. **2분 이내에 할 수 있나요?**
   → 예: 지금 바로 하세요
   → 아니오: 다음 단계로

2. **나만 할 수 있나요?**
   → 아니오: 위임하세요
   → 예: 다음 단계로

3. **언제 해야 하나요?**
   → 특정 날짜/시간 → 일정에 추가
   → 언제든 → 할일 목록에 추가

4. **어떤 프로젝트/목표와 관련있나요?**
   → 연결하거나 새 프로젝트 생성

## 처리 옵션

각 인박스 항목은 다음 중 하나로 처리하세요:

- ✅ **완료**: 지금 바로 처리
- 📅 **일정**: 특정 날짜에 배정
- 📁 **정리**: 프로젝트에 연결
- 🗑️ **삭제**: 더 이상 필요 없음

## 추천 액션

- \`get_inbox_items\`: 인박스 항목 확인
- \`link_todo_to_project\`: 프로젝트에 연결
- \`reschedule_todo\`: 일정 변경
- \`delete_todo\`: 불필요한 항목 삭제

깔끔한 인박스로 마음의 여유를 찾으세요! 🧘`;

  return {
    content: [{ type: 'text', text: prompt }],
    isError: false,
  };
}

/**
 * 시간 블로킹 프롬프트
 */
async function getTimeBlockingPrompt(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, string>,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const targetDate = args.date || dateContext.today;

  const prompt = `# ⏰ 시간 블로킹 가이드

날짜: ${formatDateKorean(targetDate)}

## 시간 블로킹이란?

하루를 시간 단위로 나누어 각 블록에 특정 작업을 배정하는 방법입니다.
산만함을 줄이고 집중력을 높이는 효과적인 시간 관리 기법입니다.

## 블록 유형

### 🎯 딥 워크 블록 (2-4시간)
- 가장 중요하고 어려운 일
- 방해받지 않는 집중 시간
- 보통 오전에 배치

### 📋 얕은 작업 블록 (30분-1시간)
- 이메일, 메시지 확인
- 간단한 행정 업무
- 회의 전후에 배치

### 🗓️ 회의/약속 블록
- 고정된 약속
- 버퍼 시간 포함

### ☕ 휴식 블록 (15-30분)
- 점심, 간식 시간
- 산책, 스트레칭
- 2시간마다 배치

## 시간대별 추천

| 시간 | 추천 활동 | 이유 |
|------|----------|------|
| 06-09 | 운동, 자기개발 | 방해 없는 시간 |
| 09-12 | 딥 워크 | 집중력 최고 |
| 12-13 | 점심, 휴식 | 에너지 충전 |
| 13-15 | 회의, 협업 | 소화 중, 대화에 적합 |
| 15-17 | 얕은 작업 | 집중력 감소 |
| 17-18 | 정리, 계획 | 마무리 시간 |

## 작성 팁

1. 가장 중요한 일을 먼저 배치
2. 비슷한 작업은 묶어서 배치
3. 전환 시간 (15분) 포함
4. 예상치 못한 일을 위한 여유 블록 (20%)
5. 현실적으로 계획 (과도한 스케줄 금지)

## 추천 액션

- \`create_todo\`: 시간 지정 할일 생성 (schedule_type: 'timed')
- \`list_todos\`: 기존 일정 확인
- \`reschedule_todo\`: 시간 조정

오늘도 집중력 있는 하루 되세요! ⚡`;

  return {
    content: [{ type: 'text', text: prompt }],
    isError: false,
  };
}
