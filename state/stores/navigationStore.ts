import { create } from 'zustand';
import { NavigationGroupType } from '@/config/navigation';

type GroupType = NavigationGroupType | null;

interface NavigationStore {
  selectedGroup: GroupType;
  setSelectedGroup: (group: NavigationGroupType) => void;
  clearSelectedGroup: () => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  selectedGroup: 'productivity', // 기본값 설정 - sticky 탭바 렌더링 보장
  setSelectedGroup: (group) => set({ selectedGroup: group }),
  clearSelectedGroup: () => set({ selectedGroup: null }),
}));
