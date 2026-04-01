/**
 * Note Store (Zustand + MMKV)
 * 원동력(motivation) 노트 CRUD + 홈 배너용 조회
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';

export type EmotionTag = 'joy' | 'gratitude' | 'awakening' | 'determination';

export interface Note {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  category?: string;
  emotion_tag?: EmotionTag | null;
  is_banner_pinned?: boolean;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
  todos?: {id: string; title: string}[];
}

interface CreateMotivationNoteInput {
  content: string;
  title?: string;
  emotion_tag?: EmotionTag;
}

async function getCurrentUserId(): Promise<string | null> {
  const {data: {session}} = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

interface NoteState {
  notes: Note[];
  loading: boolean;
  error: string | null;

  fetchMotivationNotes: (userId: string) => Promise<void>;
  createMotivationNote: (input: CreateMotivationNoteInput) => Promise<Note | null>;
  updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'emotion_tag'>>) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  setBannerPinned: (noteId: string, isPinned: boolean) => Promise<boolean>;
  getBannerPinnedMotivationNotes: () => Note[];
  getRandomMotivationNote: () => Note | null;
  clearError: () => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => ({
      notes: [],
      loading: false,
      error: null,

      fetchMotivationNotes: async (userId: string) => {
        try {
          set({loading: true, error: null});

          const {data, error} = await supabase
            .from('motivations')
            .select('*, todo_motivations(todos(id, title))')
            .eq('user_id', userId)
            .eq('category', 'motivation')
            .order('created_at', {ascending: false});

          if (error) throw error;

          // join 결과 평탄화: todo_motivations -> todos
          const notes = (data ?? []).map((n: any) => ({
            ...n,
            todos: n.todo_motivations?.map((tn: any) => tn.todos).filter(Boolean) ?? [],
            todo_motivations: undefined,
          }));

          set({notes});
        } catch (err: any) {
          console.error('[NoteStore] Fetch error:', err);
          set({error: err.message ?? 'Failed to fetch notes'});
        } finally {
          set({loading: false});
        }
      },

      createMotivationNote: async (input) => {
        try {
          set({loading: true, error: null});

          const userId = await getCurrentUserId();
          if (!userId) throw new Error('Not authenticated');

          const noteData = {
            user_id: userId,
            content: input.content,
            title: input.title ?? undefined,
            emotion_tag: input.emotion_tag ?? undefined,
            category: 'motivation' as const,
            is_banner_pinned: false,
          };

          // DB insert용 (null 허용)
          const dbData = {
            user_id: userId,
            content: input.content,
            title: input.title ?? null,
            emotion_tag: input.emotion_tag ?? null,
            category: 'motivation',
            is_banner_pinned: false,
          };

          // Optimistic: 로컬 먼저 추가
          const tempId = `temp_${Date.now()}`;
          const optimisticNote: Note = {
            ...noteData,
            id: tempId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            todos: [],
          };

          set(state => ({notes: [optimisticNote, ...state.notes]}));

          const {data, error} = await supabase
            .from('motivations')
            .insert(dbData)
            .select()
            .single();

          if (error) {
            // 롤백
            set(state => ({notes: state.notes.filter(n => n.id !== tempId)}));
            throw error;
          }

          // 임시 ID → 실제 ID
          const created: Note = {...data, todos: []};
          set(state => ({
            notes: state.notes.map(n => (n.id === tempId ? created : n)),
          }));

          return created;
        } catch (err: any) {
          console.error('[NoteStore] Create error:', err);
          set({error: err.message ?? 'Failed to create note'});
          return null;
        } finally {
          set({loading: false});
        }
      },

      updateNote: async (id, updates) => {
        const originalNotes = get().notes;
        try {
          // Optimistic update
          set(state => ({
            notes: state.notes.map(n =>
              n.id === id ? {...n, ...updates, updated_at: new Date().toISOString()} : n,
            ),
          }));

          const {error} = await supabase
            .from('motivations')
            .update({...updates, updated_at: new Date().toISOString()})
            .eq('id', id);

          if (error) throw error;
          return true;
        } catch (err: any) {
          set({notes: originalNotes});
          console.error('[NoteStore] Update error:', err);
          set({error: err.message ?? 'Failed to update note'});
          return false;
        }
      },

      deleteNote: async (id) => {
        const originalNotes = get().notes;
        try {
          // Optimistic delete
          set(state => ({notes: state.notes.filter(n => n.id !== id)}));

          const {error} = await supabase
            .from('motivations')
            .delete()
            .eq('id', id);

          if (error) throw error;
          return true;
        } catch (err: any) {
          set({notes: originalNotes});
          console.error('[NoteStore] Delete error:', err);
          set({error: err.message ?? 'Failed to delete note'});
          return false;
        }
      },

      setBannerPinned: async (noteId, isPinned) => {
        const originalNotes = get().notes;
        try {
          set(state => ({
            notes: state.notes.map(n =>
              n.id === noteId ? {...n, is_banner_pinned: isPinned} : n,
            ),
          }));

          const {error} = await supabase
            .from('motivations')
            .update({is_banner_pinned: isPinned})
            .eq('id', noteId);

          if (error) throw error;
          return true;
        } catch (err: any) {
          set({notes: originalNotes});
          console.error('[NoteStore] Pin error:', err);
          set({error: err.message ?? 'Failed to pin note'});
          return false;
        }
      },

      getBannerPinnedMotivationNotes: () => {
        return get().notes.filter(n => n.is_banner_pinned === true);
      },

      getRandomMotivationNote: () => {
        const pinned = get().getBannerPinnedMotivationNotes();
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
