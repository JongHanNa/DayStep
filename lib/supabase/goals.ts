/**
 * Goals - 목표 관리
 */

import { createWithJWT, updateWithJWT, deleteWithJWT, queryRLSTableWithJWT } from './core';
import type { Goal, CreateGoalInput, UpdateGoalInput } from '@/types/second-brain';

type GoalInsert = Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'progress' | 'projects' | 'area' | 'resource'>;
type GoalUpdate = Partial<GoalInsert>;

/**
 * JWT 방식으로 목표 조회
 */
export async function fetchGoalsWithJWT(userId: string): Promise<Goal[]> {
  console.log('🎯 JWT 방식으로 목표 조회:', { userId });

  try {
    // 목표 조회
    const goals = await queryRLSTableWithJWT('goals', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*',
      order: 'order_index.asc'
    });

    console.log('✅ JWT 목표 조회 성공:', { count: goals?.length || 0 });
    return goals || [];
  } catch (error) {
    console.error('❌ JWT 목표 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 목표 생성
 */
export async function createGoalWithJWT(data: GoalInsert): Promise<Goal> {
  console.log('✏️ JWT 방식으로 목표 생성:', data);

  try {
    const result = await createWithJWT('goals', data);
    console.log('✅ JWT 목표 생성 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 목표 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 목표 업데이트
 */
export async function updateGoalWithJWT(
  id: string,
  userId: string,
  updates: GoalUpdate
): Promise<Goal | null> {
  console.log('🔄 JWT 방식으로 목표 업데이트:', { id, userId, updates });

  try {
    const result = await updateWithJWT('goals', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      ...updates,
      updated_at: new Date().toISOString()
    });

    console.log('✅ JWT 목표 업데이트 성공:', { id });
    return result?.[0] || null;
  } catch (error) {
    console.error('❌ JWT 목표 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 목표 삭제
 */
export async function deleteGoalWithJWT(
  id: string,
  userId: string
): Promise<boolean> {
  console.log('🗑️ JWT 방식으로 목표 삭제:', { id, userId });

  try {
    await deleteWithJWT('goals', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 목표 삭제 성공:', { id });
    return true;
  } catch (error) {
    console.error('❌ JWT 목표 삭제 실패:', error);
    return false;
  }
}
