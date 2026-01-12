// ============================================
// 집중 환경 세팅 시스템 타입 정의
// "지금 바로" 체크리스트 기반 환경 준비
// ============================================

/**
 * 환경 체크 항목
 */
export interface EnvironmentCheckItem {
  id: string;
  text: string;           // "핸드폰을 금욕상자에 넣었다"
  category: 'digital' | 'media' | 'workspace' | 'custom';
  checked: boolean;
}

/**
 * 환경 세팅 (pomodoro_sessions.distraction_plan에 저장)
 */
export interface EnvironmentSetup {
  items: EnvironmentCheckItem[];
  completedAt: string | null;
}

// ============================================
// 기본 체크 항목 (3개)
// ============================================

export const DEFAULT_ENVIRONMENT_ITEMS: Omit<EnvironmentCheckItem, 'id' | 'checked'>[] = [
  { text: '핸드폰을 금욕상자/다른 방에 넣었다', category: 'digital' },
  { text: 'TV 리모컨을 서랍에 치웠다', category: 'media' },
  { text: '책상 위를 정리했다', category: 'workspace' },
];

/**
 * 카테고리 아이콘
 */
export const CATEGORY_ICONS: Record<EnvironmentCheckItem['category'], string> = {
  digital: '📱',
  media: '📺',
  workspace: '🪑',
  custom: '✏️',
};

// ============================================
// 레거시 타입 (호환성 유지)
// ============================================

/**
 * @deprecated EnvironmentSetup 사용
 */
export interface DistractionPlan {
  distraction: string;
  response: string;
  preset_id: string | null;
  review_result: DistractionReviewResult | null;
}

/**
 * @deprecated 사용 안함
 */
export type DistractionReviewResult = 'success' | 'partial' | 'failed';

/**
 * @deprecated 사용 안함
 */
export interface DistractionPreset {
  id: string;
  user_id: string;
  distraction_text: string;
  response_text: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated 사용 안함
 */
export interface DistractionHistory {
  recent_distractions: string[];
  recent_responses: string[];
  last_updated: string;
}

/**
 * @deprecated 사용 안함
 */
export interface DistractionPresetInput {
  distraction_text: string;
  response_text: string;
}

/**
 * @deprecated 사용 안함
 */
export interface DistractionPresetUpdate {
  distraction_text?: string;
  response_text?: string;
  is_active?: boolean;
}

/**
 * @deprecated 사용 안함
 */
export const DISTRACTION_HISTORY_MAX_ITEMS = 20;
