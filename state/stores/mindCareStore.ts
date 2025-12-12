import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { MindCareService } from '@/services/mind-care.service';
import type {
  MindCareEntry,
  MindCareEntryInput,
  MindCareEntryUpdate,
  MindCareEntryType,
  MindCareSettings,
  MindCarePrompt,
  MindCareStats,
  ComfortReminder,
} from '@/types/mind-care';
import { format } from 'date-fns';

// ============================================
// 상태 인터페이스
// ============================================

interface MindCareState {
  // 데이터
  entries: MindCareEntry[];
  isLoadingEntries: boolean;

  stats: MindCareStats | null;
  isLoadingStats: boolean;

  settings: MindCareSettings | null;

  // 현재 탭
  currentTab: MindCareEntryType | 'timer';

  // 성찰 질문
  currentPrompt: MindCarePrompt | null;

  // 위로 리마인더
  comfortReminder: ComfortReminder | null;
  showComfortReminderBanner: boolean;

  // 기록 추가/편집 모달
  showAddEntryModal: boolean;
  editingEntry: MindCareEntry | null;
  defaultEntryType: MindCareEntryType;

  // 기록 상세 시트
  showEntryDetailSheet: boolean;
  selectedEntry: MindCareEntry | null;

  // Actions - 데이터
  loadEntries: (userId: string, entryType?: MindCareEntryType) => Promise<void>;
  addEntry: (userId: string, input: MindCareEntryInput) => Promise<MindCareEntry | null>;
  updateEntry: (entryId: string, userId: string, updates: MindCareEntryUpdate) => Promise<boolean>;
  deleteEntry: (entryId: string, userId: string) => Promise<boolean>;
  toggleFavorite: (entry: MindCareEntry, userId: string) => Promise<void>;
  togglePinned: (entry: MindCareEntry, userId: string) => Promise<void>;

  loadStats: (userId: string) => Promise<void>;
  loadSettings: (userId: string) => Promise<void>;
  updateSettings: (userId: string, updates: Partial<MindCareSettings>) => Promise<void>;

  // Actions - 성찰 질문
  loadRandomPrompt: (entryType: MindCareEntryType) => Promise<void>;

  // Actions - 위로 리마인더
  loadComfortReminder: (userId: string) => Promise<void>;
  dismissComfortReminder: () => void;
  markReminderShown: (userId: string) => Promise<void>;

  // Actions - 탭
  setCurrentTab: (tab: MindCareEntryType | 'timer') => void;

  // Actions - 모달
  openAddEntryModal: (entryType?: MindCareEntryType, entry?: MindCareEntry) => void;
  closeAddEntryModal: () => void;

  openEntryDetailSheet: (entry: MindCareEntry) => void;
  closeEntryDetailSheet: () => void;

  reset: () => void;
}

// ============================================
// 기본 상태
// ============================================

const initialState = {
  entries: [],
  isLoadingEntries: false,

  stats: null,
  isLoadingStats: false,

  settings: null,

  currentTab: 'reflection' as MindCareEntryType | 'timer',

  currentPrompt: null,

  comfortReminder: null,
  showComfortReminderBanner: false,

  showAddEntryModal: false,
  editingEntry: null,
  defaultEntryType: 'reflection' as MindCareEntryType,

  showEntryDetailSheet: false,
  selectedEntry: null,
};

// ============================================
// 스토어 생성
// ============================================

