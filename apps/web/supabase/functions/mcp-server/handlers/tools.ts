/**
 * MCP Tools 핸들러
 *
 * tools/list 및 tools/call 메소드 처리
 *
 * AI 플래닝에는 create_project_with_todos 도구만 사용
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type {
  McpTool,
  McpToolsListResult,
  McpToolCallParams,
  McpToolCallResult,
} from '../types/mcp.ts';
import { createErrorResult } from '../utils/response.ts';
import { getCurrentDateContext } from '../utils/date.ts';

// Tool 구현 임포트
import { createProjectWithTodos } from '../tools/projects.ts';
import { generateCreateProjectToolDescription } from '../../_shared/prompts/adhd-planning.ts';

// ============================================================================
// Tool 정의 (AI 플래닝용 단일 도구)
// ============================================================================

const TOOLS: McpTool[] = [
  {
    name: 'create_project_with_todos',
    description: generateCreateProjectToolDescription(),
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'object',
          description: '프로젝트 정보',
          properties: {
            title: { type: 'string', description: '프로젝트 제목' },
            description: { type: 'string', description: '설명 (AI가 생성한 요약)' },
            icon: { type: 'string', description: '이모지 아이콘' },
            color: { type: 'string', description: '색상 (Hex 코드)' },
          },
          required: ['title'],
        },
        todos: {
          type: 'array',
          description: '할일 목록',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '할일 제목 (15분 이내 완료 가능한 구체적 행동. 모호한 표현 금지)' },
              start_time: { type: 'string', description: '시작일 (today, tomorrow, YYYY-MM-DD)' },
              schedule_type: { type: 'string', enum: ['all_day', 'timed', 'anytime', 'none'], description: '일정 타입' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'], description: '우선순위' },
              anytime_duration: { type: 'number', description: '예상 소요시간 (분)' },
              subtasks: {
                type: 'array',
                description: '🔴 필수! 모든 할일에 최소 2-3개 서브태스크 포함. 각 서브태스크는 "5분 안에 끝나는 물리적 행동"만 가능 (클릭, 열기, 타이핑, 복사/붙여넣기). "검토하기", "확인하기" 같은 모호한 표현 금지!',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: '물리적 행동 제목. 파일 참조 시 전체 경로 포함 (예: "이력서 열기: ~/Downloads/이력서.docx"), 웹사이트는 URL 포함 (예: "사람인 열기 (www.saramin.co.kr)")' },
                    anytime_duration: { type: 'number', description: '예상 소요시간 (분, 기본값 5분)' },
                  },
                  required: ['title'],
                },
              },
            },
            required: ['title'],
          },
        },
      },
      required: ['project', 'todos'],
    },
  },
];

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * tools/list 핸들러
 */
export function handleToolsList(): McpToolsListResult {
  return { tools: TOOLS };
}

/**
 * tools/call 핸들러
 */
export async function handleToolsCall(
  params: McpToolCallParams,
  supabase: SupabaseClient,
  userId: string
): Promise<McpToolCallResult> {
  const { name, arguments: args = {} } = params;
  const dateContext = getCurrentDateContext();

  try {
    switch (name) {
      case 'create_project_with_todos':
        return await createProjectWithTodos(supabase, userId, args, dateContext);

      default:
        return createErrorResult(`알 수 없는 도구: ${name}`);
    }
  } catch (error) {
    console.error(`Tool call error (${name}):`, error);
    return createErrorResult((error as Error).message);
  }
}
