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
