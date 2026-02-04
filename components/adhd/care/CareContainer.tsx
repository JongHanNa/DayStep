'use client';

/**
 * Care Container
 *
 * 기존 CareMode를 Container 패턴으로 re-export합니다.
 * 점진적 분리를 위해 별도 폴더 구조를 사용합니다.
 *
 * TODO: 향후 분리 계획
 * - views/: SelectPersonView, CareTimerView, WriteNewsView, CompletedView
 * - components/: InteractionTypeSelector
 * - hooks/: useCareInteraction
 */

// 기존 CareMode를 CareContainer로 re-export
export { default } from '../CareMode';
export { default as CareContainer } from '../CareMode';
