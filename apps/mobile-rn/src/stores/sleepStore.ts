/**
 * Sleep Record Store (Zustand + MMKV)
 * 수면 기록 CRUD + 월간 통계
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {format, startOfMonth, endOfMonth, differenceInMinutes} from 'date-fns';

// ============================================
// Types
// ============================================

export type SleepMood = 'great' | 'good' | 'fair' | 'poor';

export interface SleepRecord {
  id: string;
  user_id: string;
  date: string; // yyyy-MM-dd
  sleep_time: string; // ISO timestamptz
  wake_time: string; // ISO timestamptz
  duration_minutes: number;
  mood: SleepMood | null;
  took_rx: boolean;
  took_supplement: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SleepRecordInput {
  date: string;
  sleep_time: string;
  wake_time: string;
  mood?: SleepMood | null;
  took_rx?: boolean;
  took_supplement?: boolean;
  note?: string | null;
}

interface MonthStats {
  avgDuration: number; // 분
  avgSleepHour: number; // 0-23 (취침 시간)
  avgWakeHour: number; // 0-23 (기상 시간)
  recordRate: number; // 0-1
  totalDays: number;
  recordedDays: number;
}

interface SleepStoreState {
  records: Record<string, SleepRecord>; // key: date (yyyy-MM-dd)
  selectedDate: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMonthRecords: (year: number, month: number) => Promise<void>;
  upsertRecord: (input: SleepRecordInput) => Promise<void>;
  deleteRecord: (date: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  getMonthStats: (year: number, month: number) => MonthStats;
  getRecordForDate: (date: string) => SleepRecord | undefined;
  clearError: () => void;
}

// ============================================
// Store
// ============================================

export const useSleepStore = create<SleepStoreState>()(
  persist(
    (set, get) => ({
      records: {},
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      isLoading: false,
      error: null,

      fetchMonthRecords: async (year, month) => {
        set({isLoading: true, error: null});
        try {
          const monthStart = startOfMonth(new Date(year, month - 1));
          const monthEnd = endOfMonth(monthStart);

          const {data, error} = await supabase
            .from('sleep_records')
            .select('*')
            .gte('date', format(monthStart, 'yyyy-MM-dd'))
            .lte('date', format(monthEnd, 'yyyy-MM-dd'))
            .order('date', {ascending: true});

          if (error) throw error;

          const newRecords = {...get().records};
          (data ?? []).forEach((r: SleepRecord) => {
            newRecords[r.date] = r;
          });
          set({records: newRecords});
        } catch (err: any) {
          console.error('[SleepStore] fetchMonthRecords error:', err);
          set({error: err.message});
        } finally {
          set({isLoading: false});
        }
      },

      upsertRecord: async (input) => {
        set({isLoading: true, error: null});
        try {
          const {
            data: {user},
          } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const sleepDate = new Date(input.sleep_time);
          const wakeDate = new Date(input.wake_time);
          const duration = differenceInMinutes(wakeDate, sleepDate);

          const record = {
            user_id: user.id,
            date: input.date,
            sleep_time: input.sleep_time,
            wake_time: input.wake_time,
            duration_minutes: duration,
            mood: input.mood ?? null,
            took_rx: input.took_rx ?? false,
            took_supplement: input.took_supplement ?? false,
            note: input.note ?? null,
          };

          const {data, error} = await supabase
            .from('sleep_records')
            .upsert(record, {onConflict: 'user_id,date'})
            .select()
            .single();

          if (error) throw error;

          const newRecords = {...get().records};
          newRecords[data.date] = data;
          set({records: newRecords});
        } catch (err: any) {
          console.error('[SleepStore] upsertRecord error:', err);
          set({error: err.message});
          throw err;
        } finally {
          set({isLoading: false});
        }
      },

      deleteRecord: async (date) => {
        set({isLoading: true, error: null});
        try {
          const record = get().records[date];
          if (!record) return;

          const {error} = await supabase
            .from('sleep_records')
            .delete()
            .eq('id', record.id);

          if (error) throw error;

          const newRecords = {...get().records};
          delete newRecords[date];
          set({records: newRecords});
        } catch (err: any) {
          console.error('[SleepStore] deleteRecord error:', err);
          set({error: err.message});
        } finally {
          set({isLoading: false});
        }
      },

      setSelectedDate: (date) => set({selectedDate: date}),

      getRecordForDate: (date) => get().records[date],

      getMonthStats: (year, month) => {
        const records = get().records;
        const monthStart = startOfMonth(new Date(year, month - 1));
        const monthEnd = endOfMonth(monthStart);
        const today = new Date();
        const lastDay = monthEnd > today ? today : monthEnd;
        const totalDays = lastDay.getDate() - monthStart.getDate() + 1;

        const monthRecords = Object.values(records).filter(r => {
          const d = new Date(r.date);
          return d >= monthStart && d <= monthEnd;
        });

        const recordedDays = monthRecords.length;
        if (recordedDays === 0) {
          return {
            avgDuration: 0,
            avgSleepHour: 0,
            avgWakeHour: 0,
            recordRate: 0,
            totalDays,
            recordedDays: 0,
          };
        }

        const totalDuration = monthRecords.reduce((s, r) => s + r.duration_minutes, 0);

        // 취침 시간 평균 (자정 넘김 처리: 0~6시는 +24로 계산)
        const sleepHours = monthRecords.map(r => {
          const h = new Date(r.sleep_time).getHours();
          const m = new Date(r.sleep_time).getMinutes();
          const hour = h + m / 60;
          return hour < 12 ? hour + 24 : hour; // 자정 이후는 +24
        });
        const avgSleepRaw = sleepHours.reduce((s, h) => s + h, 0) / recordedDays;
        const avgSleepHour = avgSleepRaw >= 24 ? avgSleepRaw - 24 : avgSleepRaw;

        const wakeHours = monthRecords.map(r => {
          const h = new Date(r.wake_time).getHours();
          const m = new Date(r.wake_time).getMinutes();
          return h + m / 60;
        });
        const avgWakeHour = wakeHours.reduce((s, h) => s + h, 0) / recordedDays;

        return {
          avgDuration: Math.round(totalDuration / recordedDays),
          avgSleepHour: Math.round(avgSleepHour * 10) / 10,
          avgWakeHour: Math.round(avgWakeHour * 10) / 10,
          recordRate: recordedDays / totalDays,
          totalDays,
          recordedDays,
        };
      },

      clearError: () => set({error: null}),
    }),
    {
      name: 'sleep-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        records: state.records,
        selectedDate: state.selectedDate,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.selectedDate = format(new Date(), 'yyyy-MM-dd');
        }
      },
    },
  ),
);
