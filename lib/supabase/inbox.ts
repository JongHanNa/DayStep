/**
 * Supabase Inbox - 수집함 관리 (Second Brain 워크플로우)
 *
 * GTD 수집 단계를 위한 todos/notes 테이블 통합 관리
 */

import { fetchWithJWT, createWithJWT, updateWithJWT, deleteWithJWT } from './core';

/**
 * 수집함 할일 목록 조회 (inbox_todos Materialized View)
 *
 * DB 레벨 필터링 조건:
 *   - recurrence_pattern = 'none' (반복 할일 제외)
 *   - clarification != 'waiting' (대기중: 무조건 제외)
 *   - NOT (clarification = 'scheduled' AND start_time IS NOT NULL) (일정+날짜: 제외)
 *   - NOT (clarification = 'next_action' AND next_action_contexts.length > 0) (다음행동+상황: 제외)
 */
export async function fetchInboxTodos(userId: string): Promise<any[]> {
  console.log('📥 수집함 할일 조회:', { userId });

  try {
    const path = `/inbox_todos?user_id=eq.${userId}&select=*&order=created_at.desc`;
    const todos = await fetchWithJWT(path);

    console.log('✅ 수집함 할일 조회 성공:', { count: todos?.length || 0 });
    return todos || [];
  } catch (error) {
    console.error('❌ 수집함 할일 조회 실패:', error);
    return [];
  }
}

/**
 * 수집함 노트 목록 조회 (note_category = 'none'인 notes)
 */
export async function fetchInboxNotes(userId: string): Promise<any[]> {
  console.log('📥 수집함 노트 조회:', { userId });

  try {
    const path = `/notes?user_id=eq.${userId}&note_category=eq.none&select=*&order=created_at.desc`;
    const notes = await fetchWithJWT(path);

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
  is_today_highlight?: boolean;
  completed?: boolean;
  project_id?: string;
  next_action_contexts?: string[];
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
      next_action_contexts: data.next_action_contexts || null,
      schedule_type: 'none', // 기본값: 선택안함
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
    next_action_contexts?: string[];
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
    if (data.next_action_contexts !== undefined) updateData.next_action_contexts = data.next_action_contexts;

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
 * 수집함 프로젝트 목록 조회 (inbox_projects Materialized View)
 *
 * DB 레벨 필터링 조건:
 *   - NOT (end_date IS NOT NULL AND total_todos > 0)
 *   - 종료일과 할일이 모두 있는 프로젝트는 제외
 */
export async function fetchInboxProjects(userId: string): Promise<any[]> {
  console.log('📥 수집함 프로젝트 조회:', { userId });

  try {
    const path = `/inbox_projects?user_id=eq.${userId}&select=*&order=created_at.desc`;
    const projects = await fetchWithJWT(path);

    console.log('✅ 수집함 프로젝트 조회 성공:', { count: projects?.length || 0 });
    return projects || [];
  } catch (error) {
    console.error('❌ 수집함 프로젝트 조회 실패:', error);
    return [];
  }
}

/**
 * 수집함 목표 목록 조회 (inbox_goals Materialized View)
 *
 * DB 레벨 필터링 조건:
 *   - NOT ((area_id IS NOT NULL OR resource_id IS NOT NULL) AND end_date IS NOT NULL)
 *   - 영역/자원과 종료일이 모두 있는 목표는 제외
 */
export async function fetchInboxGoals(userId: string): Promise<any[]> {
  console.log('📥 수집함 목표 조회:', { userId });

  try {
    const path = `/inbox_goals?user_id=eq.${userId}&select=*&order=created_at.desc`;
    const goals = await fetchWithJWT(path);

    console.log('✅ 수집함 목표 조회 성공:', { count: goals?.length || 0 });
    return goals || [];
  } catch (error) {
    console.error('❌ 수집함 목표 조회 실패:', error);
    return [];
  }
}
