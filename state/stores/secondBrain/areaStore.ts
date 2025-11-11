/**
 * Area Store - 영역(책임 영역) 관리
 * PARA 시스템의 A (Areas of Responsibility)
 */

import { createStore } from '@/state/utils/storeUtils';
import type { AreaResource, Area } from '@/types/second-brain';
import {
  fetchAreasResourcesWithJWT,
  createAreaResourceWithJWT,
  updateAreaResourceWithJWT,
  deleteAreaResourceWithJWT,
} from '@/lib/supabase/areas-resources';

interface AreaStoreState {
  areas: AreaResource[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchAreas: (userId: string) => Promise<void>;
  fetchArchivedAreas: (userId: string) => Promise<AreaResource[]>;
  fetchArchivedAreasResources: (userId: string) => Promise<AreaResource[]>;
  createArea: (userId: string, data: Omit<AreaResource, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>) => Promise<AreaResource>;
  updateArea: (userId: string, id: string, data: Partial<Omit<AreaResource, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>>) => Promise<AreaResource>;
  deleteArea: (userId: string, id: string) => Promise<boolean>;
  archiveArea: (userId: string, id: string) => Promise<AreaResource>;
  unarchiveArea: (userId: string, id: string) => Promise<AreaResource>;
  reorderAreas: (userId: string, areaIds: string[]) => Promise<void>;
}

export const useAreaStore = createStore<AreaStoreState>(
  (set, get) => ({
    areas: [],
    loading: false,
    error: null,

    fetchAreas: async (userId: string) => {
      try {
        set({ loading: true, error: null });

        const allAreasResources = await fetchAreasResourcesWithJWT(userId);

        // 영역만 필터링 (status === 'area')
        const areas = allAreasResources.filter((item) => item.status === 'area');

        set({ areas, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '영역을 불러오는데 실패했습니다.',
          loading: false,
        });
      }
    },

    fetchArchivedAreas: async (userId: string) => {
      try {
        const allAreasResources = await fetchAreasResourcesWithJWT(userId);
        // status가 'archived'인 영역만 필터링
        const archivedAreas = allAreasResources.filter((item) => item.status === 'archived');
        return archivedAreas;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '아카이브된 영역을 불러오는데 실패했습니다.',
        });
        return [];
      }
    },

    fetchArchivedAreasResources: async (userId: string) => {
      try {
        const allAreasResources = await fetchAreasResourcesWithJWT(userId);
        // status가 'archived'인 모든 항목 필터링 (영역 + 자원)
        const archivedItems = allAreasResources.filter((item: AreaResource) => item.status === 'archived');
        return archivedItems;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '아카이브된 영역/자원을 불러오는데 실패했습니다.',
        });
        return [];
      }
    },

    createArea: async (userId: string, data) => {
      try {
        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticArea: AreaResource = {
          id: tempId,
          user_id: userId,
          status: 'area',
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set({ areas: [...get().areas, optimisticArea] });

        // 실제 API 호출
        const newArea = await createAreaResourceWithJWT({
          status: 'area',
          user_id: userId,
          ...data,
        });

        // 실제 데이터로 교체
        set({
          areas: get().areas.map((area: Area) =>
            area.id === tempId ? newArea : area
          ),
        });

        return newArea;
      } catch (error) {
        // Rollback optimistic update
        set({ areas: get().areas.filter((area: Area) => !area.id.startsWith('temp-')) });
        set({
          error: error instanceof Error ? error.message : '영역 생성에 실패했습니다.',
        });
        throw error;
      }
    },

    updateArea: async (userId: string, id, data) => {
      try {
        // Optimistic update
        const previousAreas = get().areas;
        const updatedAreas = get().areas.map((area: Area) =>
          area.id === id
            ? {
                ...area,
                ...data,
                updated_at: new Date().toISOString(),
              }
            : area
        );

        set({ areas: updatedAreas });

        // 실제 API 호출
        const updatedArea = await updateAreaResourceWithJWT(id, userId, data);
        if (!updatedArea) throw new Error('영역 업데이트에 실패했습니다.');

        // 실제 데이터로 교체
        set({
          areas: get().areas.map((area: Area) =>
            area.id === id ? updatedArea : area
          ),
        });

        return updatedArea;
      } catch (error) {
        // Rollback
        set({ areas: get().areas });
        set({
          error: error instanceof Error ? error.message : '영역 수정에 실패했습니다.',
        });
        throw error;
      }
    },

    deleteArea: async (userId: string, id) => {
      try {
        // Optimistic update
        const previousAreas = get().areas;
        set({ areas: get().areas.filter((area: Area) => area.id !== id) });

        // 실제 API 호출
        const success = await deleteAreaResourceWithJWT(id, userId);
        if (!success) {
          throw new Error('영역 삭제에 실패했습니다.');
        }

        return true;
      } catch (error) {
        // Rollback
        set({ areas: get().areas });
        set({
          error: error instanceof Error ? error.message : '영역 삭제에 실패했습니다.',
        });
        throw error;
      }
    },

    archiveArea: async (userId: string, id) => {
      const previousAreas = get().areas;
      try {
        // Optimistic update - UI에서 제거
        set({ areas: get().areas.filter((area: Area) => area.id !== id) });

        // 실제 API 호출 - status를 'archived'로 변경
        const archivedArea = await updateAreaResourceWithJWT(id, userId, {
          status: 'archived',
        });

        if (!archivedArea) {
          throw new Error('영역 아카이브에 실패했습니다.');
        }

        return archivedArea;
      } catch (error) {
        // Rollback
        set({ areas: previousAreas });
        set({
          error: error instanceof Error ? error.message : '영역 아카이브에 실패했습니다.',
        });
        throw error;
      }
    },

    unarchiveArea: async (userId: string, id) => {
      try {
        // 실제 API 호출 - status를 'area'로 변경
        const unarchivedArea = await updateAreaResourceWithJWT(id, userId, {
          status: 'area',
        });

        if (!unarchivedArea) {
          throw new Error('영역 복원에 실패했습니다.');
        }

        // UI에 추가
        set({ areas: [...get().areas, unarchivedArea] });

        return unarchivedArea;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '영역 복원에 실패했습니다.',
        });
        throw error;
      }
    },

    reorderAreas: async (userId: string, areaIds) => {
      const previousAreas = get().areas;
      try {
        // Optimistic update
        const updatedAreas = get().areas.map((area: AreaResource) => {
          const newIndex = areaIds.indexOf(area.id);
          return {
            ...area,
            order_index: newIndex >= 0 ? newIndex : area.order_index,
          };
        });

        // order_index로 정렬
        updatedAreas.sort((a: AreaResource, b: AreaResource) => a.order_index - b.order_index);
        set({ areas: updatedAreas });

        // 실제 API 호출 - 각 영역의 order_index 업데이트
        await Promise.all(
          areaIds.map((id, index) =>
            updateAreaResourceWithJWT(id, userId, { order_index: index })
          )
        );
      } catch (error) {
        // Rollback
        set({ areas: previousAreas });
        set({
          error: error instanceof Error ? error.message : '영역 순서 변경에 실패했습니다.',
        });
        throw error;
      }
    },
  }),
  {
    name: 'area-store',
    persist: {
      name: 'daystep-areas',
      version: 1,
    },
  }
);
