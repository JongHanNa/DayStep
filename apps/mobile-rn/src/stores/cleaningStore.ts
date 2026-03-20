/**
 * Cleaning Store (Zustand + MMKV)
 * 청소/정리 태스크 관리, 완료 기록, 스트릭, 타이머, DB 세션 기록, 정원 데이터
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {format, subDays} from 'date-fns';
import {shieldForCleaning, clearCleaningShield} from '@/lib/screenTimeManager';
import {
  ALL_DEFAULT_TASKS,
  DEFAULT_ZONES,
  DEFAULT_DIGITAL_SCHEDULES,
  DEFAULT_BELONGINGS_SCHEDULES,
  type EnergyLevel,
  type CleaningTab,
  type CleaningTask,
  type CleaningZone,
  type CategorySchedule,
} from '@/constants/cleaning-data';

// ============================================
// Types
// ============================================

interface CompletionRecord {
  taskId: string;
  date: string; // yyyy-MM-dd
  completedAt: string; // ISO
}

/** DB cleaning_records 테이블 레코드 */
export interface CleaningRecord {
  id: string;
  user_id: string;
  date: string; // yyyy-MM-dd
  task_id: string;
  task_title: string;
  tab: CleaningTab;
  category: string;
  duration_seconds: number;
  session_outcome: 'completed' | 'abandoned' | 'skipped';
  energy_level: EnergyLevel;
  created_at: string;
  updated_at: string;
}

export interface CleaningRecordInput {
  date: string;
  task_id: string;
  task_title: string;
  tab: CleaningTab;
  category: string;
  duration_seconds: number;
  session_outcome: 'completed' | 'abandoned' | 'skipped';
  energy_level: EnergyLevel;
}

/** 정원 데이터 (RN → Native) */
export interface CleaningTreeInfo {
  taskId: string;
  durationSeconds: number;
  outcome: 'completed' | 'abandoned' | 'skipped';
  tab: CleaningTab;
}

export interface CleaningGardenDayInfo {
  date: string; // yyyy-MM-dd
  trees: CleaningTreeInfo[];
}

export interface CleaningGardenPayload {
  days: CleaningGardenDayInfo[];
}

/** 청소 세션 상태 */
export interface CleaningSessionState {
  isActive: boolean;
  taskId: string | null;
  startedAt: string | null; // ISO
}

const DEFAULT_SESSION: CleaningSessionState = {
  isActive: false,
  taskId: null,
  startedAt: null,
};

interface CleaningStoreState {
  // Data
  tasks: CleaningTask[];
  zones: CleaningZone[];
  categorySchedules: CategorySchedule[];
  completions: Record<string, CompletionRecord[]>; // key: date (MMKV legacy)
  customMaxTasks: Partial<Record<EnergyLevel, number | {daily: number; today: number}>>;
  _cleaningSettingsSyncedAt: string | null;

  // DB Records (cleaning_records)
  cleaningRecords: Record<string, CleaningRecord[]>; // key: date

  // Session
  cleaningSession: CleaningSessionState;
  screenTimeLinkEnabled: boolean;

  // Garden view state
  gardenViewMode: 'day' | 'week' | 'month' | 'year';
  gardenSelectedDate: string; // yyyy-MM-dd

  // UI State
  energyLevel: EnergyLevel;
  activeTab: CleaningTab;
  focusTaskId: string | null;

  // Timer
  timerSeconds: number;
  timerTotalSeconds: number;
  isTimerRunning: boolean;

  // Actions
  setEnergyLevel: (level: EnergyLevel) => void;
  setActiveTab: (tab: CleaningTab) => void;
  setFocusTask: (taskId: string | null) => void;

  // Task actions
  toggleTaskCompletion: (taskId: string) => void;
  isTaskCompleted: (taskId: string, date?: string) => boolean;
  addCustomTask: (task: CleaningTask) => void;
  removeCustomTask: (taskId: string) => void;

  // Custom settings actions
  setCustomMaxTasks: (level: EnergyLevel, maxTasks: number | {daily: number; today: number}) => void;
  loadCleaningSettingsFromDB: (settings: Record<string, any>) => void;

