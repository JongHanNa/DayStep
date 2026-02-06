/**
 * Department Store - 부서 관리 상태
 *
 * 부서 CRUD + 소식 + 멤버 + 일정 관리
 */

import type {
  Department,
  DepartmentInput,
  DepartmentAnnouncement,
  DepartmentAnnouncementInput,
  DepartmentCategory,
  PersonDepartment,
} from '@/types/department';
import type { Todo } from '@/types';
import {
  createStore,
  loadingHelpers,
  logStoreAction,
} from '../utils/storeUtils';
import type { BaseStoreState } from '../types';
import { DepartmentService } from '@/services/department.service';

/**
 * 부서 통계
 */
interface DepartmentStats {
  memberCount: number;
  todoCount: number;
  announcementCount: number;
}

/**
 * 부서 스토어 상태 타입 정의
 */
interface DepartmentStoreState extends BaseStoreState {
  // 데이터 상태
  departments: Department[];
  currentDepartment: Department | null;
  departmentAnnouncements: DepartmentAnnouncement[];
  departmentMembers: PersonDepartment[];
  departmentTodos: Todo[];
  departmentStats: Map<string, DepartmentStats>;

  // UI 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // 필터 상태
  categoryFilter: DepartmentCategory | 'all';
  showFavoritesOnly: boolean;

  // 모달 상태
  showAddDepartmentModal: boolean;
  editingDepartment: Department | null;
  showAnnouncementModal: boolean;
  editingAnnouncement: DepartmentAnnouncement | null;

  // 부서 CRUD 액션
  fetchDepartments: (userId: string) => Promise<void>;
  fetchDepartmentById: (userId: string, departmentId: string) => Promise<Department | null>;
  createDepartment: (userId: string, input: DepartmentInput) => Promise<Department | null>;
  updateDepartment: (userId: string, departmentId: string, updates: Partial<DepartmentInput>) => Promise<boolean>;
  deleteDepartment: (userId: string, departmentId: string) => Promise<boolean>;
  toggleFavorite: (userId: string, departmentId: string) => Promise<boolean>;

  // 소식 액션
  fetchAnnouncements: (userId: string, departmentId?: string) => Promise<void>;
  createAnnouncement: (userId: string, input: DepartmentAnnouncementInput) => Promise<DepartmentAnnouncement | null>;
  updateAnnouncement: (userId: string, announcementId: string, updates: Partial<DepartmentAnnouncementInput>) => Promise<boolean>;
  deleteAnnouncement: (userId: string, announcementId: string) => Promise<boolean>;

  // 멤버 관리 액션
  fetchDepartmentMembers: (userId: string, departmentId: string) => Promise<void>;
  linkPersonToDepartment: (userId: string, personId: string, departmentId: string, role?: string) => Promise<boolean>;
  unlinkPersonFromDepartment: (userId: string, personId: string, departmentId: string) => Promise<boolean>;
  updateMemberRole: (userId: string, personId: string, departmentId: string, role: string | null) => Promise<boolean>;

  // 일정 액션
  fetchDepartmentTodos: (userId: string, departmentId: string) => Promise<void>;
  linkTodoToDepartment: (userId: string, todoId: string, departmentId: string | null) => Promise<boolean>;

  // 통계 액션
  fetchDepartmentStats: (userId: string, departmentId: string) => Promise<void>;

  // 필터 액션
  setCategoryFilter: (category: DepartmentCategory | 'all') => void;
  setShowFavoritesOnly: (show: boolean) => void;

  // 모달 액션
  openAddDepartmentModal: () => void;
  closeAddDepartmentModal: () => void;
  openEditDepartmentModal: (department: Department) => void;
  closeEditDepartmentModal: () => void;
  openAnnouncementModal: (announcement?: DepartmentAnnouncement) => void;
  closeAnnouncementModal: () => void;

