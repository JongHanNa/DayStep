/**
 * Cherished People & CareInteraction Types
 * DB 테이블: cherished_people, care_interactions
 */

export type InteractionType =
  | 'call'
  | 'message'
  | 'visit'
  | 'meal'
  | 'gift'
  | 'letter'
  | 'help'
  | 'prayer'
  | 'other';

export interface CareInteraction {
  id: string;
  user_id: string;
  person_id: string;
  interaction_type: InteractionType;
  interaction_date: string; // YYYY-MM-DD
  description: string | null;
  gratitude_note: string | null;
  recent_news: string | null;
  request_from_them: string | null;
  request_to_them: string | null;
  meeting_note: string | null;
  todo_id: string | null;
  created_at: string;
}

export interface CareInteractionInput {
  person_id: string;
  interaction_type: InteractionType;
  interaction_date: string;
  description?: string;
  gratitude_note?: string;
  recent_news?: string;
  request_from_them?: string;
  request_to_them?: string;
  meeting_note?: string;
}

/** 사람 이름이 포함된 노트 (감사/소식 조회용) */
export interface NoteWithPerson {
  id: string;
  person_id: string;
  person_name: string;
  person_nickname?: string | null;
  interaction_type: InteractionType;
  interaction_date: string;
  gratitude_note: string | null;
  recent_news: string | null;
  description: string | null;
  created_at: string;
}

export interface DetailedStats {
  totalInteractions: number;
  thisMonthCount: number;
  interactionTypeStats: Record<InteractionType, number>;
  topContacts: Array<{person_id: string; name: string; count: number}>;
  monthlyTrend: Array<{month: string; count: number}>;
}

export interface RelationshipStats {
  totalPeople: number;
  activeThisWeek: number;
  needsAttention: number;
  totalInteractions: number;
}

/** 관심 표현 유형 라벨 + 아이콘 */
export const INTERACTION_TYPE_LABELS: Record<
  InteractionType,
  {label: string; icon: string}
> = {
  call: {label: '전화', icon: 'phone'},
  message: {label: '메시지', icon: 'message-circle'},
  visit: {label: '방문', icon: 'home'},
  meal: {label: '식사', icon: 'coffee'},
  gift: {label: '선물', icon: 'gift'},
  letter: {label: '편지', icon: 'mail'},
  help: {label: '도움', icon: 'heart'},
  prayer: {label: '기도', icon: 'sun'},
  other: {label: '기타', icon: 'star'},
};
