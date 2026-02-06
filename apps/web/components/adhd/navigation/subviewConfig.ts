import { type LucideIcon } from 'lucide-react';
import { getSubViewConfig } from '@/lib/constants/adhd-screens';

/**
 * 서브뷰 ID → 아이콘/레이블 매핑
 * ADHDSidebar와 ADHDBottomTabBar에서 공통 사용
 *
 * ADHD_SCREENS (lib/constants/adhd-screens.ts)에서 파생됨
 */
export const SUBVIEW_CONFIG: Record<string, { icon: LucideIcon; label: string }> =
  getSubViewConfig();
