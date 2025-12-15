// ============================================
// 소중한 사람 관리 시스템 타입 정의
// ============================================

/** 관계 유형 */
export type RelationshipType =
  | 'family'      // 가족
  | 'friend'      // 친구
  | 'colleague'   // 동료
  | 'mentor'      // 멘토/선배
  | 'community'   // 커뮤니티/모임
  | 'neighbor'    // 이웃
  | 'other';      // 기타

/** 관심 표현 방식 */
export type InteractionType =
  | 'call'        // 전화
  | 'message'     // 문자/카톡
  | 'visit'       // 방문
  | 'meal'        // 식사
  | 'gift'        // 선물
  | 'letter'      // 편지/카드
  | 'help'        // 도움
  | 'prayer'      // 마음으로 응원 (비신앙인 자연스러운 표현)
  | 'other';      // 기타

/** 우선순위 상기 메시지 카테고리 */
export type ReminderCategory =
  | 'work_vs_people'
  | 'money_vs_care'
  | 'time_vs_relationship'
  | 'reflection';

/** 소중한 사람 */
export interface CherishedPerson {
  id: string;
  user_id: string;
  name: string;
  nickname: string | null;
  relationship: RelationshipType | null;
  priority: number;           // 0: 일반, 1: 중요, 2: 매우 중요
  is_active: boolean;
  last_interaction_at: string | null;
  interaction_count: number;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

/** 소중한 사람 입력 폼 */
export interface CherishedPersonInput {
  name: string;
  nickname?: string;
  relationship?: RelationshipType;
  priority?: number;
  notes?: string;
  tags?: string[];
}

/** 관심 기록 */
export interface CareInteraction {
  id: string;
  user_id: string;
  person_id: string;
  interaction_type: InteractionType;
  interaction_date: string;   // YYYY-MM-DD
  description: string | null;
  gratitude_note: string | null;
  recent_news: string | null;
  feeling_rating: number | null;  // 1-5
  todo_id: string | null;         // 연결된 할일 ID
  created_at: string;
}

/** 관심 기록 입력 폼 */
export interface CareInteractionInput {
  person_id: string;
  interaction_type: InteractionType;
  interaction_date: string;
  description?: string;
  gratitude_note?: string;
  recent_news?: string;
  feeling_rating?: number;
}

/** 우선순위 상기 메시지 */
export interface PriorityReminder {
  id: string;
  message_key: string;
  message_text: string;
  category: ReminderCategory;
  display_weight: number;
  is_active: boolean;
  created_at: string;
}

/** 연락 추천 정보 */
export interface ContactRecommendation {
  person: CherishedPerson;
  daysSinceLastContact: number;  // -1이면 한 번도 연락 안 함
  lastInteraction: CareInteraction | null;
  priority: 'high' | 'medium' | 'normal';
}

/** 관계 통계 */
export interface RelationshipStats {
  totalPeople: number;
  activeThisWeek: number;
  needsAttention: number;
  totalInteractions: number;
}

// ============================================
// 라벨 및 상수
// ============================================

/** 관계 유형 라벨 */
export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  family: '가족',
  friend: '친구',
  colleague: '동료',
  mentor: '멘토/선배',
  community: '모임/커뮤니티',
  neighbor: '이웃',
  other: '기타',
};

/** 관심 표현 방식 라벨 (Lucide 아이콘 이름 사용) */
export const INTERACTION_TYPE_LABELS: Record<InteractionType, { label: string; icon: string }> = {
  call: { label: '전화', icon: 'Phone' },
  message: { label: '문자/카톡', icon: 'MessageCircle' },
  visit: { label: '방문', icon: 'Home' },
  meal: { label: '식사', icon: 'Utensils' },
  gift: { label: '선물', icon: 'Gift' },
  letter: { label: '편지/카드', icon: 'Mail' },
  help: { label: '도움', icon: 'HandHelping' },
  prayer: { label: '마음으로 응원', icon: 'Heart' },
  other: { label: '기타', icon: 'Sparkles' },
};

/** 중요도 라벨 */
export const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: '일반', color: 'text-base-content/60' },
  1: { label: '중요', color: 'text-warning' },
  2: { label: '매우 중요', color: 'text-error' },
};

/** 느낌 평가 라벨 (Lucide 아이콘 이름 사용) */
export const FEELING_RATINGS: Array<{ value: number; icon: string; label: string }> = [
  { value: 1, icon: 'Frown', label: '아쉬워요' },
  { value: 2, icon: 'Meh', label: '그저 그래요' },
  { value: 3, icon: 'Smile', label: '괜찮아요' },
  { value: 4, icon: 'SmilePlus', label: '좋았어요' },
  { value: 5, icon: 'HeartHandshake', label: '감사해요' },
];

/** 추천 우선순위 라벨 */
export const RECOMMENDATION_PRIORITY_LABELS: Record<ContactRecommendation['priority'], { label: string; color: string; bgColor: string }> = {
  high: { label: '꼭 연락하세요', color: 'text-error', bgColor: 'bg-error/10' },
  medium: { label: '연락해보세요', color: 'text-warning', bgColor: 'bg-warning/10' },
  normal: { label: '연락 추천', color: 'text-info', bgColor: 'bg-info/10' },
};
