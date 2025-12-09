import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT
} from '@/lib/supabaseWebViewHelper';
import { Todo } from '@/entities/todo/Todo';
import { SkipReason } from '@/state/stores/adhdModeStore';

export interface ADHDUserPatterns {
  id: string;
  user_id: string;
  // 완료 패턴
  avg_title_length: number;
  completed_keywords: Record<string, number>;  // { "키워드": 빈도 }
  hourly_completion_rate: number[];            // [0-23 시간대별 완료율]
  // 스킵 패턴
  skipped_keywords: Record<string, number>;    // { "키워드": 빈도 }
  too_big_keywords: Record<string, number>;    // { "키워드": 빈도 }
  // 메타
  total_completions: number;
  total_skips: number;
  created_at: string;
  updated_at: string;
}

// 기본 패턴 데이터
const DEFAULT_PATTERNS: Omit<ADHDUserPatterns, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  avg_title_length: 0,
  completed_keywords: {},
  hourly_completion_rate: Array(24).fill(0),
  skipped_keywords: {},
  too_big_keywords: {},
  total_completions: 0,
  total_skips: 0
};

/**
 * ADHD 사용자 패턴 학습 서비스
 * 완료/스킵 패턴을 DB에 저장하여 다중 기기 동기화 지원
 */
export class ADHDPatternsService {
  /**
   * 키워드 추출 (한글/영문 단어, 2글자 이상)
   */
  private static extractKeywords(title: string): string[] {
    return title
      .toLowerCase()
      .split(/[\s,.\\-_!?]+/)
      .filter(word => word.length >= 2);
  }

