import { create } from 'zustand';
import { NavigationGroupType } from '@/config/navigation';

type GroupType = NavigationGroupType | null;

interface NavigationStore {
  selectedGroup: GroupType;
  setSelectedGroup: (group: NavigationGroupType) => void;
  clearSelectedGroup: () => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  selectedGroup: null,
  setSelectedGroup: (group) => set({ selectedGroup: group }),
  clearSelectedGroup: () => set({ selectedGroup: null }),
}));
