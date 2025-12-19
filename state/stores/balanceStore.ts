import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  BalanceJournalService,
  BalanceJournal,
  BalanceSettings,
  JournalType,
  JOURNAL_PROMPTS
} from '@/services/balance-journal.service';

// ============================================
// 타입 정의
// ============================================

interface BalanceState {
  // 저널 데이터
  journals: BalanceJournal[];
  isLoadingJournals: boolean;

  // 설정 데이터
  settings: BalanceSettings | null;
  isLoadingSettings: boolean;

  // 상기 모달 상태
  reminderJournal: BalanceJournal | null;
  showReminderModal: boolean;

  // 현재 사용자 ID
  currentUserId: string | null;

  // === 저널 Actions ===
  loadJournals: (userId: string) => Promise<void>;
  createJournal: (
    userId: string,
    journalType: JournalType,
    promptKey: string,
    content: string
  ) => Promise<BalanceJournal | null>;
  updateJournal: (
    journalId: string,
    userId: string,
    updates: Partial<Pick<BalanceJournal, 'content' | 'is_pinned'>>
  ) => Promise<void>;
  deleteJournal: (journalId: string, userId: string) => Promise<void>;
  togglePinJournal: (journalId: string, userId: string) => Promise<void>;

  // === 설정 Actions ===
  loadSettings: (userId: string) => Promise<void>;
  updateSettings: (
    userId: string,
    updates: Partial<Pick<BalanceSettings,
      'morning_prompt_enabled' |
      'evening_prompt_enabled' |
      'balance_check_enabled' |
      'journal_reminder_enabled' |
      'journal_reminder_frequency'
    >>
  ) => Promise<void>;

  // === 상기 모달 Actions ===
  checkAndShowReminder: (userId: string) => Promise<boolean>;
  showReminder: (journal: BalanceJournal) => void;
  hideReminder: () => void;
  recordReminderShown: (userId: string) => Promise<void>;

  // === 유틸리티 ===
  hasJournals: () => boolean;
  getJournalsByType: (type: JournalType) => BalanceJournal[];
  reset: () => void;
}

// ============================================
// 초기 상태
// ============================================

const DEFAULT_STATE = {
  journals: [],
  isLoadingJournals: false,
  settings: null,
  isLoadingSettings: false,
  reminderJournal: null,
  showReminderModal: false,
  currentUserId: null,
};

// ============================================
// 스토어 생성
// ============================================

