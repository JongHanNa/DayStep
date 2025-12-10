import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
} from '@/lib/supabaseWebViewHelper';

// ============================================
// 타입 정의
// ============================================

export type ReflectionType = 'morning_intention' | 'evening_review';

export interface DailyReflection {
  id: string;
  user_id: string;
  reflection_date: string;
  reflection_type: ReflectionType;
  target_person: string | null;
  planned_action: string | null;
  actual_action: string | null;
  connection_rating: number | null;
  created_at: string;
}

// ============================================
// 질문 프롬프트 (보편적 표현)
// ============================================

export const MORNING_PROMPTS = [
  '오늘 누구에게 따뜻한 한마디 건네볼까요?',
  '오늘 연락해보고 싶은 사람이 있나요?',
  '오늘 감사 인사를 전하고 싶은 분이 있나요?',
  '오늘 함께 시간을 보내고 싶은 사람은?',
];

export const EVENING_PROMPTS = [
  '오늘 누군가에게 따뜻한 관심을 보였나요?',
  '오늘 의미 있는 대화를 나눴나요?',
  '오늘 연락한 사람이 있나요?',
  '오늘 관계에 시간을 투자했나요?',
];

export const CONNECTION_RATINGS = [
  { value: 1, label: '아쉬워요', emoji: '😔' },
  { value: 2, label: '보통이에요', emoji: '😐' },
  { value: 3, label: '괜찮았어요', emoji: '🙂' },
  { value: 4, label: '따뜻했어요', emoji: '😊' },
  { value: 5, label: '감사해요', emoji: '🥰' },
];

// ============================================
// 서비스 클래스
// ============================================

/**
 * 하루 리플렉션 서비스
 * 아침 의도 설정 + 저녁 리뷰 관리
 */
export class DailyReflectionService {

  // ============================================
  // 아침 의도 설정
  // ============================================

