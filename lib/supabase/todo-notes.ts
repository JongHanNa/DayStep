import { fetchWithJWT, QueryOptions } from './core';

/**
 * Get all notes connected to a todo
 */
export async function getTodoNotes(todoId: string): Promise<string[]> {
  try {
    const result = await fetchWithJWT(
      `/rest/v1/todo_notes?todo_id=eq.${todoId}&select=note_id`,
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
export async function addTodoNote(todoId: string, noteId: string): Promise<boolean> {
  try {
    await fetchWithJWT('/rest/v1/todo_notes', {
      method: 'POST',
      body: JSON.stringify({ todo_id: todoId, note_id: noteId }),
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
      `/rest/v1/todo_notes?todo_id=eq.${todoId}&note_id=eq.${noteId}`,
      { method: 'DELETE' }
    );
    return true;
  } catch (error) {
    console.error('Error removing todo note:', error);
    return false;
  }
}

/**
 * Update all note connections for a todo (replaces existing connections)
 */
export async function updateTodoNotes(todoId: string, noteIds: string[]): Promise<boolean> {
  try {
    // Delete all existing connections
    await fetchWithJWT(
      `/rest/v1/todo_notes?todo_id=eq.${todoId}`,
      { method: 'DELETE' }
    );

    // Insert new connections if any
    if (noteIds.length > 0) {
      const items = noteIds.map(noteId => ({
        todo_id: todoId,
        note_id: noteId
      }));

      await fetchWithJWT('/rest/v1/todo_notes', {
        method: 'POST',
        body: JSON.stringify(items),
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating todo notes:', error);
    return false;
  }
}

/**
 * Get all todos connected to a note
 */
export async function getNoteTodos(noteId: string): Promise<string[]> {
  try {
    const result = await fetchWithJWT(
      `/rest/v1/todo_notes?note_id=eq.${noteId}&select=todo_id`,
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
