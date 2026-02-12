/**
 * Daily Reflection Store (Zustand + MMKV)
 * 하루 회고: 보상/칭찬/감사 CRUD
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';

interface DayReflection {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  praises: string[];
  gratitudes: string[];
  reward: string;
  reflection: string;
  spending_note: string;
  thought_archive: string;
  created_at: string;
  updated_at: string;
}

interface ReflectionState {
  reflections: Record<string, DayReflection>; // date -> reflection
  loading: boolean;
  error: string | null;

  loadReflection: (userId: string, date: string) => Promise<void>;
  upsertReflection: (
    userId: string,
    date: string,
    data: Partial<Omit<DayReflection, 'id' | 'user_id' | 'date' | 'created_at' | 'updated_at'>>,
  ) => Promise<boolean>;
  getReflection: (date: string) => DayReflection | null;
  clearError: () => void;
}

export const useReflectionStore = create<ReflectionState>()(
  persist(
    (set, get) => ({
      reflections: {},
      loading: false,
      error: null,

      loadReflection: async (userId: string, date: string) => {
        try {
          set({loading: true, error: null});

          const {data, error} = await supabase
            .from('daily_reflections')
            .select('*')
            .eq('user_id', userId)
            .eq('date', date)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            set(state => ({
              reflections: {...state.reflections, [date]: data},
            }));
          }
        } catch (err: any) {
          console.error('[ReflectionStore] Load error:', err);
          set({error: err.message ?? 'Failed to load reflection'});
        } finally {
          set({loading: false});
        }
      },

      upsertReflection: async (userId, date, data) => {
        const existing = get().reflections[date];

        // Optimistic update
        const optimistic = {
          ...(existing ?? {
            id: `temp_${Date.now()}`,
            user_id: userId,
            date,
            praises: [],
            gratitudes: [],
            reward: '',
            reflection: '',
            spending_note: '',
            thought_archive: '',
            created_at: new Date().toISOString(),
          }),
          ...data,
          updated_at: new Date().toISOString(),
        } as DayReflection;

        set(state => ({
          reflections: {...state.reflections, [date]: optimistic},
        }));

        try {
          const {data: result, error} = await supabase
            .from('daily_reflections')
            .upsert(
              {
                user_id: userId,
                date,
                ...data,
                updated_at: new Date().toISOString(),
              },
              {onConflict: 'user_id,date'},
            )
            .select()
            .single();

          if (error) throw error;

          set(state => ({
            reflections: {...state.reflections, [date]: result},
          }));

          return true;
        } catch (err: any) {
          // 롤백
          if (existing) {
            set(state => ({
              reflections: {...state.reflections, [date]: existing},
            }));
          } else {
            set(state => {
              const {[date]: _, ...rest} = state.reflections;
              return {reflections: rest};
            });
          }
          console.error('[ReflectionStore] Upsert error:', err);
          set({error: err.message ?? 'Failed to save reflection'});
          return false;
        }
      },

      getReflection: (date: string) => {
        return get().reflections[date] ?? null;
      },

      clearError: () => set({error: null}),
    }),
    {
      name: 'reflection-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        reflections: state.reflections,
      }),
    },
  ),
);
