// ============================================
// 방해 요소 (Distraction) 시스템 타입 정의
// Implementation Intention 기반 집중력 향상 기능
// ============================================

/**
 * 방해 요소 프리셋 (DB 저장용)
 * - 자주 사용하는 방해요소/대응책 조합
 */
export interface DistractionPreset {
  id: string;
  user_id: string;
  distraction_text: string;  // "핸드폰 보고 싶을 때"
  response_text: string;     // "핸드폰을 서랍에 넣는다"
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 프리셋 생성 입력
 */
export interface DistractionPresetInput {
  distraction_text: string;
  response_text: string;
}

/**
 * 프리셋 업데이트 입력
 */
export interface DistractionPresetUpdate {
  distraction_text?: string;
  response_text?: string;
  is_active?: boolean;
}

/**
 * 회고 결과 타입
 */
export type DistractionReviewResult = 'success' | 'partial' | 'failed';

/**
 * 방해 요소 계획 (세션별, pomodoro_sessions.distraction_plan에 저장)
 */
export interface DistractionPlan {
  distraction: string;        // 방해 요소 ("TV 보고 싶을 때")
  response: string;           // 대응책 ("TV 끄고 다른 방으로")
  preset_id: string | null;   // 프리셋 사용 시 ID
  review_result: DistractionReviewResult | null;  // 완료 후 회고
}

/**
 * 방해 요소 히스토리 (user_preferences에 저장)
 */
export interface DistractionHistory {
  recent_distractions: string[];  // 최근 사용한 방해요소 (최대 20개)
  recent_responses: string[];     // 최근 사용한 대응책 (최대 20개)
  last_updated: string;
}

/**
 * Implementation Intention 형식
 * - "만약 X하면, Y할 것이다"
 */
export interface ImplementationIntention {
  if_condition: string;   // 방해 상황
  then_action: string;    // 대응 행동
}

// ============================================
// UI 상태 타입
// ============================================

/**
 * 방해요소 계획 폼 상태
 */
export interface DistractionPlanFormState {
  distraction: string;
  response: string;
  saveAsPreset: boolean;
  selectedPresetId: string | null;
}

/**
 * 방해요소 계획 뷰 props
 */
export interface DistractionPlanViewProps {
  onNext: (plan: DistractionPlan | null) => void;
  onSkip: () => void;
  presets: DistractionPreset[];
  history: DistractionHistory | null;
  isLoading?: boolean;
}

/**
 * 방해요소 회고 뷰 props
 */
export interface DistractionReviewViewProps {
  plan: DistractionPlan | null;
  onSubmit: (result: DistractionReviewResult) => void;
  onSkip: () => void;
}

// ============================================
// 상수
// ============================================

/**
 * 회고 결과 라벨
 */
export const REVIEW_RESULT_LABELS: Record<DistractionReviewResult, { emoji: string; label: string }> = {
  success: { emoji: '😊', label: '잘 피했어요' },
  partial: { emoji: '😐', label: '부분 성공' },
  failed: { emoji: '😔', label: '방해받았어요' },
};

/**
 * 기본 방해요소 예시 (힌트용)
 */
export const DEFAULT_DISTRACTION_EXAMPLES = [
  '핸드폰 알림이 오면',
  'TV를 보고 싶으면',
  '유튜브를 열고 싶으면',
  '다른 생각이 나면',
  '피곤해지면',
] as const;

/**
 * 기본 대응책 예시 (힌트용)
 */
export const DEFAULT_RESPONSE_EXAMPLES = [
  '핸드폰을 다른 방에 둔다',
  'TV 리모컨을 치운다',
  '5분만 집중하고 쉰다',
  '일단 적어두고 나중에',
  '스트레칭 후 다시 시작',
] as const;

/**
 * 히스토리 최대 저장 개수
 */
export const DISTRACTION_HISTORY_MAX_ITEMS = 20;
