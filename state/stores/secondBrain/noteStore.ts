/**
 * Note Store - 노트 관리
 * PARA 구조로 분류되는 노트 시스템 (Supabase 연동)
 */

import { createStore } from '@/state/utils/storeUtils';
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/types/second-brain';
import {
  fetchNotesWithJWT,
  createNoteWithJWT,
  updateNoteWithJWT,
  deleteNoteWithJWT,
  fetchNotesByTodoWithJWT,
} from '@/lib/supabase/notes';
import { getProjectNotes } from '@/lib/supabase/project-notes';
import { getNoteNotes } from '@/lib/supabase/note-notes';
import { queryRLSTableWithJWT } from '@/lib/supabase/core';

interface NoteStoreState {
  notes: Note[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchNotes: (userId: string) => Promise<void>;
  fetchNotesByTodo: (todoId: string, userId: string) => Promise<Note[]>;
  fetchNotesByProject: (projectId: string, userId: string) => Promise<Note[]>;
  fetchNotesByNote: (noteId: string, userId: string) => Promise<Note[]>;
  createNote: (userId: string, data: CreateNoteInput) => Promise<Note>;
  updateNote: (id: string, userId: string, data: UpdateNoteInput) => Promise<Note>;
  deleteNote: (id: string, userId: string) => Promise<boolean>;
  pinNote: (id: string, userId: string) => Promise<Note>;
  unpinNote: (id: string, userId: string) => Promise<Note>;
  clearNotes: () => void;
}

export const useNoteStore = createStore<NoteStoreState>(
  (set, get) => ({
    notes: [],
    loading: false,
    error: null,

    fetchNotes: async (userId: string) => {
      try {
        set({ loading: true, error: null });
        const notes = await fetchNotesWithJWT(userId);
        set({ notes, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '노트를 불러오는데 실패했습니다.',
          loading: false,
        });
      }
    },

    fetchNotesByTodo: async (todoId: string, userId: string) => {
      try {
        set({ loading: true, error: null });
        const notes = await fetchNotesByTodoWithJWT(todoId, userId);
        set({ loading: false });
        return notes;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '노트를 불러오는데 실패했습니다.',
          loading: false,
        });
        return [];
      }
    },

    fetchNotesByProject: async (projectId: string, userId: string) => {
      try {
        set({ loading: true, error: null });

        // 1. Junction table에서 노트 ID 목록 가져오기 (JWT 자동 인증)
        const noteIds = await getProjectNotes(projectId);

        // 2. 노트 ID가 없으면 빈 배열 반환
        if (noteIds.length === 0) {
          set({ loading: false });
          return [];
        }

        // 3. 노트 ID 목록으로 실제 노트 데이터 조회
        const notes = await queryRLSTableWithJWT('notes', {
          column: 'id',
          operator: 'in',
          value: noteIds,
        }, {
          select: '*',
          order: 'created_at.desc'
        });

        set({ loading: false });
        return notes || [];
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '노트를 불러오는데 실패했습니다.',
          loading: false,
        });
        return [];
      }
    },

    fetchNotesByNote: async (noteId: string, userId: string) => {
      try {
        set({ loading: true, error: null });

        // 1. Junction table에서 연결된 노트 ID 목록 가져오기 (양방향 조회)
        const noteIds = await getNoteNotes(noteId);

        // 2. 노트 ID가 없으면 빈 배열 반환
        if (noteIds.length === 0) {
          set({ loading: false });
          return [];
        }

        // 3. 노트 ID 목록으로 실제 노트 데이터 조회
        const notes = await queryRLSTableWithJWT('notes', {
          column: 'id',
          operator: 'in',
          value: noteIds,
        }, {
          select: '*',
          order: 'created_at.desc'
        });

        set({ loading: false });
        return notes || [];
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '노트를 불러오는데 실패했습니다.',
          loading: false,
        });
        return [];
      }
    },

    createNote: async (userId: string, data: CreateNoteInput) => {
      try {
        set({ loading: true, error: null });

        const newNote = await createNoteWithJWT({
          ...data,
          user_id: userId,
        });

        const updatedNotes = [...get().notes, newNote];
        set({ notes: updatedNotes, loading: false });

        return newNote;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '노트 생성에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    updateNote: async (id: string, userId: string, data: UpdateNoteInput) => {
      try {
        set({ loading: true, error: null });

        const updatedNote = await updateNoteWithJWT(id, userId, data);

        if (!updatedNote) {
          throw new Error('노트를 찾을 수 없습니다.');
        }

        const updatedNotes = get().notes.map((note: Note) =>
          note.id === id ? updatedNote : note
        );

        set({ notes: updatedNotes, loading: false });
        return updatedNote;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '노트 수정에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    deleteNote: async (id: string, userId: string) => {
      try {
        set({ loading: true, error: null });

        const success = await deleteNoteWithJWT(id, userId);

        if (success) {
          const updatedNotes = get().notes.filter((note: Note) => note.id !== id);
          set({ notes: updatedNotes, loading: false });
        } else {
          set({ loading: false });
        }

        return success;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '노트 삭제에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    pinNote: async (id: string, userId: string) => {
      try {
        set({ loading: true, error: null });

        const updatedNote = await updateNoteWithJWT(id, userId, {
          is_pinned: true,
        });

        if (!updatedNote) {
          throw new Error('노트를 찾을 수 없습니다.');
        }

        const updatedNotes = get().notes.map((note: Note) =>
          note.id === id ? updatedNote : note
        );

        set({ notes: updatedNotes, loading: false });
        return updatedNote;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '노트 고정에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    unpinNote: async (id: string, userId: string) => {
      try {
        set({ loading: true, error: null });

        const updatedNote = await updateNoteWithJWT(id, userId, {
          is_pinned: false,
        });

        if (!updatedNote) {
          throw new Error('노트를 찾을 수 없습니다.');
        }

        const updatedNotes = get().notes.map((note: Note) =>
          note.id === id ? updatedNote : note
        );

        set({ notes: updatedNotes, loading: false });
        return updatedNote;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '노트 고정 해제에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    // 로그아웃 시 스토어 초기화
    clearNotes: () => set({ notes: [], loading: false, error: null }),
  }),
  {
    name: 'note-store',
    persist: {
      name: 'daystep-notes',
      version: 2, // 버전 업데이트 (Supabase 연동)
    },
  }
);
