/**
 * Supabase Inbox - 수집함 관리 (Second Brain 워크플로우)
 *
 * GTD 수집 단계를 위한 todos/notes 테이블 통합 관리
 */

import { fetchWithJWT, createWithJWT, updateWithJWT, deleteWithJWT } from './core';
import { filterInboxProjects } from '@/lib/helpers/projectFilters';

/**
 * 수집함 할일 목록 조회 (todos 테이블 직접 조회)
 *
 * DB 레벨 필터링 조건:
 *   - recurrence_pattern = 'none' (반복 할일 제외)
 *   - clarification != 'waiting' (대기중: 무조건 제외)
 *   - clarification != 'someday' (언젠가: 무조건 제외)
 *   - NOT (clarification = 'schedule_clear' AND start_time IS NOT NULL) (일정+날짜: 제외)
 *   - NOT (clarification = 'next_action' AND next_action_context_ids.length > 0) (다음행동+상황: 제외)
 *
 * ✅ 변경 사항: Materialized View 대신 todos 테이블 직접 조회 (실시간 데이터)
 */
export async function fetchInboxTodos(userId: string): Promise<any[]> {
  console.log('📥 수집함 할일 조회:', { userId });

  try {
    // ✅ todos 테이블 직접 조회 (Materialized View 대신)
    const path = `/todos?user_id=eq.${userId}&recurrence_pattern=eq.none&clarification=neq.waiting&clarification=neq.someday&select=*&order=created_at.desc`;
    const todos = await fetchWithJWT(path);

    // 클라이언트 필터링: scheduled + 날짜, next_action + 상황 제외
    const filteredTodos = todos?.filter((todo: any) => {
      // schedule_clear + start_time 있으면 제외
      if (todo.clarification === 'schedule_clear' && todo.start_time) return false;
      // next_action + context_ids 있으면 제외
      if (todo.clarification === 'next_action' && todo.next_action_context_ids?.length > 0) return false;
      return true;
    }) || [];

    console.log('✅ 수집함 할일 조회 성공:', { count: filteredTodos.length });
    return filteredTodos;
  } catch (error) {
    console.error('❌ 수집함 할일 조회 실패:', error);
    return [];
  }
}

/**
 * 계획 페이지 할일 목록 조회 (todos 테이블 직접 조회)
 *
 * DB 레벨 필터링 조건:
 *   - recurrence_pattern = 'none' (반복 할일 제외)
 *   - clarification != 'someday' (언젠가: 무조건 제외)
 *
 * 클라이언트 필터링 조건:
 *   - NOT (clarification = 'next_action' AND next_action_context_ids.length > 0) (다음행동+상황: 제외)
 *
 * ✅ fetchInboxTodos와의 차이점:
 *   - schedule_clear + start_time 필터 제거 (계획 페이지에 표시)
 *   - waiting 데이터도 포함 (클라이언트에서 탭별로 분류)
 */
export async function fetchPlanTodos(userId: string): Promise<any[]> {
  console.log('📅 계획 페이지 할일 조회:', { userId });

  try {
    // ✅ todos 테이블 직접 조회 (waiting 데이터도 포함, todo_projects LEFT JOIN)
    const path = `/todos?user_id=eq.${userId}&recurrence_pattern=eq.none&clarification=neq.someday&select=*,todo_projects(project_id)&order=created_at.desc`;
    const todos = await fetchWithJWT(path);

    // ✅ 계획 페이지에서는 모든 next_action 데이터 표시 (contexts 여부 무관)
    const filteredTodos = todos || [];

    console.log('✅ 계획 페이지 할일 조회 성공:', { count: filteredTodos.length });
    return filteredTodos;
  } catch (error) {
    console.error('❌ 계획 페이지 할일 조회 실패:', error);
    return [];
  }
}

/**
 * 수집함 노트 목록 조회 (영역/자원에 연결되지 않은 모든 notes)
 *
 * DB 레벨 필터링 조건:
 *   - area_resource_id IS NULL (영역/자원 미연결)
 *   - 모든 분류 포함 (none, work_in_progress, read_later, reference)
 *
 * Junction 테이블 JOIN:
 *   - todo_notes → todos (할일 연결)
 *   - project_notes → projects (프로젝트 연결)
 *   - note_notes → notes (노트 연결)
 */
