import { fetchWithJWT, QueryOptions } from './core';

/**
 * Get all projects connected to a todo (다대다 관계)
 */
export async function getTodoProjects(todoId: string): Promise<string[]> {
  try {
    const result = await fetchWithJWT(
      `/todo_projects?todo_id=eq.${todoId}&select=project_id`,
      { method: 'GET' }
    );

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((item: any) => item.project_id);
  } catch (error) {
    console.error('Error fetching todo projects:', error);
    return [];
  }
}

/**
 * Add a project connection to a todo
 */
export async function addTodoProject(todoId: string, projectId: string, userId: string): Promise<boolean> {
  try {
    const result = await fetchWithJWT('/todo_projects', {
      method: 'POST',
      body: JSON.stringify({
        todo_id: todoId,
        project_id: projectId,
        user_id: userId,
      }),
    });
    return true;
  } catch (error) {
    console.error('Error adding todo project:', error);
    return false;
  }
}

/**
 * Remove a project connection from a todo
 */
export async function removeTodoProject(todoId: string, projectId: string): Promise<boolean> {
  try {
    await fetchWithJWT(
      `/todo_projects?todo_id=eq.${todoId}&project_id=eq.${projectId}`,
      { method: 'DELETE' }
    );
    return true;
  } catch (error) {
    console.error('Error removing todo project:', error);
    return false;
  }
}

/**
 * Update all project connections for a todo (다대다 관계)
 * @param todoId - Todo ID
 * @param projectIds - 연결할 프로젝트 ID 배열 (여러 개 가능)
 * @param userId - User ID (RLS 정책 필수)
 */
export async function updateTodoProjects(todoId: string, projectIds: string[], userId: string): Promise<boolean> {
  try {
    // 1. 기존 연결 모두 삭제
    await fetchWithJWT(`/todo_projects?todo_id=eq.${todoId}`, {
      method: 'DELETE',
    });

    // 2. 새로운 연결 생성
    if (projectIds.length > 0) {
      // 배치 삽입을 위한 데이터 준비 (user_id 포함)
      const insertData = projectIds.map((projectId) => ({
        todo_id: todoId,
        project_id: projectId,
        user_id: userId,
      }));

      await fetchWithJWT('/todo_projects', {
        method: 'POST',
        body: JSON.stringify(insertData),
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating todo projects:', error);
    return false;
  }
}

/**
 * Get all todos connected to a project (다대다 관계)
 */
export async function getProjectTodos(projectId: string): Promise<string[]> {
  try {
    const result = await fetchWithJWT(
      `/todo_projects?project_id=eq.${projectId}&select=todo_id`,
      { method: 'GET' }
    );

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((item: any) => item.todo_id);
  } catch (error) {
    console.error('Error fetching project todos:', error);
    return [];
  }
}
