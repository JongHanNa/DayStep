/**
 * Next Action Context Store - 다음행동상황 관리
 * 사용자별 커스텀 다음행동상황 항목 CRUD
 */

import { createStore } from '@/state/utils/storeUtils';
import type { NextActionContextItem, CreateNextActionContextInput, UpdateNextActionContextInput } from '@/types';
import {
  fetchNextActionContexts,
  createNextActionContext,
  updateNextActionContext,
  deleteNextActionContext,
  reorderNextActionContexts,
  ensureDefaultNextActionContexts,
} from '@/lib/supabase/next-action-contexts';

interface NextActionContextStoreState {
  contexts: NextActionContextItem[];
  loading: boolean;
  error: string | null;

  // Actions
  loadContexts: (userId: string) => Promise<void>;
  createContext: (userId: string, title: string) => Promise<NextActionContextItem | null>;
  updateContext: (id: string, title: string) => Promise<NextActionContextItem | null>;
  deleteContext: (id: string) => Promise<boolean>;
  reorderContexts: (items: { id: string; display_order: number }[]) => Promise<boolean>;
  clearContexts: () => void;
}

export const useNextActionContextStore = createStore<NextActionContextStoreState>(
  (set, get) => ({
    contexts: [],
    loading: false,
    error: null,

    loadContexts: async (userId: string) => {
      try {
        set({ loading: true, error: null });

        let contexts = await fetchNextActionContexts(userId);

        // 항목이 없으면 기본 항목 생성 후 다시 조회
        if (contexts.length === 0) {
          await ensureDefaultNextActionContexts(userId);
          contexts = await fetchNextActionContexts(userId);
        }

        set({ contexts, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '다음행동상황을 불러오는데 실패했습니다.',
          loading: false,
        });
      }
    },

    createContext: async (userId: string, title: string) => {
      try {
        const currentContexts = get().contexts;

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticContext: NextActionContextItem = {
          id: tempId,
          user_id: userId,
          title,
          display_order: currentContexts.length > 0
            ? Math.max(...currentContexts.map((c: NextActionContextItem) => c.display_order)) + 1
            : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set({ contexts: [...currentContexts, optimisticContext] });

        // 실제 API 호출
        const newContext = await createNextActionContext(userId, { title });

        if (newContext) {
          // 성공 시 실제 데이터로 교체
          set({
            contexts: get().contexts.map((c: NextActionContextItem) =>
              c.id === tempId ? newContext : c
            ),
          });
          return newContext;
        } else {
          // 실패 시 롤백
          set({ contexts: currentContexts });
          return null;
        }
      } catch (error) {
        // 에러 시 롤백
        const contexts = await fetchNextActionContexts(userId);
        set({
          contexts,
          error: error instanceof Error ? error.message : '다음행동상황 생성에 실패했습니다.',
        });
        return null;
      }
    },

    updateContext: async (id: string, title: string) => {
      try {
        const currentContexts = get().contexts;
        const targetContext = currentContexts.find((c: NextActionContextItem) => c.id === id);

        if (!targetContext) return null;

        // Optimistic update
        set({
          contexts: currentContexts.map((c: NextActionContextItem) =>
            c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c
          ),
        });

        // 실제 API 호출
        const updatedContext = await updateNextActionContext({ id, title });

        if (updatedContext) {
          // 성공 시 실제 데이터로 교체
          set({
            contexts: get().contexts.map((c: NextActionContextItem) =>
              c.id === id ? updatedContext : c
            ),
          });
          return updatedContext;
        } else {
          // 실패 시 롤백
          set({ contexts: currentContexts });
          return null;
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '다음행동상황 수정에 실패했습니다.',
        });
        return null;
      }
    },

    deleteContext: async (id: string) => {
      try {
        const currentContexts = get().contexts;

        // Optimistic update
        set({
          contexts: currentContexts.filter((c: NextActionContextItem) => c.id !== id),
        });

        // 실제 API 호출
        const success = await deleteNextActionContext(id);

        if (!success) {
          // 실패 시 롤백
          set({ contexts: currentContexts });
          return false;
        }

        return true;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '다음행동상황 삭제에 실패했습니다.',
        });
        return false;
      }
    },

    reorderContexts: async (items: { id: string; display_order: number }[]) => {
      try {
        const currentContexts = get().contexts;

        // Optimistic update
        const reorderedContexts = currentContexts.map((c: NextActionContextItem) => {
          const newOrder = items.find(i => i.id === c.id);
          return newOrder ? { ...c, display_order: newOrder.display_order } : c;
        }).sort((a: NextActionContextItem, b: NextActionContextItem) => a.display_order - b.display_order);

        set({ contexts: reorderedContexts });

        // 실제 API 호출
        const success = await reorderNextActionContexts(items);

        if (!success) {
          // 실패 시 롤백
          set({ contexts: currentContexts });
          return false;
        }

        return true;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '다음행동상황 순서 변경에 실패했습니다.',
        });
        return false;
      }
    },

    clearContexts: () => {
      set({ contexts: [], loading: false, error: null });
    },
  }),
  { name: 'next-action-context-store' }
);