  // Zone actions
  updateZoneDayOfWeek: (zoneId: string, dayOfWeek: number) => void;

  // Category schedule actions
  updateCategoryScheduleDayOfWeek: (id: string, dayOfWeek: number) => void;

  // Timer actions
  startTimer: (totalSeconds: number) => void;
  tickTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;

  // Session actions
  startCleaningSession: (taskId: string) => void;
  completeCleaningSession: () => Promise<void>;
  abandonCleaningSession: () => Promise<void>;
  checkOrphanedSession: () => void;
  toggleScreenTimeLink: () => void;

  // DB CRUD actions
  insertCleaningRecord: (input: CleaningRecordInput) => Promise<void>;
  fetchCleaningRecords: (startDate: string, endDate: string) => Promise<void>;

  // Garden actions
  getGardenPayload: () => string;
  setGardenViewMode: (mode: 'day' | 'week' | 'month' | 'year') => void;
  setGardenSelectedDate: (date: string) => void;

  // Computed helpers
  getTodayZone: () => CleaningZone | undefined;
  getAllTasks: () => CleaningTask[];
  getFilteredTasks: () => CleaningTask[];
  getOrderedTasks: () => {dailyRoutine: CleaningTask[]; zoneFocus: CleaningTask[]; digitalTasks: CleaningTask[]; belongingsTasks: CleaningTask[]};
  getStreak: () => number;
  getCategoryCompletionCount: (category: string, date?: string) => {completed: number; total: number};
}

// ============================================
// Helpers
// ============================================

