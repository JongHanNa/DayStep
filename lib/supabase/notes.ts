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
    // tags와 todo_notes를 JOIN으로 가져오기 위한 select 쿼리
    const rawNotes = await queryRLSTableWithJWT('notes', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*,note_tag_links(tag_id,note_tags(id,name,color,icon)),todo_notes(todo_id,todos(id,title))',
      order: 'created_at.desc'
    });

    // note_tag_links를 tags 배열로, todo_notes를 todos 배열로 변환
    const notes = (rawNotes || []).map((note: any) => {
      const tags = (note.note_tag_links || [])
        .map((link: any) => link.note_tags)
        .filter(Boolean);

      const todos = (note.todo_notes || [])
        .map((link: any) => link.todos)
        .filter(Boolean);

      // note_tag_links, todo_notes 제거하고 tags, todos 추가
      const { note_tag_links, todo_notes, ...rest } = note;
      return {
        ...rest,
        tags,
        todos
      };
    });

    console.log('✅ JWT 노트 조회 성공:', { count: notes?.length || 0 });
    return notes;
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
    // tags는 DB에 저장하지 않음 (note_tag_links 테이블로 별도 관리)
    const { tags, ...noteData } = data;

    const result = await createWithJWT('notes', {
      ...noteData,
      title: noteData.title || '새 노트', // 기본값 추가
      note_category: noteData.note_category || 'none', // 기본값
      is_pinned: noteData.is_pinned || false,
    });

    // 결과에 빈 tags 배열 추가 (타입 일치를 위해)
    const noteWithTags: Note = {
      ...result,
      tags: []
    };

    console.log('✅ JWT 노트 생성 성공:', { id: result?.id });
    return noteWithTags;
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
 * @deprecated 이 함수는 더 이상 사용되지 않습니다. getTodoNotes() junction table API를 사용하세요.
 * import { getTodoNotes } from '@/lib/supabase/todo-notes';
 */
export async function fetchNotesByTodoWithJWT(todoId: string, userId: string): Promise<Note[]> {
  console.warn('⚠️  fetchNotesByTodoWithJWT는 deprecated되었습니다. getTodoNotes()를 사용하세요.');
  console.log('📝 JWT 방식으로 할일 연결 노트 조회 (deprecated):', { todoId, userId });

  // 더 이상 related_task_id 컬럼이 없으므로 빈 배열 반환
  // junction table을 사용하려면 getTodoNotes(todoId)를 호출하세요
  return [];
}

/**
 * JWT 방식으로 프로젝트에 연결된 노트 조회
 * @deprecated 이 함수는 더 이상 사용되지 않습니다. getProjectNotes() junction table API를 사용하세요.
 * import { getProjectNotes } from '@/lib/supabase/project-notes';
 */
export async function fetchNotesByProjectWithJWT(projectId: string, userId: string): Promise<Note[]> {
  console.warn('⚠️  fetchNotesByProjectWithJWT는 deprecated되었습니다. getProjectNotes()를 사용하세요.');
  console.log('📝 JWT 방식으로 프로젝트 연결 노트 조회 (deprecated):', { projectId, userId });

  // 더 이상 project_id 컬럼이 없으므로 빈 배열 반환
  // junction table을 사용하려면 getProjectNotes(projectId)를 호출하세요
  return [];
}
