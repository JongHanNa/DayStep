/**
 * 코치마크 PoC 변형 선택 — 시각/UX 비교용
 *
 * 'A' = 커스텀 구현 (Modal + Reanimated + 4-piece dim mask)
 * 'B' = react-native-copilot 라이브러리
 *
 * 변경 후 Metro 재시작 필요.
 */
export type CoachmarkVariant = 'A' | 'B';

export const COACHMARK_VARIANT: CoachmarkVariant = 'A';
