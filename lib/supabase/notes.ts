/**
 * Notes - 노트 관리
 */

import { createWithJWT, updateWithJWT, deleteWithJWT, queryRLSTableWithJWT } from './core';
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/types/second-brain';

/**
 * JWT 방식으로 노트 조회
 */
export async function fetchNotesWithJWT(userId: string): Promise<Note[]> {
  console.log('📝 JWT 방식으로 노트 조회:', { userId });

  try {
    const notes = await queryRLSTableWithJWT('notes', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*',
      order: 'created_at.desc'
    });

    console.log('✅ JWT 노트 조회 성공:', { count: notes?.length || 0 });
    return notes || [];
  } catch (error) {
    console.error('❌ JWT 노트 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 노트 생성
 */
export async function createNoteWithJWT(data: CreateNoteInput & { user_id: string }): Promise<Note> {
  console.log('✏️ JWT 방식으로 노트 생성:', data);

  try {
    const result = await createWithJWT('notes', {
      ...data,
      title: data.title || '새 노트', // 기본값 추가
      note_category: data.note_category || 'none', // 기본값
      is_pinned: data.is_pinned || false,
      tags: data.tags || [],
    });
    console.log('✅ JWT 노트 생성 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 노트 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 업데이트
 */
export async function updateNoteWithJWT(
  id: string,
  userId: string,
  updates: UpdateNoteInput
): Promise<Note | null> {
  console.log('🔄 JWT 방식으로 노트 업데이트:', { id, userId, updates });

  try {
    const result = await updateWithJWT('notes', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      ...updates,
      updated_at: new Date().toISOString()
    });

    console.log('✅ JWT 노트 업데이트 성공:', { id });
    return result?.[0] || null;
  } catch (error) {
    console.error('❌ JWT 노트 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 삭제
 */
export async function deleteNoteWithJWT(
  id: string,
  userId: string
): Promise<boolean> {
  console.log('🗑️ JWT 방식으로 노트 삭제:', { id, userId });

  try {
    await deleteWithJWT('notes', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 노트 삭제 성공:', { id });
    return true;
  } catch (error) {
    console.error('❌ JWT 노트 삭제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 할일에 연결된 노트 조회
 */
export async function fetchNotesByTodoWithJWT(todoId: string, userId: string): Promise<Note[]> {
  console.log('📝 JWT 방식으로 할일 연결 노트 조회:', { todoId, userId });

  try {
    const notes = await queryRLSTableWithJWT('notes', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'related_task_id',
        operator: 'eq',
        value: todoId
      }
    ], {
      select: '*',
      order: 'created_at.desc'
    });

    console.log('✅ JWT 할일 연결 노트 조회 성공:', { count: notes?.length || 0 });
    return notes || [];
  } catch (error) {
    console.error('❌ JWT 할일 연결 노트 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 프로젝트에 연결된 노트 조회
 */
export async function fetchNotesByProjectWithJWT(projectId: string, userId: string): Promise<Note[]> {
  console.log('📝 JWT 방식으로 프로젝트 연결 노트 조회:', { projectId, userId });

  try {
    const notes = await queryRLSTableWithJWT('notes', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'project_id',
        operator: 'eq',
        value: projectId
      }
    ], {
      select: '*',
      order: 'created_at.desc'
    });

    console.log('✅ JWT 프로젝트 연결 노트 조회 성공:', { count: notes?.length || 0 });
    return notes || [];
  } catch (error) {
    console.error('❌ JWT 프로젝트 연결 노트 조회 실패:', error);
    return [];
  }
}
