import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SidebarStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarStore>()(
  devtools(
    (set) => ({
      isOpen: false,

      open: () => {
        set({ isOpen: true });
      },

      close: () => {
        set({ isOpen: false });
      },

      toggle: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },
    }),
    {
      name: 'sidebar-store',
    }
  )
);
