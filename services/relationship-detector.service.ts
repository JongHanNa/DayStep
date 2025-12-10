// ============================================
// 관계 키워드 목록
// ============================================

/**
 * 관계 관련 키워드 목록
 * 할일 제목에서 이 키워드들을 감지하면 관계 할일로 태그 추천
 */
export const RELATIONSHIP_KEYWORDS = [
  // 연락 관련
  '전화', '통화', '카톡', '문자', '연락', '메시지', '톡', 'DM',

  // 만남 관련
  '만남', '만나', '식사', '커피', '밥', '약속', '점심', '저녁', '아침',

  // 특별한 날
  '선물', '축하', '안부', '생일', '기념일', '결혼', '돌잔치',

  // 관계 대상
  '부모님', '엄마', '아빠', '친구', '동료', '가족', '형', '누나', '오빠', '동생',
  '할머니', '할아버지', '이모', '삼촌', '고모', '사촌', '조카',

  // 함께하는 활동
  '영화', '운동', '산책', '데이트', '여행', '드라이브', '등산', '캠핑',

  // 감정 표현
  '감사', '고마', '사랑', '보고싶', '미안', '응원', '격려', '위로',
];

// ============================================
// 서비스 클래스
// ============================================

/**
 * 관계 감지 서비스
 * 할일 제목에서 관계 키워드를 감지하여 태그 추천
 */
export class RelationshipDetectorService {

  /**
   * 텍스트에서 관계 키워드 감지
   * @param text 검사할 텍스트 (할일 제목)
   * @returns 관계 키워드 포함 여부
   */
  static detectRelationshipKeyword(text: string): boolean {
    if (!text) return false;

    const normalizedText = text.toLowerCase();

    return RELATIONSHIP_KEYWORDS.some(keyword =>
      normalizedText.includes(keyword.toLowerCase())
    );
  }

  /**
   * 텍스트에서 발견된 관계 키워드 목록 반환
   * @param text 검사할 텍스트
   * @returns 발견된 키워드 목록
   */
  static findRelationshipKeywords(text: string): string[] {
    if (!text) return [];

    const normalizedText = text.toLowerCase();

    return RELATIONSHIP_KEYWORDS.filter(keyword =>
      normalizedText.includes(keyword.toLowerCase())
    );
  }

  /**
   * 관계 할일인지 확인 (키워드 또는 명시적 태그)
   * @param title 할일 제목
   * @param isRelationshipTask 명시적 태그 여부
   * @returns 관계 할일 여부
   */
  static isRelationshipTodo(
    title: string,
    isRelationshipTask?: boolean | null
  ): boolean {
    // 명시적으로 설정된 경우 그 값 사용
    if (isRelationshipTask !== null && isRelationshipTask !== undefined) {
      return isRelationshipTask;
    }

    // 아니면 키워드 감지로 판단
    return this.detectRelationshipKeyword(title);
  }

  /**
   * 균형 체크: 오늘 완료한 할일 중 관계 할일 비율
   * @param completedTodos 오늘 완료한 할일 목록
   * @returns 관계 할일 개수와 전체 개수
   */
  static checkBalance(completedTodos: Array<{
    title: string;
    isRelationshipTask?: boolean | null;
  }>): { relationshipCount: number; totalCount: number; ratio: number } {
    if (!completedTodos || completedTodos.length === 0) {
      return { relationshipCount: 0, totalCount: 0, ratio: 0 };
    }

    const relationshipCount = completedTodos.filter(todo =>
      this.isRelationshipTodo(todo.title, todo.isRelationshipTask)
    ).length;

    const totalCount = completedTodos.length;
    const ratio = totalCount > 0 ? relationshipCount / totalCount : 0;

    return { relationshipCount, totalCount, ratio };
  }

  /**
   * 균형 체크 결과에 따른 메시지
   * @param ratio 관계 할일 비율
   * @returns 표시할 메시지
   */
  static getBalanceMessage(ratio: number): {
    type: 'praise' | 'gentle-reminder' | 'neutral';
    message: string;
  } {
    if (ratio >= 0.3) {
      // 30% 이상: 칭찬
      return {
        type: 'praise',
        message: '오늘 관계에도 시간을 쓰셨네요! 균형 잡힌 하루예요.',
      };
    } else if (ratio === 0) {
      // 0%: 부드러운 리마인드
      return {
        type: 'gentle-reminder',
        message: '오늘 주변 사람에게 안부 한번 전해보는 건 어떨까요?',
      };
    } else {
      // 그 사이: 중립
      return {
        type: 'neutral',
        message: '일도 중요하지만, 잠깐 소중한 사람을 떠올려보세요.',
      };
    }
  }

  /**
   * 관계 키워드 카테고리 분류
   * @param keyword 키워드
   * @returns 카테고리
   */
  static getKeywordCategory(keyword: string): string {
    const categories: Record<string, string[]> = {
      '연락': ['전화', '통화', '카톡', '문자', '연락', '메시지', '톡', 'DM'],
      '만남': ['만남', '만나', '식사', '커피', '밥', '약속', '점심', '저녁', '아침'],
      '특별한 날': ['선물', '축하', '안부', '생일', '기념일', '결혼', '돌잔치'],
      '가족/친구': ['부모님', '엄마', '아빠', '친구', '동료', '가족', '형', '누나', '오빠', '동생', '할머니', '할아버지', '이모', '삼촌', '고모', '사촌', '조카'],
      '함께 활동': ['영화', '운동', '산책', '데이트', '여행', '드라이브', '등산', '캠핑'],
      '감정 표현': ['감사', '고마', '사랑', '보고싶', '미안', '응원', '격려', '위로'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.includes(keyword)) {
        return category;
      }
    }

    return '기타';
  }
}
