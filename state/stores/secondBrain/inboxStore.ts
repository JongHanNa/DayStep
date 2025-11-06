/**
 * Inbox Store - 수집함 관리
 * GTD 시스템의 Collect 단계
 *
 * ✅ Supabase 백엔드 연동 완료
 */

import { createStore } from '@/state/utils/storeUtils';
import type {
  InboxItem,
  CreateInboxItemInput,
  UpdateInboxItemInput,
  GTDStatus,
} from '@/types/second-brain';
import {
  fetchInboxTodos,
  fetchInboxNotes,
  createInboxTodo,
  createInboxNote,
  updateInboxTodo,
  updateInboxNote,
  deleteInboxTodo,
  deleteInboxNote,
} from '@/lib/supabase/inbox';

interface InboxStoreState {
  inboxItems: InboxItem[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchInboxItems: (userId: string) => Promise<void>;
  fetchInboxItemsByStatus: (status: GTDStatus) => Promise<InboxItem[]>;
  fetchInboxItemsByType: (type: 'todo' | 'note' | 'project' | 'goal') => Promise<InboxItem[]>;
  createInboxItem: (userId: string, data: CreateInboxItemInput) => Promise<InboxItem>;
  updateInboxItem: (userId: string, id: string, data: UpdateInboxItemInput) => Promise<InboxItem>;
  deleteInboxItem: (userId: string, id: string) => Promise<boolean>;
  clarifyInboxItem: (userId: string, id: string, status: GTDStatus, clarifyData?: Partial<InboxItem>) => Promise<InboxItem>;
  completeInboxItem: (userId: string, id: string) => Promise<InboxItem>;
  delegateInboxItem: (userId: string, id: string, delegatedTo: string) => Promise<InboxItem>;
}

/**
 * todos 테이블 데이터를 InboxItem 형식으로 변환
 */
function todoToInboxItem(todo: any): InboxItem {
  return {
    id: todo.id,
    user_id: todo.user_id,
    content: todo.title, // title → content
    status: 'inbox', // 수집함 항목은 모두 inbox
    item_type: 'todo',
    clarification: todo.clarification || '',
    scheduled_date: todo.start_time || undefined,
    is_highlight: todo.is_today_highlight || false,
    is_completed: todo.completed || false,
    next_action_status: todo.next_action_contexts?.length > 0 ? JSON.stringify(todo.next_action_contexts) : '',
    recurrence_pattern: todo.recurrence_pattern || 'none',
    created_at: todo.created_at,
    updated_at: todo.updated_at,
  };
}

/**
 * notes 테이블 데이터를 InboxItem 형식으로 변환
 */
function noteToInboxItem(note: any): InboxItem {
  return {
    id: note.id,
    user_id: note.user_id,
    content: note.title || '새 노트',
    status: 'inbox',
    item_type: 'note',
    note_title: note.title || '',
    note_content: note.content || '',
    note_category: note.note_category === 'none' ? '중간 작업물' :
                   note.note_category === 'work_in_progress' ? '중간 작업물' :
                   note.note_category === 'read_later' ? '나중에 보기' :
                   note.note_category === 'reference' ? '레퍼런스' : '중간 작업물',
    is_pinned: note.is_pinned || false,
    linked_area_or_resource: note.area_resource_id ? `area-${note.area_resource_id}` : '',
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
}

export const useInboxStore = createStore<InboxStoreState>(
  (set, get) => ({
    inboxItems: [],
    loading: false,
    error: null,

    fetchInboxItems: async (userId: string) => {
      try {
        set({ loading: true, error: null });

        // 병렬로 todos와 notes 조회
        const [todos, notes] = await Promise.all([
          fetchInboxTodos(userId),
          fetchInboxNotes(userId),
        ]);

        // InboxItem 형식으로 변환
        const todoItems = todos.map(todoToInboxItem);
        const noteItems = notes.map(noteToInboxItem);

        // 합쳐서 최신순 정렬
        const allItems = [...todoItems, ...noteItems].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        set({ inboxItems: allItems, loading: false });
      } catch (error) {
        console.error('❌ [inboxStore] fetchInboxItems 오류:', error);
        set({
          error: error instanceof Error ? error.message : '수집함 항목을 불러오는데 실패했습니다.',
          loading: false,
        });
      }
    },

    fetchInboxItemsByStatus: async (status: GTDStatus) => {
      try {
        set({ loading: true, error: null });
        const filteredItems = get().inboxItems.filter((item: InboxItem) => item.status === status);
        set({ loading: false });
        return filteredItems;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '수집함 항목을 불러오는데 실패했습니다.',
          loading: false,
        });
        return [];
      }
    },

    fetchInboxItemsByType: async (type: 'todo' | 'note' | 'project' | 'goal') => {
      try {
        set({ loading: true, error: null });
        const filteredItems = get().inboxItems.filter((item: InboxItem) => {
          return item.item_type === type && item.status === 'inbox';
        });
        set({ loading: false });
        return filteredItems;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '수집함 항목을 불러오는데 실패했습니다.',
          loading: false,
        });
        return [];
      }
    },

