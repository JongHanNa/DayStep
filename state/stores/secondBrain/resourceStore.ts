/**
 * Resource Store - 자원(관심 주제) 관리
 * PARA 시스템의 R (Resources)
 */

import { createStore } from '@/state/utils/storeUtils';
import type { Resource, CreateResourceInput, UpdateResourceInput } from '@/types/second-brain';
import { mockResources, saveMockDataToLocalStorage } from '@/lib/mockData/secondBrain';

interface ResourceStoreState {
  resources: Resource[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchResources: () => Promise<void>;
  createResource: (data: CreateResourceInput) => Promise<Resource>;
  updateResource: (id: string, data: UpdateResourceInput) => Promise<Resource>;
  deleteResource: (id: string) => Promise<boolean>;
  archiveResource: (id: string) => Promise<Resource>;
  unarchiveResource: (id: string) => Promise<Resource>;
  reorderResources: (resourceIds: string[]) => Promise<void>;
}

export const useResourceStore = createStore<ResourceStoreState>(
  (set, get) => ({
    resources: [],
    loading: false,
    error: null,

    fetchResources: async () => {
      try {
        set({ loading: true, error: null });
        // Mock 데이터 로드 (아카이브 포함)
        const resources = mockResources;
        set({ resources, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '자원을 불러오는데 실패했습니다.',
          loading: false,
        });
      }
    },

    createResource: async (data: CreateResourceInput) => {
      try {
        set({ loading: true, error: null });

        const newResource: Resource = {
          id: `resource-${Date.now()}`,
          user_id: 'mock-user-123',
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedResources = [...get().resources, newResource];
        set({ resources: updatedResources, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        return newResource;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '자원 생성에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    updateResource: async (id: string, data: UpdateResourceInput) => {
      try {
        set({ loading: true, error: null });

        const updatedResources = get().resources.map((resource) =>
          resource.id === id
            ? {
                ...resource,
                ...data,
                updated_at: new Date().toISOString(),
              }
            : resource
        );

        set({ resources: updatedResources, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const updatedResource = updatedResources.find((r) => r.id === id);
        if (!updatedResource) throw new Error('자원을 찾을 수 없습니다.');

        return updatedResource;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '자원 수정에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    deleteResource: async (id: string) => {
      try {
        set({ loading: true, error: null });

        const updatedResources = get().resources.filter((resource) => resource.id !== id);
        set({ resources: updatedResources, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        return true;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '자원 삭제에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    archiveResource: async (id: string) => {
      try {
        set({ loading: true, error: null });

        const updatedResources = get().resources.map((resource) =>
          resource.id === id
            ? {
                ...resource,
                is_archived: true,
                updated_at: new Date().toISOString(),
              }
            : resource
        );

        set({ resources: updatedResources.filter((r) => !r.is_archived), loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const archivedResource = updatedResources.find((r) => r.id === id);
        if (!archivedResource) throw new Error('자원을 찾을 수 없습니다.');

        return archivedResource;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '자원 아카이브에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    unarchiveResource: async (id: string) => {
      try {
        set({ loading: true, error: null });

        // 아카이브된 자원 포함하여 로드
        const allResources = mockResources;
        const updatedResources = allResources.map((resource) =>
          resource.id === id
            ? {
                ...resource,
                is_archived: false,
                updated_at: new Date().toISOString(),
              }
            : resource
        );

        set({ resources: updatedResources.filter((r) => !r.is_archived), loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const unarchivedResource = updatedResources.find((r) => r.id === id);
        if (!unarchivedResource) throw new Error('자원을 찾을 수 없습니다.');

        return unarchivedResource;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '자원 복원에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    reorderResources: async (resourceIds: string[]) => {
      try {
        set({ loading: true, error: null });

        const updatedResources = get().resources.map((resource) => {
          const newIndex = resourceIds.indexOf(resource.id);
          return {
            ...resource,
            order_index: newIndex >= 0 ? newIndex : resource.order_index,
            updated_at: new Date().toISOString(),
          };
        });

        // order_index로 정렬
        updatedResources.sort((a, b) => a.order_index - b.order_index);

        set({ resources: updatedResources, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '자원 순서 변경에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },
  }),
  {
    name: 'resource-store',
    persist: {
      name: 'daystep-resources',
      version: 1,
    },
  }
);
