import { RepositoryItem } from "@/entities/repository/RepositoryItem";
import { RepositoryItemInsert, RepositoryItemUpdate } from "@/types";
import { supabase } from "@/lib/supabase";
import {
  createStore,
  createAsyncAction,
  createOptimisticUpdate,
  createRealtimeHelpers,
  createFilterHelpers,
  logStoreAction,
} from "../utils/storeUtils";
import type { BaseStoreState, FilterState } from "../types";

/**
 * 보관함 스토어 상태 타입 정의
 */
interface RepositoryStoreState extends BaseStoreState {
  // 데이터 상태
  items: RepositoryItem[];
  selectedItem: RepositoryItem | null;

  // API 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // 필터 및 정렬 상태
  filters: FilterState & {
    type: "all" | "todo";
    category: string | "all";
    categories: string[];
  };

  // 실시간 구독 상태
  isSubscribed: boolean;
  channel: any;

  // 통계 정보
  stats: {
    totalCount: number;
    typeBreakdown: {
      todo: number;
    };
    categoryBreakdown: Record<string, number>;
  };

  // 드래그 앤 드롭 상태
  dragState: {
    isDragging: boolean;
    draggedItem: RepositoryItem | null;
    dropTarget: string | null;
  };

  // 액션들
  fetchItems: any;
  fetchItemById: (id: string) => Promise<RepositoryItem | null>;
  createItem: any;
  updateItem: any;
  deleteItem: any;

  // 카테고리 관리
  updateItemCategory: (id: string, category: string | null) => Promise<boolean>;
  deleteCategory: any;
  mergeCategories: any;

  // 필터링 및 검색
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: "all" | "todo") => void;
  setCategoryFilter: (category: string | "all") => void;
  setSortBy: (sortBy: string, sortOrder?: "asc" | "desc") => void;

  // 선택 상태 관리
  selectItem: (item: RepositoryItem | null) => void;

  // 드래그 앤 드롭
  startDrag: (item: RepositoryItem) => void;
  endDrag: () => void;
  setDropTarget: (targetId: string | null) => void;
  moveToCategory: (
    itemId: string,
    targetCategory: string | null
  ) => Promise<boolean>;

  // 실시간 구독
  subscribe: () => void;
  unsubscribe: () => void;

  // 통계 및 유틸리티
  refreshStats: () => void;
  getFilteredItems: () => RepositoryItem[];
  getItemsByType: (type: "todo") => RepositoryItem[];
  getItemsByCategory: (category: string) => RepositoryItem[];
  getAllCategories: () => string[];

  // 일괄 작업
  bulkDelete: any;
  bulkUpdateCategory: any;

  // 복원 기능
  restoreItem: (id: string) => Promise<boolean>;

  // 스토어 초기화
  reset: () => void;
}

/**
 * 보관함 스토어 생성
 */
