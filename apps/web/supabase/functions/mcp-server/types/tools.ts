/**
 * MCP Tool 입출력 타입 정의 (AI 플래닝용)
 *
 * 단일 도구 create_project_with_todos에 필요한 타입만 정의
 */

// ============================================================================
// 공통 타입
// ============================================================================

export type ScheduleType = 'all_day' | 'timed' | 'anytime' | 'none';

// ============================================================================
// AI 플래닝 도구 타입
// ============================================================================

/**
 * 서브태스크 입력 타입 (ADHD용 "바보같이 작게 쪼개기")
 */
export interface SubtaskInput {
  title: string;
  anytime_duration?: number;  // 예상 소요시간 (분, 기본값 5분)
}

/**
 * AI 플래닝 결과를 프로젝트와 할일로 일괄 생성하는 입력 타입
 */
export interface CreateProjectWithTodosInput {
  project: {
    title: string;
    description?: string;
    icon?: string;
    color?: string;
  };
  todos: Array<{
    title: string;
    start_time?: string;  // 'today', 'tomorrow', 'YYYY-MM-DD'
    schedule_type?: ScheduleType;
    anytime_duration?: number;  // 예상 소요시간 (분)
    subtasks?: SubtaskInput[];  // ADHD용 서브태스크 (5분짜리 작은 행동들)
  }>;
}