export async function fetchInboxNotes(userId: string): Promise<any[]> {
  console.log('📥 수집함 노트 조회:', { userId });

  try {
    // Junction 테이블 JOIN으로 연결 데이터 가져오기
    const path = `/notes?user_id=eq.${userId}&area_resource_id=is.null&select=*,todo_notes(todo_id,todos(id,title)),project_notes(project_id,projects(id,title,icon,color,status)),note_notes!note_notes_source_note_id_fkey(target_note_id,target_note:notes!note_notes_target_note_id_fkey(id,title))&order=created_at.desc`;
    const rawNotes = await fetchWithJWT(path);

    // Junction 데이터를 배열로 변환
    const notes = (rawNotes || []).map((note: any) => {
      const todos = (note.todo_notes || [])
        .map((link: any) => link.todos)
        .filter(Boolean);

      const projects = (note.project_notes || [])
        .map((link: any) => link.projects)
        .filter(Boolean);

      const connectedNotes = (note.note_notes || [])
        .map((link: any) => link.target_note)
        .filter(Boolean);

      // Junction table 필드 제거하고 변환된 배열 추가
      const { todo_notes, project_notes, note_notes, ...rest } = note;
      return {
        ...rest,
        todos,
        projects,
        connectedNotes
      };
    });

    console.log('✅ 수집함 노트 조회 성공:', { count: notes?.length || 0 });
    return notes || [];
  } catch (error) {
    console.error('❌ 수집함 노트 조회 실패:', error);
    return [];
  }
}

/**
 * 수집함 할일 생성
 */
export async function createInboxTodo(userId: string, data: {
  title: string;
  clarification?: string;
  scheduled_date?: string;
  schedule_type?: string;
  is_today_highlight?: boolean;
  completed?: boolean;
  project_id?: string;
  next_action_context_ids?: string[];
}): Promise<any> {
  console.log('📝 수집함 할일 생성:', { userId, data });

  try {
    const todoData = {
      user_id: userId,
      title: data.title,
      clarification: data.clarification || 'none',
      start_time: data.scheduled_date,
      is_today_highlight: data.is_today_highlight || false,
      completed: data.completed || false,
      project_id: data.project_id,
      next_action_context_ids: data.next_action_context_ids || null,
      schedule_type: data.schedule_type || 'none', // 전달받은 값 사용, 없으면 기본값 'none'
      recurrence_pattern: 'none',
      icon: null,
      color: '#DBAC6C',
    };

    const result = await createWithJWT('todos', todoData);
    console.log('✅ 수집함 할일 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ 수집함 할일 생성 실패:', error);
    throw error;
  }
}

/**
 * 수집함 노트 생성
 */
export async function createInboxNote(userId: string, data: {
  title: string;
  content: string;
  note_category?: 'none' | 'work_in_progress' | 'read_later' | 'reference';
  is_pinned?: boolean;
  area_resource_id?: string;
  project_id?: string;
}): Promise<any> {
  console.log('📝 수집함 노트 생성:', { userId, data });

  try {
    const noteData = {
      user_id: userId,
      title: data.title || '새 노트',
      content: data.content,
      note_category: data.note_category || 'none',
      is_pinned: data.is_pinned || false,
      area_resource_id: data.area_resource_id,
      project_id: data.project_id,
      is_floating: false,
    };

    const result = await createWithJWT('notes', noteData);
    console.log('✅ 수집함 노트 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ 수집함 노트 생성 실패:', error);
    throw error;
  }
}

/**
 * 수집함 할일 수정
 */
export async function updateInboxTodo(
  userId: string,
  todoId: string,
  data: {
    title?: string;
    clarification?: string;
    scheduled_date?: string;
    is_today_highlight?: boolean;
    completed?: boolean;
    project_id?: string;
    next_action_context_ids?: string[] | null; // 다음행동상황 ID 배열
    schedule_type?: string; // 일정 유형 필드
  }
): Promise<any> {
  console.log('✏️ 수집함 할일 수정:', { userId, todoId, data });

  try {
    const updateData: Record<string, any> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.clarification !== undefined) updateData.clarification = data.clarification;
    if (data.scheduled_date !== undefined) updateData.start_time = data.scheduled_date;
    if (data.is_today_highlight !== undefined) updateData.is_today_highlight = data.is_today_highlight;
    if (data.completed !== undefined) updateData.completed = data.completed;
    if (data.project_id !== undefined) updateData.project_id = data.project_id;
    if (data.next_action_context_ids !== undefined) updateData.next_action_context_ids = data.next_action_context_ids;
    if (data.schedule_type !== undefined) updateData.schedule_type = data.schedule_type;

    const result = await updateWithJWT('todos', { column: 'id', operator: 'eq', value: todoId }, updateData);
    console.log('✅ 수집함 할일 수정 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ 수집함 할일 수정 실패:', error);
    throw error;
  }
}

/**
 * 수집함 노트 수정
 */
export async function updateInboxNote(
  userId: string,
  noteId: string,
  data: {
    title?: string;
    content?: string;
    note_category?: 'none' | 'work_in_progress' | 'read_later' | 'reference';
    is_pinned?: boolean;
    area_resource_id?: string;
    project_id?: string;
  }
): Promise<any> {
  console.log('✏️ 수집함 노트 수정:', { userId, noteId, data });

  try {
    const updateData: Record<string, any> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.note_category !== undefined) updateData.note_category = data.note_category;
    if (data.is_pinned !== undefined) updateData.is_pinned = data.is_pinned;
    if (data.area_resource_id !== undefined) updateData.area_resource_id = data.area_resource_id;
    if (data.project_id !== undefined) updateData.project_id = data.project_id;

    const result = await updateWithJWT('notes', { column: 'id', operator: 'eq', value: noteId }, updateData);
    console.log('✅ 수집함 노트 수정 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ 수집함 노트 수정 실패:', error);
    throw error;
  }
}

