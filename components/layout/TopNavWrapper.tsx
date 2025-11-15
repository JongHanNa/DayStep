'use client';

import { usePathname } from 'next/navigation';
import { useNavigationStore } from '@/state/stores/navigationStore';
import { getActiveGroupFromPath } from '@/config/navigation';
import DynamicTopTabs from './DynamicTopTabs';

/**
 * DynamicTopTabs를 렌더링하는 클라이언트 래퍼 컴포넌트
 * selectedGroup 또는 현재 경로 기반으로 상단 탭 표시
 */
export default function TopNavWrapper() {
  const pathname = usePathname();
  const selectedGroup = useNavigationStore((state) => state.selectedGroup);

  // 1. 사용자가 하단 그룹을 선택한 경우 → 선택된 그룹 표시
  // 2. 선택하지 않은 경우 → 현재 경로에서 그룹 자동 감지
  const activeGroup = selectedGroup || getActiveGroupFromPath(pathname || '');

  // 디버깅 로그
  console.log('TopNavWrapper Debug:', {
    pathname,
    selectedGroup,
    activeGroupFromPath: getActiveGroupFromPath(pathname || ''),
    finalActiveGroup: activeGroup
  });

  // 어떤 그룹에도 속하지 않으면 상단 탭 숨김
  if (!activeGroup) {
    console.log('TopNavWrapper: No active group, hiding tabs');
    return null;
  }

  return <DynamicTopTabs groupType={activeGroup} />;
}
