/**
 * AI Tool 정의
 *
 * 일상투두 MCP 도구와 동일한 도구를 AI에게 제공
 */

import type { ToolDefinition } from '../types/index.ts';

export const DAYSTEP_TOOLS: ToolDefinition[] = [
  {
    name: 'create_project_with_todos',
    description: `프로젝트와 할일들을 일괄 생성합니다. ADHD 친화적인 계획 수립에 최적화되어 있습니다.

사용 시나리오:
- 사용자가 목표나 계획을 세우고 싶을 때
- 막연한 작업을 구체적인 할일로 분해할 때
- 프로젝트와 연결된 할일 목록을 한 번에 생성할 때

중요 규칙:
1. 할일은 5-15분 내에 완료할 수 있는 작은 단위로 쪼개세요 (ADHD용 "바보같이 작게 쪼개기")
2. 각 할일은 즉시 시작할 수 있는 구체적인 행동이어야 합니다
3. 동사로 시작하세요: "작성하다", "검토하다", "연락하다"
4. 마감일이 있다면 역순으로 계획을 세우세요`,
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'object',
          description: '프로젝트 정보',
          properties: {
            title: {
              type: 'string',
              description: '프로젝트 제목 (예: "송도 IT 취업 준비")',
            },
            description: {
              type: 'string',
              description: '프로젝트 설명 (선택)',
            },
            icon: {
              type: 'string',
              description: '프로젝트 아이콘 이모지 (예: "🎯", "📚")',
            },
            color: {
              type: 'string',
              description: '프로젝트 색상 (hex, 예: "#4ECDC4")',
            },
          },
          required: ['title'],
        },
        todos: {
          type: 'array',
          description: '할일 목록 (최소 1개)',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description:
                  '할일 제목 - 구체적인 행동으로 작성 (예: "잡코리아에서 송도 IT 회사 5개 북마크하기")',
              },
              start_time: {
                type: 'string',
                description: '시작 날짜 ("today", "tomorrow", "YYYY-MM-DD")',
              },
              schedule_type: {
                type: 'string',
                enum: ['anytime', 'timed', 'all_day'],
                description: 'anytime(언제든), timed(특정시간), all_day(종일)',
              },
              anytime_duration: {
                type: 'number',
                description: '예상 소요 시간 (분, 5-30분 권장)',
              },
              subtasks: {
                type: 'array',
                description: '서브태스크 (더 작은 단위로 쪼개기)',
                items: {
                  type: 'object',
                  properties: {
                    title: {
                      type: 'string',
                      description: '서브태스크 제목 (5분짜리 작은 행동)',
                    },
                    anytime_duration: {
                      type: 'number',
                      description: '예상 소요 시간 (분, 기본 5분)',
                    },
                  },
                  required: ['title'],
                },
              },
            },
            required: ['title'],
          },
          minItems: 1,
        },
      },
      required: ['project', 'todos'],
    },
  },
  {
    name: 'list_projects',
    description: '사용자의 프로젝트 목록을 조회합니다.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'completed', 'abandoned'],
          description: '프로젝트 상태 필터',
        },
        limit: {
          type: 'number',
          description: '조회할 개수 (기본 20)',
        },
      },
    },
  },
  {
    name: 'get_today_summary',
    description: '오늘 할일 요약을 조회합니다. 오늘 예정된 할일, 완료한 할일, 지연된 할일 등을 확인합니다.',
    input_schema: {
      type: 'object',
      properties: {
        include_overdue: {
          type: 'boolean',
          description: '지연된 할일 포함 여부 (기본 true)',
        },
      },
    },
  },
  {
    name: 'create_todo',
    description: '단일 할일을 생성합니다.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '할일 제목',
        },
        start_time: {
          type: 'string',
          description: '시작 날짜/시간 ("today", "tomorrow", "YYYY-MM-DD", "YYYY-MM-DDTHH:mm")',
        },
        schedule_type: {
          type: 'string',
          enum: ['anytime', 'timed', 'all_day'],
          description: '일정 유형',
        },
        project_id: {
          type: 'string',
          description: '연결할 프로젝트 ID',
        },
        anytime_duration: {
          type: 'number',
          description: '예상 소요 시간 (분)',
        },
      },
      required: ['title'],
    },
  },
];

/**
 * 도구 정의 가져오기
 */
export function getToolDefinitions(): ToolDefinition[] {
  return DAYSTEP_TOOLS;
}

/**
 * 도구 이름으로 정의 찾기
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return DAYSTEP_TOOLS.find((tool) => tool.name === name);
}
