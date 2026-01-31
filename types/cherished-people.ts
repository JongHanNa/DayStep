// ============================================
// 소중한 사람 관리 시스템 타입 정의
// ============================================

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
  relationships: string[];    // 복수 관계 (배열) - 자유 입력
  roles: string[];            // 역할/직분 (배열) - 자유 입력
  is_active: boolean;
  last_interaction_at: string | null;
  interaction_count: number;
  created_at: string;
  updated_at: string;
}

/** 소중한 사람 입력 폼 */
export interface CherishedPersonInput {
  name: string;
  nickname?: string;
  relationships?: string[];   // 복수 관계 (배열)
  roles?: string[];           // 역할/직분 (배열)
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
  request_from_them: string | null;  // 상대방이 나에게 한 부탁
  request_to_them: string | null;    // 내가 상대방에게 한 부탁
  meeting_note: string | null;       // 회의 내용
  todo_id: string | null;            // 연결된 할일 ID
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
  request_from_them?: string;  // 상대방이 나에게 한 부탁
  request_to_them?: string;    // 내가 상대방에게 한 부탁
  meeting_note?: string;       // 회의 내용
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

/** 추천 우선순위 라벨 */
export const RECOMMENDATION_PRIORITY_LABELS: Record<ContactRecommendation['priority'], { label: string; color: string; bgColor: string }> = {
  high: { label: '꼭 연락하세요', color: 'text-error', bgColor: 'bg-error/10' },
  medium: { label: '연락해보세요', color: 'text-warning', bgColor: 'bg-warning/10' },
  normal: { label: '연락 추천', color: 'text-info', bgColor: 'bg-info/10' },
};

