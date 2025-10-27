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
import { mockInboxItems } from '@/lib/mockData/secondBrain';

interface InboxStoreState {
  inboxItems: InboxItem[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchInboxItems: () => Promise<void>;
  fetchInboxItemsByStatus: (status: GTDStatus) => Promise<InboxItem[]>;
  fetchInboxItemsByType: (type: 'todo' | 'note' | 'project' | 'goal') => Promise<InboxItem[]>;
  createInboxItem: (data: CreateInboxItemInput) => Promise<InboxItem>;
  updateInboxItem: (id: string, data: UpdateInboxItemInput) => Promise<InboxItem>;
  deleteInboxItem: (id: string) => Promise<boolean>;
  clarifyInboxItem: (id: string, status: GTDStatus, clarifyData?: Partial<InboxItem>) => Promise<InboxItem>;
  completeInboxItem: (id: string) => Promise<InboxItem>;
  delegateInboxItem: (id: string, delegatedTo: string) => Promise<InboxItem>;
  convertTodoToProject: (todoId: string, projectTitle?: string) => Promise<{ deletedTodoId: string; newProjectId: string }>;
}

export const useInboxStore = createStore<InboxStoreState>(
  (set, get) => ({
    inboxItems: [],
    loading: false,
    error: null,

    fetchInboxItems: async () => {
      try {
        set({ loading: true, error: null });

        // ✅ Zustand persist에서 복원된 데이터가 있으면 그대로 사용
        // 사용자가 편집한 데이터를 보존하기 위함
        const currentItems = get().inboxItems;
        if (currentItems && currentItems.length > 0) {
          set({ loading: false });
          return;
        }

        // ✅ persist 데이터가 없을 때만 mock 데이터 로드 (최초 실행)
        const inboxItems = mockInboxItems.filter((item: InboxItem) => item.status !== 'deleted');
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
        const filteredItems = get().inboxItems.filter((item: InboxItem) => item.status === status);
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

    fetchInboxItemsByType: async (type: 'todo' | 'note' | 'project' | 'goal') => {
      try {
        set({ loading: true, error: null });
        const filteredItems = get().inboxItems.filter((item: InboxItem) => {
          // item_type 일치 AND status='inbox'인 항목만 반환
          // status가 'waiting', 'scheduled', 'next_action' 등으로 변경되면 수집함에서 제거됨
          return item.item_type === type && item.status === 'inbox';
        });
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

        // ✅ Zustand persist가 자동으로 저장하므로 saveMockDataToLocalStorage() 제거

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

        const updatedInboxItems = get().inboxItems.map((item: InboxItem) =>
          item.id === id
            ? {
                ...item,
                ...data,
                updated_at: new Date().toISOString(),
              }
            : item
        );

        const updatedItem = updatedInboxItems.find((i: InboxItem) => i.id === id);

        set({ inboxItems: updatedInboxItems, loading: false });

        // ✅ Zustand persist가 자동으로 저장하므로 saveMockDataToLocalStorage() 제거

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

        const updatedInboxItems = get().inboxItems.map((item: InboxItem) =>
          item.id === id
            ? {
                ...item,
                status: 'deleted' as const,
                updated_at: new Date().toISOString(),
              }
            : item
        );

        set({ inboxItems: updatedInboxItems.filter((item: InboxItem) => item.status !== 'deleted'), loading: false });

        // ✅ Zustand persist가 자동으로 저장하므로 saveMockDataToLocalStorage() 제거

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

        const updatedInboxItems = get().inboxItems.map((item: InboxItem) =>
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

        // ✅ Zustand persist가 자동으로 저장하므로 saveMockDataToLocalStorage() 제거

        const clarifiedItem = updatedInboxItems.find((i: InboxItem) => i.id === id);
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

        const updatedInboxItems = get().inboxItems.map((item: InboxItem) =>
          item.id === id
            ? {
                ...item,
                status: 'completed' as const,
                updated_at: new Date().toISOString(),
              }
            : item
        );

        set({ inboxItems: updatedInboxItems, loading: false });

        // ✅ Zustand persist가 자동으로 저장하므로 saveMockDataToLocalStorage() 제거

        const completedItem = updatedInboxItems.find((i: InboxItem) => i.id === id);
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

        const updatedInboxItems = get().inboxItems.map((item: InboxItem) =>
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

        // ✅ Zustand persist가 자동으로 저장하므로 saveMockDataToLocalStorage() 제거

        const delegatedItem = updatedInboxItems.find((i: InboxItem) => i.id === id);
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

    convertTodoToProject: async (todoId: string, projectTitle?: string) => {
      try {
        set({ loading: true, error: null });

        // 할일 찾기
        const todo = get().inboxItems.find((item: InboxItem) => item.id === todoId);
        if (!todo) throw new Error('할일을 찾을 수 없습니다.');

        // 할일 삭제 (status를 deleted로 변경)
        const updatedInboxItems = get().inboxItems.map((item: InboxItem) =>
          item.id === todoId
            ? {
                ...item,
                status: 'deleted' as const,
                updated_at: new Date().toISOString(),
              }
            : item
        ).filter((item: InboxItem) => item.status !== 'deleted');

        // 프로젝트 수집함에 새 항목 생성
        const newProjectInboxItem: InboxItem = {
          id: `inbox-project-${Date.now()}`,
          user_id: todo.user_id,
          content: projectTitle || todo.content,
          status: 'inbox',
          item_type: 'project',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const finalInboxItems = [...updatedInboxItems, newProjectInboxItem];
        set({ inboxItems: finalInboxItems, loading: false });

        // ✅ Zustand persist가 자동으로 저장하므로 saveMockDataToLocalStorage() 제거

        return {
          deletedTodoId: todoId,
          newProjectId: newProjectInboxItem.id,
        };
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 변환에 실패했습니다.',
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
