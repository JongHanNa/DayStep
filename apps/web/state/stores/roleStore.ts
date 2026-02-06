/**
 * Role Store - 역할 관리 상태
 *
 * 역할 CRUD + 사람-역할 연결 관리
 */

import type {
  Role,
  RoleInput,
  PersonRole,
} from '@/types/role';
import {
  createStore,
  loadingHelpers,
  logStoreAction,
} from '../utils/storeUtils';
import type { BaseStoreState } from '../types';
import { RoleService } from '@/services/role.service';

/**
 * 역할 스토어 상태 타입 정의
 */
interface RoleStoreState extends BaseStoreState {
  // 데이터 상태
  roles: Role[];
  personRoleMap: Map<string, string[]>; // personId -> roleId[]

  // UI 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // 모달 상태
  showManageModal: boolean;
  editingRole: Role | null;

  // 역할 CRUD 액션
  fetchRoles: (userId: string) => Promise<void>;
  createRole: (userId: string, input: RoleInput) => Promise<Role | null>;
  updateRole: (userId: string, roleId: string, updates: Partial<RoleInput>) => Promise<boolean>;
  deleteRole: (userId: string, roleId: string) => Promise<boolean>;

  // 사람-역할 연결 액션
  fetchAllPersonRoles: (userId: string) => Promise<void>;
  linkPersonToRole: (userId: string, personId: string, roleId: string) => Promise<boolean>;
  unlinkPersonFromRole: (userId: string, personId: string, roleId: string) => Promise<boolean>;
  updatePersonRoles: (userId: string, personId: string, roleIds: string[]) => Promise<boolean>;
  getPersonRoleIds: (personId: string) => string[];

  // 모달 액션
  openManageModal: (role?: Role) => void;
  closeManageModal: () => void;

  // 헬퍼 메서드
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  getRoleById: (roleId: string) => Role | undefined;
  getRolesByIds: (roleIds: string[]) => Role[];

  // 스토어 초기화
  reset: () => void;
}

/**
 * 역할 스토어 생성
 */