export const useRepositoryStore = createStore<RepositoryStoreState>(
  (set, get) => ({
    // 초기 상태
    initialized: false,
    version: 1,
    items: [],
    selectedItem: null,
    loading: false,
    error: null,
    lastUpdated: null,
    filters: {
      searchQuery: "",
      sortBy: "created_at",
      sortOrder: "desc",
      filters: {},
      type: "all",
      category: "all",
      categories: [],
    },
    isSubscribed: false,
    channel: null,
    stats: {
      totalCount: 0,
      typeBreakdown: {
        todo: 0,
      },
      categoryBreakdown: {},
    },
    dragState: {
      isDragging: false,
      draggedItem: null,
      dropTarget: null,
    },

    /**
     * 보관함 아이템 목록 조회
     */
    fetchItems: createAsyncAction(async () => {
      logStoreAction("RepositoryStore", "fetchItems");

      const { data, error } = await supabase
        .from("repository_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const items = data.map((item) => RepositoryItem.fromDatabase(item));

      set((state: RepositoryStoreState) => {
        state.items = items;
        state.refreshStats();
      });

      return items;
    }),

    /**
     * 특정 보관함 아이템 조회
     */
    fetchItemById: async (id: string) => {
      logStoreAction("RepositoryStore", "fetchItemById", { id });

      try {
        const { data, error } = await supabase
          .from("repository_items")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          throw error;
        }

        return RepositoryItem.fromDatabase(data);
      } catch (error) {
        console.error("보관함 아이템 조회 오류:", error);
        return null;
      }
    },

    /**
     * 새 보관함 아이템 생성
     */
    createItem: createAsyncAction(async (data: RepositoryItemInsert) => {
      logStoreAction("RepositoryStore", "createItem", data);

      // 낙관적 업데이트
      const tempId = `temp-${Date.now()}`;
      const optimisticItem = RepositoryItem.fromDatabase({
        id: tempId,
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        content: data.content,
        category: data.category || null,
        source_id: data.source_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      set((state: RepositoryStoreState) => {
        state.items.unshift(optimisticItem);
        state.refreshStats();
      });

      try {
        const { data: created, error } = await supabase
          .from("repository_items")
          .insert([data])
          .select()
          .single();

        if (error) {
          throw error;
        }

        const newItem = RepositoryItem.fromDatabase(created);

        set((state: RepositoryStoreState) => {
          // 낙관적 업데이트 제거하고 실제 데이터로 교체
          state.items = state.items.filter((i: any) => i.id !== tempId);
          state.items.unshift(newItem);
          state.refreshStats();
        });

        return newItem;
      } catch (error) {
        // 낙관적 업데이트 롤백
        set((state: RepositoryStoreState) => {
          state.items = state.items.filter((i: any) => i.id !== tempId);
          state.refreshStats();
        });
        throw error;
      }
    }),

    /**
     * 보관함 아이템 업데이트
     */
    updateItem: createAsyncAction(
      async (id: string, data: RepositoryItemUpdate) => {
        logStoreAction("RepositoryStore", "updateItem", { id, data });

        // 원본 데이터 백업
        const originalItems = [...get().items];

        // 낙관적 업데이트
        set((state: RepositoryStoreState) => {
          const index = state.items.findIndex((i: any) => i.id === id);
          if (index !== -1) {
            state.items[index] = { ...state.items[index], ...data };
          }
          state.refreshStats();
        });

        try {
          const { data: updated, error } = await supabase
            .from("repository_items")
            .update(data)
            .eq("id", id)
            .select()
            .single();

          if (error) {
            throw error;
          }

          const updatedItem = RepositoryItem.fromDatabase(updated);

          set((state: RepositoryStoreState) => {
            const index = state.items.findIndex((i: any) => i.id === id);
            if (index !== -1) {
              state.items[index] = updatedItem;
            }
            state.refreshStats();
          });

          return updatedItem;
        } catch (error) {
          // 낙관적 업데이트 롤백
          set((state: RepositoryStoreState) => {
            state.items = originalItems;
            state.refreshStats();
          });
          throw error;
        }
      }
    ),

    /**
     * 보관함 아이템 삭제
     */
    deleteItem: createAsyncAction(async (id: string) => {
      logStoreAction("RepositoryStore", "deleteItem", { id });

      // 원본 데이터 백업
      const originalItems = [...get().items];

      // 낙관적 업데이트
      set((state: RepositoryStoreState) => {
        state.items = state.items.filter((i: any) => i.id !== id);
        state.refreshStats();
      });

      try {
        const { error } = await supabase
          .from("repository_items")
          .delete()
          .eq("id", id);

        if (error) {
          throw error;
        }

        return true;
      } catch (error) {
        // 낙관적 업데이트 롤백
        set((state: RepositoryStoreState) => {
          state.items = originalItems;
          state.refreshStats();
        });
        throw error;
      }
    }),

    /**
     * 아이템 카테고리 업데이트
     */
    updateItemCategory: async (id: string, category: string | null) => {
      return get().updateItem(id, { category });
    },

    /**
     * 카테고리 삭제 (해당 카테고리의 모든 아이템을 미분류로 이동)
     */
    deleteCategory: createAsyncAction(async (category: string) => {
      logStoreAction("RepositoryStore", "deleteCategory", { category });

      const { error } = await supabase
        .from("repository_items")
        .update({ category: null })
        .eq("category", category);

      if (error) {
        throw error;
      }

      // 로컬 상태 업데이트
      set((state: RepositoryStoreState) => {
        state.items.forEach((item: any) => {
          if (item.category === category) {
            const index = state.items.findIndex((i: any) => i.id === item.id);
            if (index !== -1) {
              state.items[index] = item.setCategory(null);
            }
          }
        });
        state.refreshStats();
      });

      return true;
    }),

    /**
     * 카테고리 병합
     */
    mergeCategories: createAsyncAction(
      async (fromCategory: string, toCategory: string) => {
        logStoreAction("RepositoryStore", "mergeCategories", {
          fromCategory,
          toCategory,
        });

        const { error } = await supabase
          .from("repository_items")
          .update({ category: toCategory })
          .eq("category", fromCategory);

        if (error) {
          throw error;
        }

        // 로컬 상태 업데이트
        set((state: RepositoryStoreState) => {
          state.items.forEach((item: any) => {
            if (item.category === fromCategory) {
              const index = state.items.findIndex((i: any) => i.id === item.id);
              if (index !== -1) {
                state.items[index] = item.setCategory(toCategory);
              }
            }
          });
          state.refreshStats();
        });

        return true;
      }
    ),

    /**
     * 검색어 설정
     */
    setSearchQuery: (query: string) => {
      set((state: RepositoryStoreState) => {
        state.filters.searchQuery = query;
      });
    },

    /**
     * 타입 필터 설정
     */
    setTypeFilter: (type: "all" | "todo") => {
      set((state: RepositoryStoreState) => {
        state.filters.type = type;
      });
    },

    /**
     * 카테고리 필터 설정
     */
    setCategoryFilter: (category: string | "all") => {
      set((state: RepositoryStoreState) => {
        state.filters.category = category;
      });
    },

    /**
     * 정렬 설정
     */
    setSortBy: (sortBy: string, sortOrder: "asc" | "desc" = "desc") => {
      set((state: RepositoryStoreState) => {
        state.filters.sortBy = sortBy;
        state.filters.sortOrder = sortOrder;
      });
    },

    /**
     * 아이템 선택
     */
    selectItem: (item: RepositoryItem | null) => {
      set((state: RepositoryStoreState) => {
        state.selectedItem = item;
      });
    },

    /**
     * 드래그 시작
     */
    startDrag: (item: RepositoryItem) => {
      set((state: RepositoryStoreState) => {
        state.dragState.isDragging = true;
        state.dragState.draggedItem = item;
      });
    },

    /**
     * 드래그 종료
     */
    endDrag: () => {
      set((state: RepositoryStoreState) => {
        state.dragState.isDragging = false;
        state.dragState.draggedItem = null;
        state.dragState.dropTarget = null;
      });
    },

    /**
     * 드롭 타겟 설정
     */
    setDropTarget: (targetId: string | null) => {
      set((state: RepositoryStoreState) => {
        state.dragState.dropTarget = targetId;
      });
    },

    /**
     * 아이템을 카테고리로 이동
     */
    moveToCategory: async (itemId: string, targetCategory: string | null) => {
      return get().updateItemCategory(itemId, targetCategory);
    },

    /**
     * 실시간 구독 시작
     */
    subscribe: () => {
      if (get().isSubscribed) return;

      logStoreAction("RepositoryStore", "subscribe");

      const realtimeHelpers = createRealtimeHelpers();

      const channel = supabase
        .channel("repository_items")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "repository_items" },
          (payload) => {
            const newItem = RepositoryItem.fromDatabase(payload.new as any);
            set((state: RepositoryStoreState) => {
              state.items.unshift(newItem);
              state.refreshStats();
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "repository_items" },
          (payload) => {
            const updatedItem = RepositoryItem.fromDatabase(payload.new as any);
            set((state: RepositoryStoreState) => {
              const index = state.items.findIndex(
                (i: any) => i.id === updatedItem.id
              );
              if (index !== -1) {
                state.items[index] = updatedItem;
              }
              state.refreshStats();
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "repository_items" },
          (payload) => {
            set((state: RepositoryStoreState) => {
              state.items = state.items.filter(
                (i: any) => i.id !== (payload.old as any).id
              );
              state.refreshStats();
            });
          }
        )
        .subscribe();

      set((state: RepositoryStoreState) => {
        state.isSubscribed = true;
        state.channel = channel;
      });
    },

    /**
     * 실시간 구독 해제
     */
    unsubscribe: () => {
      if (!get().isSubscribed) return;

      logStoreAction("RepositoryStore", "unsubscribe");

      const { channel } = get();
      if (channel) {
        supabase.removeChannel(channel);
      }

      set((state: RepositoryStoreState) => {
        state.isSubscribed = false;
        state.channel = null;
      });
    },

    /**
     * 통계 새로고침
     */
    refreshStats: () => {
      const { items } = get();

      const stats = {
        totalCount: items.length,
        typeBreakdown: {
          todo: 0,
        },
        categoryBreakdown: {} as Record<string, number>,
      };

      // 타입별 개수 계산
      items.forEach((item: any) => {
        (stats.typeBreakdown as any)[item.type]++;

        // 카테고리별 개수 계산
        const category = item.category || "미분류";
        stats.categoryBreakdown[category] =
          (stats.categoryBreakdown[category] || 0) + 1;
      });

      set((state: RepositoryStoreState) => {
        state.stats = stats;
        state.filters.categories = Object.keys(stats.categoryBreakdown);
      });
    },

    /**
     * 필터링된 아이템 목록 반환
     */
    getFilteredItems: () => {
      const { items, filters } = get();
      const filterHelpers = createFilterHelpers<RepositoryItem>();

      return filterHelpers.filterData(items, {
        searchQuery: filters.searchQuery,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        customFilters: {
          ...(filters.type !== "all" && { type: filters.type }),
          ...(filters.category !== "all" && {
            category: (item: RepositoryItem) => {
              const itemCategory = item.category || "미분류";
              return itemCategory === filters.category;
            },
          }),
        },
      });
    },

    /**
     * 타입별 아이템 반환
     */
    getItemsByType: (type: "todo") => {
      return get().items.filter((item: any) => item.type === type);
    },

    /**
     * 카테고리별 아이템 반환
     */
    getItemsByCategory: (category: string) => {
      return get().items.filter((item: any) => {
        const itemCategory = item.category || "미분류";
        return itemCategory === category;
      });
    },

    /**
     * 모든 카테고리 목록 반환
     */
    getAllCategories: () => {
      return get().filters.categories;
    },

    /**
     * 일괄 삭제
     */
    bulkDelete: createAsyncAction(async (ids: string[]) => {
      logStoreAction("RepositoryStore", "bulkDelete", { ids });

      const { error } = await supabase
        .from("repository_items")
        .delete()
        .in("id", ids);

      if (error) {
        throw error;
      }

      set((state: RepositoryStoreState) => {
        state.items = state.items.filter((item: any) => !ids.includes(item.id));
        state.refreshStats();
      });

      return true;
    }),

    /**
     * 일괄 카테고리 변경
     */
    bulkUpdateCategory: createAsyncAction(
      async (ids: string[], category: string | null) => {
        logStoreAction("RepositoryStore", "bulkUpdateCategory", {
          ids,
          category,
        });

        const { error } = await supabase
          .from("repository_items")
          .update({ category })
          .in("id", ids);

        if (error) {
          throw error;
        }

        set((state: RepositoryStoreState) => {
          state.items.forEach((item: any) => {
            if (ids.includes(item.id)) {
              const index = state.items.findIndex((i: any) => i.id === item.id);
              if (index !== -1) {
                state.items[index] = item.setCategory(category);
              }
            }
          });
          state.refreshStats();
        });

        return true;
      }
    ),

    /**
     * 아이템 복원 (원본 타입으로 되돌리기)
     */
    restoreItem: async (id: string) => {
      logStoreAction("RepositoryStore", "restoreItem", { id });

      try {
        const item = get().items.find((i: any) => i.id === id);
        if (!item) {
          throw new Error("복원할 아이템을 찾을 수 없습니다.");
        }

        // 타입에 따라 원본 테이블로 복원
        if (item.type === "todo") {
          // Todo로 복원 (useTodoStore의 restoreFromRepository 메서드 사용)
          const { useTodoStore } = await import("./todoStore");
          const todoStore = useTodoStore.getState();
          const restoredTodo = await todoStore.restoreFromRepository(id);

          if (restoredTodo) {
            await get().deleteItem(id);
            return true;
          }
        }

        return false;
      } catch (error) {
        console.error("아이템 복원 오류:", error);
        set((state: RepositoryStoreState) => {
          state.error =
            error instanceof Error ? error.message : "복원에 실패했습니다.";
        });
        return false;
      }
    },

    /**
     * 스토어 초기화
     */
    reset: () => {
      get().unsubscribe();

      set((state: RepositoryStoreState) => {
        state.items = [];
        state.selectedItem = null;
        state.loading = false;
        state.error = null;
        state.lastUpdated = null;
        state.filters = {
          searchQuery: "",
          sortBy: "created_at",
          sortOrder: "desc",
          filters: {},
          type: "all",
          category: "all",
          categories: [],
        };
        state.stats = {
          totalCount: 0,
          typeBreakdown: {
            todo: 0,
          },
          categoryBreakdown: {},
        };
        state.dragState = {
          isDragging: false,
          draggedItem: null,
          dropTarget: null,
        };
        state.isSubscribed = false;
        state.channel = null;
      });
    },
  }),
  {
    name: "repository-store",
    devtools: true,
    persist: {
      name: "daystep-repository",
      version: 1,
      blacklist: ["loading", "error", "isSubscribed", "dragState", "channel"],
    },
  }
);
