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
  ENERGY_CONFIG,
  type EnergyLevel,
  type CleaningTab,
  type CleaningTask,
  type CleaningZone,
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
  completions: Record<string, CompletionRecord[]>; // key: date

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

  // Zone actions
  updateZoneDayOfWeek: (zoneId: string, dayOfWeek: number) => void;

  // Timer actions
  startTimer: (totalSeconds: number) => void;
  tickTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;

  // Computed helpers
  getTodayZone: () => CleaningZone | undefined;
  getFilteredTasks: () => CleaningTask[];
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
      completions: {},
      energyLevel: 'moderate',
      activeTab: 'space',
      focusTaskId: null,
      timerSeconds: 0,
      timerTotalSeconds: 0,
      isTimerRunning: false,

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

      getFilteredTasks: () => {
        const {tasks, energyLevel, zones} = get();
        const config = ENERGY_CONFIG[energyLevel];
        const dayOfWeek = new Date().getDay();
        const todayZone = zones.find(z => z.dayOfWeek === dayOfWeek);

        let filtered = tasks.filter(t => t.energyCost <= config.maxEnergyCost);

        // 공간 태스크: 오늘 구역 필터 (daily는 항상 포함)
        if (todayZone) {
          filtered = filtered.filter(
            t => t.tab !== 'space' || t.frequency === 'daily' || t.zoneId === todayZone.id,
          );
        }

        return filtered;
      },

      getStreak: () => calculateStreak(get().completions),

      getCategoryCompletionCount: (category, date) => {
        const d = date ?? getToday();
        const {tasks, completions, energyLevel} = get();
        const config = ENERGY_CONFIG[energyLevel];
        const categoryTasks = tasks.filter(
          t => t.category === category && t.energyCost <= config.maxEnergyCost,
        );
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
        completions: state.completions,
        energyLevel: state.energyLevel,
        activeTab: state.activeTab,
      }),
    },
  ),
);
