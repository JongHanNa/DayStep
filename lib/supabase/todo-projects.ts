import { fetchWithJWT, QueryOptions } from './core';

/**
 * Get all projects connected to a todo
 */
export async function getTodoProjects(todoId: string): Promise<string[]> {
  try {
    const result = await fetchWithJWT(
      `/rest/v1/todo_projects?todo_id=eq.${todoId}&select=project_id`,
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
export async function addTodoProject(todoId: string, projectId: string): Promise<boolean> {
  try {
    await fetchWithJWT('/rest/v1/todo_projects', {
      method: 'POST',
      body: JSON.stringify({ todo_id: todoId, project_id: projectId }),
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
      `/rest/v1/todo_projects?todo_id=eq.${todoId}&project_id=eq.${projectId}`,
      { method: 'DELETE' }
    );
    return true;
  } catch (error) {
    console.error('Error removing todo project:', error);
    return false;
  }
}

/**
 * Update all project connections for a todo (replaces existing connections)
 */
export async function updateTodoProjects(todoId: string, projectIds: string[]): Promise<boolean> {
  try {
    // Delete all existing connections
    await fetchWithJWT(
      `/rest/v1/todo_projects?todo_id=eq.${todoId}`,
      { method: 'DELETE' }
    );

    // Insert new connections if any
    if (projectIds.length > 0) {
      const items = projectIds.map(projectId => ({
        todo_id: todoId,
        project_id: projectId
      }));

      await fetchWithJWT('/rest/v1/todo_projects', {
        method: 'POST',
        body: JSON.stringify(items),
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating todo projects:', error);
    return false;
  }
}

/**
 * Get all todos connected to a project
 */
export async function getProjectTodos(projectId: string): Promise<string[]> {
  try {
    const result = await fetchWithJWT(
      `/rest/v1/todo_projects?project_id=eq.${projectId}&select=todo_id`,
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
