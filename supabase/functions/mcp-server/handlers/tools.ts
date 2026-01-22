/**
 * MCP Tools 핸들러
 *
 * tools/list 및 tools/call 메소드 처리
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
import {
  createGoal,
  listGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  setGoalStatus,
} from '../tools/goals.ts';

import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  completeProject,
  createProjectWithTodos,
  getProjectProgress,
} from '../tools/projects.ts';

import {
  createTodo,
  listTodos,
  getTodo,
  updateTodo,
  deleteTodo,
  completeTodo,
  rescheduleTodo,
} from '../tools/todos.ts';

import {
  linkTodoToProject,
  unlinkTodoFromProject,
  getTodaySummary,
  getWeeklyReview,
  createPlanFromTemplate,
  bulkReschedule,
  searchItems,
  getInboxItems,
  getOverdueTodos,
  getStatistics,
} from '../tools/relations.ts';

// ============================================================================
// Tool 정의
// ============================================================================

const TOOLS: McpTool[] = [
  // ========== Goals ==========
  {
    name: 'create_goal',
    description: '새로운 목표를 생성합니다. year_goal과 quarter_goal로 연간/분기 목표를 설정할 수 있습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '목표 제목' },
        year_goal: { type: ['number', 'string'], description: '연도 (예: 2025) 또는 "current"로 현재 연도' },
        quarter_goal: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4', 'current'], description: '분기 또는 "current"로 현재 분기' },
        area_resource_id: { type: 'string', description: '연결할 책임/자원 ID' },
        start_date: { type: 'string', description: '시작일 (YYYY-MM-DD 또는 today, tomorrow, next_week 등)' },
        end_date: { type: 'string', description: '종료일' },
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '상태' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_goals',
    description: '목표 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '상태 필터' },
        year_goal: { type: ['number', 'string'], description: '연도 필터 또는 "current"' },
        quarter_goal: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4', 'current'], description: '분기 필터' },
        area_resource_id: { type: 'string', description: '책임/자원 ID 필터' },
        limit: { type: 'number', description: '최대 개수' },
        offset: { type: 'number', description: '시작 위치' },
      },
    },
  },
  {
    name: 'get_goal',
    description: '특정 목표의 상세 정보를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        include_projects: { type: 'boolean', description: '연결된 프로젝트 포함 여부' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_goal',
    description: '목표를 수정합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        title: { type: 'string', description: '제목' },
        year_goal: { type: ['number', 'null'], description: '연도 (null로 해제)' },
        quarter_goal: { type: ['string', 'null'], enum: ['Q1', 'Q2', 'Q3', 'Q4', null], description: '분기' },
        area_resource_id: { type: ['string', 'null'], description: '책임/자원 ID' },
        start_date: { type: ['string', 'null'], description: '시작일' },
        end_date: { type: ['string', 'null'], description: '종료일' },
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '상태' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_goal',
    description: '목표를 삭제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        force: { type: 'boolean', description: '연결된 프로젝트가 있어도 강제 삭제' },
      },
      required: ['id'],
    },
  },
  {
    name: 'set_goal_status',
    description: '목표의 상태를 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '새 상태' },
      },
      required: ['id', 'status'],
    },
  },

  // ========== Projects (심플 버전 - AI 플래닝용) ==========
  {
    name: 'create_project',
    description: '새로운 프로젝트를 생성합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '프로젝트 제목' },
        description: { type: 'string', description: '설명' },
        status: { type: 'string', enum: ['active', 'completed', 'abandoned'], description: '상태' },
        icon: { type: 'string', description: '아이콘 (이모지)' },
        color: { type: 'string', description: '색상 (Hex 코드, 예: #A8DADC)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_projects',
    description: '프로젝트 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'completed', 'abandoned'], description: '상태 필터' },
        limit: { type: 'number', description: '최대 개수' },
        offset: { type: 'number', description: '시작 위치' },
      },
    },
  },
  {
    name: 'get_project',
    description: '특정 프로젝트의 상세 정보를 조회합니다. 진행률과 연결된 할일 목록 포함.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        include_todos: { type: 'boolean', description: '연결된 할일 포함 여부' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_project',
    description: '프로젝트를 수정합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        title: { type: 'string', description: '제목' },
        description: { type: ['string', 'null'], description: '설명' },
        status: { type: 'string', enum: ['active', 'completed', 'abandoned'], description: '상태' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_project',
    description: '프로젝트를 삭제합니다. 연결된 할일의 project_id가 null로 설정됩니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        force: { type: 'boolean', description: '연결된 할일이 있어도 강제 삭제' },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_project',
    description: '프로젝트를 완료 처리합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_project_with_todos',
    description: `AI 플래닝 결과를 프로젝트와 할일들로 일괄 생성합니다. ADHD 친화적 계획 수립에 최적화.

⚠️ 중요: 이 도구를 호출하기 전에 반드시 사용자에게 다음 질문을 해서 상황을 파악하세요:

1. 현재 상태: "지금까지 이 일을 위해 무엇을 준비하셨나요?"
   - 예: 이력서 초안 있음/없음, 포트폴리오 있음/없음

2. 구체적 목표: "어떤 회사/직무를 목표로 하시나요?" 또는 "구체적으로 어떤 결과를 원하시나요?"
   - 예: 지원 회사 정해짐/탐색 중, 목표 금액/기간 등

3. 가능한 시간: "이 일에 하루에 얼마나 시간을 쓸 수 있나요?"
   - 예: 1시간 미만 / 1-2시간 / 2시간 이상

4. 막히는 부분: "가장 어렵거나 막막한 부분이 무엇인가요?"
   - 예: 시작하기가 어려움, 어디서부터 해야 할지 모름 등

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 ADHD 친화적 서브태스크 필수 규칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【필수】 모든 할일에 subtasks 배열을 포함하세요!
- 최소 2-3개 이상의 서브태스크
- 각 서브태스크는 "5분 안에 끝낼 수 있는 물리적 행동"

【"물리적 행동"이란?】
✅ 몸이 움직이는 것: 클릭, 열기, 타이핑, 복사/붙여넣기, 스크롤
❌ 생각하는 것: 검토하기, 확인하기, 준비하기, 고민하기

【파일/URL 포함 규칙】
- 참조 파일이 있으면 → 전체 경로 포함 (예: ~/Downloads/이력서.docx)
- 웹사이트라면 → URL 포함 (예: www.saramin.co.kr)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 좋은 예시 vs 나쁜 예시
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 나쁜 예시 (모호함, 서브태스크 없음):
{
  "title": "사람인 이력서 경력 업데이트",
  "subtasks": []
}

✅ 좋은 예시 (물리적 행동 + 파일 경로):
{
  "title": "사람인 이력서 경력 업데이트",
  "subtasks": [
    { "title": "Chrome에서 사람인 사이트 열기 (www.saramin.co.kr)" },
    { "title": "로그인 후 '이력서 관리' 메뉴 클릭" },
    { "title": "참조 파일 열기: ~/Downloads/입사지원/나종한_경력기술서.docx" },
    { "title": "'경력사항' 섹션에서 '편집' 버튼 클릭" },
    { "title": "참조 파일에서 최신 경력 복사 → 사람인에 붙여넣기" },
    { "title": "'저장' 버튼 클릭" }
  ]
}

【변환 예시】
| 모호한 표현 ❌ | 물리적 행동 ✅ |
|--------------|---------------|
| 이력서 준비 | 이력서 파일 열기: ~/Downloads/이력서.docx |
| 회사 조사 | 잡코리아에서 'OO회사' 검색 후 채용공고 클릭 |
| 자기소개서 작성 | 메모장 열고 첫 문장 타이핑: "저는..." |
| 내용 검토 | Ctrl+F로 '경력' 단어 검색 |
| 포트폴리오 확인 | 포트폴리오 폴더 열기: ~/Documents/Portfolio/ |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
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
  {
    name: 'get_project_progress',
    description: '프로젝트 진행률을 조회합니다. (완료/전체 할일, 진행률 퍼센트)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: '프로젝트 ID' },
      },
      required: ['project_id'],
    },
  },

  // ========== Todos ==========
  {
    name: 'create_todo',
    description: '새로운 할일을 생성합니다. 반복 일정과 다양한 일정 타입을 지원합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '할일 제목' },
        schedule_type: { type: 'string', enum: ['all_day', 'timed', 'anytime', 'none'], description: '일정 타입' },
        start_time: { type: 'string', description: '시작 시간 (ISO datetime 또는 today, tomorrow 등 + 시간)' },
        end_time: { type: 'string', description: '종료 시간' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: '우선순위' },
        project_ids: { type: 'array', items: { type: 'string' }, description: '연결할 프로젝트 ID 목록' },
        recurrence: {
          type: 'object',
          description: '반복 설정',
          properties: {
            pattern: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly', 'custom'], description: '반복 패턴' },
            interval: { type: 'number', description: '반복 간격 (예: 2 = 2일/2주마다)' },
            days_of_week: { type: 'array', items: { type: 'number' }, description: '요일 (0=일, 1=월, ..., 6=토)' },
            day_of_month: { type: 'number', description: '매월 반복 일 (1-31)' },
            end_date: { type: 'string', description: '반복 종료일' },
            count: { type: 'number', description: '반복 횟수' },
          },
        },
        is_today_highlight: { type: 'boolean', description: '오늘 하이라이트 여부' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
        anytime_duration: { type: 'number', description: '예상 소요 시간 (분, anytime 타입용)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_todos',
    description: '할일 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: '날짜 필터 (today, tomorrow, YYYY-MM-DD)' },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string', description: '시작일' },
            end: { type: 'string', description: '종료일' },
          },
        },
        completed: { type: 'boolean', description: '완료 여부 필터' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: '우선순위 필터' },
        project_id: { type: 'string', description: '프로젝트 ID 필터' },
        schedule_type: { type: 'string', enum: ['all_day', 'timed', 'anytime', 'none'], description: '일정 타입 필터' },
        limit: { type: 'number', description: '최대 개수' },
        offset: { type: 'number', description: '시작 위치' },
      },
    },
  },
  {
    name: 'get_todo',
    description: '특정 할일의 상세 정보를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        include_projects: { type: 'boolean', description: '연결된 프로젝트 포함 여부' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_todo',
    description: '할일을 수정합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        title: { type: 'string', description: '제목' },
        schedule_type: { type: 'string', enum: ['all_day', 'timed', 'anytime', 'none'], description: '일정 타입' },
        start_time: { type: ['string', 'null'], description: '시작 시간' },
        end_time: { type: ['string', 'null'], description: '종료 시간' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: '우선순위' },
        completed: { type: 'boolean', description: '완료 여부' },
        is_today_highlight: { type: 'boolean', description: '오늘 하이라이트' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
        anytime_duration: { type: 'number', description: '예상 소요 시간' },
        recurrence: { type: ['object', 'null'], description: '반복 설정 (null로 해제)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_todo',
    description: '할일을 삭제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        permanent: { type: 'boolean', description: '미완료 할일도 강제 삭제' },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_todo',
    description: '할일의 완료 상태를 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        completed: { type: 'boolean', description: '완료 여부' },
        completion_date: { type: 'string', description: '완료일 (반복 할일의 특정 날짜 완료용)' },
      },
      required: ['id', 'completed'],
    },
  },
  {
    name: 'reschedule_todo',
    description: '할일의 일정을 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        start_time: { type: 'string', description: '새 시작 시간 (today, tomorrow, YYYY-MM-DD 등)' },
        end_time: { type: 'string', description: '새 종료 시간' },
        schedule_type: { type: 'string', enum: ['all_day', 'timed', 'anytime', 'none'], description: '새 일정 타입' },
      },
      required: ['id', 'start_time'],
    },
  },
  // ========== Relations & Special ==========
  {
    name: 'link_todo_to_project',
    description: '할일을 프로젝트에 연결합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        todo_id: { type: 'string', description: '할일 ID' },
        project_id: { type: 'string', description: '프로젝트 ID' },
      },
      required: ['todo_id', 'project_id'],
    },
  },
  {
    name: 'unlink_todo_from_project',
    description: '할일과 프로젝트의 연결을 해제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        todo_id: { type: 'string', description: '할일 ID' },
        project_id: { type: 'string', description: '프로젝트 ID' },
      },
      required: ['todo_id', 'project_id'],
    },
  },
  {
    name: 'get_today_summary',
    description: '오늘의 할일 요약을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: '타임존 (기본: Asia/Seoul)' },
      },
    },
  },
  {
    name: 'get_weekly_review',
    description: '주간 리뷰 데이터를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        week_start: { type: 'string', description: '주 시작일 (기본: 이번 주 월요일)' },
        timezone: { type: 'string', description: '타임존' },
      },
    },
  },
  {
    name: 'create_plan_from_template',
    description: '템플릿에서 계획(책임, 목표, 프로젝트, 할일)을 일괄 생성합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        template_name: {
          type: 'string',
          enum: ['health', 'finance', 'learning', 'family', 'work', 'custom'],
          description: '템플릿 이름 (health: 건강관리, finance: 재정관리, learning: 자기계발, family: 가족/관계, work: 업무, custom: 커스텀)',
        },
        start_date: { type: 'string', description: '계획 시작일 (기본: today)' },
        customizations: {
          type: 'object',
          description: '커스텀 설정',
          properties: {
            area_title: { type: 'string', description: '책임 영역 이름' },
            goals: { type: 'array', description: '목표 목록' },
            projects: { type: 'array', description: '프로젝트 목록' },
            todos: { type: 'array', description: '할일 목록' },
          },
        },
      },
      required: ['template_name'],
    },
  },
  {
    name: 'bulk_reschedule',
    description: '여러 할일의 일정을 일괄 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        todo_ids: { type: 'array', items: { type: 'string' }, description: '할일 ID 목록' },
        new_date: { type: 'string', description: '새 날짜 (today, tomorrow, YYYY-MM-DD)' },
        preserve_time: { type: 'boolean', description: '기존 시간 유지 여부' },
      },
      required: ['todo_ids', 'new_date'],
    },
  },
  {
    name: 'search_items',
    description: '책임, 자원, 목표, 프로젝트, 할일을 통합 검색합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어' },
        types: { type: 'array', items: { type: 'string', enum: ['area', 'resource', 'goal', 'project', 'todo'] }, description: '검색 대상 타입' },
        limit: { type: 'number', description: '최대 결과 수' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_inbox_items',
    description: '인박스 항목(연결되지 않은 목표, 프로젝트, 할일)을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        types: { type: 'array', items: { type: 'string', enum: ['goal', 'project', 'todo'] }, description: '조회할 타입' },
        limit: { type: 'number', description: '최대 개수' },
      },
    },
  },
  {
    name: 'get_overdue_todos',
    description: '기한이 지난 할일을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        include_completed: { type: 'boolean', description: '완료된 항목 포함 여부' },
        limit: { type: 'number', description: '최대 개수' },
      },
    },
  },
  {
    name: 'get_statistics',
    description: '할일 통계를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['today', 'week', 'month', 'year'], description: '기간' },
        timezone: { type: 'string', description: '타임존' },
      },
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
      // Goals
      case 'create_goal':
        return await createGoal(supabase, userId, args, dateContext);
      case 'list_goals':
        return await listGoals(supabase, userId, args, dateContext);
      case 'get_goal':
        return await getGoal(supabase, userId, args, dateContext);
      case 'update_goal':
        return await updateGoal(supabase, userId, args, dateContext);
      case 'delete_goal':
        return await deleteGoal(supabase, userId, args, dateContext);
      case 'set_goal_status':
        return await setGoalStatus(supabase, userId, args, dateContext);

      // Projects (심플 버전 - AI 플래닝용)
      case 'create_project':
        return await createProject(supabase, userId, args, dateContext);
      case 'list_projects':
        return await listProjects(supabase, userId, args, dateContext);
      case 'get_project':
        return await getProject(supabase, userId, args, dateContext);
      case 'update_project':
        return await updateProject(supabase, userId, args, dateContext);
      case 'delete_project':
        return await deleteProject(supabase, userId, args, dateContext);
      case 'complete_project':
        return await completeProject(supabase, userId, args, dateContext);
      case 'create_project_with_todos':
        return await createProjectWithTodos(supabase, userId, args, dateContext);
      case 'get_project_progress':
        return await getProjectProgress(supabase, userId, args, dateContext);

      // Todos
      case 'create_todo':
        return await createTodo(supabase, userId, args, dateContext);
      case 'list_todos':
        return await listTodos(supabase, userId, args, dateContext);
      case 'get_todo':
        return await getTodo(supabase, userId, args, dateContext);
      case 'update_todo':
        return await updateTodo(supabase, userId, args, dateContext);
      case 'delete_todo':
        return await deleteTodo(supabase, userId, args, dateContext);
      case 'complete_todo':
        return await completeTodo(supabase, userId, args, dateContext);
      case 'reschedule_todo':
        return await rescheduleTodo(supabase, userId, args, dateContext);

      // Relations & Special
      case 'link_todo_to_project':
        return await linkTodoToProject(supabase, userId, args, dateContext);
      case 'unlink_todo_from_project':
        return await unlinkTodoFromProject(supabase, userId, args, dateContext);
      case 'get_today_summary':
        return await getTodaySummary(supabase, userId, args, dateContext);
      case 'get_weekly_review':
        return await getWeeklyReview(supabase, userId, args, dateContext);
      case 'create_plan_from_template':
        return await createPlanFromTemplate(supabase, userId, args, dateContext);
      case 'bulk_reschedule':
        return await bulkReschedule(supabase, userId, args, dateContext);
      case 'search_items':
        return await searchItems(supabase, userId, args, dateContext);
      case 'get_inbox_items':
        return await getInboxItems(supabase, userId, args, dateContext);
      case 'get_overdue_todos':
        return await getOverdueTodos(supabase, userId, args, dateContext);
      case 'get_statistics':
        return await getStatistics(supabase, userId, args, dateContext);

      default:
        return createErrorResult(`알 수 없는 도구: ${name}`);
    }
  } catch (error) {
    console.error(`Tool call error (${name}):`, error);
    return createErrorResult((error as Error).message);
  }
}