  /**
   * 사용자 패턴 조회 (없으면 기본값 반환)
   */
  static async getPatterns(userId: string): Promise<ADHDUserPatterns | null> {
    try {
      const data = await queryRLSTableWithJWT('adhd_user_patterns', [
        { column: 'user_id', operator: 'eq', value: userId }
      ], { limit: 1 });

      if (data && data.length > 0) {
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('❌ ADHD 패턴 조회 오류:', error);
      return null;
    }
  }

  /**
   * 신규 사용자 패턴 초기화
   */
  static async initializePatterns(userId: string): Promise<ADHDUserPatterns> {
    const patternData = {
      user_id: userId,
      ...DEFAULT_PATTERNS,
      // JSONB 필드는 JSON 문자열로 전송
      completed_keywords: JSON.stringify(DEFAULT_PATTERNS.completed_keywords),
      hourly_completion_rate: JSON.stringify(DEFAULT_PATTERNS.hourly_completion_rate),
      skipped_keywords: JSON.stringify(DEFAULT_PATTERNS.skipped_keywords),
      too_big_keywords: JSON.stringify(DEFAULT_PATTERNS.too_big_keywords)
    };

    try {
      const data = await createWithJWT('adhd_user_patterns', patternData);
      console.log('✅ ADHD 패턴 초기화 완료:', userId);
      return data[0];
    } catch (error) {
      console.error('❌ ADHD 패턴 초기화 오류:', error);
      throw error;
    }
  }

  /**
   * 패턴 조회 또는 초기화 (upsert 패턴)
   */
  static async getOrCreatePatterns(userId: string): Promise<ADHDUserPatterns> {
    const existing = await this.getPatterns(userId);
    if (existing) {
      return existing;
    }

    // 새로 생성
    await this.initializePatterns(userId);

    // 생성 후 다시 조회하여 JSONB 필드가 제대로 파싱된 데이터 반환
    const created = await this.getPatterns(userId);
    if (!created) {
      throw new Error('패턴 초기화 후 조회 실패');
    }
    return created;
  }

  /**
   * 완료 패턴 업데이트
   */
  static async updateCompletionPattern(
    userId: string,
    todo: Todo,
    method: 'direct' | 'alternative'
  ): Promise<void> {
    const hour = new Date().getHours();
    const keywords = this.extractKeywords(todo.title);

    try {
      // 기존 패턴 조회
      const patterns = await this.getOrCreatePatterns(userId);

      // 패턴 업데이트
      const completedKeywords = { ...(patterns.completed_keywords || {}) };
      keywords.forEach(kw => {
        completedKeywords[kw] = (completedKeywords[kw] || 0) + 1;
      });

      const hourlyRate = [...(patterns.hourly_completion_rate || Array(24).fill(0))];
      hourlyRate[hour] = (hourlyRate[hour] || 0) + 1;

      // 평균 제목 길이 업데이트
      const totalCompletions = patterns.total_completions + 1;
      const avgTitleLength =
        (patterns.avg_title_length * patterns.total_completions + todo.title.length) / totalCompletions;

      // DB 업데이트
      await updateWithJWT('adhd_user_patterns',
        { column: 'id', operator: 'eq', value: patterns.id },
        {
          completed_keywords: JSON.stringify(completedKeywords),
          hourly_completion_rate: JSON.stringify(hourlyRate),
          avg_title_length: avgTitleLength,
          total_completions: totalCompletions
        }
      );

      console.log('📊 ADHD 완료 패턴 학습:', { todoTitle: todo.title, method, hour });
    } catch (error) {
      console.error('❌ 완료 패턴 업데이트 오류:', error);
      // 학습 실패는 무시 (핵심 기능 아님)
    }
  }

  /**
   * 스킵 패턴 업데이트
   */
  static async updateSkipPattern(
    userId: string,
    todo: Todo,
    reason: SkipReason
  ): Promise<void> {
    // not_needed는 학습 대상 아님 (삭제)
    if (reason === 'not_needed') {
      return;
    }

    const keywords = this.extractKeywords(todo.title);

    try {
      // 기존 패턴 조회
      const patterns = await this.getOrCreatePatterns(userId);

      // 패턴 업데이트
      const skippedKeywords = { ...(patterns.skipped_keywords || {}) };
      const tooBigKeywords = { ...(patterns.too_big_keywords || {}) };

      keywords.forEach(kw => {
        skippedKeywords[kw] = (skippedKeywords[kw] || 0) + 1;

        // "너무 큰 일" 사유면 별도 기록
        if (reason === 'too_big') {
          tooBigKeywords[kw] = (tooBigKeywords[kw] || 0) + 1;
        }
      });

      // DB 업데이트
      await updateWithJWT('adhd_user_patterns',
        { column: 'id', operator: 'eq', value: patterns.id },
        {
          skipped_keywords: JSON.stringify(skippedKeywords),
          too_big_keywords: JSON.stringify(tooBigKeywords),
          total_skips: patterns.total_skips + 1
        }
      );

      console.log('📊 ADHD 스킵 패턴 학습:', { todoTitle: todo.title, reason });
    } catch (error) {
      console.error('❌ 스킵 패턴 업데이트 오류:', error);
      // 학습 실패는 무시 (핵심 기능 아님)
    }
  }

  /**
   * 추천 점수 계산용 패턴 데이터 조회 (캐시 가능)
   */
  static async getPatternsForScoring(userId: string): Promise<{
    completedKeywords: Record<string, number>;
    skippedKeywords: Record<string, number>;
    tooBigKeywords: Record<string, number>;
    hourlyCompletionRate: number[];
  }> {
    const patterns = await this.getPatterns(userId);

    if (!patterns) {
      return {
        completedKeywords: {},
        skippedKeywords: {},
        tooBigKeywords: {},
        hourlyCompletionRate: Array(24).fill(0)
      };
    }

    return {
      completedKeywords: patterns.completed_keywords || {},
      skippedKeywords: patterns.skipped_keywords || {},
      tooBigKeywords: patterns.too_big_keywords || {},
      hourlyCompletionRate: patterns.hourly_completion_rate || Array(24).fill(0)
    };
  }

  /**
   * 패턴 데이터 초기화 (사용자 요청 시)
   */
  static async resetPatterns(userId: string): Promise<void> {
    try {
      const patterns = await this.getPatterns(userId);
      if (!patterns) {
        return;
      }

      await updateWithJWT('adhd_user_patterns',
        { column: 'id', operator: 'eq', value: patterns.id },
        {
          avg_title_length: 0,
          completed_keywords: JSON.stringify({}),
          hourly_completion_rate: JSON.stringify(Array(24).fill(0)),
          skipped_keywords: JSON.stringify({}),
          too_big_keywords: JSON.stringify({}),
          total_completions: 0,
          total_skips: 0
        }
      );

      console.log('🔄 ADHD 패턴 데이터 초기화 완료');
    } catch (error) {
      console.error('❌ 패턴 초기화 오류:', error);
      throw error;
    }
  }
}