export const useMindCareStore = create<MindCareState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ============================================
      // 데이터 로드
      // ============================================

      loadEntries: async (userId: string, entryType?: MindCareEntryType) => {
        set({ isLoadingEntries: true });
        try {
          const entries = await MindCareService.getEntries(userId, { entryType });
          set({ entries, isLoadingEntries: false });
        } catch (error) {
          console.error('❌ 마음 기록 로드 오류:', error);
          set({ isLoadingEntries: false });
        }
      },

      addEntry: async (userId: string, input: MindCareEntryInput) => {
        // Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const tempEntry: MindCareEntry = {
          id: tempId,
          user_id: userId,
          entry_type: input.entry_type || 'reflection', // 통합 폼: 기본값 'reflection'
          content: input.content,
          entry_date: input.entry_date,
          source_text: input.source_text || null,
          source_reference: input.source_reference || null,
          insight: input.insight || null,
          experience: input.experience || null,
          commitment: input.commitment || null,
          mood_rating: input.mood_rating || null,
          tags: input.tags || null,
          is_favorite: input.is_favorite || false,
          is_pinned: false,
          reminder_enabled: input.reminder_enabled || false,
          last_reminded_at: null,
          reminder_count: 0,
          project_id: input.project_id || null,  // 배움→과제 플로우
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          entries: [tempEntry, ...state.entries],
        }));

        try {
          const newEntry = await MindCareService.addEntry(userId, input);
          if (newEntry) {
            // 임시 항목을 실제 항목으로 교체
            set((state) => ({
              entries: state.entries.map((e) =>
                e.id === tempId ? newEntry : e
              ),
            }));
            // 통계 업데이트
            get().loadStats(userId);
            return newEntry;
          }
        } catch (error) {
          console.error('❌ 마음 기록 추가 오류:', error);
          // 롤백
          set((state) => ({
            entries: state.entries.filter((e) => e.id !== tempId),
          }));
        }
        return null;
      },

      updateEntry: async (entryId: string, userId: string, updates: MindCareEntryUpdate) => {
        const previousEntries = get().entries;

        // Optimistic Update
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId ? { ...e, ...updates, updated_at: new Date().toISOString() } : e
          ),
        }));

        try {
          const success = await MindCareService.updateEntry(entryId, userId, updates);
          if (!success) {
            set({ entries: previousEntries });
          }
          return success;
        } catch (error) {
          console.error('❌ 마음 기록 수정 오류:', error);
          set({ entries: previousEntries });
          return false;
        }
      },

      deleteEntry: async (entryId: string, userId: string) => {
        const previousEntries = get().entries;

        // Optimistic Update
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== entryId),
        }));

        try {
          const success = await MindCareService.deleteEntry(entryId, userId);
          if (!success) {
            set({ entries: previousEntries });
          } else {
            get().loadStats(userId);
          }
          return success;
        } catch (error) {
          console.error('❌ 마음 기록 삭제 오류:', error);
          set({ entries: previousEntries });
          return false;
        }
      },

      toggleFavorite: async (entry: MindCareEntry, userId: string) => {
        const previousEntries = get().entries;
        const newValue = !entry.is_favorite;

        // Optimistic Update
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entry.id ? { ...e, is_favorite: newValue } : e
          ),
        }));

        try {
          const success = await MindCareService.toggleFavorite(entry.id, userId, entry.is_favorite);
          if (!success) {
            set({ entries: previousEntries });
          }
        } catch (error) {
          console.error('❌ 즐겨찾기 토글 오류:', error);
          set({ entries: previousEntries });
        }
      },

      togglePinned: async (entry: MindCareEntry, userId: string) => {
        const previousEntries = get().entries;
        const newValue = !entry.is_pinned;

        // Optimistic Update
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entry.id ? { ...e, is_pinned: newValue } : e
          ),
        }));

        try {
          const success = await MindCareService.togglePinned(entry.id, userId, entry.is_pinned);
          if (!success) {
            set({ entries: previousEntries });
          }
        } catch (error) {
          console.error('❌ 고정 토글 오류:', error);
          set({ entries: previousEntries });
        }
      },

      loadStats: async (userId: string) => {
        set({ isLoadingStats: true });
        try {
          const stats = await MindCareService.getStats(userId);
          set({ stats, isLoadingStats: false });
        } catch (error) {
          console.error('❌ 통계 로드 오류:', error);
          set({ isLoadingStats: false });
        }
      },

      loadSettings: async (userId: string) => {
        try {
          const settings = await MindCareService.getSettings(userId);
          set({ settings });
        } catch (error) {
          console.error('❌ 설정 로드 오류:', error);
        }
      },

      updateSettings: async (userId: string, updates: Partial<MindCareSettings>) => {
        const previousSettings = get().settings;

        // Optimistic Update
        if (previousSettings) {
          set({ settings: { ...previousSettings, ...updates } as MindCareSettings });
        }

        try {
          await MindCareService.updateSettings(userId, updates);
        } catch (error) {
          console.error('❌ 설정 업데이트 오류:', error);
          set({ settings: previousSettings });
        }
      },

      // ============================================
      // 성찰 질문
      // ============================================

      loadRandomPrompt: async (entryType: MindCareEntryType) => {
        try {
          const prompt = await MindCareService.getRandomPrompt(entryType);
          set({ currentPrompt: prompt });
        } catch (error) {
          console.error('❌ 성찰 질문 로드 오류:', error);
        }
      },

      // ============================================
      // 위로 리마인더
      // ============================================

      loadComfortReminder: async (userId: string) => {
        try {
          const reminder = await MindCareService.getComfortReminder(userId);
          if (reminder) {
            set({ comfortReminder: reminder, showComfortReminderBanner: true });
          }
        } catch (error) {
          console.error('❌ 위로 리마인더 로드 오류:', error);
        }
      },

      dismissComfortReminder: () => {
        set({ showComfortReminderBanner: false });
      },

      markReminderShown: async (userId: string) => {
        const { comfortReminder } = get();
        if (comfortReminder) {
          await MindCareService.markReminderShown(comfortReminder.entry.id, userId);
        }
      },

      // ============================================
      // 탭
      // ============================================

      setCurrentTab: (tab: MindCareEntryType | 'timer') => {
        set({ currentTab: tab });
        // 탭 전환 시 해당 유형의 질문 로드
        if (tab !== 'timer') {
          get().loadRandomPrompt(tab);
        }
      },

      // ============================================
      // 모달 Actions
      // ============================================

      openAddEntryModal: (entryType?: MindCareEntryType, entry?: MindCareEntry) => {
        set({
          showAddEntryModal: true,
          editingEntry: entry || null,
          defaultEntryType: entryType || entry?.entry_type || 'reflection',
        });
      },

      closeAddEntryModal: () => {
        set({
          showAddEntryModal: false,
          editingEntry: null,
        });
      },

      openEntryDetailSheet: (entry: MindCareEntry) => {
        set({
          showEntryDetailSheet: true,
          selectedEntry: entry,
        });
      },

      closeEntryDetailSheet: () => {
        set({
          showEntryDetailSheet: false,
          selectedEntry: null,
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    { name: 'mind-care-store' }
  )
);
