import { create } from 'zustand';
import {
  fetchReviewChecklists,
  createChecklistItem,
  deleteChecklistItem,
  fetchChecklistStates,
  updateChecklistState,
  resetChecklist,
  resetChecklistBySection,
  type ReviewChecklistItem,
  type ReviewChecklistState,
} from '@/lib/supabase/review';

interface ReviewStore {
  // 체크리스트 항목 (비우기, 갱신하기)
  emptyChecklists: ReviewChecklistItem[];
  refreshChecklists: ReviewChecklistItem[];

  // 체크리스트 상태
  checklistStates: Map<string, ReviewChecklistState>;

  // 탭 상태 (갱신하기, 추가하기 섹션)
  refreshTab: 'next_actions' | 'weekly_calendar' | 'schedules' | 'projects' | 'waiting' | 'goals';
  addTab: 'someday' | 'inactive_projects';

  // 로딩 상태
  isLoading: boolean;

  // Actions
  fetchChecklists: (userId: string) => Promise<void>;
  fetchStates: (userId: string) => Promise<void>;
  toggleChecklistItem: (userId: string, itemId: string) => Promise<void>;
  addChecklistItem: (userId: string, section: 'empty' | 'refresh', label: string) => Promise<void>;
  removeChecklistItem: (userId: string, itemId: string) => Promise<void>;
  resetAllChecklists: (userId: string) => Promise<void>;
  resetSectionChecklists: (userId: string, section: 'empty' | 'refresh') => Promise<void>;
  setRefreshTab: (tab: ReviewStore['refreshTab']) => void;
  setAddTab: (tab: ReviewStore['addTab']) => void;
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  // Initial state
  emptyChecklists: [],
  refreshChecklists: [],
  checklistStates: new Map(),
  refreshTab: 'next_actions',
  addTab: 'someday',
  isLoading: false,

  // Fetch checklists
  fetchChecklists: async (userId: string) => {
    try {
      set({ isLoading: true });

      const [emptyItems, refreshItems] = await Promise.all([
        fetchReviewChecklists(userId, 'empty'),
        fetchReviewChecklists(userId, 'refresh'),
      ]);

      set({
        emptyChecklists: emptyItems,
        refreshChecklists: refreshItems,
      });
    } catch (error) {
      console.error('fetchChecklists failed:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch checklist states
  fetchStates: async (userId: string) => {
    try {
      const states = await fetchChecklistStates(userId);
      const stateMap = new Map<string, ReviewChecklistState>();

      states.forEach((state) => {
        stateMap.set(state.checklist_item_id, state);
      });

      set({ checklistStates: stateMap });
    } catch (error) {
      console.error('fetchStates failed:', error);
    }
  },

  // Toggle checklist item (check/uncheck)
  toggleChecklistItem: async (userId: string, itemId: string) => {
    try {
      const { checklistStates } = get();
      const currentState = checklistStates.get(itemId);
      const newIsChecked = !currentState?.is_checked;

      await updateChecklistState(userId, itemId, newIsChecked);

      // Optimistic update
      const updatedStates = new Map(checklistStates);
      updatedStates.set(itemId, {
        ...currentState,
        id: currentState?.id || '',
        user_id: userId,
        checklist_item_id: itemId,
        is_checked: newIsChecked,
        checked_at: newIsChecked ? new Date().toISOString() : null,
        reset_at: currentState?.reset_at || new Date().toISOString(),
        created_at: currentState?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      set({ checklistStates: updatedStates });
    } catch (error) {
      console.error('toggleChecklistItem failed:', error);
      // Revert on error
      await get().fetchStates(userId);
    }
  },

  // Add new checklist item (custom)
  addChecklistItem: async (userId: string, section: 'empty' | 'refresh', label: string) => {
    try {
      const newItem = await createChecklistItem(userId, section, label);

      if (section === 'empty') {
        set((state) => ({
          emptyChecklists: [...state.emptyChecklists, newItem],
        }));
      } else {
        set((state) => ({
          refreshChecklists: [...state.refreshChecklists, newItem],
        }));
      }
    } catch (error) {
      console.error('addChecklistItem failed:', error);
      throw error;
    }
  },

  // Remove checklist item (custom only)
  removeChecklistItem: async (userId: string, itemId: string) => {
    try {
      await deleteChecklistItem(userId, itemId);

      set((state) => ({
        emptyChecklists: state.emptyChecklists.filter((item) => item.id !== itemId),
        refreshChecklists: state.refreshChecklists.filter((item) => item.id !== itemId),
      }));
    } catch (error) {
      console.error('removeChecklistItem failed:', error);
      throw error;
    }
  },

  // Reset all checklists (uncheck all)
  resetAllChecklists: async (userId: string) => {
    try {
      await resetChecklist(userId);

      // Clear all states
      set({ checklistStates: new Map() });
    } catch (error) {
      console.error('resetAllChecklists failed:', error);
      throw error;
    }
  },

  // Reset checklists by section
  resetSectionChecklists: async (userId: string, section: 'empty' | 'refresh') => {
    try {
      const { checklistStates, emptyChecklists, refreshChecklists } = get();

      // 해당 섹션의 item ID들
      const sectionItems = section === 'empty' ? emptyChecklists : refreshChecklists;
      const sectionItemIds = new Set(sectionItems.map((item) => item.id));

      // DB 업데이트
      await resetChecklistBySection(userId, section);

      // Optimistic update: 해당 섹션의 상태만 초기화
      const updatedStates = new Map(checklistStates);
      sectionItemIds.forEach((itemId) => {
        const currentState = updatedStates.get(itemId);
        if (currentState) {
          updatedStates.set(itemId, {
            ...currentState,
            is_checked: false,
            checked_at: null,
            reset_at: new Date().toISOString(),
          });
        }
      });

      set({ checklistStates: updatedStates });
    } catch (error) {
      console.error('resetSectionChecklists failed:', error);
      throw error;
    }
  },

  // Set refresh tab
  setRefreshTab: (tab: ReviewStore['refreshTab']) => {
    set({ refreshTab: tab });
  },

  // Set add tab
  setAddTab: (tab: ReviewStore['addTab']) => {
    set({ addTab: tab });
  },
}));
