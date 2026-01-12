import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
  deleteWithJWT
} from '@/lib/supabaseWebViewHelper';
import {
  DistractionPreset,
  DistractionPresetInput,
  DistractionPresetUpdate,
  DistractionHistory,
  DistractionPlan,
  DistractionReviewResult,
  DISTRACTION_HISTORY_MAX_ITEMS
} from '@/types/distraction';
import {
  loadUserPreferencesWithJWT as getUserPreference,
  saveUserPreferencesWithJWT as setUserPreference
} from '@/lib/supabase/preferences';

const HISTORY_PREFERENCE_KEY = 'distraction_history';

/**
 * 방해 요소 관리 서비스
 * - 프리셋 CRUD
 * - 히스토리 관리
 * - 세션 연동
 */
export class DistractionService {
  // ============================================
  // 프리셋 CRUD
  // ============================================

  /**
   * 사용자의 모든 프리셋 조회
   */
  static async getPresets(userId: string): Promise<DistractionPreset[]> {
    try {
      const data = await queryRLSTableWithJWT('distraction_presets', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'is_active', operator: 'eq', value: true }
      ], {
        order: 'usage_count.desc',
        limit: 50
      });

      return (data || []) as DistractionPreset[];
    } catch (error) {
      console.error('❌ 방해요소 프리셋 조회 오류:', error);
      return [];
    }
  }

  /**
   * 새 프리셋 생성
   */
  static async createPreset(
    userId: string,
    input: DistractionPresetInput
  ): Promise<string> {
    try {
      const data = await createWithJWT('distraction_presets', {
        user_id: userId,
        distraction_text: input.distraction_text,
        response_text: input.response_text,
        usage_count: 0,
        is_active: true
      });

      console.log('✨ 방해요소 프리셋 생성:', {
        id: data.id,
        distraction: input.distraction_text
      });

      return data.id;
    } catch (error) {
      console.error('❌ 프리셋 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 프리셋 업데이트
   */
  static async updatePreset(
    presetId: string,
    updates: DistractionPresetUpdate
  ): Promise<void> {
    try {
      await updateWithJWT('distraction_presets', [
        { column: 'id', operator: 'eq', value: presetId }
      ], {
        ...updates,
        updated_at: new Date().toISOString()
      });

      console.log('📝 프리셋 업데이트:', { presetId });
    } catch (error) {
      console.error('❌ 프리셋 업데이트 오류:', error);
      throw error;
    }
  }

  /**
   * 프리셋 삭제 (soft delete)
   */
  static async deletePreset(presetId: string): Promise<void> {
    try {
      await updateWithJWT('distraction_presets', [
        { column: 'id', operator: 'eq', value: presetId }
      ], {
        is_active: false,
        updated_at: new Date().toISOString()
      });

      console.log('🗑️ 프리셋 삭제:', { presetId });
    } catch (error) {
      console.error('❌ 프리셋 삭제 오류:', error);
      throw error;
    }
  }

  /**
   * 프리셋 사용 횟수 증가
   */
  static async incrementPresetUsage(presetId: string): Promise<void> {
    try {
      // 현재 값 조회
      const data = await queryRLSTableWithJWT('distraction_presets', [
        { column: 'id', operator: 'eq', value: presetId }
      ], { limit: 1 });

      if (data && data.length > 0) {
        const currentCount = (data[0] as DistractionPreset).usage_count || 0;
        await updateWithJWT('distraction_presets', [
          { column: 'id', operator: 'eq', value: presetId }
        ], {
          usage_count: currentCount + 1,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      // 사용 횟수 증가 실패는 무시 (비핵심 기능)
      console.warn('⚠️ 프리셋 사용 횟수 증가 실패:', error);
    }
  }

  // ============================================
  // 히스토리 관리
  // ============================================

  /**
   * 방해요소 히스토리 조회
   */
  static async getHistory(userId: string): Promise<DistractionHistory | null> {
    try {
      const history = await getUserPreference(
        userId,
        HISTORY_PREFERENCE_KEY
      ) as DistractionHistory | null;
      return history;
    } catch (error) {
      console.error('❌ 히스토리 조회 오류:', error);
      return null;
    }
  }

  /**
   * 히스토리에 새 항목 추가
   */
  static async addToHistory(
    userId: string,
    distraction: string,
    response: string
  ): Promise<void> {
    try {
      const currentHistory = await this.getHistory(userId);

      const recentDistractions = currentHistory?.recent_distractions || [];
      const recentResponses = currentHistory?.recent_responses || [];

      // 중복 제거 후 앞에 추가
      const newDistractions = [
        distraction,
        ...recentDistractions.filter(d => d !== distraction)
      ].slice(0, DISTRACTION_HISTORY_MAX_ITEMS);

      const newResponses = [
        response,
        ...recentResponses.filter(r => r !== response)
      ].slice(0, DISTRACTION_HISTORY_MAX_ITEMS);

      await setUserPreference(userId, HISTORY_PREFERENCE_KEY, {
        recent_distractions: newDistractions,
        recent_responses: newResponses,
        last_updated: new Date().toISOString()
      });

      console.log('📝 히스토리 업데이트:', { distraction, response });
    } catch (error) {
      // 히스토리 저장 실패는 무시 (비핵심 기능)
      console.warn('⚠️ 히스토리 저장 실패:', error);
    }
  }

  // ============================================
  // 세션 연동 (pomodoro_sessions.distraction_plan)
  // ============================================

  /**
   * 세션에 방해요소 계획 저장
   */
  static async saveSessionPlan(
    sessionId: string,
    plan: Omit<DistractionPlan, 'review_result'>
  ): Promise<void> {
    try {
      const planData: DistractionPlan = {
        ...plan,
        review_result: null
      };

      await updateWithJWT('pomodoro_sessions', [
        { column: 'id', operator: 'eq', value: sessionId }
      ], {
        distraction_plan: planData,
        updated_at: new Date().toISOString()
      });

      console.log('💾 세션 방해요소 계획 저장:', { sessionId, plan });
    } catch (error) {
      console.error('❌ 세션 계획 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 세션의 방해요소 회고 결과 저장
   */
  static async saveSessionReview(
    sessionId: string,
    result: DistractionReviewResult
  ): Promise<void> {
    try {
      // 기존 계획 조회
      const sessions = await queryRLSTableWithJWT('pomodoro_sessions', [
        { column: 'id', operator: 'eq', value: sessionId }
      ], { limit: 1 });

      if (!sessions || sessions.length === 0) {
        throw new Error('세션을 찾을 수 없습니다');
      }

      const session = sessions[0] as { distraction_plan: DistractionPlan | null };
      const currentPlan = session.distraction_plan;

      if (currentPlan) {
        const updatedPlan: DistractionPlan = {
          ...currentPlan,
          review_result: result
        };

        await updateWithJWT('pomodoro_sessions', [
          { column: 'id', operator: 'eq', value: sessionId }
        ], {
          distraction_plan: updatedPlan,
          updated_at: new Date().toISOString()
        });

        console.log('📊 세션 회고 결과 저장:', { sessionId, result });
      }
    } catch (error) {
      console.error('❌ 세션 회고 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 세션의 방해요소 계획 조회
   */
  static async getSessionPlan(sessionId: string): Promise<DistractionPlan | null> {
    try {
      const sessions = await queryRLSTableWithJWT('pomodoro_sessions', [
        { column: 'id', operator: 'eq', value: sessionId }
      ], { limit: 1 });

      if (!sessions || sessions.length === 0) {
        return null;
      }

      return (sessions[0] as { distraction_plan: DistractionPlan | null }).distraction_plan;
    } catch (error) {
      console.error('❌ 세션 계획 조회 오류:', error);
      return null;
    }
  }

  // ============================================
  // 스마트 제안
  // ============================================

  /**
   * 입력 텍스트 기반 자동완성 제안
   */
  static async getSuggestions(
    userId: string,
    inputText: string,
    type: 'distraction' | 'response'
  ): Promise<string[]> {
    try {
      const history = await this.getHistory(userId);
      const presets = await this.getPresets(userId);

      const items = type === 'distraction'
        ? [
            ...presets.map(p => p.distraction_text),
            ...(history?.recent_distractions || [])
          ]
        : [
            ...presets.map(p => p.response_text),
            ...(history?.recent_responses || [])
          ];

      // 중복 제거 및 입력 텍스트로 필터링
      const lowerInput = inputText.toLowerCase();
      const filtered = [...new Set(items)]
        .filter(item => item.toLowerCase().includes(lowerInput))
        .slice(0, 5);

      return filtered;
    } catch (error) {
      console.error('❌ 제안 조회 오류:', error);
      return [];
    }
  }
}
