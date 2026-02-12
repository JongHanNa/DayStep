/**
 * 사용자 용량 통계 API
 *
 * user_usage_stats 테이블과 연동하여 용량 조회 및 관리
 */

import { supabase } from '../supabase';
import { queryRLSTableWithJWT, type QueryCondition, type QueryOptions } from './core';

/**
 * 용량 통계 타입
 */
export interface UserUsageStats {
  id: string;
  userId: string;
  todoCount: number;
  habitCount: number;
  projectCount: number;
  noteCount: number;
  contactCount: number;
  cherishedPeopleCount: number;
  careInteractionCount: number;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DB Row를 camelCase로 변환
 */
function mapDbRowToUsageStats(row: any): UserUsageStats {
  return {
    id: row.id,
    userId: row.user_id,
    todoCount: row.todo_count,
    habitCount: row.habit_count,
    projectCount: row.project_count,
    noteCount: row.note_count,
    contactCount: row.contact_count,
    cherishedPeopleCount: row.cherished_people_count ?? 0,
    careInteractionCount: row.care_interaction_count ?? 0,
    lastCalculatedAt: row.last_calculated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 현재 사용자의 용량 통계 조회
 */
export async function fetchUserUsageStats(userId: string): Promise<UserUsageStats | null> {
  try {
    console.log('📊 용량 통계 조회:', userId);

    // JWT 방식으로 조회 (Capacitor 환경 지원)
    const condition: QueryCondition = {
      column: 'user_id',
      operator: 'eq',
      value: userId,
    };

    const data = await queryRLSTableWithJWT('user_usage_stats', condition, {
      single: true,
    });

    if (!data) {
      console.log('📊 용량 통계 없음 - 초기화 필요');
      return null;
    }

    console.log('📊 용량 통계 조회 성공:', data);
    return mapDbRowToUsageStats(data);
  } catch (err: any) {
    // 통계가 없는 경우 (신규 사용자)
    if (err?.code === 'PGRST116') {
      console.log('📊 용량 통계 없음 - 초기화 필요');
      return null;
    }
    console.error('📊 용량 통계 조회 실패:', err);
    throw err;
  }
}

/**
 * 용량 통계 초기화 (신규 사용자 또는 재계산 필요 시)
 */
export async function initializeUserUsageStats(userId: string): Promise<UserUsageStats | null> {
  try {
    console.log('📊 용량 통계 초기화:', userId);

    // PostgreSQL 함수 호출하여 초기화 (Supabase client 사용)
    // 타입 안전을 위해 any 캐스팅 (initialize_user_usage_stats는 동적으로 생성된 함수)
    const { error: funcError } = await (supabase.rpc as any)('initialize_user_usage_stats', {
      p_user_id: userId,
    });

    if (funcError) {
      throw funcError;
    }

    // 초기화 후 데이터 조회
    return await fetchUserUsageStats(userId);
  } catch (err) {
    console.error('📊 용량 통계 초기화 실패:', err);
    throw err;
  }
}

/**
 * 용량 통계 조회 또는 초기화
 * 통계가 없으면 자동으로 초기화
 */
export async function getOrInitializeUserUsageStats(userId: string): Promise<UserUsageStats> {
  try {
    // 1. 먼저 조회 시도
    const existing = await fetchUserUsageStats(userId);

    if (existing) {
      return existing;
    }

    // 2. 없으면 초기화
    const initialized = await initializeUserUsageStats(userId);

    if (!initialized) {
      // 초기화 실패 시 기본값 반환
      return {
        id: '',
        userId,
        todoCount: 0,
        habitCount: 0,
        projectCount: 0,
        noteCount: 0,
        contactCount: 0,
        cherishedPeopleCount: 0,
        careInteractionCount: 0,
        lastCalculatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return initialized;
  } catch (err) {
    console.error('📊 용량 통계 조회/초기화 실패:', err);

    // 에러 시 기본값 반환 (UI 깨짐 방지)
    return {
      id: '',
      userId,
      todoCount: 0,
      habitCount: 0,
      projectCount: 0,
      noteCount: 0,
      contactCount: 0,
      cherishedPeopleCount: 0,
      careInteractionCount: 0,
      lastCalculatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
