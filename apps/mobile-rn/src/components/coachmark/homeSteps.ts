/**
 * 홈 화면 코치마크 step 정의
 *
 * targetId는 HomeScreen.tsx의 <CoachmarkTarget> id와 매칭되어야 한다.
 * step1은 targetId 없음 → 화면 전체 dim + 중앙 말풍선 (welcome)
 * step5는 staticRect 사용 — 탭바는 absolute positioning이라 measure 불가
 */
import {Dimensions} from 'react-native';
import type {CoachmarkStep} from './types';

export const HOME_TARGET_IDS = {
  progress: 'home-progress',
  mission: 'home-mission',
  dailyCare: 'home-daily-care',
  tabBar: 'home-tab-bar',
} as const;

// 탭바 좌표 — CustomTabBar의 NATIVE_COLLAPSED 높이(80) + 일반 safe area 여유
const TAB_BAR_HEIGHT = 80;
const TAB_BAR_BOTTOM_PADDING = 24;
const TAB_BAR_HORIZONTAL_INSET = 16;

export const HOME_COACHMARK_STEPS: CoachmarkStep[] = [
  {
    id: 'home-step-1',
    i18nKey: 'onboarding.home.step1',
    preferredPlacement: 'auto',
  },
  {
    id: 'home-step-2',
    targetId: HOME_TARGET_IDS.progress,
    i18nKey: 'onboarding.home.step2',
    preferredPlacement: 'bottom',
  },
  {
    id: 'home-step-3',
    targetId: HOME_TARGET_IDS.mission,
    i18nKey: 'onboarding.home.step3',
    preferredPlacement: 'bottom',
  },
  {
    id: 'home-step-4',
    targetId: HOME_TARGET_IDS.dailyCare,
    i18nKey: 'onboarding.home.step4',
    preferredPlacement: 'top',
  },
  {
    id: 'home-step-5',
    i18nKey: 'onboarding.home.step5',
    preferredPlacement: 'top',
    staticRect: () => {
      const {width, height} = Dimensions.get('window');
      return {
        x: TAB_BAR_HORIZONTAL_INSET,
        y: height - TAB_BAR_HEIGHT - TAB_BAR_BOTTOM_PADDING,
        width: width - TAB_BAR_HORIZONTAL_INSET * 2,
        height: TAB_BAR_HEIGHT,
      };
    },
  },
];
