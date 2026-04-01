/**
 * useUsageStats — 사용량 통계 Hook (RN)
 * user_usage_stats 테이블에서 현재 사용량 조회
 */

import {useState, useEffect, useCallback} from 'react';
import {supabase} from '@/lib/supabase';
import {useAuthStore} from '@/stores/authStore';

export interface UserUsageStats {
  todoCount: number;
  habitCount: number;
  projectCount: number;
  noteCount: number;
  contactCount: number;
  cherishedPeopleCount: number;
  careInteractionCount: number;
}

const DEFAULT_STATS: UserUsageStats = {
  todoCount: 0,
  habitCount: 0,
  projectCount: 0,
  noteCount: 0,
  contactCount: 0,
  cherishedPeopleCount: 0,
  careInteractionCount: 0,
};

function mapRow(row: any): UserUsageStats {
  return {
    todoCount: row.todo_count ?? 0,
    habitCount: row.habit_count ?? 0,
    projectCount: row.project_count ?? 0,
    noteCount: row.note_count ?? 0,
    contactCount: row.contact_count ?? 0,
    cherishedPeopleCount: row.cherished_people_count ?? 0,
    careInteractionCount: row.care_interaction_count ?? 0,
  };
}

export function useUsageStats() {
  const {user} = useAuthStore();
  const [stats, setStats] = useState<UserUsageStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // user_usage_stats에 project_count/note_count 컬럼 없음 → 직접 COUNT
      const [usageResult, projectResult, noteResult] = await Promise.all([
        supabase
          .from('user_usage_stats')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('projects')
          .select('*', {count: 'exact', head: true})
          .eq('user_id', user.id),
        supabase
          .from('notes')
          .select('*', {count: 'exact', head: true})
          .eq('user_id', user.id)
          .eq('note_category', 'motivation'),
      ]);

      const {data, error} = usageResult;

      if (error && error.code === 'PGRST116') {
        // 행이 없으면 초기화 후 재조회
        await supabase.rpc('initialize_user_usage_stats', {p_user_id: user.id});
        const {data: retryData} = await supabase
          .from('user_usage_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const base = retryData ? mapRow(retryData) : DEFAULT_STATS;
        setStats({
          ...base,
          projectCount: projectResult.count ?? 0,
          noteCount: noteResult.count ?? 0,
        });
      } else if (error) {
        console.warn('[useUsageStats] 조회 실패:', error.message);
        setStats(DEFAULT_STATS);
      } else {
        const base = data ? mapRow(data) : DEFAULT_STATS;
        setStats({
          ...base,
          projectCount: projectResult.count ?? 0,
          noteCount: noteResult.count ?? 0,
        });
      }
    } catch (err) {
      console.warn('[useUsageStats] 예외:', err);
      setStats(DEFAULT_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {stats, isLoading, fetchStats};
}
