/**
 * Resource Store - 자원(관심 주제) 관리
 * PARA 시스템의 R (Resources)
 */

import { createStore } from '@/state/utils/storeUtils';
import type { AreaResource } from '@/types/second-brain';
import {
  fetchAreasResourcesWithJWT,
  createAreaResourceWithJWT,
  updateAreaResourceWithJWT,
  deleteAreaResourceWithJWT,
} from '@/lib/supabase/areas-resources';

interface ResourceStoreState {
  resources: AreaResource[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchResources: (userId: string) => Promise<void>;
  createResource: (userId: string, data: Omit<AreaResource, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>) => Promise<AreaResource>;
  updateResource: (userId: string, id: string, data: Partial<Omit<AreaResource, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>>) => Promise<AreaResource>;
  deleteResource: (userId: string, id: string) => Promise<boolean>;
  archiveResource: (userId: string, id: string) => Promise<AreaResource>;
  unarchiveResource: (userId: string, id: string) => Promise<AreaResource>;
  reorderResources: (userId: string, resourceIds: string[]) => Promise<void>;
}

export const useResourceStore = createStore<ResourceStoreState>(
  (set, get) => ({
    resources: [],
    loading: false,
    error: null,

    fetchResources: async (userId: string) => {
      try {
        set({ loading: true, error: null });


        const allAreasResources = await fetchAreasResourcesWithJWT(userId);

        // 자원만 필터링 (status === 'resource')
        const resources = allAreasResources.filter((item: AreaResource) => item.status === 'resource');

        set({ resources, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '자원을 불러오는데 실패했습니다.',
          loading: false,
        });
      }
    },

    createResource: async (userId: string, data) => {
      try {

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticResource: AreaResource = {
          id: tempId,
          user_id: userId,
          status: 'resource',
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set({ resources: [...get().resources, optimisticResource] });

        // 실제 API 호출
        const newResource = await createAreaResourceWithJWT({
          status: 'resource',
          user_id: userId,
          ...data,
        });

        // 실제 데이터로 교체
        set({
          resources: get().resources.map((resource: AreaResource) =>
            resource.id === tempId ? newResource : resource
          ),
        });

        return newResource;
      } catch (error) {
        // Rollback optimistic update
        set({ resources: get().resources.filter((resource: AreaResource) => !resource.id.startsWith('temp-')) });
        set({
          error: error instanceof Error ? error.message : '자원 생성에 실패했습니다.',
        });
        throw error;
      }
    },

    updateResource: async (userId: string, id, data) => {
      try {

        // Optimistic update
        const previousResources = get().resources;
        const updatedResources = get().resources.map((resource: AreaResource) =>
          resource.id === id
            ? {
                ...resource,
                ...data,
                updated_at: new Date().toISOString(),
              }
            : resource
        );

        set({ resources: updatedResources });

        // 실제 API 호출
        const updatedResource = await updateAreaResourceWithJWT(id, userId, data);
        if (!updatedResource) throw new Error('자원 업데이트에 실패했습니다.');

        // 실제 데이터로 교체
        set({
          resources: get().resources.map((resource: AreaResource) =>
            resource.id === id ? updatedResource : resource
          ),
        });

        return updatedResource;
      } catch (error) {
        // Rollback
        set({ resources: get().resources });
        set({
          error: error instanceof Error ? error.message : '자원 수정에 실패했습니다.',
        });
        throw error;
      }
    },

    deleteResource: async (userId: string, id) => {
      try {

        // Optimistic update
        const previousResources = get().resources;
        set({ resources: get().resources.filter((resource: AreaResource) => resource.id !== id) });

        // 실제 API 호출
        const success = await deleteAreaResourceWithJWT(id, userId);
        if (!success) {
          throw new Error('자원 삭제에 실패했습니다.');
        }

        return true;
      } catch (error) {
        // Rollback
        set({ resources: get().resources });
        set({
          error: error instanceof Error ? error.message : '자원 삭제에 실패했습니다.',
        });
        throw error;
      }
    },

    archiveResource: async (userId: string, id) => {
      const previousResources = get().resources;
      try {

        // Optimistic update - UI에서 제거
        set({ resources: get().resources.filter((resource: AreaResource) => resource.id !== id) });

        // 실제 API 호출 - status를 'archived'로 변경
        const archivedResource = await updateAreaResourceWithJWT(id, userId, {
          status: 'archived',
        });

        if (!archivedResource) {
          throw new Error('자원 아카이브에 실패했습니다.');
        }

        return archivedResource;
      } catch (error) {
        // Rollback
        set({ resources: previousResources });
        set({
          error: error instanceof Error ? error.message : '자원 아카이브에 실패했습니다.',
        });
        throw error;
      }
    },

    unarchiveResource: async (userId: string, id) => {
      try {

        // 실제 API 호출 - status를 'resource'로 변경
        const unarchivedResource = await updateAreaResourceWithJWT(id, userId, {
          status: 'resource',
        });

        if (!unarchivedResource) {
          throw new Error('자원 복원에 실패했습니다.');
        }

        // UI에 추가
        set({ resources: [...get().resources, unarchivedResource] });

        return unarchivedResource;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '자원 복원에 실패했습니다.',
        });
        throw error;
      }
    },

    reorderResources: async (userId: string, resourceIds) => {
      const previousResources = get().resources;
      try {

        // Optimistic update
        const updatedResources = get().resources.map((resource: AreaResource) => {
          const newIndex = resourceIds.indexOf(resource.id);
          return {
            ...resource,
            order_index: newIndex >= 0 ? newIndex : resource.order_index,
          };
        });

        // order_index로 정렬
        updatedResources.sort((a: AreaResource, b: AreaResource) => a.order_index - b.order_index);
        set({ resources: updatedResources });

        // 실제 API 호출 - 각 자원의 order_index 업데이트
        await Promise.all(
          resourceIds.map((id, index) =>
            updateAreaResourceWithJWT(id, userId, { order_index: index })
          )
        );
      } catch (error) {
        // Rollback
        set({ resources: previousResources });
        set({
          error: error instanceof Error ? error.message : '자원 순서 변경에 실패했습니다.',
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