/**
 * 수집함 할일 삭제
 */
export async function deleteInboxTodo(userId: string, todoId: string): Promise<boolean> {
  console.log('🗑️ 수집함 할일 삭제:', { userId, todoId });

  try {
    await deleteWithJWT('todos', { column: 'id', operator: 'eq', value: todoId });
    console.log('✅ 수집함 할일 삭제 성공');
    return true;
  } catch (error) {
    console.error('❌ 수집함 할일 삭제 실패:', error);
    throw error;
  }
}

/**
 * 수집함 노트 삭제
 */
export async function deleteInboxNote(userId: string, noteId: string): Promise<boolean> {
  console.log('🗑️ 수집함 노트 삭제:', { userId, noteId });

  try {
    await deleteWithJWT('notes', { column: 'id', operator: 'eq', value: noteId });
    console.log('✅ 수집함 노트 삭제 성공');
    return true;
  } catch (error) {
    console.error('❌ 수집함 노트 삭제 실패:', error);
    throw error;
  }
}

/**
 * 수집함 프로젝트 목록 조회 (projects 테이블 직접 조회)
 *
 * DB 레벨 필터링 조건:
 *   - user_id 일치
 *
 * 클라이언트 필터링 조건:
 *   - NOT (area_resource_id IS NOT NULL AND end_date IS NOT NULL AND todo_count > 0)
 *   - 영역/자원과 종료일, 할일이 모두 있는 프로젝트는 제외
 *
 * ✅ 변경 사항: Materialized View 대신 projects 테이블 직접 조회 (실시간 데이터)
 */
export async function fetchInboxProjects(userId: string): Promise<any[]> {
  console.log('📥 수집함 프로젝트 조회:', { userId });

  try {
    // ✅ projects 테이블 직접 조회 (Materialized View 대신)
    const path = `/projects?user_id=eq.${userId}&select=*&order=created_at.desc`;
    const projects = await fetchWithJWT(path);

    // todos 카운트 조회 (todo_projects 연결 테이블 사용)
    const todoCountsPath = `/todo_projects?project_id=in.(${projects?.map((p: any) => p.id).join(',') || 'null'})&select=project_id`;
    const todosProjects = await fetchWithJWT(todoCountsPath);

    // 프로젝트별 todo 카운트 맵 생성
    const todoCountMap = new Map<string, number>();
    todosProjects?.forEach((tp: any) => {
      const count = todoCountMap.get(tp.project_id) || 0;
      todoCountMap.set(tp.project_id, count + 1);
    });

    // 클라이언트 필터링: 공통 헬퍼 함수 사용
    const filteredProjects = filterInboxProjects(projects || [], todoCountMap);

    console.log('✅ 수집함 프로젝트 조회 성공:', { count: filteredProjects.length });
    return filteredProjects;
  } catch (error) {
    console.error('❌ 수집함 프로젝트 조회 실패:', error);
    return [];
  }
}

/**
 * 수집함 목표 목록 조회 (goals 테이블 직접 조회)
 *
 * DB 레벨 필터링 조건:
 *   - user_id 일치
 *
 * 클라이언트 필터링 조건:
 *   - NOT ((area_id IS NOT NULL OR resource_id IS NOT NULL) AND end_date IS NOT NULL)
 *   - 영역/자원과 종료일이 모두 있는 목표는 제외
 *
 * ✅ 변경 사항: Materialized View 대신 goals 테이블 직접 조회 (실시간 데이터)
 */
export async function fetchInboxGoals(userId: string): Promise<any[]> {
  console.log('📥 수집함 목표 조회:', { userId });

  try {
    // ✅ goals 테이블 직접 조회 (Materialized View 대신)
    const path = `/goals?user_id=eq.${userId}&select=*&order=created_at.desc`;
    const goals = await fetchWithJWT(path);

    // 클라이언트 필터링: (area_id OR resource_id) + end_date 제외
    const filteredGoals = goals?.filter((goal: any) => {
      const hasAreaOrResource = goal.area_id != null || goal.resource_id != null;
      const hasEndDate = goal.end_date != null;

      // (area_id OR resource_id) + end_date 모두 충족 시 제외
      if (hasAreaOrResource && hasEndDate) return false;
      return true;
    }) || [];

    console.log('✅ 수집함 목표 조회 성공:', { count: filteredGoals.length });
    return filteredGoals;
  } catch (error) {
    console.error('❌ 수집함 목표 조회 실패:', error);
    return [];
  }
}