    createInboxItem: async (userId: string, data: CreateInboxItemInput) => {
      try {
        set({ loading: true, error: null });

        let newItem: InboxItem;

        if (data.item_type === 'note') {
          // 노트 생성
          const noteData = {
            title: data.note_title || data.content,
            content: data.note_content || '',
            note_category: (data.note_category === '중간 작업물' ? 'work_in_progress' :
                           data.note_category === '나중에 보기' ? 'read_later' :
                           data.note_category === '레퍼런스' ? 'reference' : 'none') as 'none' | 'work_in_progress' | 'read_later' | 'reference',
            is_pinned: data.is_pinned || false,
          };

          const createdNote = await createInboxNote(userId, noteData);
          newItem = noteToInboxItem(createdNote);
        } else {
          // 할일 생성 (기본값)
          const todoData = {
            title: data.content,
            clarification: data.clarification,
            scheduled_date: data.scheduled_date,
            is_today_highlight: data.is_highlight,
            completed: data.is_completed,
            next_action_contexts: data.next_action_status ? JSON.parse(data.next_action_status) : undefined,
          };

          const createdTodo = await createInboxTodo(userId, todoData);
          newItem = todoToInboxItem(createdTodo);
        }

        const updatedInboxItems = [...get().inboxItems, newItem];
        set({ inboxItems: updatedInboxItems, loading: false });

        return newItem;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '수집함 항목 생성에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    updateInboxItem: async (userId: string, id: string, data: UpdateInboxItemInput) => {
      try {
        set({ loading: true, error: null });

        const item = get().inboxItems.find((i: InboxItem) => i.id === id);
        if (!item) throw new Error('수집함 항목을 찾을 수 없습니다.');

        let updatedItemData: InboxItem;

        if (item.item_type === 'note') {
          // 노트 수정
          const noteData: any = {};
          if (data.note_title !== undefined) noteData.title = data.note_title;
          if (data.note_content !== undefined) noteData.content = data.note_content;
          if (data.note_category !== undefined) {
            noteData.note_category = data.note_category === '중간 작업물' ? 'work_in_progress' :
                                      data.note_category === '나중에 보기' ? 'read_later' :
                                      data.note_category === '레퍼런스' ? 'reference' : 'none';
          }
          if (data.is_pinned !== undefined) noteData.is_pinned = data.is_pinned;

          const updatedNote = await updateInboxNote(userId, id, noteData);
          updatedItemData = noteToInboxItem(updatedNote);
        } else {
          // 할일 수정
          const todoData: any = {};
          if (data.content !== undefined) todoData.title = data.content;
          if (data.clarification !== undefined) todoData.clarification = data.clarification;
          if (data.scheduled_date !== undefined) todoData.scheduled_date = data.scheduled_date;
          if (data.is_highlight !== undefined) todoData.is_today_highlight = data.is_highlight;
          if (data.is_completed !== undefined) todoData.completed = data.is_completed;
          if (data.next_action_status !== undefined) {
            todoData.next_action_contexts = data.next_action_status ? JSON.parse(data.next_action_status) : null;
          }

          const updatedTodo = await updateInboxTodo(userId, id, todoData);
          updatedItemData = todoToInboxItem(updatedTodo);
        }

        const updatedInboxItems = get().inboxItems.map((i: InboxItem) =>
          i.id === id ? updatedItemData : i
        );

        set({ inboxItems: updatedInboxItems, loading: false });
        return updatedItemData;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '수집함 항목 수정에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    deleteInboxItem: async (userId: string, id: string) => {
      try {
        set({ loading: true, error: null });

        const item = get().inboxItems.find((i: InboxItem) => i.id === id);
        if (!item) throw new Error('수집함 항목을 찾을 수 없습니다.');

        // DB에서 삭제
        if (item.item_type === 'note') {
          await deleteInboxNote(userId, id);
        } else {
          await deleteInboxTodo(userId, id);
        }

        // 로컬 상태에서 제거
        const updatedInboxItems = get().inboxItems.filter((i: InboxItem) => i.id !== id);
        set({ inboxItems: updatedInboxItems, loading: false });

        return true;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '수집함 항목 삭제에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    clarifyInboxItem: async (userId: string, id: string, status: GTDStatus, clarifyData?: Partial<InboxItem>) => {
      try {
        set({ loading: true, error: null });

        const item = get().inboxItems.find((i: InboxItem) => i.id === id);
        if (!item) throw new Error('수집함 항목을 찾을 수 없습니다.');

        // 명료화 처리 (clarification 필드 업데이트)
        const updateData: UpdateInboxItemInput = {
          ...clarifyData,
          clarification: status !== 'inbox' ? status : '',
        };

        const updatedItem = await get().updateInboxItem(userId, id, updateData);

        return updatedItem;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '명료화 처리에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    completeInboxItem: async (userId: string, id: string) => {
      try {
        set({ loading: true, error: null });

        const updateData: UpdateInboxItemInput = {
          is_completed: true,
        };

        const completedItem = await get().updateInboxItem(userId, id, updateData);

        return completedItem;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '완료 처리에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    delegateInboxItem: async (userId: string, id: string, delegatedTo: string) => {
      try {
        set({ loading: true, error: null });

        const updateData: UpdateInboxItemInput = {
          delegated_to: delegatedTo,
          delegated_at: new Date().toISOString(),
        };

        const delegatedItem = await get().updateInboxItem(userId, id, updateData);

        return delegatedItem;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '위임 처리에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },
  }),
  {
    name: 'inbox-store',
    persist: {
      name: 'daystep-inbox',
      version: 3, // Supabase 연동으로 버전 업그레이드
    },
  }
);
