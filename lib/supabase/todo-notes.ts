import { fetchWithJWT, QueryOptions } from './core';

/**
 * Get all notes connected to a todo (다대다 관계)
 */
export async function getTodoNotes(todoId: string): Promise<string[]> {
  try {
    const result = await fetchWithJWT(
      `/todo_notes?todo_id=eq.${todoId}&select=note_id`,
      { method: 'GET' }
    );

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((item: any) => item.note_id);
  } catch (error) {
    console.error('Error fetching todo notes:', error);
    return [];
  }
}

/**
 * Add a note connection to a todo
 */
export async function addTodoNote(todoId: string, noteId: string, userId: string): Promise<boolean> {
  try {
    await fetchWithJWT('/todo_notes', {
      method: 'POST',
      body: JSON.stringify({
        todo_id: todoId,
        note_id: noteId,
        user_id: userId,
      }),
    });
    return true;
  } catch (error) {
    console.error('Error adding todo note:', error);
    return false;
  }
}

/**
 * Remove a note connection from a todo
 */
export async function removeTodoNote(todoId: string, noteId: string): Promise<boolean> {
  try {
    await fetchWithJWT(
      `/todo_notes?todo_id=eq.${todoId}&note_id=eq.${noteId}`,
      { method: 'DELETE' }
    );
    return true;
  } catch (error) {
    console.error('Error removing todo note:', error);
    return false;
  }
}

/**
 * Update all note connections for a todo (다대다 관계)
 * @param todoId - Todo ID
 * @param noteIds - 연결할 노트 ID 배열 (여러 개 가능)
 * @param userId - User ID (RLS 정책 필수)
 */
export async function updateTodoNotes(todoId: string, noteIds: string[], userId: string): Promise<boolean> {
  try {
    // 1. 기존 연결 모두 삭제
    await fetchWithJWT(`/todo_notes?todo_id=eq.${todoId}`, {
      method: 'DELETE',
    });

    // 2. 새로운 연결 생성
    if (noteIds.length > 0) {
      // 배치 삽입을 위한 데이터 준비 (user_id 포함)
      const insertData = noteIds.map((noteId) => ({
        todo_id: todoId,
        note_id: noteId,
        user_id: userId,
      }));

      await fetchWithJWT('/todo_notes', {
        method: 'POST',
        body: JSON.stringify(insertData),
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating todo notes:', error);
    return false;
  }
}

/**
 * Get all todos connected to a note (다대다 관계)
 */
export async function getNoteTodos(noteId: string): Promise<string[]> {
  try {
    const result = await fetchWithJWT(
      `/todo_notes?note_id=eq.${noteId}&select=todo_id`,
      { method: 'GET' }
    );

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((item: any) => item.todo_id);
  } catch (error) {
    console.error('Error fetching note todos:', error);
    return [];
  }
}
