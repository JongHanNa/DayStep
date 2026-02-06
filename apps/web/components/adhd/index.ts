// ADHD 모드 시스템 배럴 export

// === 통합 컨테이너 ===
export { ADHDContainer } from './ADHDContainer';

// === GenericTabContainer (새 아키텍처) ===
export { GenericTabContainer } from './containers/GenericTabContainer';

// === 도메인 Container ===
export { FocusExecutionContainer, RelationshipRecordContainer } from './containers';
export { SettingsContainer } from './settings';
export { TaskOrganizeContainer } from './task-organize';

// === 공통 컴포넌트 ===
export * from './common';

// === 기타 컴포넌트 ===
export { default as ADHDEntryScreen } from './ADHDEntryScreen';
export { default as HomeTableOfContents } from './HomeTableOfContents';
export { default as ADHDInterruptModal } from './ADHDInterruptModal';
export { default as MotivationNoteSelector } from './MotivationNoteSelector';
export { default as MotivationReminderBanner } from './MotivationReminderBanner';
export { default as QuickLogModal } from './QuickLogModal';
export { default as AwakeningSentenceSetup } from './AwakeningSentenceSetup';
export { default as OrganizeTimer } from './OrganizeTimer';

// === Screen export ===
export { OrganizeScreen } from './screens/organize';
export { TimelineScreen } from './screens/timeline';
export { ActivityScreen } from './screens/activity';
export { BannerScreen } from './screens/banner';
export { ContactScreen } from './screens/contact';
export { ExecuteScreen } from './screens/execute';

// === Screen Components re-export ===
// 하위 호환성을 위한 View export (새 위치: screens/*/components/)
export { ActivityView, TodoStatsView } from './screens/activity/components';
export { BannerView } from './screens/banner/components';
export { ContactView } from './screens/contact/components';
export { TodoTimelineView, MonthNavigator, MonthPickerPopover } from './screens/timeline/components';
export { OrganizeNeededView } from './screens/organize/components';
export {
  RecommendationView,
  CompletedAllView,
  EmptyStateView,
  AdhocTimerView,
  AdhocCaptureView,
  AdhocNoteConnectionView,
} from './screens/execute/components';