function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function calculateStreak(completions: Record<string, CompletionRecord[]>): number {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = format(d, 'yyyy-MM-dd');
    if (completions[key] && completions[key].length > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

// ============================================
// Store
// ============================================

export const useCleaningStore = create<CleaningStoreState>()(
  persist(
    (set, get) => ({
      tasks: ALL_DEFAULT_TASKS,
      zones: DEFAULT_ZONES,
      categorySchedules: [...DEFAULT_DIGITAL_SCHEDULES, ...DEFAULT_BELONGINGS_SCHEDULES],
      completions: {},
      customMaxTasks: {},
      _cleaningSettingsSyncedAt: null,
      cleaningRecords: {},
      cleaningSession: {...DEFAULT_SESSION},
      screenTimeLinkEnabled: false,
      gardenViewMode: 'day',
      gardenSelectedDate: getToday(),
      energyLevel: 'moderate',
      activeTab: 'space',
      focusTaskId: null,
      timerSeconds: 0,
      timerTotalSeconds: 0,
      isTimerRunning: false,

      setCustomMaxTasks: (level, maxTasks) => {
        const current = get().customMaxTasks;
        set({
          customMaxTasks: {...current, [level]: maxTasks},
          _cleaningSettingsSyncedAt: new Date().toISOString(),
        });
      },

      loadCleaningSettingsFromDB: (settings) => {
        set({
          customMaxTasks: settings.customMaxTasks ?? {},
          _cleaningSettingsSyncedAt: settings._lastSyncedAt ?? null,
        });
      },

      setEnergyLevel: (level) => {
        set({energyLevel: level, focusTaskId: null});
      },

      setActiveTab: (tab) => {
        set({activeTab: tab, focusTaskId: null});
      },

      setFocusTask: (taskId) => set({focusTaskId: taskId}),

      toggleTaskCompletion: (taskId) => {
        const today = getToday();
        const completions = {...get().completions};
        const todayCompletions = completions[today] ?? [];

        const existing = todayCompletions.findIndex(c => c.taskId === taskId);
        if (existing >= 0) {
          completions[today] = todayCompletions.filter(c => c.taskId !== taskId);
        } else {
          completions[today] = [
            ...todayCompletions,
            {taskId, date: today, completedAt: new Date().toISOString()},
          ];
        }
        set({completions});
      },

      isTaskCompleted: (taskId, date) => {
        const d = date ?? getToday();
        const dayCompletions = get().completions[d] ?? [];
        return dayCompletions.some(c => c.taskId === taskId);
      },

      addCustomTask: (task) => {
        set({tasks: [...get().tasks, task]});
      },

      removeCustomTask: (taskId) => {
        set({tasks: get().tasks.filter(t => t.id !== taskId)});
      },

      updateZoneDayOfWeek: (zoneId, dayOfWeek) => {
        const zones = get().zones.map(z =>
          z.id === zoneId ? {...z, dayOfWeek} : z,
        );
        set({zones});
      },

      updateCategoryScheduleDayOfWeek: (id, dayOfWeek) => {
        const categorySchedules = get().categorySchedules.map(cs =>
          cs.id === id ? {...cs, dayOfWeek} : cs,
        );
        set({categorySchedules});
      },

      startTimer: (totalSeconds) => {
        set({timerSeconds: totalSeconds, timerTotalSeconds: totalSeconds, isTimerRunning: true});
      },

      tickTimer: () => {
        const {timerSeconds, isTimerRunning} = get();
        if (isTimerRunning && timerSeconds > 0) {
          set({timerSeconds: timerSeconds - 1});
        } else if (timerSeconds <= 0) {
          set({isTimerRunning: false});
        }
      },

      pauseTimer: () => set({isTimerRunning: false}),
      resumeTimer: () => set({isTimerRunning: true}),
      resetTimer: () => set({timerSeconds: 0, timerTotalSeconds: 0, isTimerRunning: false}),

      // ============================================
      // Session Actions
      // ============================================

      startCleaningSession: (taskId) => {
        const {screenTimeLinkEnabled} = get();

        if (screenTimeLinkEnabled) {
          shieldForCleaning();
        }

        set({
          cleaningSession: {
            isActive: true,
            taskId,
            startedAt: new Date().toISOString(),
          },
        });
      },

      completeCleaningSession: async () => {
        const {cleaningSession, screenTimeLinkEnabled, tasks, energyLevel, activeTab} = get();
        if (!cleaningSession.isActive || !cleaningSession.taskId || !cleaningSession.startedAt) return;

        if (screenTimeLinkEnabled) {
          clearCleaningShield();
        }

        const now = new Date();
        const startedAt = new Date(cleaningSession.startedAt);
        const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);
        const task = tasks.find(t => t.id === cleaningSession.taskId);

        if (task) {
          try {
            await get().insertCleaningRecord({
              date: getToday(),
              task_id: task.id,
              task_title: task.title,
              tab: task.tab,
              category: task.category,
              duration_seconds: durationSeconds,
              session_outcome: 'completed',
              energy_level: energyLevel,
            });
          } catch {
            // insertCleaningRecord 내부에서 에러 처리됨
          }
        }

        set({cleaningSession: {...DEFAULT_SESSION}});
      },

      abandonCleaningSession: async () => {
        const {cleaningSession, screenTimeLinkEnabled, tasks, energyLevel} = get();
        if (!cleaningSession.isActive || !cleaningSession.taskId || !cleaningSession.startedAt) return;

        if (screenTimeLinkEnabled) {
          clearCleaningShield();
        }

        const now = new Date();
        const startedAt = new Date(cleaningSession.startedAt);
        const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);
        const task = tasks.find(t => t.id === cleaningSession.taskId);

        if (task) {
          try {
            await get().insertCleaningRecord({
              date: getToday(),
              task_id: task.id,
              task_title: task.title,
              tab: task.tab,
              category: task.category,
              duration_seconds: durationSeconds,
              session_outcome: 'abandoned',
              energy_level: energyLevel,
            });
          } catch {
            // insertCleaningRecord 내부에서 에러 처리됨
          }
        }

        set({cleaningSession: {...DEFAULT_SESSION}});
      },

      checkOrphanedSession: () => {
        const {cleaningSession, screenTimeLinkEnabled} = get();
        if (!cleaningSession.isActive) return;

        // 앱 재시작 시 미완료 세션 → 차단 해제 + abandon 처리
        if (screenTimeLinkEnabled) {
          clearCleaningShield();
        }

        // 세션 리셋 (DB insert 없이 — 기간 불명확)
        set({cleaningSession: {...DEFAULT_SESSION}});
      },

      toggleScreenTimeLink: () => {
        set({screenTimeLinkEnabled: !get().screenTimeLinkEnabled});
      },

      // ============================================
      // DB CRUD Actions
      // ============================================

      insertCleaningRecord: async (input) => {
        try {
          const {data: {user}} = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const record = {
            user_id: user.id,
            ...input,
          };

          const {data, error} = await supabase
            .from('cleaning_records')
            .insert(record)
            .select()
            .single();

          if (error) throw error;

          // 로컬 캐시 업데이트
          const cleaningRecords = {...get().cleaningRecords};
          if (!cleaningRecords[data.date]) cleaningRecords[data.date] = [];
          cleaningRecords[data.date] = [...cleaningRecords[data.date], data];
          set({cleaningRecords});
        } catch (err: any) {
          console.error('[CleaningStore] insertCleaningRecord error:', err);
          throw err;
        }
      },

      fetchCleaningRecords: async (startDate, endDate) => {
        try {
          const {data, error} = await supabase
            .from('cleaning_records')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', {ascending: true})
            .order('created_at', {ascending: true});

          if (error) throw error;

          // 날짜별 그룹핑
          const cleaningRecords = {...get().cleaningRecords};
          const grouped: Record<string, CleaningRecord[]> = {};
          (data ?? []).forEach((r: CleaningRecord) => {
            if (!grouped[r.date]) grouped[r.date] = [];
            grouped[r.date].push(r);
          });

          // 해당 범위 날짜 덮어쓰기
          for (const [date, records] of Object.entries(grouped)) {
            cleaningRecords[date] = records;
          }

          // 범위 내 데이터 없는 날짜 정리
          for (const date of Object.keys(cleaningRecords)) {
            if (date >= startDate && date <= endDate && !grouped[date]) {
              delete cleaningRecords[date];
            }
          }

          set({cleaningRecords});
        } catch (err: any) {
          console.error('[CleaningStore] fetchCleaningRecords error:', err);
        }
      },

      // ============================================
      // Garden Actions
      // ============================================

      getGardenPayload: () => {
        const {cleaningRecords} = get();
        const days: CleaningGardenDayInfo[] = [];

        // 최근 365일 (년 뷰 대응)
        for (let i = 364; i >= 0; i--) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          const records = cleaningRecords[date] ?? [];

          if (records.length > 0) {
            days.push({
              date,
              trees: records.map(r => ({
                taskId: r.task_id,
                durationSeconds: r.duration_seconds,
                outcome: r.session_outcome,
                tab: r.tab as CleaningTab,
              })),
            });
          }
        }

        const payload: CleaningGardenPayload = {days};
        return JSON.stringify(payload);
      },

      setGardenViewMode: (mode) => set({gardenViewMode: mode}),
      setGardenSelectedDate: (date) => set({gardenSelectedDate: date}),

      // ============================================
      // Computed Helpers
      // ============================================

      getTodayZone: () => {
        const dayOfWeek = new Date().getDay();
        return get().zones.find(z => z.dayOfWeek === dayOfWeek);
      },

      getAllTasks: () => {
        const {tasks, zones, categorySchedules} = get();
        const dayOfWeek = new Date().getDay();
        const todayZone = zones.find(z => z.dayOfWeek === dayOfWeek);

        return tasks.filter(t => {
          // space 탭: 기존 zone 로직
          if (t.tab === 'space') {
            if (t.frequency === 'daily') return true;
            if (todayZone && t.zoneId === todayZone.id) return true;
            return false;
          }
          // digital/belongings: 카테고리 스케줄 기준
          if (t.frequency === 'daily') return true;
          const schedule = categorySchedules.find(
            cs => cs.tab === t.tab && cs.category === t.category,
          );
          if (schedule && schedule.dayOfWeek === dayOfWeek) return true;
          return false;
        });
      },

      getFilteredTasks: () => {
        return get().getAllTasks(); // energyCost 필터 제거, daily/today 개수 제한으로 관리
      },

      getOrderedTasks: () => {
        const {tasks, zones, categorySchedules} = get();
        const dayOfWeek = new Date().getDay();
        const todayZone = zones.find(z => z.dayOfWeek === dayOfWeek);

        const dailyRoutine = tasks.filter(
          t => t.frequency === 'daily',
        );
        const zoneFocus = todayZone
          ? tasks.filter(
              t =>
                t.tab === 'space' &&
                t.frequency !== 'daily' &&
                t.zoneId === todayZone.id,
            )
          : [];

        const digitalTasks = tasks.filter(t => {
          if (t.tab !== 'digital') return false;
          if (t.frequency === 'daily') return false;
          const schedule = categorySchedules.find(
            cs => cs.tab === 'digital' && cs.category === t.category,
          );
          return schedule ? schedule.dayOfWeek === dayOfWeek : false;
        });
        const belongingsTasks = tasks.filter(t => {
          if (t.tab !== 'belongings') return false;
          if (t.frequency === 'daily') return false;
          const schedule = categorySchedules.find(
            cs => cs.tab === 'belongings' && cs.category === t.category,
          );
          return schedule ? schedule.dayOfWeek === dayOfWeek : false;
        });

        return {dailyRoutine, zoneFocus, digitalTasks, belongingsTasks};
      },

      getStreak: () => calculateStreak(get().completions),

      getCategoryCompletionCount: (category, date) => {
        const d = date ?? getToday();
        const {completions} = get();
        const allTasks = get().getAllTasks();
        const categoryTasks = allTasks.filter(t => t.category === category);
        const dayCompletions = completions[d] ?? [];
        const completed = categoryTasks.filter(t =>
          dayCompletions.some(c => c.taskId === t.id),
        ).length;
        return {completed, total: categoryTasks.length};
      },
    }),
    {
      name: 'cleaning-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      version: 4,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // 기존 저장 데이터에 subtasks가 없음 → 기본 태스크를 최신으로 교체
          const customTasks = (persistedState.tasks ?? []).filter(
            (t: any) => t.isCustom,
          );
          persistedState.tasks = [...ALL_DEFAULT_TASKS, ...customTasks];
        }
        if (version < 4) {
          // v4: energyCost 1 태스크에 subtasks 추가 반영
          const customTasks = (persistedState.tasks ?? []).filter(
            (t: any) => t.isCustom,
          );
          persistedState.tasks = [...ALL_DEFAULT_TASKS, ...customTasks];
        }
        if (version < 3) {
          // v3: 정원 + 세션 필드 추가
          persistedState.cleaningRecords = persistedState.cleaningRecords ?? {};
          persistedState.cleaningSession = persistedState.cleaningSession ?? {
            isActive: false,
            taskId: null,
            startedAt: null,
          };
          persistedState.screenTimeLinkEnabled = persistedState.screenTimeLinkEnabled ?? false;
          persistedState.gardenViewMode = persistedState.gardenViewMode ?? 'day';
          persistedState.gardenSelectedDate = persistedState.gardenSelectedDate ?? getToday();
        }
        return persistedState;
      },
      partialize: (state) => ({
        tasks: state.tasks,
        zones: state.zones,
        categorySchedules: state.categorySchedules,
        completions: state.completions,
        customMaxTasks: state.customMaxTasks,
        energyLevel: state.energyLevel,
        activeTab: state.activeTab,
        cleaningRecords: state.cleaningRecords,
        cleaningSession: state.cleaningSession,
        screenTimeLinkEnabled: state.screenTimeLinkEnabled,
        gardenViewMode: state.gardenViewMode,
        gardenSelectedDate: state.gardenSelectedDate,
      }),
    },
  ),
);

/** DB 동기화용 설정 스냅샷 */
export function getCleaningSettingsForSync() {
  const {customMaxTasks, _cleaningSettingsSyncedAt} =
    useCleaningStore.getState();
  return {customMaxTasks, _lastSyncedAt: _cleaningSettingsSyncedAt};
}
