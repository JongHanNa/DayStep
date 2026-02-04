// ADHD 모드 시스템 배럴 export

// === 통합 컨테이너 ===
export { ADHDContainer } from './ADHDContainer';

// === 도메인 Container ===
export { ExecutionContainer } from './execution';
export { FuelContainer } from './fuel';
export { CareContainer } from './care';
export { ProjectContainer } from './project';
export { SettingsContainer } from './settings';
export { TaskOrganizeContainer } from './task-organize';
export { RelationshipContainer } from './RelationshipInsights';

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

// === 레거시 View export (하위 호환성 - Container 사용 권장) ===
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
