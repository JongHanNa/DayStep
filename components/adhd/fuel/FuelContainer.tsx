'use client';

/**
 * Fuel Container
 *
 * 기존 FuelMode를 Container 패턴으로 re-export합니다.
 * 점진적 분리를 위해 별도 폴더 구조를 사용합니다.
 *
 * TODO: 향후 분리 계획
 * - views/: TimerInputView, ReflectionInputView, ActionChoiceView 등
 * - modals/: FuelInputModal, FuelDetailModal, TodoEditModal
 * - hooks/: useFuelNotes, useFuelTimer
 */

// 기존 FuelMode를 FuelContainer로 re-export
// 실제 코드는 점진적으로 이 폴더로 이동 예정
export { default } from '../FuelMode';
export { default as FuelContainer } from '../FuelMode';
