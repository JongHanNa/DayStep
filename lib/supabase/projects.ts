/**
 * Supabase Projects - JWT 기반 프로젝트 관리
 * Capacitor WebView 환경에서 RLS 테이블 접근을 위한 함수들
 */

import { queryRLSTableWithJWT, createWithJWT, updateWithJWT, deleteWithJWT, fetchWithJWT } from './core';
import type { Project, ProjectInsert, ProjectStatus, ProjectProgress, Todo } from '@/types';

/**
 * JWT 방식으로 프로젝트 목록 조회
 */
export async function fetchProjectsWithJWT(
  userId: string,
  status?: ProjectStatus
): Promise<Project[]> {
  console.log('📁 JWT 방식으로 프로젝트 목록 조회:', { userId, status });

  try {
    const queryParams: string[] = [
      `user_id=eq.${userId}`,
      'select=*',
      'order=created_at.desc'
    ];

    if (status) {
      queryParams.push(`status=eq.${status}`);
    }

    const path = `/projects?${queryParams.join('&')}`;
    const projects = await fetchWithJWT(path);

    console.log('✅ JWT 프로젝트 목록 조회 성공:', { count: projects?.length || 0 });
    return projects || [];
  } catch (error) {
    console.error('❌ JWT 프로젝트 목록 조회 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 프로젝트 상세 조회
 */
export async function fetchProjectByIdWithJWT(
  userId: string,
  projectId: string
): Promise<Project | null> {
  console.log('📁 JWT 방식으로 프로젝트 상세 조회:', { userId, projectId });

  try {
    const result = await queryRLSTableWithJWT('projects', [
      { column: 'id', operator: 'eq', value: projectId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: '*',
      single: true
    });

    console.log('✅ JWT 프로젝트 상세 조회 성공:', { project: result?.id });
    return result || null;
  } catch (error) {
    console.error('❌ JWT 프로젝트 상세 조회 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 프로젝트 진행률 조회
 */
export async function fetchProjectProgressWithJWT(
  userId: string,
  projectId: string
): Promise<ProjectProgress | null> {
  console.log('📁 JWT 방식으로 프로젝트 진행률 조회:', { userId, projectId });

  try {
    // 프로젝트에 연결된 할일 통계 조회
    const todos = await queryRLSTableWithJWT('todos', [
      { column: 'project_id', operator: 'eq', value: projectId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'id,completed'
    });

    const total = todos?.length || 0;
    const completed = todos?.filter((t: { completed: boolean }) => t.completed).length || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    const progressData: ProjectProgress = {
      project_id: projectId,
      total,
      completed,
      progress
    };

    console.log('✅ JWT 프로젝트 진행률 조회 성공:', progressData);
    return progressData;
  } catch (error) {
    console.error('❌ JWT 프로젝트 진행률 조회 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 프로젝트 생성
 */
export async function createProjectWithJWT(
  userId: string,
  data: Omit<ProjectInsert, 'user_id'>
): Promise<Project | null> {
  console.log('📁 JWT 방식으로 프로젝트 생성:', { userId, data });

  try {
    const projectData = {
      user_id: userId,
      title: data.title,
      description: data.description || null,
      status: data.status || 'in_progress',
      icon: data.icon || null,
      color: data.color || '#A8DADC'
    };

    const result = await createWithJWT('projects', projectData);

    console.log('✅ JWT 프로젝트 생성 성공:', { projectId: result?.id });
    return result || null;
  } catch (error) {
    console.error('❌ JWT 프로젝트 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 프로젝트 수정
 */
export async function updateProjectWithJWT(
  userId: string,
  projectId: string,
  updates: Partial<Omit<ProjectInsert, 'user_id'>>
): Promise<Project | null> {
  console.log('📁 JWT 방식으로 프로젝트 수정:', { userId, projectId, updates });

  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const result = await updateWithJWT('projects', [
      { column: 'id', operator: 'eq', value: projectId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], updateData);

    const updatedProject = Array.isArray(result) ? result[0] : result;
    console.log('✅ JWT 프로젝트 수정 성공:', { projectId: updatedProject?.id });
    return updatedProject || null;
  } catch (error) {
    console.error('❌ JWT 프로젝트 수정 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 프로젝트 삭제
 */
export async function deleteProjectWithJWT(
  userId: string,
  projectId: string
): Promise<boolean> {
  console.log('📁 JWT 방식으로 프로젝트 삭제:', { userId, projectId });

  try {
    // 먼저 연결된 할일의 project_id를 null로 설정
    await updateWithJWT('todos', [
      { column: 'project_id', operator: 'eq', value: projectId }
    ], { project_id: null });

    // 프로젝트 삭제
    await deleteWithJWT('projects', [
      { column: 'id', operator: 'eq', value: projectId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 프로젝트 삭제 성공');
    return true;
  } catch (error) {
    console.error('❌ JWT 프로젝트 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 프로젝트와 연결된 할일 모두 삭제
 */
export async function deleteProjectWithTodosWithJWT(
  userId: string,
  projectId: string
): Promise<boolean> {
  console.log('📁 JWT 방식으로 프로젝트 및 할일 삭제:', { userId, projectId });

  try {
    // 연결된 할일 삭제
    await deleteWithJWT('todos', [
      { column: 'project_id', operator: 'eq', value: projectId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    // 프로젝트 삭제
    await deleteWithJWT('projects', [
      { column: 'id', operator: 'eq', value: projectId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 프로젝트 및 할일 삭제 성공');
    return true;
  } catch (error) {
    console.error('❌ JWT 프로젝트 및 할일 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 프로젝트 완료 처리
 */
export async function completeProjectWithJWT(
  userId: string,
  projectId: string
): Promise<boolean> {
  console.log('📁 JWT 방식으로 프로젝트 완료:', { userId, projectId });

  try {
    await updateWithJWT('projects', [
      { column: 'id', operator: 'eq', value: projectId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log('✅ JWT 프로젝트 완료 성공');
    return true;
  } catch (error) {
    console.error('❌ JWT 프로젝트 완료 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 프로젝트에 연결된 할일 조회
 */
export async function fetchProjectTodosWithJWT(
  userId: string,
  projectId: string
): Promise<Todo[]> {
  console.log('📁 JWT 방식으로 프로젝트 할일 조회:', { userId, projectId });

  try {
    const queryParams: string[] = [
      `project_id=eq.${projectId}`,
      `user_id=eq.${userId}`,
      'parent_todo_id=is.null', // 부모 할일만 조회 (서브태스크 제외)
      'select=*',
      'order=created_at.desc'
    ];

    const path = `/todos?${queryParams.join('&')}`;
    const todos = await fetchWithJWT(path);

    console.log('✅ JWT 프로젝트 할일 조회 성공:', { count: todos?.length || 0 });
    return todos || [];
  } catch (error) {
    console.error('❌ JWT 프로젝트 할일 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 할일에서 프로젝트 연결 해제
 */
export async function unlinkTodoFromProjectWithJWT(
  userId: string,
  todoId: string
): Promise<boolean> {
  console.log('📁 JWT 방식으로 할일 연결 해제:', { userId, todoId });

  try {
    await updateWithJWT('todos', [
      { column: 'id', operator: 'eq', value: todoId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], { project_id: null });

    console.log('✅ JWT 할일 연결 해제 성공');
    return true;
  } catch (error) {
    console.error('❌ JWT 할일 연결 해제 실패:', error);
    return false;
  }
}
