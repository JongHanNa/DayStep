/**
 * Projects 도구 (AI 플래닝용)
 *
 * ADHD 친화적 AI 플래닝 기능을 위한 프로젝트 관리
 * - 단일 도구: createProjectWithTodos (프로젝트 + 할일 일괄 생성)
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { McpToolCallResult } from '../types/mcp.ts';
import type { CreateProjectWithTodosInput } from '../types/tools.ts';
import type { DateContext } from '../utils/date.ts';
import { resolveDate } from '../utils/date.ts';
import { createSuccessResult, createErrorResult } from '../utils/response.ts';

// ============================================================================
// AI 플래닝용 도구
// ============================================================================

/**
 * 프로젝트와 할일을 일괄 생성 (AI 플래닝 결과)
 * 서브태스크 지원: ADHD용 "바보같이 작게 쪼개기" 기능
 */
export async function createProjectWithTodos(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProjectWithTodosInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { project, todos } = input;

  if (!project?.title) {
    return createErrorResult('project.title은 필수입니다.');
  }

  if (!todos || todos.length === 0) {
    return createErrorResult('최소 1개 이상의 할일이 필요합니다.');
  }

  // 1. 프로젝트 생성
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title: project.title,
      description: project.description || null,
      icon: project.icon || null,
      color: project.color || '#A8DADC',
      status: 'active',
      source: 'mcp', // MCP(AI)로 생성됨을 표시
    })
    .select()
    .single();

  if (projectError) {
    return createErrorResult(`프로젝트 생성 실패: ${projectError.message}`);
  }

  const projectId = projectData.id;

  // 2. 부모 할일 일괄 생성
  const todoInserts = todos.map((todo, index) => {
    // 날짜 해석
    let startTime: string | null = null;
    if (todo.start_time) {
      startTime = resolveDate(todo.start_time, dateContext);
      if (startTime) {
        // 시간이 없으면 자정으로 설정
        const date = new Date(startTime);
        if (date.getHours() === 0 && date.getMinutes() === 0) {
          date.setHours(9, 0, 0, 0); // 기본 시작 시간: 오전 9시
        }
        startTime = date.toISOString();
      }
    }

    return {
      user_id: userId,
      title: todo.title,
      project_id: projectId,
      start_time: startTime,
      schedule_type: todo.schedule_type || 'anytime',
      priority: todo.priority || 'medium',
      anytime_duration: todo.anytime_duration || null,
      order_index: index,
      completed: false,
    };
  });

  const { data: todosData, error: todosError } = await supabase
    .from('todos')
    .insert(todoInserts)
    .select();

  if (todosError) {
    // 롤백: 프로젝트도 삭제
    await supabase.from('projects').delete().eq('id', projectId);
    return createErrorResult(`할일 생성 실패: ${todosError.message}`);
  }

  // 3. 서브태스크 생성 (있는 경우)
  let subtaskCount = 0;
  const subtaskInserts: Array<{
    user_id: string;
    title: string;
    parent_todo_id: string;
    project_id: string;
    schedule_type: string;
    anytime_duration: number;
    recurrence_pattern: string;
    order_index: number;
    completed: boolean;
    priority: string;
  }> = [];

  // 부모 할일 ID와 입력 데이터 매핑
  todos.forEach((todo, todoIndex) => {
    if (todo.subtasks && todo.subtasks.length > 0) {
      const parentTodo = todosData?.[todoIndex];
      if (parentTodo) {
        todo.subtasks.forEach((subtask, subtaskIndex) => {
          subtaskInserts.push({
            user_id: userId,
            title: subtask.title,
            parent_todo_id: parentTodo.id,
            project_id: projectId,
            schedule_type: 'anytime',
            anytime_duration: subtask.anytime_duration || 5, // 기본값 5분
            recurrence_pattern: 'none',
            order_index: subtaskIndex,
            completed: false,
            priority: 'medium',
          });
        });
      }
    }
  });

  if (subtaskInserts.length > 0) {
    const { error: subtasksError } = await supabase
      .from('todos')
      .insert(subtaskInserts);

    if (subtasksError) {
      console.error('서브태스크 생성 실패:', subtasksError);
      // 서브태스크 실패는 전체 롤백하지 않음 (부모 할일은 유지)
    } else {
      subtaskCount = subtaskInserts.length;
    }
  }

  const todoCount = todosData?.length || 0;

  // 응답 메시지 구성
  let message = `✅ 프로젝트 "${project.title}"과(와) ${todoCount}개의 할일이 생성되었습니다.`;
  if (subtaskCount > 0) {
    message += ` (서브태스크 ${subtaskCount}개 포함)`;
  }

  return createSuccessResult(message, {
    project: {
      id: projectId,
      title: project.title,
      status: 'active',
      color: projectData.color,
      icon: projectData.icon,
    },
    todos: todosData?.map((t: any, index: number) => ({
      id: t.id,
      title: t.title,
      start_time: t.start_time,
      schedule_type: t.schedule_type,
      subtask_count: todos[index]?.subtasks?.length || 0,
    })),
    total_subtasks: subtaskCount,
  });
}
