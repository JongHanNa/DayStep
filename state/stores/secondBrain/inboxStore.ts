/**
 * Inbox Store - 수집함 관리
 * GTD 시스템의 Collect 단계
 */

import { createStore } from '@/state/utils/storeUtils';
import type {
  InboxItem,
  CreateInboxItemInput,
  UpdateInboxItemInput,
  GTDStatus,
} from '@/types/second-brain';
import { mockInboxItems, saveMockDataToLocalStorage } from '@/lib/mockData/secondBrain';

interface InboxStoreState {
  inboxItems: InboxItem[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchInboxItems: () => Promise<void>;
  fetchInboxItemsByStatus: (status: GTDStatus) => Promise<InboxItem[]>;
  createInboxItem: (data: CreateInboxItemInput) => Promise<InboxItem>;
  updateInboxItem: (id: string, data: UpdateInboxItemInput) => Promise<InboxItem>;
  deleteInboxItem: (id: string) => Promise<boolean>;
  clarifyInboxItem: (id: string, status: GTDStatus, clarifyData?: Partial<InboxItem>) => Promise<InboxItem>;
  completeInboxItem: (id: string) => Promise<InboxItem>;
  delegateInboxItem: (id: string, delegatedTo: string) => Promise<InboxItem>;
}

export const useInboxStore = createStore<InboxStoreState>(
  (set, get) => ({
    inboxItems: [],
    loading: false,
    error: null,

    fetchInboxItems: async () => {
      try {
        set({ loading: true, error: null });
        // Mock 데이터 로드 (삭제된 항목 제외)
        const inboxItems = mockInboxItems.filter((item) => item.status !== 'deleted');
        set({ inboxItems, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '수집함 항목을 불러오는데 실패했습니다.',
          loading: false,
        });
      }
    },

    fetchInboxItemsByStatus: async (status: GTDStatus) => {
      try {
        set({ loading: true, error: null });
        const filteredItems = get().inboxItems.filter((item) => item.status === status);
        set({ loading: false });
        return filteredItems;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '수집함 항목을 불러오는데 실패했습니다.',
          loading: false,
        });
        return [];
      }
    },

    createInboxItem: async (data: CreateInboxItemInput) => {
      try {
        set({ loading: true, error: null });

        const newInboxItem: InboxItem = {
          id: `inbox-${Date.now()}`,
          user_id: 'mock-user-123',
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedInboxItems = [...get().inboxItems, newInboxItem];
        set({ inboxItems: updatedInboxItems, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        return newInboxItem;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '수집함 항목 생성에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    updateInboxItem: async (id: string, data: UpdateInboxItemInput) => {
      try {
        set({ loading: true, error: null });

        const updatedInboxItems = get().inboxItems.map((item) =>
          item.id === id
            ? {
                ...item,
                ...data,
                updated_at: new Date().toISOString(),
              }
            : item
        );

        set({ inboxItems: updatedInboxItems, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const updatedItem = updatedInboxItems.find((i) => i.id === id);
        if (!updatedItem) throw new Error('수집함 항목을 찾을 수 없습니다.');

        return updatedItem;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '수집함 항목 수정에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    deleteInboxItem: async (id: string) => {
      try {
        set({ loading: true, error: null });

        const updatedInboxItems = get().inboxItems.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'deleted' as const,
                updated_at: new Date().toISOString(),
              }
            : item
        );

        set({ inboxItems: updatedInboxItems.filter((item) => item.status !== 'deleted'), loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        return true;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '수집함 항목 삭제에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    clarifyInboxItem: async (id: string, status: GTDStatus, clarifyData?: Partial<InboxItem>) => {
      try {
        set({ loading: true, error: null });

        const updatedInboxItems = get().inboxItems.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                ...clarifyData,
                clarified_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : item
        );

        set({ inboxItems: updatedInboxItems, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const clarifiedItem = updatedInboxItems.find((i) => i.id === id);
        if (!clarifiedItem) throw new Error('수집함 항목을 찾을 수 없습니다.');

        return clarifiedItem;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '명료화 처리에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    completeInboxItem: async (id: string) => {
      try {
        set({ loading: true, error: null });

        const updatedInboxItems = get().inboxItems.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'completed' as const,
                updated_at: new Date().toISOString(),
              }
            : item
        );

        set({ inboxItems: updatedInboxItems, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const completedItem = updatedInboxItems.find((i) => i.id === id);
        if (!completedItem) throw new Error('수집함 항목을 찾을 수 없습니다.');

        return completedItem;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '완료 처리에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    delegateInboxItem: async (id: string, delegatedTo: string) => {
      try {
        set({ loading: true, error: null });

        const updatedInboxItems = get().inboxItems.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'waiting' as const,
                delegated_to: delegatedTo,
                delegated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : item
        );

        set({ inboxItems: updatedInboxItems, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const delegatedItem = updatedInboxItems.find((i) => i.id === id);
        if (!delegatedItem) throw new Error('수집함 항목을 찾을 수 없습니다.');

        return delegatedItem;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '위임 처리에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },
  }),
  {
    name: 'inbox-store',
    persist: {
      name: 'daystep-inbox',
      version: 1,
    },
  }
);
