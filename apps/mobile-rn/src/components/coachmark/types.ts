/**
 * Coachmark 공통 타입
 */

export type CoachmarkPlacement = 'top' | 'bottom' | 'auto';

export interface CoachmarkStep {
  /** Step 고유 식별자 */
  id: string;
  /**
   * 강조할 UI 요소의 targetId.
   * null/undefined → 화면 전체 dim (welcome step 등)
   * staticRect가 있으면 targetId보다 우선 적용
   */
  targetId?: string;
  /**
   * 정적 좌표 — DOM measure가 부정확한 경우 (예: 탭바처럼 absolute로 떠있는 요소)
   * 호출 시점에 평가되므로 Dimensions 기반 동적 계산 가능
   */
  staticRect?: () => TargetRect;
  /** i18n 키 prefix. `${i18nKey}.title`, `.body`, `.rationale` 사용 */
  i18nKey: string;
  /** 말풍선 위치 힌트 (auto = 타겟 위치에 따라 자동 계산) */
  preferredPlacement?: CoachmarkPlacement;
  /** 스포트라이트 여백 (px) — 기본 8 */
  spotlightPadding?: number;
  /** 스포트라이트 모서리 둥글기 (px) — 기본 12 */
  spotlightRadius?: number;
}

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MeasureFn = () => Promise<TargetRect | null>;
