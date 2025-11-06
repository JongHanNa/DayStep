import { fetchWithJWT } from './core';

/**
 * Get all notes connected to a project (다대다 관계)
 */
export async function getProjectNotes(projectId: string): Promise<string[]> {
  try {
    const result = await fetchWithJWT(
      `/project_notes?project_id=eq.${projectId}&select=note_id`,
      { method: 'GET' }
    );

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((item: any) => item.note_id);
  } catch (error) {
    console.error('Error fetching project notes:', error);
    return [];
  }
}

/**
 * Get all projects connected to a note (다대다 관계)
 */
export async function getNoteProjects(noteId: string): Promise<string[]> {
  try {
    const result = await fetchWithJWT(
      `/project_notes?note_id=eq.${noteId}&select=project_id`,
      { method: 'GET' }
    );

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((item: any) => item.project_id);
  } catch (error) {
    console.error('Error fetching note projects:', error);
    return [];
  }
}

/**
 * Link a project to a note (단일 연결 생성)
 */
export async function linkProjectNote(projectId: string, noteId: string): Promise<boolean> {
  try {
    await fetchWithJWT('/project_notes', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        note_id: noteId,
      }),
    });
    return true;
  } catch (error) {
    console.error('Error linking project note:', error);
    return false;
  }
}

/**
 * Unlink a project from a note (단일 연결 해제)
 */
export async function unlinkProjectNote(projectId: string, noteId: string): Promise<boolean> {
  try {
    await fetchWithJWT(
      `/project_notes?project_id=eq.${projectId}&note_id=eq.${noteId}`,
      { method: 'DELETE' }
    );
    return true;
  } catch (error) {
    console.error('Error unlinking project note:', error);
    return false;
  }
}

/**
 * Link multiple notes to a project (일괄 연결)
 * @param projectId - Project ID
 * @param noteIds - 연결할 노트 ID 배열
 */
export async function linkProjectNotes(projectId: string, noteIds: string[]): Promise<boolean> {
  try {
    if (noteIds.length === 0) {
      return true;
    }

    // 배치 삽입을 위한 데이터 준비
    const insertData = noteIds.map((noteId) => ({
      project_id: projectId,
      note_id: noteId,
    }));

    await fetchWithJWT('/project_notes', {
      method: 'POST',
      body: JSON.stringify(insertData),
    });

    return true;
  } catch (error) {
    console.error('Error linking project notes:', error);
    return false;
  }
}

/**
 * Unlink multiple notes from a project (일괄 해제)
 * @param projectId - Project ID
 * @param noteIds - 해제할 노트 ID 배열
 */
export async function unlinkProjectNotes(projectId: string, noteIds: string[]): Promise<boolean> {
  try {
    if (noteIds.length === 0) {
      return true;
    }

    // 각 노트에 대해 개별 DELETE 요청
    const deletePromises = noteIds.map((noteId) =>
      fetchWithJWT(
        `/project_notes?project_id=eq.${projectId}&note_id=eq.${noteId}`,
        { method: 'DELETE' }
      )
    );

    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Error unlinking project notes:', error);
    return false;
  }
}

/**
 * Update all note connections for a project (프로젝트의 모든 노트 연결 업데이트)
 * @param projectId - Project ID
 * @param noteIds - 연결할 노트 ID 배열 (여러 개 가능)
 */
export async function updateProjectNotes(projectId: string, noteIds: string[]): Promise<boolean> {
  try {
    // 1. 기존 연결 모두 삭제
    await fetchWithJWT(`/project_notes?project_id=eq.${projectId}`, {
      method: 'DELETE',
    });

    // 2. 새로운 연결 생성
    if (noteIds.length > 0) {
      await linkProjectNotes(projectId, noteIds);
    }

    return true;
  } catch (error) {
    console.error('Error updating project notes:', error);
    return false;
  }
}
