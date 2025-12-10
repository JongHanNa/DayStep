import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
  deleteWithJWT
} from '@/lib/supabaseWebViewHelper';

// ============================================
// 타입 정의
// ============================================

export type JournalType =
  | 'why_relationship'      // 왜 관계가 중요한가
  | 'regret_reflection'     // 후회 성찰
  | 'gratitude_connection'; // 감사 연결

export interface BalanceJournal {
  id: string;
  user_id: string;
  journal_type: JournalType;
  prompt_key: string;
  content: string;
  is_pinned: boolean;
  display_count: number;
  last_displayed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BalanceSettings {
  id: string;
  user_id: string;
  morning_prompt_enabled: boolean;
  evening_prompt_enabled: boolean;
  balance_check_enabled: boolean;
  journal_reminder_enabled: boolean;
  journal_reminder_frequency: number;
  last_journal_reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// 질문 프롬프트 (보편적 표현)
// ============================================

export const JOURNAL_PROMPTS: Record<JournalType, { key: string; question: string }[]> = {
  why_relationship: [
    { key: 'why_1', question: '일에만 집중했을 때 후회했던 경험이 있나요?' },
    { key: 'why_2', question: '관계에 시간을 쓸 때 어떤 기분이 들었나요?' },
    { key: 'why_3', question: '나에게 관계가 중요한 이유는 무엇인가요?' },
    { key: 'why_4', question: '바쁠 때 놓쳤던 소중한 순간이 있나요?' },
  ],
  regret_reflection: [
    { key: 'regret_1', question: '연락하지 못해 후회했던 사람이 있나요?' },
    { key: 'regret_2', question: '일에 밀려 미뤘던 약속이 있나요?' },
    { key: 'regret_3', question: '그 순간을 되돌릴 수 있다면 어떻게 했을까요?' },
  ],
  gratitude_connection: [
    { key: 'gratitude_1', question: '최근 따뜻함을 느꼈던 대화가 있나요?' },
    { key: 'gratitude_2', question: '누군가에게 고마웠던 순간을 떠올려보세요.' },
    { key: 'gratitude_3', question: '관계에서 에너지를 얻었던 경험은?' },
  ],
};

// ============================================
// 서비스 클래스
// ============================================

/**
 * WHY 저널 서비스
 * 관계의 중요성에 대한 사용자 성찰 기록 관리
 */
export class BalanceJournalService {

  // ============================================
  // 저널 CRUD
  // ============================================

  /**
   * 저널 생성
   */
  static async createJournal(
    userId: string,
    journalType: JournalType,
    promptKey: string,
    content: string
  ): Promise<BalanceJournal> {
    const journalData = {
      user_id: userId,
      journal_type: journalType,
      prompt_key: promptKey,
      content: content.trim(),
      is_pinned: false,
      display_count: 0,
    };

    try {
      const data = await createWithJWT('balance_journals', journalData);
      console.log('📝 저널 생성 완료:', { journalType, promptKey });
      return data[0];
    } catch (error) {
      console.error('❌ 저널 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자의 모든 저널 조회
   */
  static async getJournals(userId: string): Promise<BalanceJournal[]> {
    try {
      const data = await queryRLSTableWithJWT('balance_journals', [
        { column: 'user_id', operator: 'eq', value: userId }
      ], { order: 'created_at.desc' });

      return data || [];
    } catch (error) {
      console.error('❌ 저널 조회 오류:', error);
      return [];
    }
  }

  /**
   * 특정 유형의 저널 조회
   */
  static async getJournalsByType(
    userId: string,
    journalType: JournalType
  ): Promise<BalanceJournal[]> {
    try {
      const data = await queryRLSTableWithJWT('balance_journals', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'journal_type', operator: 'eq', value: journalType }
      ], { order: 'created_at.desc' });

      return data || [];
    } catch (error) {
      console.error('❌ 저널 유형별 조회 오류:', error);
      return [];
    }
  }

  /**
   * 저널 수정
   */
  static async updateJournal(
    journalId: string,
    userId: string,
    updates: Partial<Pick<BalanceJournal, 'content' | 'is_pinned'>>
  ): Promise<void> {
    try {
      await updateWithJWT('balance_journals',
        [
          { column: 'id', operator: 'eq', value: journalId },
          { column: 'user_id', operator: 'eq', value: userId }
        ],
        { ...updates, updated_at: new Date().toISOString() }
      );
      console.log('✏️ 저널 수정 완료:', journalId);
    } catch (error) {
      console.error('❌ 저널 수정 오류:', error);
      throw error;
    }
  }

  /**
   * 저널 삭제
   */
  static async deleteJournal(journalId: string, userId: string): Promise<void> {
    try {
      await deleteWithJWT('balance_journals', [
        { column: 'id', operator: 'eq', value: journalId },
        { column: 'user_id', operator: 'eq', value: userId }
      ]);
      console.log('🗑️ 저널 삭제 완료:', journalId);
    } catch (error) {
      console.error('❌ 저널 삭제 오류:', error);
      throw error;
    }
  }

  // ============================================
  // 저널 상기 시스템
  // ============================================

  /**
   * 상기할 저널 랜덤 선택
   * - 고정된 저널 우선
   * - 표시 횟수 적은 저널 우선
   */
  static async getJournalForReminder(userId: string): Promise<BalanceJournal | null> {
    try {
      const journals = await this.getJournals(userId);

      if (journals.length === 0) return null;

      // 고정된 저널 필터링
      const pinnedJournals = journals.filter(j => j.is_pinned);

      // 고정된 저널이 있으면 그 중에서 선택
      const pool = pinnedJournals.length > 0 ? pinnedJournals : journals;

      // 표시 횟수가 적은 순으로 정렬하고 상위 3개 중 랜덤 선택
      const sorted = [...pool].sort((a, b) => a.display_count - b.display_count);
      const candidates = sorted.slice(0, Math.min(3, sorted.length));

      const randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex];
    } catch (error) {
      console.error('❌ 상기 저널 선택 오류:', error);
      return null;
    }
  }

  /**
   * 저널 표시 기록 업데이트
   */
  static async recordJournalDisplay(journalId: string, userId: string): Promise<void> {
    try {
      // 현재 저널 조회
      const journals = await queryRLSTableWithJWT('balance_journals', [
        { column: 'id', operator: 'eq', value: journalId },
        { column: 'user_id', operator: 'eq', value: userId }
      ]);

      if (journals && journals.length > 0) {
        const journal = journals[0];
        await updateWithJWT('balance_journals',
          [{ column: 'id', operator: 'eq', value: journalId }],
          {
            display_count: (journal.display_count || 0) + 1,
            last_displayed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        );
        console.log('📊 저널 표시 기록:', { journalId, newCount: journal.display_count + 1 });
      }
    } catch (error) {
      console.error('❌ 저널 표시 기록 오류:', error);
    }
  }

  // ============================================
  // 설정 관리
  // ============================================

  /**
   * 사용자 설정 조회 (없으면 생성)
   */
  static async getOrCreateSettings(userId: string): Promise<BalanceSettings> {
    try {
      // 기존 설정 조회
      const existing = await queryRLSTableWithJWT('balance_settings', [
        { column: 'user_id', operator: 'eq', value: userId }
      ]);

      if (existing && existing.length > 0) {
        return existing[0];
      }

      // 없으면 기본값으로 생성
      const defaultSettings = {
        user_id: userId,
        morning_prompt_enabled: true,
        evening_prompt_enabled: true,
        balance_check_enabled: true,
        journal_reminder_enabled: true,
        journal_reminder_frequency: 3, // 3일마다
      };

      const created = await createWithJWT('balance_settings', defaultSettings);
      console.log('⚙️ 균형 설정 생성:', userId);
      return created[0];
    } catch (error) {
      console.error('❌ 설정 조회/생성 오류:', error);
      // 기본값 반환
      return {
        id: '',
        user_id: userId,
        morning_prompt_enabled: true,
        evening_prompt_enabled: true,
        balance_check_enabled: true,
        journal_reminder_enabled: true,
        journal_reminder_frequency: 3,
        last_journal_reminder_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * 설정 업데이트
   */
  static async updateSettings(
    userId: string,
    updates: Partial<Pick<BalanceSettings,
      'morning_prompt_enabled' |
      'evening_prompt_enabled' |
      'balance_check_enabled' |
      'journal_reminder_enabled' |
      'journal_reminder_frequency' |
      'last_journal_reminder_at'
    >>
  ): Promise<void> {
    try {
      await updateWithJWT('balance_settings',
        [{ column: 'user_id', operator: 'eq', value: userId }],
        { ...updates, updated_at: new Date().toISOString() }
      );
      console.log('⚙️ 균형 설정 업데이트:', updates);
    } catch (error) {
      console.error('❌ 설정 업데이트 오류:', error);
      throw error;
    }
  }

  /**
   * 저널 상기가 필요한지 확인
   */
  static async shouldShowJournalReminder(userId: string): Promise<boolean> {
    try {
      const settings = await this.getOrCreateSettings(userId);

      // 기능 비활성화 상태
      if (!settings.journal_reminder_enabled) return false;

      // 저널이 없으면 상기할 필요 없음
      const journals = await this.getJournals(userId);
      if (journals.length === 0) return false;

      // 마지막 상기 시간 확인
      if (!settings.last_journal_reminder_at) return true;

      const lastReminder = new Date(settings.last_journal_reminder_at);
      const daysSinceLastReminder =
        (Date.now() - lastReminder.getTime()) / (1000 * 60 * 60 * 24);

      return daysSinceLastReminder >= settings.journal_reminder_frequency;
    } catch (error) {
      console.error('❌ 상기 필요 확인 오류:', error);
      return false;
    }
  }

  /**
   * 저널 상기 시간 기록
   */
  static async recordJournalReminder(userId: string): Promise<void> {
    await this.updateSettings(userId, {
      last_journal_reminder_at: new Date().toISOString()
    });
  }

  // ============================================
  // 유틸리티
  // ============================================

  /**
   * 질문 프롬프트 키로 질문 텍스트 찾기
   */
  static getQuestionByKey(promptKey: string): string | null {
    for (const type of Object.keys(JOURNAL_PROMPTS) as JournalType[]) {
      const prompt = JOURNAL_PROMPTS[type].find(p => p.key === promptKey);
      if (prompt) return prompt.question;
    }
    return null;
  }

  /**
   * 저널 유형 한글 이름
   */
  static getJournalTypeName(type: JournalType): string {
    const names: Record<JournalType, string> = {
      why_relationship: '관계의 중요성',
      regret_reflection: '후회 성찰',
      gratitude_connection: '감사 연결',
    };
    return names[type] || type;
  }
}
