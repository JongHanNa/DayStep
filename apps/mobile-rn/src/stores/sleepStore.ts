/**
 * Sleep Record Store (Zustand + MMKV)
 * 수면 기록 CRUD + 월간 통계 + 수면 세션 (정원 게이미피케이션)
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {format, startOfMonth, endOfMonth, differenceInMinutes, subDays, addDays} from 'date-fns';

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

// --- 수면 세션 & 정원 타입 ---

export type SleepSessionStatus = 'idle' | 'running' | 'completed';

export interface SleepSessionState {
  status: SleepSessionStatus;
  startedAt: string | null; // ISO timestamp
  expectedWakeTime: string | null; // ISO timestamp
  goalDurationMinutes: number;
}

export type GardenDayStatus = 'healthy' | 'wilted' | 'empty' | 'today';

export interface GardenDay {
  date: string; // yyyy-MM-dd
  status: GardenDayStatus;
  durationMinutes?: number;
}

const DEFAULT_SESSION: SleepSessionState = {
  status: 'idle',
  startedAt: null,
  expectedWakeTime: null,
  goalDurationMinutes: 0,
};

interface SleepStoreState {
  records: Record<string, SleepRecord>; // key: date (yyyy-MM-dd)
  selectedDate: string;
  isLoading: boolean;
  error: string | null;

  // 수면 정원 설정
  sleepGoalTime: string; // HH:mm (기본 23:30)
  wakeGoalTime: string; // HH:mm (기본 07:00)
  screenTimeLinkEnabled: boolean;
  sessionState: SleepSessionState;

  // Actions (기존)
  fetchMonthRecords: (year: number, month: number) => Promise<void>;
  upsertRecord: (input: SleepRecordInput) => Promise<void>;
  deleteRecord: (date: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  getMonthStats: (year: number, month: number) => MonthStats;
  getRecordForDate: (date: string) => SleepRecord | undefined;
  clearError: () => void;

  // Actions (수면 정원)
  setSleepGoalTime: (time: string) => void;
  setWakeGoalTime: (time: string) => void;
  setScreenTimeLinkEnabled: (v: boolean) => void;
  getGoalDurationMinutes: () => number;
  startSleepSession: () => void;
  completeSleepSession: () => Promise<void>;
  abandonSleepSession: () => Promise<void>;
  recoverSession: () => Promise<void>;
  getGardenData: () => GardenDay[];
  getStreak: () => number;
}

// ============================================
// Helpers
// ============================================

/** 취침~기상 목표 시간 계산 (자정 넘김 핸들링) */
function calcGoalMinutes(sleepTime: string, wakeTime: string): number {
  const [sh, sm] = sleepTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let sleepMins = sh * 60 + sm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= sleepMins) wakeMins += 24 * 60; // 자정 넘김
  return wakeMins - sleepMins;
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

      // 수면 정원 기본값
      sleepGoalTime: '23:30',
      wakeGoalTime: '07:00',
      screenTimeLinkEnabled: false,
      sessionState: {...DEFAULT_SESSION},

      // ============================================
      // 기존 Actions
      // ============================================

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

      // ============================================
      // 수면 정원 Actions
      // ============================================

      setSleepGoalTime: (time) => set({sleepGoalTime: time}),
      setWakeGoalTime: (time) => set({wakeGoalTime: time}),
      setScreenTimeLinkEnabled: (v) => set({screenTimeLinkEnabled: v}),

      getGoalDurationMinutes: () => {
        const {sleepGoalTime, wakeGoalTime} = get();
        return calcGoalMinutes(sleepGoalTime, wakeGoalTime);
      },

      startSleepSession: () => {
        const {sleepGoalTime, wakeGoalTime} = get();
        const goalDuration = calcGoalMinutes(sleepGoalTime, wakeGoalTime);
        const now = new Date();
        const expected = new Date(now.getTime() + goalDuration * 60 * 1000);

        set({
          sessionState: {
            status: 'running',
            startedAt: now.toISOString(),
            expectedWakeTime: expected.toISOString(),
            goalDurationMinutes: goalDuration,
          },
        });
      },

      completeSleepSession: async () => {
        const {sessionState, upsertRecord} = get();
        if (sessionState.status !== 'running' || !sessionState.startedAt) return;

        const now = new Date();
        const startedAt = new Date(sessionState.startedAt);
        // 기상일 = 오늘 날짜 (기상 시점 기준 기록)
        const recordDate = format(now, 'yyyy-MM-dd');

        try {
          await upsertRecord({
            date: recordDate,
            sleep_time: startedAt.toISOString(),
            wake_time: now.toISOString(),
            mood: 'good',
          });
        } catch {
          // upsertRecord 내부에서 에러 처리됨
        }

        set({sessionState: {...DEFAULT_SESSION}});
      },

      abandonSleepSession: async () => {
        const {sessionState, upsertRecord} = get();
        if (sessionState.status !== 'running' || !sessionState.startedAt) return;

        const now = new Date();
        const startedAt = new Date(sessionState.startedAt);
        const recordDate = format(now, 'yyyy-MM-dd');

        try {
          await upsertRecord({
            date: recordDate,
            sleep_time: startedAt.toISOString(),
            wake_time: now.toISOString(),
            mood: 'poor',
          });
        } catch {
          // upsertRecord 내부에서 에러 처리됨
        }

        set({sessionState: {...DEFAULT_SESSION}});
      },

      /** 앱 재시작 시 크래시 복구 */
      recoverSession: async () => {
        const {sessionState, upsertRecord} = get();
        if (sessionState.status !== 'running' || !sessionState.startedAt) return;

        const now = new Date();
        const expectedWake = sessionState.expectedWakeTime
          ? new Date(sessionState.expectedWakeTime)
          : null;

        // 예상 기상 시간이 지났으면 자동 완료
        if (expectedWake && now > expectedWake) {
          const startedAt = new Date(sessionState.startedAt);
          const recordDate = format(expectedWake, 'yyyy-MM-dd');

          try {
            await upsertRecord({
              date: recordDate,
              sleep_time: startedAt.toISOString(),
              wake_time: expectedWake.toISOString(),
              mood: 'good',
            });
          } catch {
            // 에러 시 세션은 리셋하되 기록은 무시
          }

          set({sessionState: {...DEFAULT_SESSION}});
        }
        // 아직 진행 중이면 세션 유지 (SleepSessionScreen으로 복귀)
      },

      getGardenData: () => {
        const {records, sleepGoalTime, wakeGoalTime} = get();
        const goalMinutes = calcGoalMinutes(sleepGoalTime, wakeGoalTime);
        const threshold = goalMinutes * 0.8; // 80% 달성 기준
        const today = format(new Date(), 'yyyy-MM-dd');
        const days: GardenDay[] = [];

        for (let i = 29; i >= 0; i--) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          const record = records[date];

          if (date === today) {
            days.push({
              date,
              status: 'today',
              durationMinutes: record?.duration_minutes,
            });
          } else if (record) {
            days.push({
              date,
              status: record.duration_minutes >= threshold ? 'healthy' : 'wilted',
              durationMinutes: record.duration_minutes,
            });
          } else {
            days.push({date, status: 'empty'});
          }
        }

        return days;
      },

      getStreak: () => {
        const {records, sleepGoalTime, wakeGoalTime} = get();
        const goalMinutes = calcGoalMinutes(sleepGoalTime, wakeGoalTime);
        const threshold = goalMinutes * 0.8;
        let streak = 0;

        // 어제부터 역순으로 연속 성공일 카운트
        for (let i = 1; i <= 365; i++) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          const record = records[date];
          if (record && record.duration_minutes >= threshold) {
            streak++;
          } else {
            break;
          }
        }

        return streak;
      },
    }),
    {
      name: 'sleep-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        records: state.records,
        selectedDate: state.selectedDate,
        sleepGoalTime: state.sleepGoalTime,
        wakeGoalTime: state.wakeGoalTime,
        screenTimeLinkEnabled: state.screenTimeLinkEnabled,
        sessionState: state.sessionState,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.selectedDate = format(new Date(), 'yyyy-MM-dd');
        }
      },
    },
  ),
);
