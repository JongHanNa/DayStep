/**
 * Projects - 프로젝트 관리
 */

import { createWithJWT, updateWithJWT, deleteWithJWT, fetchWithJWT } from './core';

/**
 * JWT 방식으로 프로젝트 조회
 */
export async function fetchProjectsWithJWT(userId: string): Promise<any[]> {
  console.log('📁 JWT 방식으로 프로젝트 조회:', { userId });

  try {
    // 프로젝트 조회 (관계 포함)
    const projects = await fetchWithJWT(
      `/rest/v1/projects?user_id=eq.${userId}&select=*,goal:goals(*),area_resource:areas_resources(*),todos(*),notes(*)&order=order_index.asc`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

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
export async function createProjectWithJWT(data: any): Promise<any> {
  console.log('✏️ JWT 방식으로 프로젝트 생성:', data);

  try {
    const result = await createWithJWT('projects', data);
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
  updates: any
): Promise<any> {
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
