/**
 * 홈 화면 코치마크 step 정의
 *
 * 5단계 — 홈에서 접근 가능한 핵심 카드/그룹을 차례로 강조하며
 * 각 화면이 ADHD에 어떤 도움을 주는지 설명한다.
 */
import type {CoachmarkStep} from './types';

export const HOME_TARGET_IDS = {
  progress: 'home-progress',
  mission: 'home-mission',
  dailyCare: 'home-daily-care',
  planning: 'home-planning',
  thoughts: 'home-thoughts',
} as const;

export const HOME_COACHMARK_STEPS: CoachmarkStep[] = [
  {
    id: 'home-progress',
    targetId: HOME_TARGET_IDS.progress,
    i18nKey: 'onboarding.home.progress',
    preferredPlacement: 'bottom',
  },
  {
    id: 'home-mission',
    targetId: HOME_TARGET_IDS.mission,
    i18nKey: 'onboarding.home.mission',
    preferredPlacement: 'bottom',
  },
  {
    id: 'home-daily-care',
    targetId: HOME_TARGET_IDS.dailyCare,
    i18nKey: 'onboarding.home.dailyCare',
    preferredPlacement: 'top',
  },
  {
    id: 'home-planning',
    targetId: HOME_TARGET_IDS.planning,
    i18nKey: 'onboarding.home.planning',
    preferredPlacement: 'top',
  },
  {
    id: 'home-thoughts',
    targetId: HOME_TARGET_IDS.thoughts,
    i18nKey: 'onboarding.home.thoughts',
    preferredPlacement: 'top',
  },
];
