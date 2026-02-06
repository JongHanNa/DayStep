/**
 * Relationship Store - 관계 관리 상태
 *
 * 관계 CRUD + 사람-관계 연결 관리
 */

import type {
  Relationship,
  RelationshipInput,
  PersonRelationship,
} from '@/types/relationship';
import {
  createStore,
  loadingHelpers,
  logStoreAction,
} from '../utils/storeUtils';
import type { BaseStoreState } from '../types';
import { RelationshipService } from '@/services/relationship.service';

/**
 * 관계 스토어 상태 타입 정의
 */
interface RelationshipStoreState extends BaseStoreState {
  // 데이터 상태
  relationships: Relationship[];
  personRelationshipMap: Map<string, string[]>; // personId -> relationshipId[]

  // UI 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // 모달 상태
  showManageModal: boolean;
  editingRelationship: Relationship | null;

  // 관계 CRUD 액션
  fetchRelationships: (userId: string) => Promise<void>;
  createRelationship: (userId: string, input: RelationshipInput) => Promise<Relationship | null>;
  updateRelationship: (userId: string, relationshipId: string, updates: Partial<RelationshipInput>) => Promise<boolean>;
  deleteRelationship: (userId: string, relationshipId: string) => Promise<boolean>;

  // 사람-관계 연결 액션
  fetchAllPersonRelationships: (userId: string) => Promise<void>;
  linkPersonToRelationship: (userId: string, personId: string, relationshipId: string) => Promise<boolean>;
  unlinkPersonFromRelationship: (userId: string, personId: string, relationshipId: string) => Promise<boolean>;
  updatePersonRelationships: (userId: string, personId: string, relationshipIds: string[]) => Promise<boolean>;
  getPersonRelationshipIds: (personId: string) => string[];

  // 모달 액션
  openManageModal: (relationship?: Relationship) => void;
  closeManageModal: () => void;

  // 헬퍼 메서드
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  getRelationshipById: (relationshipId: string) => Relationship | undefined;
  getRelationshipsByIds: (relationshipIds: string[]) => Relationship[];

  // 스토어 초기화
  reset: () => void;
}

/**
 * 관계 스토어 생성
 */
