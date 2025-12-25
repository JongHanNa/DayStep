import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import type {
  CherishedPerson,
  CherishedPersonInput,
  CareInteraction,
  CareInteractionInput,
  ContactRecommendation,
  PriorityReminder,
  RelationshipStats,
} from '@/types/cherished-people';

// ============================================
// 상태 인터페이스
// ============================================

interface CherishedPeopleState {
  // 데이터
  people: CherishedPerson[];
  isLoadingPeople: boolean;

  recommendations: ContactRecommendation[];
  isLoadingRecommendations: boolean;

  stats: RelationshipStats | null;

  // 선택된 사람의 관심 기록
  selectedPersonInteractions: CareInteraction[];
  isLoadingInteractions: boolean;

  // 자동완성 추천 목록
  relationshipSuggestions: string[];
  roleSuggestions: string[];
  departmentSuggestions: string[];
  isLoadingSuggestions: boolean;

  // 우선순위 상기 모달
  currentReminder: PriorityReminder | null;
  showPriorityReminderModal: boolean;

  // 관심 기록 모달
  showInteractionModal: boolean;
  selectedPersonForInteraction: CherishedPerson | null;

  // 사람 추가/편집 모달
  showAddPersonModal: boolean;
  editingPerson: CherishedPerson | null;

  // 사람 상세 시트
  showPersonDetailSheet: boolean;
  selectedPersonForDetail: CherishedPerson | null;

  // Actions
  loadPeople: (userId: string) => Promise<void>;
  addPerson: (userId: string, input: CherishedPersonInput) => Promise<CherishedPerson | null>;
  updatePerson: (personId: string, userId: string, updates: Partial<CherishedPersonInput>) => Promise<boolean>;
  deactivatePerson: (personId: string, userId: string) => Promise<boolean>;

  loadRecommendations: (userId: string, thresholdDays?: number) => Promise<void>;
  loadStats: (userId: string) => Promise<void>;
  loadSuggestions: (userId: string) => Promise<void>;

  loadPersonInteractions: (userId: string, personId: string) => Promise<void>;
  addInteraction: (userId: string, input: CareInteractionInput) => Promise<CareInteraction | null>;
  addInteractionWithTodo: (userId: string, input: CareInteractionInput, todoTitle: string) => Promise<{ interaction: CareInteraction; todoId: string } | null>;
  deleteInteraction: (interactionId: string, userId: string, personId: string) => Promise<boolean>;

  // Modal Actions
  openAddPersonModal: (person?: CherishedPerson) => void;
  closeAddPersonModal: () => void;

  openInteractionModal: (person: CherishedPerson) => void;
  closeInteractionModal: () => void;

  openPersonDetailSheet: (person: CherishedPerson) => void;
  closePersonDetailSheet: () => void;

  showPriorityReminder: () => Promise<void>;
  hidePriorityReminder: () => void;

  reset: () => void;
}

// ============================================
// 기본 상태
// ============================================

const DEFAULT_STATE = {
  people: [],
  isLoadingPeople: false,
  recommendations: [],
  isLoadingRecommendations: false,
  stats: null,
  selectedPersonInteractions: [],
  isLoadingInteractions: false,
  relationshipSuggestions: [],
  roleSuggestions: [],
  departmentSuggestions: [],
  isLoadingSuggestions: false,
  currentReminder: null,
  showPriorityReminderModal: false,
  showInteractionModal: false,
  selectedPersonForInteraction: null,
  showAddPersonModal: false,
  editingPerson: null,
  showPersonDetailSheet: false,
  selectedPersonForDetail: null,
};

// ============================================
// Zustand Store
// ============================================