  // 헬퍼 메서드
  setCurrentDepartment: (department: Department | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  // 계산된 값 (getter처럼 사용)
  getFilteredDepartments: () => Department[];

  // 스토어 초기화
  reset: () => void;
}

/**
 * 부서 스토어 생성
 */
export const useDepartmentStore = createStore<DepartmentStoreState>(
  (set, get) => ({
    // 초기 상태
    initialized: false,
    version: 1,
    departments: [],
    currentDepartment: null,
    departmentAnnouncements: [],
    departmentMembers: [],
    departmentTodos: [],
    departmentStats: new Map(),
    loading: false,
    error: null,
    lastUpdated: null,
    categoryFilter: 'all',
    showFavoritesOnly: false,
    showAddDepartmentModal: false,
    editingDepartment: null,
    showAnnouncementModal: false,
    editingAnnouncement: null,

    // ============================================
    // 부서 CRUD 액션
    // ============================================

    /**
     * 부서 목록 조회
     */
    fetchDepartments: async (userId: string) => {
      logStoreAction('DepartmentStore', 'fetchDepartments', { userId });

      set((state: DepartmentStoreState) => {
        loadingHelpers.setLoading(state);
      });

      try {
        const data = await DepartmentService.getDepartments(userId);

        set((state: DepartmentStoreState) => {
          state.departments = data || [];
          loadingHelpers.setSuccess(state);
          state.initialized = true;
        });
      } catch (error) {
        console.error('부서 목록 조회 오류:', error);
        set((state: DepartmentStoreState) => {
          loadingHelpers.setError(
            state,
            error instanceof Error ? error.message : '부서 목록을 불러오는데 실패했습니다.'
          );
        });
      }
    },

    /**
     * 부서 상세 조회
     */
    fetchDepartmentById: async (userId: string, departmentId: string) => {
      logStoreAction('DepartmentStore', 'fetchDepartmentById', { userId, departmentId });

      try {
        const data = await DepartmentService.getDepartment(departmentId, userId);

        set((state: DepartmentStoreState) => {
          state.currentDepartment = data;
        });

        return data;
      } catch (error) {
        console.error('부서 상세 조회 오류:', error);
        set((state: DepartmentStoreState) => {
          state.error = error instanceof Error ? error.message : '부서를 찾을 수 없습니다.';
        });
        return null;
      }
    },

    /**
     * 부서 생성
     */
    createDepartment: async (userId: string, input: DepartmentInput) => {
      logStoreAction('DepartmentStore', 'createDepartment', { userId, input });

      set((state: DepartmentStoreState) => {
        loadingHelpers.setLoading(state);
      });

      try {
        const newDepartment = await DepartmentService.createDepartment(userId, input);

        if (newDepartment) {
          set((state: DepartmentStoreState) => {
            state.departments = [...state.departments, newDepartment];
            loadingHelpers.setSuccess(state);
          });
        }

        return newDepartment;
      } catch (error) {
        console.error('부서 생성 오류:', error);
        set((state: DepartmentStoreState) => {
          loadingHelpers.setError(
            state,
            error instanceof Error ? error.message : '부서 생성에 실패했습니다.'
          );
        });
        return null;
      }
    },

    /**
     * 부서 수정
     */
    updateDepartment: async (userId: string, departmentId: string, updates: Partial<DepartmentInput>) => {
      logStoreAction('DepartmentStore', 'updateDepartment', { userId, departmentId, updates });

      // Optimistic update
      const prevDepartments = get().departments;
      set((state: DepartmentStoreState) => {
        state.departments = state.departments.map((d) =>
          d.id === departmentId ? { ...d, ...updates } : d
        );
        if (state.currentDepartment?.id === departmentId) {
          state.currentDepartment = { ...state.currentDepartment, ...updates } as Department;
        }
      });

      try {
        const success = await DepartmentService.updateDepartment(departmentId, userId, updates);

        if (!success) {
          // 롤백
          set((state: DepartmentStoreState) => {
            state.departments = prevDepartments;
          });
        }

        return success;
      } catch (error) {
        console.error('부서 수정 오류:', error);
        // 롤백
        set((state: DepartmentStoreState) => {
          state.departments = prevDepartments;
          state.error = error instanceof Error ? error.message : '부서 수정에 실패했습니다.';
        });
        return false;
      }
    },

    /**
     * 부서 삭제
     */
    deleteDepartment: async (userId: string, departmentId: string) => {
      logStoreAction('DepartmentStore', 'deleteDepartment', { userId, departmentId });

      // Optimistic update
      const prevDepartments = get().departments;
      set((state: DepartmentStoreState) => {
        state.departments = state.departments.filter((d) => d.id !== departmentId);
        if (state.currentDepartment?.id === departmentId) {
          state.currentDepartment = null;
        }
      });

      try {
        const success = await DepartmentService.deleteDepartment(departmentId, userId);

        if (!success) {
          // 롤백
          set((state: DepartmentStoreState) => {
            state.departments = prevDepartments;
          });
        }

        return success;
      } catch (error) {
        console.error('부서 삭제 오류:', error);
        // 롤백
        set((state: DepartmentStoreState) => {
          state.departments = prevDepartments;
          state.error = error instanceof Error ? error.message : '부서 삭제에 실패했습니다.';
        });
        return false;
      }
    },

    /**
     * 즐겨찾기 토글
     */
    toggleFavorite: async (userId: string, departmentId: string) => {
      const department = get().departments.find((d: Department) => d.id === departmentId);
      if (!department) return false;

      const newFavorite = !department.is_favorite;

      // Optimistic update
      set((state: DepartmentStoreState) => {
        state.departments = state.departments.map((d) =>
          d.id === departmentId ? { ...d, is_favorite: newFavorite } : d
        );
      });

      try {
        const success = await DepartmentService.toggleFavorite(departmentId, userId, newFavorite);

        if (!success) {
          // 롤백
          set((state: DepartmentStoreState) => {
            state.departments = state.departments.map((d) =>
              d.id === departmentId ? { ...d, is_favorite: !newFavorite } : d
            );
          });
        }

        return success;
      } catch (error) {
        console.error('즐겨찾기 토글 오류:', error);
        // 롤백
        set((state: DepartmentStoreState) => {
          state.departments = state.departments.map((d) =>
            d.id === departmentId ? { ...d, is_favorite: !newFavorite } : d
          );
        });
        return false;
      }
    },

    // ============================================
    // 소식 액션
    // ============================================

    /**
     * 소식 목록 조회
     */
    fetchAnnouncements: async (userId: string, departmentId?: string) => {
      logStoreAction('DepartmentStore', 'fetchAnnouncements', { userId, departmentId });

      try {
        const data = await DepartmentService.getAnnouncements(userId, departmentId);

        set((state: DepartmentStoreState) => {
          state.departmentAnnouncements = data || [];
        });
      } catch (error) {
        console.error('소식 목록 조회 오류:', error);
        set((state: DepartmentStoreState) => {
          state.error = error instanceof Error ? error.message : '소식 목록을 불러오는데 실패했습니다.';
        });
      }
    },

    /**
     * 소식 생성
     */
    createAnnouncement: async (userId: string, input: DepartmentAnnouncementInput) => {
      logStoreAction('DepartmentStore', 'createAnnouncement', { userId, input });

      try {
        const newAnnouncement = await DepartmentService.createAnnouncement(userId, input);

        if (newAnnouncement) {
          set((state: DepartmentStoreState) => {
            state.departmentAnnouncements = [newAnnouncement, ...state.departmentAnnouncements];
          });
        }

        return newAnnouncement;
      } catch (error) {
        console.error('소식 생성 오류:', error);
        set((state: DepartmentStoreState) => {
          state.error = error instanceof Error ? error.message : '소식 생성에 실패했습니다.';
        });
        return null;
      }
    },

    /**
     * 소식 수정
     */
    updateAnnouncement: async (userId: string, announcementId: string, updates: Partial<DepartmentAnnouncementInput>) => {
      logStoreAction('DepartmentStore', 'updateAnnouncement', { userId, announcementId, updates });

      // Optimistic update
      const prevAnnouncements = get().departmentAnnouncements;
      set((state: DepartmentStoreState) => {
        state.departmentAnnouncements = state.departmentAnnouncements.map((a) =>
          a.id === announcementId ? { ...a, ...updates } : a
        );
      });

      try {
        const success = await DepartmentService.updateAnnouncement(announcementId, userId, updates);

        if (!success) {
          set((state: DepartmentStoreState) => {
            state.departmentAnnouncements = prevAnnouncements;
          });
        }

        return success;
      } catch (error) {
        console.error('소식 수정 오류:', error);
        set((state: DepartmentStoreState) => {
          state.departmentAnnouncements = prevAnnouncements;
        });
        return false;
      }
    },

    /**
     * 소식 삭제
     */
    deleteAnnouncement: async (userId: string, announcementId: string) => {
      logStoreAction('DepartmentStore', 'deleteAnnouncement', { userId, announcementId });

      // Optimistic update
      const prevAnnouncements = get().departmentAnnouncements;
      set((state: DepartmentStoreState) => {
        state.departmentAnnouncements = state.departmentAnnouncements.filter((a) => a.id !== announcementId);
      });

      try {
        const success = await DepartmentService.deleteAnnouncement(announcementId, userId);

        if (!success) {
          set((state: DepartmentStoreState) => {
            state.departmentAnnouncements = prevAnnouncements;
          });
        }

        return success;
      } catch (error) {
        console.error('소식 삭제 오류:', error);
        set((state: DepartmentStoreState) => {
          state.departmentAnnouncements = prevAnnouncements;
        });
        return false;
      }
    },

    // ============================================
    // 멤버 관리 액션
    // ============================================

    /**
     * 부서 멤버 조회
     */
    fetchDepartmentMembers: async (userId: string, departmentId: string) => {
      logStoreAction('DepartmentStore', 'fetchDepartmentMembers', { userId, departmentId });

      try {
        const data = await DepartmentService.getDepartmentMembers(userId, departmentId);

        set((state: DepartmentStoreState) => {
          state.departmentMembers = data || [];
        });
      } catch (error) {
        console.error('부서 멤버 조회 오류:', error);
      }
    },

    /**
     * 사람을 부서에 연결
     */
    linkPersonToDepartment: async (userId: string, personId: string, departmentId: string, role?: string) => {
      logStoreAction('DepartmentStore', 'linkPersonToDepartment', { userId, personId, departmentId, role });

      try {
        const success = await DepartmentService.linkPersonToDepartment(userId, personId, departmentId, role);
        return success;
      } catch (error) {
        console.error('사람-부서 연결 오류:', error);
        return false;
      }
    },

    /**
     * 사람-부서 연결 해제
     */
    unlinkPersonFromDepartment: async (userId: string, personId: string, departmentId: string) => {
      logStoreAction('DepartmentStore', 'unlinkPersonFromDepartment', { userId, personId, departmentId });

      try {
        const success = await DepartmentService.unlinkPersonFromDepartment(userId, personId, departmentId);
        return success;
      } catch (error) {
        console.error('사람-부서 연결 해제 오류:', error);
        return false;
      }
    },

    /**
     * 멤버 역할 수정
     */
    updateMemberRole: async (userId: string, personId: string, departmentId: string, role: string | null) => {
      logStoreAction('DepartmentStore', 'updateMemberRole', { userId, personId, departmentId, role });

      try {
        const success = await DepartmentService.updateMemberRole(userId, personId, departmentId, role);
        return success;
      } catch (error) {
        console.error('멤버 역할 수정 오류:', error);
        return false;
      }
    },

    // ============================================
    // 일정 액션
    // ============================================

    /**
     * 부서 일정 조회
     */
    fetchDepartmentTodos: async (userId: string, departmentId: string) => {
      logStoreAction('DepartmentStore', 'fetchDepartmentTodos', { userId, departmentId });

      try {
        const data = await DepartmentService.getDepartmentTodos(userId, departmentId);

        set((state: DepartmentStoreState) => {
          state.departmentTodos = data || [];
        });
      } catch (error) {
        console.error('부서 일정 조회 오류:', error);
      }
    },

    /**
     * 할일에 부서 연결
     */
    linkTodoToDepartment: async (userId: string, todoId: string, departmentId: string | null) => {
      logStoreAction('DepartmentStore', 'linkTodoToDepartment', { userId, todoId, departmentId });

      try {
        const success = await DepartmentService.linkTodoToDepartment(userId, todoId, departmentId);
        return success;
      } catch (error) {
        console.error('할일-부서 연결 오류:', error);
        return false;
      }
    },

    // ============================================
    // 통계 액션
    // ============================================

    /**
     * 부서 통계 조회
     */
    fetchDepartmentStats: async (userId: string, departmentId: string) => {
      logStoreAction('DepartmentStore', 'fetchDepartmentStats', { userId, departmentId });

      try {
        const stats = await DepartmentService.getDepartmentStats(userId, departmentId);

        set((state: DepartmentStoreState) => {
          state.departmentStats.set(departmentId, stats);
        });
      } catch (error) {
        console.error('부서 통계 조회 오류:', error);
      }
    },

    // ============================================
    // 필터 액션
    // ============================================

    setCategoryFilter: (category: DepartmentCategory | 'all') => {
      set((state: DepartmentStoreState) => {
        state.categoryFilter = category;
      });
    },

    setShowFavoritesOnly: (show: boolean) => {
      set((state: DepartmentStoreState) => {
        state.showFavoritesOnly = show;
      });
    },

    // ============================================
    // 모달 액션
    // ============================================

    openAddDepartmentModal: () => {
      set((state: DepartmentStoreState) => {
        state.showAddDepartmentModal = true;
        state.editingDepartment = null;
      });
    },

    closeAddDepartmentModal: () => {
      set((state: DepartmentStoreState) => {
        state.showAddDepartmentModal = false;
      });
    },

    openEditDepartmentModal: (department: Department) => {
      set((state: DepartmentStoreState) => {
        state.showAddDepartmentModal = true;
        state.editingDepartment = department;
      });
    },

    closeEditDepartmentModal: () => {
      set((state: DepartmentStoreState) => {
        state.showAddDepartmentModal = false;
        state.editingDepartment = null;
      });
    },

    openAnnouncementModal: (announcement?: DepartmentAnnouncement) => {
      set((state: DepartmentStoreState) => {
        state.showAnnouncementModal = true;
        state.editingAnnouncement = announcement || null;
      });
    },

    closeAnnouncementModal: () => {
      set((state: DepartmentStoreState) => {
        state.showAnnouncementModal = false;
        state.editingAnnouncement = null;
      });
    },

    // ============================================
    // 헬퍼 메서드
    // ============================================

    setCurrentDepartment: (department: Department | null) => {
      set((state: DepartmentStoreState) => {
        state.currentDepartment = department;
      });
    },

    setError: (error: string | null) => {
      set((state: DepartmentStoreState) => {
        state.error = error;
      });
    },

    setLoading: (loading: boolean) => {
      set((state: DepartmentStoreState) => {
        state.loading = loading;
      });
    },

    /**
     * 필터링된 부서 목록 반환
     */
    getFilteredDepartments: () => {
      const { departments, categoryFilter, showFavoritesOnly } = get();

      let filtered = departments;

      if (categoryFilter !== 'all') {
        filtered = filtered.filter((d: Department) => d.category === categoryFilter);
      }

      if (showFavoritesOnly) {
        filtered = filtered.filter((d: Department) => d.is_favorite);
      }

      return filtered;
    },

    /**
     * 스토어 초기화
     */
    reset: () => {
      set((state: DepartmentStoreState) => {
        state.initialized = false;
        state.departments = [];
        state.currentDepartment = null;
        state.departmentAnnouncements = [];
        state.departmentMembers = [];
        state.departmentTodos = [];
        state.departmentStats = new Map();
        state.loading = false;
        state.error = null;
        state.lastUpdated = null;
        state.categoryFilter = 'all';
        state.showFavoritesOnly = false;
        state.showAddDepartmentModal = false;
        state.editingDepartment = null;
        state.showAnnouncementModal = false;
        state.editingAnnouncement = null;
      });
    },
  }),
  {
    name: 'DepartmentStore',
    devtools: true,
  }
);
