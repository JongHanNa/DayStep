/**
 * Coachmark public API
 *
 * Quick start:
 *   1. App.tsx의 NavigationContainer 안쪽을 <CoachmarkProvider>로 감싸기
 *   2. 강조할 UI에 <CoachmarkTarget id="..."> 래퍼 적용
 *   3. 시작 시점에 useCoachmark().start(STEPS, onFinish) 호출
 */
export {CoachmarkProvider, useCoachmark} from './CoachmarkProvider';
export {CoachmarkTarget} from './CoachmarkTarget';
export {HOME_COACHMARK_STEPS, HOME_TARGET_IDS} from './homeSteps';
export {COACHMARK_VARIANT} from './variant';
export type {CoachmarkVariant} from './variant';
export type {CoachmarkStep, CoachmarkPlacement, TargetRect} from './types';
