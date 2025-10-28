/**
 * Statistics - 통계 조회
 */

import { fetchWithJWT } from './core';

/**
 * JWT 방식으로 프로젝트 통계 조회
 */
export async function fetchProjectStatsWithJWT(projectId: string): Promise<any> {
  console.log('📊 JWT 방식으로 프로젝트 통계 조회:', { projectId });

  try {
    const stats = await fetchWithJWT(
      `/rest/v1/project_todo_stats?project_id=eq.${projectId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    console.log('✅ JWT 프로젝트 통계 조회 성공:', stats?.[0]);
    return stats?.[0] || null;
  } catch (error) {
    console.error('❌ JWT 프로젝트 통계 조회 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 목표별 프로젝트 통계 조회
 */
export async function fetchGoalStatsWithJWT(goalId: string): Promise<any> {
  console.log('📊 JWT 방식으로 목표 통계 조회:', { goalId });

  try {
    const stats = await fetchWithJWT(
      `/rest/v1/goal_project_stats?goal_id=eq.${goalId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    console.log('✅ JWT 목표 통계 조회 성공:', stats?.[0]);
    return stats?.[0] || null;
  } catch (error) {
    console.error('❌ JWT 목표 통계 조회 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 영역/자원별 노트 카운트 조회
 */
export async function fetchAreaResourceNoteCountsWithJWT(userId: string): Promise<any[]> {
  console.log('📊 JWT 방식으로 영역/자원별 노트 카운트 조회:', { userId });

  try {
    const counts = await fetchWithJWT(
      `/rest/v1/area_resource_note_counts?user_id=eq.${userId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    console.log('✅ JWT 영역/자원별 노트 카운트 조회 성공:', { count: counts?.length || 0 });
    return counts || [];
  } catch (error) {
    console.error('❌ JWT 영역/자원별 노트 카운트 조회 실패:', error);
    return [];
  }
}