export const useCherishedPeopleStore = create<CherishedPeopleState>()(
  devtools(
    (set, get) => ({
      ...DEFAULT_STATE,

      // ============================================
      // People CRUD
      // ============================================

      loadPeople: async (userId: string) => {
        set({ isLoadingPeople: true });
        try {
          const people = await CherishedPeopleService.getPeople(userId);
          set({ people, isLoadingPeople: false });
        } catch (error) {
          console.error('❌ 소중한 사람 로드 실패:', error);
          set({ isLoadingPeople: false });
        }
      },

      addPerson: async (userId, input) => {
        try {
          const person = await CherishedPeopleService.addPerson(userId, input);
          if (person) {
            set((state) => ({ people: [person, ...state.people] }));
          }
          return person;
        } catch (error) {
          console.error('❌ 소중한 사람 추가 실패:', error);
          return null;
        }
      },

      updatePerson: async (personId, userId, updates) => {
        const previousPeople = get().people;

        // Optimistic update
        set((state) => ({
          people: state.people.map((p) =>
            p.id === personId ? { ...p, ...updates } : p
          ),
        }));

        try {
          const success = await CherishedPeopleService.updatePerson(personId, userId, updates);
          if (!success) {
            set({ people: previousPeople }); // Rollback
          }
          return success;
        } catch (error) {
          console.error('❌ 수정 실패:', error);
          set({ people: previousPeople }); // Rollback
          return false;
        }
      },

      deactivatePerson: async (personId, userId) => {
        const previousPeople = get().people;

        // Optimistic update
        set((state) => ({
          people: state.people.filter((p) => p.id !== personId),
        }));

        try {
          const success = await CherishedPeopleService.deactivatePerson(personId, userId);
          if (!success) {
            set({ people: previousPeople }); // Rollback
          }
          return success;
        } catch (error) {
          console.error('❌ 비활성화 실패:', error);
          set({ people: previousPeople }); // Rollback
          return false;
        }
      },

      // ============================================
      // Recommendations & Stats
      // ============================================

      loadRecommendations: async (userId, thresholdDays = 7) => {
        set({ isLoadingRecommendations: true });
        try {
          const recommendations = await CherishedPeopleService.getContactRecommendations(
            userId,
            thresholdDays
          );
          set({ recommendations, isLoadingRecommendations: false });
        } catch (error) {
          console.error('❌ 추천 로드 실패:', error);
          set({ isLoadingRecommendations: false });
        }
      },

      loadStats: async (userId) => {
        try {
          const stats = await CherishedPeopleService.getRelationshipStats(userId);
          set({ stats });
        } catch (error) {
          console.error('❌ 통계 로드 실패:', error);
        }
      },

      loadSuggestions: async (userId) => {
        set({ isLoadingSuggestions: true });
        try {
          const [relationships, roles, departments] = await Promise.all([
            CherishedPeopleService.getRelationshipSuggestions(userId),
            CherishedPeopleService.getRoleSuggestions(userId),
            CherishedPeopleService.getDepartmentSuggestions(userId),
          ]);
          set({
            relationshipSuggestions: relationships,
            roleSuggestions: roles,
            departmentSuggestions: departments,
            isLoadingSuggestions: false,
          });
        } catch (error) {
          console.error('❌ 추천 목록 로드 실패:', error);
          set({ isLoadingSuggestions: false });
        }
      },

      // ============================================
      // Interactions
      // ============================================

      loadPersonInteractions: async (userId, personId) => {
        set({ isLoadingInteractions: true });
        try {
          const interactions = await CherishedPeopleService.getInteractionsByPerson(
            userId,
            personId,
            20
          );
          set({ selectedPersonInteractions: interactions, isLoadingInteractions: false });
        } catch (error) {
          console.error('❌ 관심 기록 로드 실패:', error);
          set({ isLoadingInteractions: false });
        }
      },

      addInteraction: async (userId, input) => {
        try {
          const interaction = await CherishedPeopleService.addInteraction(userId, input);

          if (interaction) {
            // Update local state for the person
            set((state) => ({
              people: state.people.map((p) =>
                p.id === input.person_id
                  ? {
                      ...p,
                      last_interaction_at: new Date().toISOString(),
                      interaction_count: p.interaction_count + 1,
                    }
                  : p
              ),
              // Add to interactions if currently viewing this person
              selectedPersonInteractions:
                state.selectedPersonForDetail?.id === input.person_id
                  ? [interaction, ...state.selectedPersonInteractions]
                  : state.selectedPersonInteractions,
              showInteractionModal: false,
              selectedPersonForInteraction: null,
            }));

            // Refresh recommendations
            await get().loadRecommendations(userId);
          }

          return interaction;
        } catch (error) {
          console.error('❌ 관심 기록 실패:', error);
          return null;
        }
      },

      addInteractionWithTodo: async (userId, input, todoTitle) => {
        try {
          const result = await CherishedPeopleService.addInteractionWithTodo(userId, input, todoTitle);

          if (result) {
            // Update local state for the person
            set((state) => ({
              people: state.people.map((p) =>
                p.id === input.person_id
                  ? {
                      ...p,
                      last_interaction_at: new Date().toISOString(),
                      interaction_count: p.interaction_count + 1,
                    }
                  : p
              ),
              // Add to interactions if currently viewing this person
              selectedPersonInteractions:
                state.selectedPersonForDetail?.id === input.person_id
                  ? [result.interaction, ...state.selectedPersonInteractions]
                  : state.selectedPersonInteractions,
            }));

            // Refresh recommendations
            await get().loadRecommendations(userId);
          }

          return result;
        } catch (error) {
          console.error('❌ 관심 기록 + 할일 저장 실패:', error);
          return null;
        }
      },

      deleteInteraction: async (interactionId, userId, personId) => {
        const previousInteractions = get().selectedPersonInteractions;

        // Optimistic update
        set((state) => ({
          selectedPersonInteractions: state.selectedPersonInteractions.filter(
            (i) => i.id !== interactionId
          ),
        }));

        try {
          const success = await CherishedPeopleService.deleteInteraction(interactionId, userId);
          if (!success) {
            set({ selectedPersonInteractions: previousInteractions }); // Rollback
          } else {
            // Update person's interaction count
            set((state) => ({
              people: state.people.map((p) =>
                p.id === personId
                  ? { ...p, interaction_count: Math.max(0, p.interaction_count - 1) }
                  : p
              ),
            }));
          }
          return success;
        } catch (error) {
          console.error('❌ 관심 기록 삭제 실패:', error);
          set({ selectedPersonInteractions: previousInteractions }); // Rollback
          return false;
        }
      },

      // ============================================
      // Modal Actions
      // ============================================

      openAddPersonModal: (person) => {
        set({
          showAddPersonModal: true,
          editingPerson: person || null,
        });
      },

      closeAddPersonModal: () => {
        set({
          showAddPersonModal: false,
          editingPerson: null,
        });
      },

      openInteractionModal: (person) => {
        set({
          showInteractionModal: true,
          selectedPersonForInteraction: person,
        });
      },

      closeInteractionModal: () => {
        set({
          showInteractionModal: false,
          selectedPersonForInteraction: null,
        });
      },

      openPersonDetailSheet: (person) => {
        set({
          showPersonDetailSheet: true,
          selectedPersonForDetail: person,
        });
      },

      closePersonDetailSheet: () => {
        set({
          showPersonDetailSheet: false,
          selectedPersonForDetail: null,
          selectedPersonInteractions: [],
        });
      },

      showPriorityReminder: async () => {
        const reminder = await CherishedPeopleService.getRandomPriorityReminder();
        if (reminder) {
          set({
            currentReminder: reminder,
            showPriorityReminderModal: true,
          });
        }
      },

      hidePriorityReminder: () => {
        set({ showPriorityReminderModal: false });
        // 애니메이션 후 정리
        setTimeout(() => set({ currentReminder: null }), 300);
      },

      reset: () => set(DEFAULT_STATE),
    }),
    { name: 'cherished-people-store' }
  )
);