  /**
   * 오늘의 아침 의도 조회
   */
  static async getTodayMorningIntention(userId: string): Promise<DailyReflection | null> {
    const today = this.getTodayDateString();

    try {
      const data = await queryRLSTableWithJWT('daily_reflections', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'reflection_date', operator: 'eq', value: today },
        { column: 'reflection_type', operator: 'eq', value: 'morning_intention' },
      ]);

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('❌ 아침 의도 조회 오류:', error);
      return null;
    }
  }

  /**
   * 아침 의도 생성/업데이트
   */
  static async saveMorningIntention(
    userId: string,
    targetPerson: string,
    plannedAction?: string
  ): Promise<DailyReflection | null> {
    const today = this.getTodayDateString();

    try {
      // 기존 기록 확인
      const existing = await this.getTodayMorningIntention(userId);

      if (existing) {
        // 업데이트
        await updateWithJWT('daily_reflections',
          [{ column: 'id', operator: 'eq', value: existing.id }],
          {
            target_person: targetPerson,
            planned_action: plannedAction || null,
          }
        );
        console.log('🌅 아침 의도 업데이트:', targetPerson);
        return { ...existing, target_person: targetPerson, planned_action: plannedAction || null };
      }

      // 새로 생성
      const data = await createWithJWT('daily_reflections', {
        user_id: userId,
        reflection_date: today,
        reflection_type: 'morning_intention',
        target_person: targetPerson,
        planned_action: plannedAction || null,
      });

      console.log('🌅 아침 의도 생성:', targetPerson);
      return data[0];
    } catch (error) {
      console.error('❌ 아침 의도 저장 오류:', error);
      return null;
    }
  }

  /**
   * 오늘 아침 의도를 설정했는지 확인
   */
  static async hasTodayMorningIntention(userId: string): Promise<boolean> {
    const intention = await this.getTodayMorningIntention(userId);
    return intention !== null;
  }

  // ============================================
  // 저녁 리뷰
  // ============================================

  /**
   * 오늘의 저녁 리뷰 조회
   */
  static async getTodayEveningReview(userId: string): Promise<DailyReflection | null> {
    const today = this.getTodayDateString();

    try {
      const data = await queryRLSTableWithJWT('daily_reflections', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'reflection_date', operator: 'eq', value: today },
        { column: 'reflection_type', operator: 'eq', value: 'evening_review' },
      ]);

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('❌ 저녁 리뷰 조회 오류:', error);
      return null;
    }
  }

  /**
   * 저녁 리뷰 저장
   */
  static async saveEveningReview(
    userId: string,
    actualAction: string | null,
    connectionRating: number
  ): Promise<DailyReflection | null> {
    const today = this.getTodayDateString();

    try {
      // 기존 기록 확인
      const existing = await this.getTodayEveningReview(userId);

      if (existing) {
        // 업데이트
        await updateWithJWT('daily_reflections',
          [{ column: 'id', operator: 'eq', value: existing.id }],
          {
            actual_action: actualAction,
            connection_rating: connectionRating,
          }
        );
        console.log('🌙 저녁 리뷰 업데이트:', { actualAction, connectionRating });
        return { ...existing, actual_action: actualAction, connection_rating: connectionRating };
      }

      // 새로 생성
      const data = await createWithJWT('daily_reflections', {
        user_id: userId,
        reflection_date: today,
        reflection_type: 'evening_review',
        actual_action: actualAction,
        connection_rating: connectionRating,
      });

      console.log('🌙 저녁 리뷰 생성:', { actualAction, connectionRating });
      return data[0];
    } catch (error) {
      console.error('❌ 저녁 리뷰 저장 오류:', error);
      return null;
    }
  }

  /**
   * 오늘 저녁 리뷰를 했는지 확인
   */
  static async hasTodayEveningReview(userId: string): Promise<boolean> {
    const review = await this.getTodayEveningReview(userId);
    return review !== null;
  }

  // ============================================
  // 통계
  // ============================================

  /**
   * 최근 N일간 리플렉션 기록 조회
   */
  static async getRecentReflections(
    userId: string,
    days: number = 7
  ): Promise<DailyReflection[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = this.formatDateString(startDate);

      const data = await queryRLSTableWithJWT('daily_reflections', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'reflection_date', operator: 'gte', value: startDateStr },
      ], { order: 'reflection_date.desc' });

      return data || [];
    } catch (error) {
      console.error('❌ 리플렉션 기록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 평균 연결감 점수 계산
   */
  static async getAverageConnectionRating(
    userId: string,
    days: number = 7
  ): Promise<number | null> {
    const reflections = await this.getRecentReflections(userId, days);
    const ratings = reflections
      .filter(r => r.reflection_type === 'evening_review' && r.connection_rating !== null)
      .map(r => r.connection_rating as number);

    if (ratings.length === 0) return null;

    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  }

  // ============================================
  // 유틸리티
  // ============================================

  /**
   * 오늘 날짜 문자열 (YYYY-MM-DD)
   */
  static getTodayDateString(): string {
    return this.formatDateString(new Date());
  }

  /**
   * 날짜 문자열 포맷 (YYYY-MM-DD)
   */
  static formatDateString(date: Date): string {
    // 한국 시간대 기준
    const koreaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    return koreaDate.toISOString().split('T')[0];
  }

  /**
   * 랜덤 아침 프롬프트 선택
   */
  static getRandomMorningPrompt(): string {
    const index = Math.floor(Math.random() * MORNING_PROMPTS.length);
    return MORNING_PROMPTS[index];
  }

  /**
   * 랜덤 저녁 프롬프트 선택
   */
  static getRandomEveningPrompt(): string {
    const index = Math.floor(Math.random() * EVENING_PROMPTS.length);
    return EVENING_PROMPTS[index];
  }

  /**
   * 연결감 점수 라벨 가져오기
   */
  static getConnectionRatingLabel(rating: number): { label: string; emoji: string } {
    const found = CONNECTION_RATINGS.find(r => r.value === rating);
    return found || { label: '알 수 없음', emoji: '❓' };
  }
}
