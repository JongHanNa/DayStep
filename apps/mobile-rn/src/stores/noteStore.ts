/**
 * Note Store (Zustand + MMKV)
 * 원동력(fuel) 노트 조회 — 홈 배너용
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';

interface Note {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  note_category?: string;
  is_banner_pinned?: boolean;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
}

interface NoteState {
  notes: Note[];
  loading: boolean;
  error: string | null;

  fetchFuelNotes: (userId: string) => Promise<void>;
  getBannerPinnedFuelNotes: () => Note[];
  getRandomFuelNote: () => Note | null;
  clearError: () => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => ({
      notes: [],
      loading: false,
      error: null,

      fetchFuelNotes: async (userId: string) => {
        try {
          set({loading: true, error: null});

          const {data, error} = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .eq('note_category', 'fuel')
            .order('created_at', {ascending: false});

          if (error) throw error;

          set({notes: data ?? []});
        } catch (err: any) {
          console.error('[NoteStore] Fetch error:', err);
          set({error: err.message ?? 'Failed to fetch notes'});
        } finally {
          set({loading: false});
        }
      },

      getBannerPinnedFuelNotes: () => {
        return get().notes.filter(n => n.is_banner_pinned === true);
      },

      getRandomFuelNote: () => {
        const pinned = get().getBannerPinnedFuelNotes();
        const source = pinned.length > 0 ? pinned : get().notes;
        if (source.length === 0) return null;
        return source[Math.floor(Math.random() * source.length)];
      },

      clearError: () => set({error: null}),
    }),
    {
      name: 'note-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        notes: state.notes,
      }),
    },
  ),
);
