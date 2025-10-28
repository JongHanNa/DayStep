/**
 * Areas & Resources - 영역/자원 관리
 */

import { createWithJWT, updateWithJWT, deleteWithJWT, queryRLSTableWithJWT } from './core';

/**
 * JWT 방식으로 영역/자원 조회
 */
export async function fetchAreasResourcesWithJWT(userId: string): Promise<any[]> {
  console.log('📂 JWT 방식으로 영역/자원 조회:', { userId });

  try {
    const areasResources = await queryRLSTableWithJWT('areas_resources', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*',
      order: 'order_index.asc'
    });

    console.log('✅ JWT 영역/자원 조회 성공:', { count: areasResources.length });
    return areasResources || [];
  } catch (error) {
    console.error('❌ JWT 영역/자원 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 영역/자원 생성
 */
export async function createAreaResourceWithJWT(data: any): Promise<any> {
  console.log('✏️ JWT 방식으로 영역/자원 생성:', data);

  try {
    const result = await createWithJWT('areas_resources', data);
    console.log('✅ JWT 영역/자원 생성 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 영역/자원 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 영역/자원 업데이트
 */
export async function updateAreaResourceWithJWT(
  id: string,
  userId: string,
  updates: any
): Promise<any> {
  console.log('🔄 JWT 방식으로 영역/자원 업데이트:', { id, userId, updates });

  try {
    const result = await updateWithJWT('areas_resources', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      ...updates,
      updated_at: new Date().toISOString()
    });

    console.log('✅ JWT 영역/자원 업데이트 성공:', { id });
    return result?.[0] || null;
  } catch (error) {
    console.error('❌ JWT 영역/자원 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 영역/자원 삭제
 */
export async function deleteAreaResourceWithJWT(
  id: string,
  userId: string
): Promise<boolean> {
  console.log('🗑️ JWT 방식으로 영역/자원 삭제:', { id, userId });

  try {
    await deleteWithJWT('areas_resources', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 영역/자원 삭제 성공:', { id });
    return true;
  } catch (error) {
    console.error('❌ JWT 영역/자원 삭제 실패:', error);
    return false;
  }
}