export const useRelationshipStore = createStore<RelationshipStoreState>(
  (set, get) => ({
    // 초기 상태
    initialized: false,
    version: 1,
    relationships: [],
    personRelationshipMap: new Map(),
    loading: false,
    error: null,
    lastUpdated: null,
    showManageModal: false,
    editingRelationship: null,

    // ============================================
    // 관계 CRUD 액션
    // ============================================

    /**
     * 관계 목록 조회
     */
    fetchRelationships: async (userId: string) => {
      logStoreAction('RelationshipStore', 'fetchRelationships', { userId });

      set((state: RelationshipStoreState) => {
        loadingHelpers.setLoading(state);
      });

      try {
        const data = await RelationshipService.getRelationships(userId);

        set((state: RelationshipStoreState) => {
          state.relationships = data || [];
          loadingHelpers.setSuccess(state);
          state.initialized = true;
        });
      } catch (error) {
        console.error('관계 목록 조회 오류:', error);
        set((state: RelationshipStoreState) => {
          loadingHelpers.setError(
            state,
            error instanceof Error ? error.message : '관계 목록을 불러오는데 실패했습니다.'
          );
        });
      }
    },

    /**
     * 관계 생성
     */
    createRelationship: async (userId: string, input: RelationshipInput) => {
      logStoreAction('RelationshipStore', 'createRelationship', { userId, input });

      set((state: RelationshipStoreState) => {
        loadingHelpers.setLoading(state);
      });

      try {
        const newRelationship = await RelationshipService.createRelationship(userId, input);

        if (newRelationship) {
          set((state: RelationshipStoreState) => {
            state.relationships = [...state.relationships, newRelationship];
            loadingHelpers.setSuccess(state);
          });
        }

        return newRelationship;
      } catch (error) {
        console.error('관계 생성 오류:', error);
        set((state: RelationshipStoreState) => {
          loadingHelpers.setError(
            state,
            error instanceof Error ? error.message : '관계 생성에 실패했습니다.'
          );
        });
        return null;
      }
    },

    /**
     * 관계 수정
     */
    updateRelationship: async (userId: string, relationshipId: string, updates: Partial<RelationshipInput>) => {
      logStoreAction('RelationshipStore', 'updateRelationship', { userId, relationshipId, updates });

      // Optimistic update
      const prevRelationships = get().relationships;
      set((state: RelationshipStoreState) => {
        state.relationships = state.relationships.map((r) =>
          r.id === relationshipId ? { ...r, ...updates } : r
        );
      });

      try {
        const success = await RelationshipService.updateRelationship(relationshipId, userId, updates);

        if (!success) {
          // 롤백
          set((state: RelationshipStoreState) => {
            state.relationships = prevRelationships;
          });
        }

        return success;
      } catch (error) {
        console.error('관계 수정 오류:', error);
        // 롤백
        set((state: RelationshipStoreState) => {
          state.relationships = prevRelationships;
          state.error = error instanceof Error ? error.message : '관계 수정에 실패했습니다.';
        });
        return false;
      }
    },

    /**
     * 관계 삭제
     */
    deleteRelationship: async (userId: string, relationshipId: string) => {
      logStoreAction('RelationshipStore', 'deleteRelationship', { userId, relationshipId });

      // Optimistic update
      const prevRelationships = get().relationships;
      set((state: RelationshipStoreState) => {
        state.relationships = state.relationships.filter((r) => r.id !== relationshipId);
      });

      try {
        const success = await RelationshipService.deleteRelationship(relationshipId, userId);

        if (!success) {
          // 롤백
          set((state: RelationshipStoreState) => {
            state.relationships = prevRelationships;
          });
        }

        return success;
      } catch (error) {
        console.error('관계 삭제 오류:', error);
        // 롤백
        set((state: RelationshipStoreState) => {
          state.relationships = prevRelationships;
          state.error = error instanceof Error ? error.message : '관계 삭제에 실패했습니다.';
        });
        return false;
      }
    },

    // ============================================
    // 사람-관계 연결 액션
    // ============================================

    /**
     * 전체 사람-관계 매핑 조회
     */
    fetchAllPersonRelationships: async (userId: string) => {
      logStoreAction('RelationshipStore', 'fetchAllPersonRelationships', { userId });

      try {
        const data = await RelationshipService.getAllPersonRelationships(userId);

        // personId별로 relationshipId 배열을 맵으로 구성
        const newMap = new Map<string, string[]>();
        for (const link of data) {
          const existing = newMap.get(link.person_id) || [];
          existing.push(link.relationship_id);
          newMap.set(link.person_id, existing);
        }

        set((state: RelationshipStoreState) => {
          state.personRelationshipMap = newMap;
        });
      } catch (error) {
        console.error('전체 사람-관계 매핑 조회 오류:', error);
      }
    },

    /**
     * 사람을 관계에 연결
     */
    linkPersonToRelationship: async (userId: string, personId: string, relationshipId: string) => {
      logStoreAction('RelationshipStore', 'linkPersonToRelationship', { userId, personId, relationshipId });

      // Optimistic update
      set((state: RelationshipStoreState) => {
        const existing = state.personRelationshipMap.get(personId) || [];
        if (!existing.includes(relationshipId)) {
          state.personRelationshipMap.set(personId, [...existing, relationshipId]);
        }
      });

      try {
        const success = await RelationshipService.linkPersonToRelationship(userId, personId, relationshipId);
        return success;
      } catch (error) {
        console.error('사람-관계 연결 오류:', error);
        // 롤백
        set((state: RelationshipStoreState) => {
          const existing = state.personRelationshipMap.get(personId) || [];
          state.personRelationshipMap.set(personId, existing.filter(id => id !== relationshipId));
        });
        return false;
      }
    },

    /**
     * 사람-관계 연결 해제
     */
    unlinkPersonFromRelationship: async (userId: string, personId: string, relationshipId: string) => {
      logStoreAction('RelationshipStore', 'unlinkPersonFromRelationship', { userId, personId, relationshipId });

      // Optimistic update
      const prevIds = get().personRelationshipMap.get(personId) || [];
      set((state: RelationshipStoreState) => {
        const existing = state.personRelationshipMap.get(personId) || [];
        state.personRelationshipMap.set(personId, existing.filter(id => id !== relationshipId));
      });

      try {
        const success = await RelationshipService.unlinkPersonFromRelationship(userId, personId, relationshipId);
        return success;
      } catch (error) {
        console.error('사람-관계 연결 해제 오류:', error);
        // 롤백
        set((state: RelationshipStoreState) => {
          state.personRelationshipMap.set(personId, prevIds);
        });
        return false;
      }
    },

    /**
     * 사람의 관계 전체 업데이트
     */
    updatePersonRelationships: async (userId: string, personId: string, relationshipIds: string[]) => {
      logStoreAction('RelationshipStore', 'updatePersonRelationships', { userId, personId, relationshipIds });

      // Optimistic update
      const prevIds = get().personRelationshipMap.get(personId) || [];
      set((state: RelationshipStoreState) => {
        state.personRelationshipMap.set(personId, relationshipIds);
      });

      try {
        const success = await RelationshipService.updatePersonRelationships(userId, personId, relationshipIds);

        if (!success) {
          // 롤백
          set((state: RelationshipStoreState) => {
            state.personRelationshipMap.set(personId, prevIds);
          });
        }

        return success;
      } catch (error) {
        console.error('사람 관계 업데이트 오류:', error);
        // 롤백
        set((state: RelationshipStoreState) => {
          state.personRelationshipMap.set(personId, prevIds);
        });
        return false;
      }
    },

    /**
     * 사람의 관계 ID 목록 조회 (캐시에서)
     */
    getPersonRelationshipIds: (personId: string) => {
      return get().personRelationshipMap.get(personId) || [];
    },

    // ============================================
    // 모달 액션
    // ============================================

    openManageModal: (relationship?: Relationship) => {
      set((state: RelationshipStoreState) => {
        state.showManageModal = true;
        state.editingRelationship = relationship || null;
      });
    },

    closeManageModal: () => {
      set((state: RelationshipStoreState) => {
        state.showManageModal = false;
        state.editingRelationship = null;
      });
    },

    // ============================================
    // 헬퍼 메서드
    // ============================================

    setError: (error: string | null) => {
      set((state: RelationshipStoreState) => {
        state.error = error;
      });
    },

    setLoading: (loading: boolean) => {
      set((state: RelationshipStoreState) => {
        state.loading = loading;
      });
    },

    getRelationshipById: (relationshipId: string) => {
      return get().relationships.find((r: Relationship) => r.id === relationshipId);
    },

    getRelationshipsByIds: (relationshipIds: string[]) => {
      const { relationships } = get();
      return relationships.filter((r: Relationship) => relationshipIds.includes(r.id));
    },

    /**
     * 스토어 초기화
     */
    reset: () => {
      set((state: RelationshipStoreState) => {
        state.initialized = false;
        state.relationships = [];
        state.personRelationshipMap = new Map();
        state.loading = false;
        state.error = null;
        state.lastUpdated = null;
        state.showManageModal = false;
        state.editingRelationship = null;
      });
    },
  }),
  {
    name: 'RelationshipStore',
    devtools: true,
  }
);