export const useBalanceStore = create<BalanceState>()(
  devtools(
    persist(
      (set, get) => ({
        ...DEFAULT_STATE,

        // === 저널 Actions ===
        loadJournals: async (userId: string) => {
          set({ isLoadingJournals: true, currentUserId: userId });

          try {
            const journals = await BalanceJournalService.getJournals(userId);
            set({ journals, isLoadingJournals: false });
            console.log(`📚 저널 ${journals.length}개 로드 완료`);
          } catch (error) {
            console.error('❌ 저널 로드 실패:', error);
            set({ isLoadingJournals: false });
          }
        },

        createJournal: async (userId, journalType, promptKey, content) => {
          try {
            const journal = await BalanceJournalService.createJournal(
              userId, journalType, promptKey, content
            );

            // 낙관적 업데이트
            set((state) => ({
              journals: [journal, ...state.journals]
            }));

            console.log('📝 저널 생성 완료');
            return journal;
          } catch (error) {
            console.error('❌ 저널 생성 실패:', error);
            return null;
          }
        },

        updateJournal: async (journalId, userId, updates) => {
          // 낙관적 업데이트
          set((state) => ({
            journals: state.journals.map(j =>
              j.id === journalId ? { ...j, ...updates } : j
            )
          }));

          try {
            await BalanceJournalService.updateJournal(journalId, userId, updates);
          } catch (error) {
            console.error('❌ 저널 수정 실패:', error);
            // 롤백: 다시 로드
            get().loadJournals(userId);
          }
        },

        deleteJournal: async (journalId, userId) => {
          // 낙관적 업데이트
          const previousJournals = get().journals;
          set((state) => ({
            journals: state.journals.filter(j => j.id !== journalId)
          }));

          try {
            await BalanceJournalService.deleteJournal(journalId, userId);
            console.log('🗑️ 저널 삭제 완료');
          } catch (error) {
            console.error('❌ 저널 삭제 실패:', error);
            // 롤백
            set({ journals: previousJournals });
          }
        },

        togglePinJournal: async (journalId, userId) => {
          const journal = get().journals.find(j => j.id === journalId);
          if (!journal) return;

          await get().updateJournal(journalId, userId, {
            is_pinned: !journal.is_pinned
          });
        },

        // === 설정 Actions ===
        loadSettings: async (userId: string) => {
          set({ isLoadingSettings: true });

          try {
            const settings = await BalanceJournalService.getOrCreateSettings(userId);
            set({ settings, isLoadingSettings: false });
            console.log('⚙️ 균형 설정 로드 완료');
          } catch (error) {
            console.error('❌ 설정 로드 실패:', error);
            set({ isLoadingSettings: false });
          }
        },

        updateSettings: async (userId, updates) => {
          // 낙관적 업데이트
          set((state) => ({
            settings: state.settings ? { ...state.settings, ...updates } : null
          }));

          try {
            await BalanceJournalService.updateSettings(userId, updates);
          } catch (error) {
            console.error('❌ 설정 업데이트 실패:', error);
            // 롤백: 다시 로드
            get().loadSettings(userId);
          }
        },

        // === 상기 모달 Actions ===
        checkAndShowReminder: async (userId: string) => {
          try {
            const shouldShow = await BalanceJournalService.shouldShowJournalReminder(userId);

            if (shouldShow) {
              const journal = await BalanceJournalService.getJournalForReminder(userId);

              if (journal) {
                set({
                  reminderJournal: journal,
                  showReminderModal: true
                });

                // 표시 기록
                await BalanceJournalService.recordJournalDisplay(journal.id, userId);

                return true;
              }
            }

            return false;
          } catch (error) {
            console.error('❌ 상기 확인 오류:', error);
            return false;
          }
        },

        showReminder: (journal) => {
          set({
            reminderJournal: journal,
            showReminderModal: true
          });
        },

        hideReminder: () => {
          set({
            showReminderModal: false,
            // reminderJournal은 유지 (애니메이션 종료 후 정리)
          });

          // 약간의 딜레이 후 정리
          setTimeout(() => {
            set({ reminderJournal: null });
          }, 300);
        },

        recordReminderShown: async (userId: string) => {
          try {
            await BalanceJournalService.recordJournalReminder(userId);

            // 로컬 설정 업데이트
            set((state) => ({
              settings: state.settings ? {
                ...state.settings,
                last_journal_reminder_at: new Date().toISOString()
              } : null
            }));
          } catch (error) {
            console.error('❌ 상기 기록 실패:', error);
          }
        },

        // === 유틸리티 ===
        hasJournals: () => {
          return get().journals.length > 0;
        },

        getJournalsByType: (type: JournalType) => {
          return get().journals.filter(j => j.journal_type === type);
        },

        reset: () => {
          set(DEFAULT_STATE);
        },
      }),
      {
        name: 'balance-store',
        partialize: (state) => ({
          // 설정 관련만 persist (저널은 DB에서 로드)
          // showReminderModal은 세션별 초기화
        }),
      }
    ),
    {
      name: 'balance-store',
    }
  )
);

// ============================================
// 셀렉터 훅
// ============================================

/**
 * 저널 프롬프트 가져오기
 */
export const useJournalPrompts = () => {
  return JOURNAL_PROMPTS;
};

/**
 * 특정 유형의 저널만 가져오기
 */
export const useJournalsByType = (type: JournalType) => {
  return useBalanceStore((state) =>
    state.journals.filter(j => j.journal_type === type)
  );
};

/**
 * 고정된 저널만 가져오기
 */
export const usePinnedJournals = () => {
  return useBalanceStore((state) =>
    state.journals.filter(j => j.is_pinned)
  );
};
