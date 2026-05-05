import { DailyReflection } from "@/types";
import { supabase } from "@/lib/supabase";
import { createStore } from "../utils/storeUtils";

interface DailyReflectionStoreState {
  reflections: Map<string, DailyReflection>; // key = YYYY-MM-DD
  loading: boolean;
  error: string | null;

  // 액션
  fetchReflection: (userId: string, date: string) => Promise<DailyReflection | null>;
  upsertReflection: (userId: string, date: string, data: Partial<DailyReflection>) => Promise<void>;
  getReflection: (date: string) => DailyReflection | null;
  reset: () => void;
}

// daily_reflections 테이블은 아직 Supabase 타입에 없으므로 any 캐스팅 사용
const fromReflections = () => (supabase as any).from('daily_reflections');

export const useDailyReflectionStore = createStore<DailyReflectionStoreState>(
  (set, get) => ({
    reflections: new Map(),
    loading: false,
    error: null,

    getReflection: (date: string) => {
      const reflections = get().reflections;
      if (!(reflections instanceof Map)) return null;
      return reflections.get(date) || null;
    },

    fetchReflection: async (userId: string, date: string) => {
      // 캐시 확인
      const cached = get().getReflection(date);
      if (cached) return cached;

      set((state: DailyReflectionStoreState) => {
        state.loading = true;
      });

      try {
        const { data, error } = await fromReflections()
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const reflection: DailyReflection = {
            id: data.id,
            user_id: data.user_id,
            date: data.date,
            praises: data.praises || [],
            gratitudes: data.gratitudes || [],
            reward: data.reward || '',
            reflection: data.reflection || '',
            spending_note: data.spending_note || '',
            thought_archive: data.thought_archive || '',
            today_lesson: data.today_lesson || '',
            today_resolution: data.today_resolution || '',
            current_period: data.current_period || '',
            today_prayer: data.today_prayer || '',
            created_at: data.created_at,
            updated_at: data.updated_at,
          };

          set((state: DailyReflectionStoreState) => {
            state.reflections.set(date, reflection);
            state.loading = false;
          });

          return reflection;
        }

        set((state: DailyReflectionStoreState) => {
          state.loading = false;
        });

        return null;
      } catch (error) {
        set((state: DailyReflectionStoreState) => {
          state.loading = false;
          state.error = `리플렉션 조회 실패: ${(error as Error).message}`;
        });
        return null;
      }
    },

    upsertReflection: async (userId: string, date: string, data: Partial<DailyReflection>) => {
      // Optimistic update
      const existing = get().getReflection(date);
      const optimistic: DailyReflection = {
        id: existing?.id || '',
        user_id: userId,
        date,
        praises: data.praises ?? existing?.praises ?? [],
        gratitudes: data.gratitudes ?? existing?.gratitudes ?? [],
        reward: data.reward ?? existing?.reward ?? '',
        reflection: data.reflection ?? existing?.reflection ?? '',
        spending_note: data.spending_note ?? existing?.spending_note ?? '',
        thought_archive: data.thought_archive ?? existing?.thought_archive ?? '',
        today_lesson: data.today_lesson ?? existing?.today_lesson ?? '',
        today_resolution: data.today_resolution ?? existing?.today_resolution ?? '',
        current_period: data.current_period ?? existing?.current_period ?? '',
        today_prayer: data.today_prayer ?? existing?.today_prayer ?? '',
        created_at: existing?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set((state: DailyReflectionStoreState) => {
        state.reflections.set(date, optimistic);
      });

      try {
        const upsertData = {
          user_id: userId,
          date,
          praises: optimistic.praises,
          gratitudes: optimistic.gratitudes,
          reward: optimistic.reward,
          reflection: optimistic.reflection,
          spending_note: optimistic.spending_note,
          thought_archive: optimistic.thought_archive,
          today_lesson: optimistic.today_lesson,
          today_resolution: optimistic.today_resolution,
          current_period: optimistic.current_period,
          today_prayer: optimistic.today_prayer,
          updated_at: new Date().toISOString(),
        };

        const { data: result, error } = await fromReflections()
          .upsert(upsertData, { onConflict: 'user_id,date' })
          .select()
          .single();

        if (error) throw error;

        if (result) {
          set((state: DailyReflectionStoreState) => {
            state.reflections.set(date, {
              id: result.id,
              user_id: result.user_id,
              date: result.date,
              praises: result.praises || [],
              gratitudes: result.gratitudes || [],
              reward: result.reward || '',
              reflection: result.reflection || '',
              spending_note: result.spending_note || '',
              thought_archive: result.thought_archive || '',
              today_lesson: result.today_lesson || '',
              today_resolution: result.today_resolution || '',
              current_period: result.current_period || '',
              today_prayer: result.today_prayer || '',
              created_at: result.created_at,
              updated_at: result.updated_at,
            });
          });
        }
      } catch (error) {
        // 롤백
        if (existing) {
          set((state: DailyReflectionStoreState) => {
            state.reflections.set(date, existing);
          });
        } else {
          set((state: DailyReflectionStoreState) => {
            state.reflections.delete(date);
          });
        }
        console.error('❌ 리플렉션 저장 실패:', error);
      }
    },

    reset: () => {
      set((state: DailyReflectionStoreState) => {
        state.reflections = new Map();
        state.loading = false;
        state.error = null;
      });
    },
  }),
  {
    name: "daily-reflection-store",
    devtools: true,
    persist: {
      name: "daystep-daily-reflections",
      version: 1,
      blacklist: [
        "loading",
        "error",
        "reflections", // Map은 직렬화 오류 방지를 위해 persist하지 않음
      ],
    } as any,
  }
);

export default useDailyReflectionStore;
