/**
 * Graph Relations - 그래프 뷰를 위한 연결 테이블 조회
 * Junction 테이블들에서 관계 데이터를 가져옵니다.
 */

import { queryRLSTableWithJWT } from './core';
import type {
  TodoProjectRelation,
  TodoNoteRelation,
  ProjectNoteRelation,
  NoteNoteRelation,
  GraphRelations,
} from '@/types/graph';

/**
 * Todo-Project 연결 관계 조회
 */
export async function fetchTodoProjectRelations(userId: string): Promise<TodoProjectRelation[]> {
  try {
    const relations = await queryRLSTableWithJWT('todo_projects', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*'
    });

    return relations || [];
  } catch (error) {
    console.error('❌ Todo-Project 관계 조회 실패:', error);
    return [];
  }
}

/**
 * Todo-Note 연결 관계 조회
 */
export async function fetchTodoNoteRelations(userId: string): Promise<TodoNoteRelation[]> {
  try {
    const relations = await queryRLSTableWithJWT('todo_notes', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*'
    });

    return relations || [];
  } catch (error) {
    console.error('❌ Todo-Note 관계 조회 실패:', error);
    return [];
  }
}

/**
 * Project-Note 연결 관계 조회
 * project_notes 테이블에는 user_id가 없으므로 전체 조회 후 필터링
 */
export async function fetchProjectNoteRelations(projectIds: string[]): Promise<ProjectNoteRelation[]> {
  if (projectIds.length === 0) return [];

  try {
    // project_notes 테이블에는 user_id가 없으므로 project_id로 필터링
    const relations = await queryRLSTableWithJWT('project_notes', [
      {
        column: 'project_id',
        operator: 'in',
        value: `(${projectIds.join(',')})`
      }
    ], {
      select: '*'
    });

    return relations || [];
  } catch (error) {
    console.error('❌ Project-Note 관계 조회 실패:', error);
    return [];
  }
}

/**
 * Note-Note 연결 관계 조회
 * note_notes 테이블에는 user_id가 없으므로 note_id로 필터링
 */
export async function fetchNoteNoteRelations(noteIds: string[]): Promise<NoteNoteRelation[]> {
  if (noteIds.length === 0) return [];

  try {
    // source_note_id 또는 target_note_id가 사용자의 노트인 관계만 조회
    const relations = await queryRLSTableWithJWT('note_notes', [
      {
        column: 'source_note_id',
        operator: 'in',
        value: `(${noteIds.join(',')})`
      }
    ], {
      select: '*'
    });

    return relations || [];
  } catch (error) {
    console.error('❌ Note-Note 관계 조회 실패:', error);
    return [];
  }
}

/**
 * 모든 그래프 관계 데이터를 한번에 조회
 */
export async function fetchAllGraphRelations(
  userId: string,
  projectIds: string[],
  noteIds: string[]
): Promise<GraphRelations> {
  console.log('🔗 그래프 관계 데이터 조회 시작:', { userId, projectCount: projectIds.length, noteCount: noteIds.length });

  try {
    // 병렬로 모든 관계 테이블 조회
    const [todoProjects, todoNotes, projectNotes, noteNotes] = await Promise.all([
      fetchTodoProjectRelations(userId),
      fetchTodoNoteRelations(userId),
      fetchProjectNoteRelations(projectIds),
      fetchNoteNoteRelations(noteIds),
    ]);

    console.log('✅ 그래프 관계 데이터 조회 완료:', {
      todoProjects: todoProjects.length,
      todoNotes: todoNotes.length,
      projectNotes: projectNotes.length,
      noteNotes: noteNotes.length,
    });

    return {
      todoProjects,
      todoNotes,
      projectNotes,
      noteNotes,
    };
  } catch (error) {
    console.error('❌ 그래프 관계 데이터 조회 실패:', error);
    return {
      todoProjects: [],
      todoNotes: [],
      projectNotes: [],
      noteNotes: [],
    };
  }
}
