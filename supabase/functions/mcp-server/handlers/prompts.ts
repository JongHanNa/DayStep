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
import { generateAdhdPlanningPrompt } from '../../_shared/prompts/adhd-planning.ts';

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
 * - 공통 모듈 사용으로 일관성 확보
 */
function getAdhdPlanningGuidePrompt(
  args: Record<string, string>,
  dateContext: DateContext
): McpToolCallResult {
  const taskDescription = args.task_description || '계획이 필요한 일';
  const deadline = args.deadline ? formatDateKorean(args.deadline) : undefined;
  const todayFormatted = formatDateKorean(dateContext.today);

  const prompt = generateAdhdPlanningPrompt(taskDescription, deadline, todayFormatted);

  return {
    content: [{ type: 'text', text: prompt }],
    isError: false,
  };
}
