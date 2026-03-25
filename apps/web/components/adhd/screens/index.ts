/**
 * ADHD Screens - 독립적인 화면 컴포넌트들
 *
 * 이 폴더의 컴포넌트들은 그룹(fuel, care, project 등)에 독립적입니다.
 * 화면을 다른 그룹으로 이동할 때 여기 파일들은 수정할 필요가 없습니다.
 *
 * 그룹 변경 시: lib/constants/adhd-screens.ts의 UI_GROUPS만 수정하면 됩니다.
 */

// 생각과 기억 (Memory) 그룹
export { MotivationScreen } from './motivation';
export { RecordScreen } from './record';
export { NewsScreen } from './news';
export { ContactScreen } from './contact';

// 일상 돌보기 (Care) 그룹
export { GratitudeScreen } from './gratitude';
export { TimelineScreen } from './timeline';
export { DailyPlannerScreen } from './daily-planner';
export { ActivityScreen } from './activity';

// 계획 세우기 (Project) 그룹
export { BannerScreen } from './banner';
export { ExecuteScreen } from './execute';
export { ProjectsScreen } from './projects';
export { AIChatScreen } from './ai-chat';
export { GuideScreen } from './guide';

/**
 * 화면 ID → Screen 컴포넌트 매핑
 * GenericTabContainer에서 동적 렌더링에 사용
 */
import type { ADHDSubViewId } from '@/lib/constants/adhd-screens';
import type { ComponentType } from 'react';

import { MotivationScreen } from './motivation';
import { RecordScreen } from './record';
import { NewsScreen } from './news';
import { ContactScreen } from './contact';
import { GratitudeScreen } from './gratitude';
import { TimelineScreen } from './timeline';
import { DailyPlannerScreen } from './daily-planner';
import { ActivityScreen } from './activity';
import { BannerScreen } from './banner';
import { ExecuteScreen } from './execute';
import { ProjectsScreen } from './projects';
import { AIChatScreen } from './ai-chat';
import { GuideScreen } from './guide';

export interface ScreenComponentProps {
  userId: string;
  onExit?: () => void;
}

type ScreenComponent = ComponentType<ScreenComponentProps> | ComponentType<{ userId?: string }> | ComponentType<object>;

export const SCREEN_COMPONENTS: Record<ADHDSubViewId, ScreenComponent> = {
  motivation: MotivationScreen,
  record: RecordScreen,
  news: NewsScreen,
  contact: ContactScreen,
  gratitude: GratitudeScreen,
  timeline: TimelineScreen,
  'daily-planner': DailyPlannerScreen,
  activity: ActivityScreen,
  banner: BannerScreen,
  execute: ExecuteScreen,
  'projects': ProjectsScreen,
  'ai-chat': AIChatScreen,
  guide: GuideScreen,
};
