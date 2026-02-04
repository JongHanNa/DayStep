// ADHD 모드 시스템 배럴 export

// === 통합 컨테이너 ===
export { ADHDContainer } from './ADHDContainer';

// === 개별 뷰 (ADHDContainer를 통해 접근 권장) ===
export {
  ExecutionView,
  FuelView,
  CareView,
  ProjectView,
  SettingsView,
  TaskOrganizeView,
  OrganizeView,
  EntryView,
  RelationshipInsightsView,
} from './views';

// === 실행 모드 (실제 구현이 분리된 컨테이너) ===
export { ExecutionContainer } from './execution';

// === 공통 컴포넌트 ===
export * from './common';

// === 기타 컴포넌트 ===
export { default as ADHDEntryScreen } from './ADHDEntryScreen';
export { default as HomeTableOfContents } from './HomeTableOfContents';
export { default as ADHDInterruptModal } from './ADHDInterruptModal';
export { default as FuelSelector } from './FuelSelector';
export { default as FuelReminderBanner } from './FuelReminderBanner';
export { default as QuickLogModal } from './QuickLogModal';
export { default as AwakeningSentenceSetup } from './AwakeningSentenceSetup';
export { default as OrganizeTimer } from './OrganizeTimer';
export { default as OrganizeWrapper } from './OrganizeWrapper';

// === 레거시 Mode 직접 export (하위 호환성) ===
/** @deprecated Use ExecutionView from views instead */
export { default as ExecutionMode } from './ExecutionMode';
/** @deprecated Use FuelView from views instead */
export { default as FuelMode } from './FuelMode';
/** @deprecated Use CareView from views instead */
export { default as CareMode } from './CareMode';
/** @deprecated Use ProjectView from views instead */
export { default as ProjectMode } from './ProjectMode';
/** @deprecated Use SettingsView from views instead */
export { default as SettingsMode } from './SettingsMode';
/** @deprecated Use OrganizeTimer instead */
export { default as OrganizeModeTimer } from './OrganizeTimer';
/** @deprecated Use OrganizeWrapper instead */
export { default as OrganizeModeWrapper } from './OrganizeWrapper';
