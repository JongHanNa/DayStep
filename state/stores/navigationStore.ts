import { create } from 'zustand';

type GroupType = 'routine' | 'productivity' | 'start' | null;

interface NavigationStore {
  selectedGroup: GroupType;
  setSelectedGroup: (group: GroupType) => void;
  clearSelectedGroup: () => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  selectedGroup: null,
  setSelectedGroup: (group) => set({ selectedGroup: group }),
  clearSelectedGroup: () => set({ selectedGroup: null }),
}));
