/**
 * sleepWakeCompletionStore — 기상/취침 카드의 날짜별 완료 상태 관리
 * DB: public.sleep_wake_completions (user_id, completion_date, type)
 */
import {create} from 'zustand';
import {supabase} from '@/lib/supabase';

export type SleepWakeType = 'sleep' | 'wake';

interface State {
  /** key: `${date}:${type}` → completion id (있으면 완료) */
  completions: Record<string, string>;
  fetchForDate: (date: string) => Promise<void>;
  toggle: (date: string, type: SleepWakeType) => Promise<void>;
  isCompleted: (date: string, type: SleepWakeType) => boolean;
}

const keyOf = (date: string, type: SleepWakeType) => `${date}:${type}`;

export const useSleepWakeCompletionStore = create<State>((set, get) => ({
  completions: {},

  isCompleted: (date, type) => {
    return !!get().completions[keyOf(date, type)];
  },

  fetchForDate: async (date) => {
    const {data: userData} = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const {data, error} = await supabase
      .from('sleep_wake_completions')
      .select('id, completion_date, type')
      .eq('user_id', userId)
      .eq('completion_date', date);
    if (error) {
      console.error('[sleepWakeCompletionStore] fetch error:', error);
      return;
    }

    const fresh: Record<string, string> = {};
    for (const row of data ?? []) {
      fresh[keyOf(row.completion_date, row.type as SleepWakeType)] = row.id;
    }
    // 같은 날짜 entries만 교체
    set(s => {
      const filtered = Object.fromEntries(
        Object.entries(s.completions).filter(([k]) => !k.startsWith(date + ':')),
      );
      return {completions: {...filtered, ...fresh}};
    });
  },

  toggle: async (date, type) => {
    const {data: userData} = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const key = keyOf(date, type);
    const existingId = get().completions[key];

    if (existingId) {
      // 완료 → 미완료 (DELETE)
      // optimistic
      set(s => {
        const next = {...s.completions};
        delete next[key];
        return {completions: next};
      });
      const {error} = await supabase
        .from('sleep_wake_completions')
        .delete()
        .eq('id', existingId);
      if (error) {
        console.error('[sleepWakeCompletionStore] delete error:', error);
        // rollback
        set(s => ({completions: {...s.completions, [key]: existingId}}));
      }
    } else {
      // 미완료 → 완료 (INSERT)
      const tempId = `temp_${Date.now()}`;
      set(s => ({completions: {...s.completions, [key]: tempId}}));
      const {data, error} = await supabase
        .from('sleep_wake_completions')
        .insert({user_id: userId, completion_date: date, type})
        .select('id')
        .single();
      if (error || !data) {
        console.error('[sleepWakeCompletionStore] insert error:', error);
        // rollback
        set(s => {
          const next = {...s.completions};
          delete next[key];
          return {completions: next};
        });
        return;
      }
      // tempId → 실제 id
      set(s => ({completions: {...s.completions, [key]: data.id}}));
    }
  },
}));
