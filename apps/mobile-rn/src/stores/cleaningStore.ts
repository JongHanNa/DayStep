/**
 * Cleaning Store (Zustand + MMKV)
 * 청소/정리 태스크 관리, 완료 기록, 스트릭, 타이머
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {format} from 'date-fns';
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

interface CleaningStoreState {
  // Data
  tasks: CleaningTask[];
  zones: CleaningZone[];
  categorySchedules: CategorySchedule[];
  completions: Record<string, CompletionRecord[]>; // key: date
  customMaxTasks: Partial<Record<EnergyLevel, number | {daily: number; today: number}>>;
  _cleaningSettingsSyncedAt: string | null;

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
      partialize: (state) => ({
        tasks: state.tasks,
        zones: state.zones,
        categorySchedules: state.categorySchedules,
        completions: state.completions,
        customMaxTasks: state.customMaxTasks,
        energyLevel: state.energyLevel,
        activeTab: state.activeTab,
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