export const useRoleStore = createStore<RoleStoreState>(
  (set, get) => ({
    // 초기 상태
    initialized: false,
    version: 1,
    roles: [],
    personRoleMap: new Map(),
    loading: false,
    error: null,
    lastUpdated: null,
    showManageModal: false,
    editingRole: null,

    // ============================================
    // 역할 CRUD 액션
    // ============================================

    /**
     * 역할 목록 조회
     */
    fetchRoles: async (userId: string) => {
      logStoreAction('RoleStore', 'fetchRoles', { userId });

      set((state: RoleStoreState) => {
        loadingHelpers.setLoading(state);
      });

      try {
        const data = await RoleService.getRoles(userId);

        set((state: RoleStoreState) => {
          state.roles = data || [];
          loadingHelpers.setSuccess(state);
          state.initialized = true;
        });
      } catch (error) {
        console.error('역할 목록 조회 오류:', error);
        set((state: RoleStoreState) => {
          loadingHelpers.setError(
            state,
            error instanceof Error ? error.message : '역할 목록을 불러오는데 실패했습니다.'
          );
        });
      }
    },

    /**
     * 역할 생성
     */
    createRole: async (userId: string, input: RoleInput) => {
      logStoreAction('RoleStore', 'createRole', { userId, input });

      set((state: RoleStoreState) => {
        loadingHelpers.setLoading(state);
      });

      try {
        const newRole = await RoleService.createRole(userId, input);

        if (newRole) {
          set((state: RoleStoreState) => {
            state.roles = [...state.roles, newRole];
            loadingHelpers.setSuccess(state);
          });
        }

        return newRole;
      } catch (error) {
        console.error('역할 생성 오류:', error);
        set((state: RoleStoreState) => {
          loadingHelpers.setError(
            state,
            error instanceof Error ? error.message : '역할 생성에 실패했습니다.'
          );
        });
        return null;
      }
    },

    /**
     * 역할 수정
     */
    updateRole: async (userId: string, roleId: string, updates: Partial<RoleInput>) => {
      logStoreAction('RoleStore', 'updateRole', { userId, roleId, updates });

      // Optimistic update
      const prevRoles = get().roles;
      set((state: RoleStoreState) => {
        state.roles = state.roles.map((r) =>
          r.id === roleId ? { ...r, ...updates } : r
        );
      });

      try {
        const success = await RoleService.updateRole(roleId, userId, updates);

        if (!success) {
          // 롤백
          set((state: RoleStoreState) => {
            state.roles = prevRoles;
          });
        }

        return success;
      } catch (error) {
        console.error('역할 수정 오류:', error);
        // 롤백
        set((state: RoleStoreState) => {
          state.roles = prevRoles;
          state.error = error instanceof Error ? error.message : '역할 수정에 실패했습니다.';
        });
        return false;
      }
    },

    /**
     * 역할 삭제
     */
    deleteRole: async (userId: string, roleId: string) => {
      logStoreAction('RoleStore', 'deleteRole', { userId, roleId });

      // Optimistic update
      const prevRoles = get().roles;
      set((state: RoleStoreState) => {
        state.roles = state.roles.filter((r) => r.id !== roleId);
      });

      try {
        const success = await RoleService.deleteRole(roleId, userId);

        if (!success) {
          // 롤백
          set((state: RoleStoreState) => {
            state.roles = prevRoles;
          });
        }

        return success;
      } catch (error) {
        console.error('역할 삭제 오류:', error);
        // 롤백
        set((state: RoleStoreState) => {
          state.roles = prevRoles;
          state.error = error instanceof Error ? error.message : '역할 삭제에 실패했습니다.';
        });
        return false;
      }
    },

    // ============================================
    // 사람-역할 연결 액션
    // ============================================

    /**
     * 전체 사람-역할 매핑 조회
     */
    fetchAllPersonRoles: async (userId: string) => {
      logStoreAction('RoleStore', 'fetchAllPersonRoles', { userId });

      try {
        const data = await RoleService.getAllPersonRoles(userId);

        // personId별로 roleId 배열을 맵으로 구성
        const newMap = new Map<string, string[]>();
        for (const link of data) {
          const existing = newMap.get(link.person_id) || [];
          existing.push(link.role_id);
          newMap.set(link.person_id, existing);
        }

        set((state: RoleStoreState) => {
          state.personRoleMap = newMap;
        });
      } catch (error) {
        console.error('전체 사람-역할 매핑 조회 오류:', error);
      }
    },

    /**
     * 사람을 역할에 연결
     */
    linkPersonToRole: async (userId: string, personId: string, roleId: string) => {
      logStoreAction('RoleStore', 'linkPersonToRole', { userId, personId, roleId });

      // Optimistic update
      set((state: RoleStoreState) => {
        const existing = state.personRoleMap.get(personId) || [];
        if (!existing.includes(roleId)) {
          state.personRoleMap.set(personId, [...existing, roleId]);
        }
      });

      try {
        const success = await RoleService.linkPersonToRole(userId, personId, roleId);
        return success;
      } catch (error) {
        console.error('사람-역할 연결 오류:', error);
        // 롤백
        set((state: RoleStoreState) => {
          const existing = state.personRoleMap.get(personId) || [];
          state.personRoleMap.set(personId, existing.filter(id => id !== roleId));
        });
        return false;
      }
    },

    /**
     * 사람-역할 연결 해제
     */
    unlinkPersonFromRole: async (userId: string, personId: string, roleId: string) => {
      logStoreAction('RoleStore', 'unlinkPersonFromRole', { userId, personId, roleId });

      // Optimistic update
      const prevIds = get().personRoleMap.get(personId) || [];
      set((state: RoleStoreState) => {
        const existing = state.personRoleMap.get(personId) || [];
        state.personRoleMap.set(personId, existing.filter(id => id !== roleId));
      });

      try {
        const success = await RoleService.unlinkPersonFromRole(userId, personId, roleId);
        return success;
      } catch (error) {
        console.error('사람-역할 연결 해제 오류:', error);
        // 롤백
        set((state: RoleStoreState) => {
          state.personRoleMap.set(personId, prevIds);
        });
        return false;
      }
    },

    /**
     * 사람의 역할 전체 업데이트
     */
    updatePersonRoles: async (userId: string, personId: string, roleIds: string[]) => {
      logStoreAction('RoleStore', 'updatePersonRoles', { userId, personId, roleIds });

      // Optimistic update
      const prevIds = get().personRoleMap.get(personId) || [];
      set((state: RoleStoreState) => {
        state.personRoleMap.set(personId, roleIds);
      });

      try {
        const success = await RoleService.updatePersonRoles(userId, personId, roleIds);

        if (!success) {
          // 롤백
          set((state: RoleStoreState) => {
            state.personRoleMap.set(personId, prevIds);
          });
        }

        return success;
      } catch (error) {
        console.error('사람 역할 업데이트 오류:', error);
        // 롤백
        set((state: RoleStoreState) => {
          state.personRoleMap.set(personId, prevIds);
        });
        return false;
      }
    },

    /**
     * 사람의 역할 ID 목록 조회 (캐시에서)
     */
    getPersonRoleIds: (personId: string) => {
      return get().personRoleMap.get(personId) || [];
    },

    // ============================================
    // 모달 액션
    // ============================================

    openManageModal: (role?: Role) => {
      set((state: RoleStoreState) => {
        state.showManageModal = true;
        state.editingRole = role || null;
      });
    },

    closeManageModal: () => {
      set((state: RoleStoreState) => {
        state.showManageModal = false;
        state.editingRole = null;
      });
    },

    // ============================================
    // 헬퍼 메서드
    // ============================================

    setError: (error: string | null) => {
      set((state: RoleStoreState) => {
        state.error = error;
      });
    },

    setLoading: (loading: boolean) => {
      set((state: RoleStoreState) => {
        state.loading = loading;
      });
    },

    getRoleById: (roleId: string) => {
      return get().roles.find((r: Role) => r.id === roleId);
    },

    getRolesByIds: (roleIds: string[]) => {
      const { roles } = get();
      return roles.filter((r: Role) => roleIds.includes(r.id));
    },

    /**
     * 스토어 초기화
     */
    reset: () => {
      set((state: RoleStoreState) => {
        state.initialized = false;
        state.roles = [];
        state.personRoleMap = new Map();
        state.loading = false;
        state.error = null;
        state.lastUpdated = null;
        state.showManageModal = false;
        state.editingRole = null;
      });
    },
  }),
  {
    name: 'RoleStore',
    devtools: true,
  }
);
