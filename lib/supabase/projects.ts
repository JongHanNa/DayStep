/**
 * Projects - 프로젝트 관리
 */

import { createWithJWT, updateWithJWT, deleteWithJWT, queryRLSTableWithJWT } from './core';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types/second-brain';

/**
 * JWT 방식으로 프로젝트 조회
 */
export async function fetchProjectsWithJWT(userId: string): Promise<Project[]> {
  console.log('📁 JWT 방식으로 프로젝트 조회:', { userId });

  try {
    // 프로젝트 조회
    const projects = await queryRLSTableWithJWT('projects', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*',
      order: 'order_index.asc'
    });

    console.log('✅ JWT 프로젝트 조회 성공:', { count: projects?.length || 0 });
    return projects || [];
  } catch (error) {
    console.error('❌ JWT 프로젝트 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 프로젝트 생성
 */
export async function createProjectWithJWT(data: CreateProjectInput & { user_id: string }): Promise<Project> {
  console.log('✏️ JWT 방식으로 프로젝트 생성:', data);

  try {
    const result = await createWithJWT('projects', {
      ...data,
      order_index: data.order_index || 0,
      // 진행도 필드는 DB에 없음 (프론트에서만 계산)
    });
    console.log('✅ JWT 프로젝트 생성 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 프로젝트 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 프로젝트 업데이트
 */
export async function updateProjectWithJWT(
  id: string,
  userId: string,
  updates: UpdateProjectInput
): Promise<Project | null> {
  console.log('🔄 JWT 방식으로 프로젝트 업데이트:', { id, userId, updates });

  try {
    const result = await updateWithJWT('projects', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      ...updates,
      updated_at: new Date().toISOString()
    });

    console.log('✅ JWT 프로젝트 업데이트 성공:', { id });
    return result?.[0] || null;
  } catch (error) {
    console.error('❌ JWT 프로젝트 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 프로젝트 삭제
 */
export async function deleteProjectWithJWT(
  id: string,
  userId: string
): Promise<boolean> {
  console.log('🗑️ JWT 방식으로 프로젝트 삭제:', { id, userId });

  try {
    await deleteWithJWT('projects', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 프로젝트 삭제 성공:', { id });
    return true;
  } catch (error) {
    console.error('❌ JWT 프로젝트 삭제 실패:', error);
    return false;
  }
}
