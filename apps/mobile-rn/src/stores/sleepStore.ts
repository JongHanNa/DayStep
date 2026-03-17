/**
 * Sleep Record Store (Zustand + MMKV)
 * 수면 기록 CRUD + 월간 통계 + 수면 세션 (정원 게이미피케이션)
 * 하루 다중 세션 지원 (v2)
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {format, startOfMonth, endOfMonth, differenceInMinutes, subDays, addDays} from 'date-fns';
import {shieldAllExceptAllowed, clearShield, scheduleAutoUnshield, getAuthorizationStatus} from '@/lib/screenTimeManager';

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
  session_outcome: 'completed' | 'abandoned';
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
  session_outcome?: 'completed' | 'abandoned';
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

export interface GardenSession {
  id: string;
  durationMinutes: number;
  outcome: 'completed' | 'abandoned';
  isHealthy: boolean;
}

export interface GardenDay {
  date: string; // yyyy-MM-dd
  status: GardenDayStatus;
  durationMinutes?: number;
  sessions: GardenSession[];
}

const DEFAULT_SESSION: SleepSessionState = {
  status: 'idle',
  startedAt: null,
  expectedWakeTime: null,
  goalDurationMinutes: 0,
};

interface SleepStoreState {
  records: Record<string, SleepRecord[]>; // key: date (yyyy-MM-dd), value: 세션 배열
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
  insertRecord: (input: SleepRecordInput) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  getMonthStats: (year: number, month: number) => MonthStats;
  getRecordsForDate: (date: string) => SleepRecord[];
  clearError: () => void;

  // Actions (수면 정원)
  setSleepGoalTime: (time: string) => void;
  setWakeGoalTime: (time: string) => void;
  setScreenTimeLinkEnabled: (v: boolean) => void;
  getGoalDurationMinutes: () => number;
  startSleepSession: () => Promise<void>;
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

/** 기존 단일 레코드 형식(Record<string, SleepRecord>)을 배열 형식으로 마이그레이션 */
function migrateRecordsToArray(records: any): Record<string, SleepRecord[]> {
  if (!records || typeof records !== 'object') return {};

  const result: Record<string, SleepRecord[]> = {};
  for (const [key, value] of Object.entries(records)) {
    if (Array.isArray(value)) {
      // 이미 배열 형식
      result[key] = value as SleepRecord[];
    } else if (value && typeof value === 'object' && 'id' in (value as any)) {
      // 단일 레코드 → 배열로 감싸기
      const record = value as SleepRecord;
      if (!record.session_outcome) {
        (record as any).session_outcome = 'completed';
      }
      result[key] = [record];
    }
  }
  return result;
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
            .order('date', {ascending: true})
            .order('created_at', {ascending: true});

          if (error) throw error;

          // 날짜별 배열로 그룹핑
          const newRecords = {...get().records};
          const grouped: Record<string, SleepRecord[]> = {};
          (data ?? []).forEach((r: SleepRecord) => {
            if (!grouped[r.date]) grouped[r.date] = [];
            grouped[r.date].push(r);
          });

          // 기존 records에 병합 (해당 월 날짜만 덮어쓰기)
          for (const [date, sessions] of Object.entries(grouped)) {
            newRecords[date] = sessions;
          }

          // 해당 월에 데이터가 없는 날짜는 빈 배열로 (기존 캐시 정리)
          const startStr = format(monthStart, 'yyyy-MM-dd');
          const endStr = format(monthEnd, 'yyyy-MM-dd');
          for (const date of Object.keys(newRecords)) {
            if (date >= startStr && date <= endStr && !grouped[date]) {
              delete newRecords[date];
            }
          }

          set({records: newRecords});
        } catch (err: any) {
          console.error('[SleepStore] fetchMonthRecords error:', err);
          set({error: err.message});
        } finally {
          set({isLoading: false});
        }
      },

      insertRecord: async (input) => {
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
            session_outcome: input.session_outcome ?? 'completed',
          };

          const {data, error} = await supabase
            .from('sleep_records')
            .insert(record)
            .select()
            .single();

          if (error) throw error;

          const newRecords = {...get().records};
          if (!newRecords[data.date]) newRecords[data.date] = [];
          newRecords[data.date] = [...newRecords[data.date], data];
          set({records: newRecords});
        } catch (err: any) {
          console.error('[SleepStore] insertRecord error:', err);
          set({error: err.message});
          throw err;
        } finally {
          set({isLoading: false});
        }
      },

      deleteRecord: async (id) => {
        set({isLoading: true, error: null});
        try {
          const {error} = await supabase
            .from('sleep_records')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // records에서 해당 id 제거
          const newRecords = {...get().records};
          for (const date of Object.keys(newRecords)) {
            const sessions = newRecords[date];
            const filtered = sessions.filter(r => r.id !== id);
            if (filtered.length === 0) {
              delete newRecords[date];
            } else if (filtered.length !== sessions.length) {
              newRecords[date] = filtered;
            }
          }
          set({records: newRecords});
        } catch (err: any) {
          console.error('[SleepStore] deleteRecord error:', err);
          set({error: err.message});
        } finally {
          set({isLoading: false});
        }
      },

      setSelectedDate: (date) => set({selectedDate: date}),

      getRecordsForDate: (date) => get().records[date] ?? [],

      getMonthStats: (year, month) => {
        const records = get().records;
        const monthStart = startOfMonth(new Date(year, month - 1));
        const monthEnd = endOfMonth(monthStart);
        const today = new Date();
        const lastDay = monthEnd > today ? today : monthEnd;
        const totalDays = lastDay.getDate() - monthStart.getDate() + 1;

        // 모든 세션을 플랫화
        const allSessions: SleepRecord[] = [];
        const datesWithRecords = new Set<string>();
        for (const [date, sessions] of Object.entries(records)) {
          const d = new Date(date);
          if (d >= monthStart && d <= monthEnd) {
            datesWithRecords.add(date);
            allSessions.push(...sessions);
          }
        }

        const recordedDays = datesWithRecords.size;
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

        // completed 세션만으로 평균 계산
        const completedSessions = allSessions.filter(r => r.session_outcome === 'completed');
        if (completedSessions.length === 0) {
          return {
            avgDuration: 0,
            avgSleepHour: 0,
            avgWakeHour: 0,
            recordRate: recordedDays / totalDays,
            totalDays,
            recordedDays,
          };
        }

        const totalDuration = completedSessions.reduce((s, r) => s + r.duration_minutes, 0);

        // 취침 시간 평균 (자정 넘김 처리: 0~6시는 +24로 계산)
        const sleepHours = completedSessions.map(r => {
          const h = new Date(r.sleep_time).getHours();
          const m = new Date(r.sleep_time).getMinutes();
          const hour = h + m / 60;
          return hour < 12 ? hour + 24 : hour; // 자정 이후는 +24
        });
        const avgSleepRaw = sleepHours.reduce((s, h) => s + h, 0) / completedSessions.length;
        const avgSleepHour = avgSleepRaw >= 24 ? avgSleepRaw - 24 : avgSleepRaw;

        const wakeHours = completedSessions.map(r => {
          const h = new Date(r.wake_time).getHours();
          const m = new Date(r.wake_time).getMinutes();
          return h + m / 60;
        });
        const avgWakeHour = wakeHours.reduce((s, h) => s + h, 0) / completedSessions.length;

        return {
          avgDuration: Math.round(totalDuration / completedSessions.length),
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

      startSleepSession: async () => {
        const {sleepGoalTime, wakeGoalTime, screenTimeLinkEnabled} = get();
        const goalDuration = calcGoalMinutes(sleepGoalTime, wakeGoalTime);
        const now = new Date();
        const expected = new Date(now.getTime() + goalDuration * 60 * 1000);

        // 스크린타임 연동 활성 시 shield 적용
        if (screenTimeLinkEnabled) {
          await shieldAllExceptAllowed();
          await scheduleAutoUnshield(expected);
        }

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
        const {sessionState, insertRecord} = get();
        if (sessionState.status !== 'running' || !sessionState.startedAt) return;

        // 스크린타임 차단 해제 (항상 호출 — 안전)
        await clearShield();

        const now = new Date();
        const startedAt = new Date(sessionState.startedAt);
        // 기상일 = 오늘 날짜 (기상 시점 기준 기록)
        const recordDate = format(now, 'yyyy-MM-dd');

        try {
          await insertRecord({
            date: recordDate,
            sleep_time: startedAt.toISOString(),
            wake_time: now.toISOString(),
            mood: 'good',
            session_outcome: 'completed',
          });
        } catch {
          // insertRecord 내부에서 에러 처리됨
        }

        set({sessionState: {...DEFAULT_SESSION}});
      },

      abandonSleepSession: async () => {
        const {sessionState, insertRecord} = get();
        if (sessionState.status !== 'running' || !sessionState.startedAt) return;

        // 스크린타임 차단 해제 (항상 호출 — 안전)
        await clearShield();

        const now = new Date();
        const startedAt = new Date(sessionState.startedAt);
        const recordDate = format(now, 'yyyy-MM-dd');

        try {
          await insertRecord({
            date: recordDate,
            sleep_time: startedAt.toISOString(),
            wake_time: now.toISOString(),
            mood: 'poor',
            session_outcome: 'abandoned',
          });
        } catch {
          // insertRecord 내부에서 에러 처리됨
        }

        set({sessionState: {...DEFAULT_SESSION}});
      },

      /** 앱 재시작 시 크래시 복구 */
      recoverSession: async () => {
        const {sessionState, screenTimeLinkEnabled, insertRecord} = get();
        if (sessionState.status !== 'running' || !sessionState.startedAt) return;

        const now = new Date();
        const startedAt = new Date(sessionState.startedAt);
        const expectedWake = sessionState.expectedWakeTime
          ? new Date(sessionState.expectedWakeTime)
          : null;
        const isPastWakeTime = expectedWake && now > expectedWake;

        // --- 스크린타임 연동 활성 시 강화된 복구 로직 ---
        if (screenTimeLinkEnabled) {
          const authStatus = await getAuthorizationStatus();
          const permissionRevoked = authStatus !== 'approved';

          if (permissionRevoked || !isPastWakeTime) {
            // 권한 해제 또는 기상시간 미경과 (= 앱 강제 종료) → 포기 처리
            await clearShield();
            // 권한 해제 시 screenTimeLinkEnabled도 리셋
            if (permissionRevoked) {
              set({screenTimeLinkEnabled: false});
            }
            const recordDate = format(now, 'yyyy-MM-dd');
            try {
              await insertRecord({
                date: recordDate,
                sleep_time: startedAt.toISOString(),
                wake_time: startedAt.toISOString(), // duration 0 → wilted 처리
                mood: 'poor',
                session_outcome: 'abandoned',
              });
            } catch {
              // 에러 시 세션은 리셋하되 기록은 무시
            }
            set({sessionState: {...DEFAULT_SESSION}});
            return;
          }

          // 기상시간 경과 + 권한 유지 → 정상 수면 성공
          await clearShield();
          const recordDate = format(expectedWake, 'yyyy-MM-dd');
          try {
            await insertRecord({
              date: recordDate,
              sleep_time: startedAt.toISOString(),
              wake_time: expectedWake.toISOString(),
              mood: 'good',
              session_outcome: 'completed',
            });
          } catch {
            // 에러 시 세션은 리셋하되 기록은 무시
          }
          set({sessionState: {...DEFAULT_SESSION}});
          return;
        }

        // --- 스크린타임 미연동: 기존 로직 유지 ---
        if (isPastWakeTime && expectedWake) {
          const recordDate = format(expectedWake, 'yyyy-MM-dd');
          try {
            await insertRecord({
              date: recordDate,
              sleep_time: startedAt.toISOString(),
              wake_time: expectedWake.toISOString(),
              mood: 'good',
              session_outcome: 'completed',
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
          const sessions = records[date] ?? [];

          const gardenSessions: GardenSession[] = sessions.map(r => ({
            id: r.id,
            durationMinutes: r.duration_minutes,
            outcome: r.session_outcome,
            isHealthy: r.session_outcome === 'completed' && r.duration_minutes >= threshold,
          }));

          // 하루 중 1개라도 healthy면 healthy
          const hasHealthy = gardenSessions.some(s => s.isHealthy);
          // 총 수면 시간 (completed 세션만)
          const totalDuration = sessions
            .filter(r => r.session_outcome === 'completed')
            .reduce((sum, r) => sum + r.duration_minutes, 0);

          if (date === today) {
            days.push({
              date,
              status: 'today',
              durationMinutes: totalDuration || undefined,
              sessions: gardenSessions,
            });
          } else if (sessions.length > 0) {
            days.push({
              date,
              status: hasHealthy ? 'healthy' : 'wilted',
              durationMinutes: totalDuration || undefined,
              sessions: gardenSessions,
            });
          } else {
            days.push({date, status: 'empty', sessions: []});
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
        // 하루에 1개 이상 healthy 세션이 있으면 성공일
        for (let i = 1; i <= 365; i++) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          const sessions = records[date] ?? [];
          const hasHealthy = sessions.some(
            r => r.session_outcome === 'completed' && r.duration_minutes >= threshold,
          );
          if (hasHealthy) {
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
          // 기존 단일 레코드 형식 → 배열 형식 마이그레이션
          state.records = migrateRecordsToArray(state.records);
        }
      },
    },
  ),
);
