import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createWithJWT,
  updateWithJWT,
  deleteWithJWT,
  queryRLSTableWithJWT,
  isCapacitorEnvironment,
  createMemoInstanceWithJWT,
  updateMemoInstanceWithJWT,
  deleteMemoInstanceWithJWT,
  fetchMemoInstancesByMemoIdWithJWT,
  fetchMemoInstancesByDateWithJWT,
  fetchMemoInstanceByDateWithJWT,
  fetchMemoInstancesByTaskIdWithJWT,
  createMultipleMemoInstancesWithJWT,
} from '@/lib/supabaseWebViewHelper';
import { supabase } from '@/lib/supabase';
import type { NoteInstance, CreateNoteInstanceInput, UpdateNoteInstanceInput } from '@/types';

// Note 타입 정의
export interface Note {
  id: string;
  user_id: string;
  content: string;
  related_task_id?: string | null;
  linked_date?: string | null; // 반복 할일의 특정 날짜
  linked_timeline_task_id?: string | null; // 타임라인 작업 직접 연결
  is_pinned: boolean;
  is_floating: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  is_recurring?: boolean; // 반복 노트 여부
  recurrence_type?: 'single' | 'recurring' | 'instance'; // 노트 반복 타입
}

// Note 생성 입력 타입
export interface CreateNoteInput {
  content: string;
  related_task_id?: string | null;
  linked_date?: string | null;
  linked_timeline_task_id?: string | null;
  is_pinned?: boolean;
  is_floating?: boolean;
  position?: number;
  user_id?: string;
  is_recurring?: boolean;
  recurrence_type?: 'single' | 'recurring' | 'instance';
}

// Note 업데이트 입력 타입
export interface UpdateNoteInput extends Partial<CreateNoteInput> {
  id: string;
}

/**
 * Note 스토어 상태 타입 정의
 */
interface NoteStoreState {
  // 데이터 상태
  notes: Note[];
  selectedNote: Note | null;
  pinnedNotes: Note[];
  floatingNotes: Note[];

  // API 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // 📦 전역 로드 상태 관리 (중복 호출 방지)
  loadState: {
    hasInitiallyLoaded: boolean;
    lastFetchTime: number;
    cacheValidityPeriod: number; // 5분 (300,000ms)
  };

  // 필터 및 정렬 상태
  filters: {
    searchQuery: string;
    showPinned: boolean;
    showFloating: boolean;
  };

  // 실시간 구독 상태
  isSubscribed: boolean;
  channel: any;

  // 통계 정보
  stats: {
    totalCount: number;
    pinnedCount: number;
    floatingCount: number;
    todayCount: number;
  };

  // UI 상태
  ui: {
    bottomSheetOpen: boolean;
    bottomSheetMode: 'compact' | 'expanded';
    selectedNoteForEdit: Note | null;
    isFloatingCardVisible: boolean;
    floatingCardPosition: { x: number; y: number };
  };
}

/**
 * Note 스토어 액션 타입 정의
 */
interface NoteStoreActions {
  // 노트 CRUD 작업
  createNote: (input: CreateNoteInput) => Promise<Note>;
  updateNote: (input: UpdateNoteInput) => Promise<Note>;
  deleteNote: (noteId: string) => Promise<void>;
  getNotes: (userId: string) => Promise<Note[]>;
  getNoteById: (noteId: string) => Note | null;

  // 핀/플로팅 관리
  pinNote: (memoId: string) => Promise<void>;
  unpinNote: (memoId: string) => Promise<void>;
  toggleFloating: (memoId: string) => Promise<void>;
  updateNotePosition: (memoId: string, position: number) => Promise<void>;

  // 할일 연결 관리
  linkToTask: (memoId: string, taskId: string | null, options?: {
    linkDate?: string;
    timelineTaskId?: string;
    recurrenceType?: 'single' | 'recurring' | 'instance';
  }) => Promise<void>;
  unlinkFromTask: (memoId: string) => Promise<void>;
  getNotesByTaskId: (taskId: string) => Note[];
  getLinkedNotesByTaskId: (taskId: string) => Note[];
  deleteLinkedNotes: (taskId: string) => Promise<number>;
  getDisplayNotesForTask: (taskId: string, date?: string) => Promise<Array<Note | NoteInstance>>;

  // 노트 인스턴스 관리
  createNoteInstance: (input: CreateNoteInstanceInput) => Promise<NoteInstance>;
  updateNoteInstance: (input: UpdateNoteInstanceInput) => Promise<NoteInstance>;
  deleteNoteInstance: (instanceId: string) => Promise<void>;
  getMemoInstancesByMemoId: (memoId: string) => Promise<NoteInstance[]>;
  getMemoInstancesByDate: (date: string) => Promise<NoteInstance[]>;
  getMemoInstanceByDate: (memoId: string, date: string) => Promise<NoteInstance | null>;
  getMemoInstancesByTaskId: (taskId: string) => Promise<NoteInstance[]>;
  createRecurringMemoInstances: (memoId: string, dates: string[], taskId?: string) => Promise<NoteInstance[]>;
  upsertMemoInstance: (memoId: string, date: string, content: string, taskId?: string | null) => Promise<NoteInstance | null>;

  // 필터링 및 정렬
  setFilter: (filter: Partial<NoteStoreState['filters']>) => void;
  getFilteredNotes: () => Note[];
  clearFilters: () => void;

  // 실시간 구독 관리
  subscribeToNotes: (userId: string) => Promise<void>;
  unsubscribeFromNotes: () => void;

  // UI 상태 관리
  setBottomSheetOpen: (open: boolean) => void;
  setBottomSheetMode: (mode: 'compact' | 'expanded') => void;
  setSelectedNoteForEdit: (memo: Note | null) => void;
  setFloatingCardVisible: (visible: boolean) => void;
  setFloatingCardPosition: (position: { x: number; y: number }) => void;

  // 통계 업데이트
  updateStats: () => void;

  // 초기화 및 정리
  initialize: (userId: string) => Promise<void>;
  reset: () => void;
  refresh: (userId: string) => Promise<void>;
}

/**
 * Quick Memo 스토어 생성
 */
export const useNoteStore = create<NoteStoreState & NoteStoreActions>()(
  persist(
    (set, get) => {
      return {
        // 초기 상태
        notes: [],
        selectedNote: null,
        pinnedNotes: [],
        floatingNotes: [],
        loading: false,
        error: null,
        lastUpdated: null,

        loadState: {
          hasInitiallyLoaded: false,
          lastFetchTime: 0,
          cacheValidityPeriod: 300000, // 5분
        },

        filters: {
          searchQuery: '',
          showPinned: true,
          showFloating: true,
        },

        isSubscribed: false,
        channel: null,

        stats: {
          totalCount: 0,
          pinnedCount: 0,
          floatingCount: 0,
          todayCount: 0,
        },

        ui: {
          bottomSheetOpen: false,
          bottomSheetMode: 'compact',
          selectedNoteForEdit: null,
          isFloatingCardVisible: false,
          floatingCardPosition: { x: 0, y: 0 },
        },

        // 노트 CRUD 작업
        createNote: async (input: CreateNoteInput) => {
          console.log('📝 NoteStore.createNote:', input);

          let userId: string | null = null;
          
          // Capacitor 백업 인증 패턴
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              userId = session.user.id;
            }
          } catch {}

          if (!userId && isCapacitorEnvironment()) {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key: 'supabase_auth_session' });
            if (value) {
              userId = JSON.parse(value).user?.id;
            }
          }

          if (!userId) {
            throw new Error('사용자 인증이 필요합니다.');
          }

          const memoData = {
            ...input,
            user_id: userId,
            is_pinned: input.is_pinned || false,
            is_floating: input.is_floating || false,
            position: input.position || 0,
          };

          // Optimistic update - 최상단에 추가하기 위해 정렬된 위치에 삽입
          const tempId = `temp-${Date.now()}`;
          const tempMemo: Note = {
            id: tempId,
            ...memoData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          set(state => {
            // 새 메모를 최상단에 추가하고 정렬 순서 적용
            const newMemos = [tempMemo, ...state.notes].sort((a, b) => {
              // 1. position 오름차순 (0이 최상단)
              if (a.position !== b.position) {
                return a.position - b.position;
              }
              // 2. created_at 내림차순 (최신이 위)
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            return { notes: newMemos };
          });

          try {
            const result = await createWithJWT('notes', memoData);
            
            set(state => {
              // 서버 응답으로 교체하고 다시 정렬
              const updatedMemos = state.notes.map(memo => 
                memo.id === tempId ? result : memo
              ).sort((a, b) => {
                // 1. position 오름차순 (0이 최상단)
                if (a.position !== b.position) {
                  return a.position - b.position;
                }
                // 2. created_at 내림차순 (최신이 위)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });

              return { notes: updatedMemos };
            });

            get().updateStats();
            return result;
          } catch (error) {
            set(state => ({
              notes: state.notes.filter(memo => memo.id !== tempId),
              error: error instanceof Error ? error.message : '노트 생성 실패',
            }));
            throw error;
          }
        },

        updateNote: async (input: UpdateNoteInput) => {
          console.log('📝 NoteStore.updateNote:', input);

          const { id, ...updateData } = input;
          const originalMemo = get().notes.find(memo => memo.id === id);
          
          if (!originalMemo) {
            throw new Error('메모를 찾을 수 없습니다.');
          }

          // Optimistic update
          const updatedMemo = { ...originalMemo, ...updateData, updated_at: new Date().toISOString() };

          set(state => ({
            notes: state.notes.map(memo => 
              memo.id === id ? updatedMemo : memo
            ),
          }));

          try {
            const result = await updateWithJWT('notes', {
              column: 'id',
              operator: 'eq',
              value: id
            }, updateData);

            // Update successful

            get().updateStats();
            return Array.isArray(result) ? result[0] : result;
          } catch (error) {
            // Rollback optimistic update
            set(state => ({
              notes: state.notes.map(memo => 
                memo.id === id ? originalMemo : memo
              ),
              error: error instanceof Error ? error.message : '노트 업데이트 실패',
            }));
            throw error;
          }
        },

        deleteNote: async (memoId: string) => {
          console.log('📝 NoteStore.deleteNote:', memoId);

          const originalMemo = get().notes.find(memo => memo.id === memoId);
          
          if (!originalMemo) {
            throw new Error('메모를 찾을 수 없습니다.');
          }

          // Optimistic update
          set(state => ({
            notes: state.notes.filter(memo => memo.id !== memoId),
          }));

          try {
            await deleteWithJWT('notes', {
              column: 'id',
              operator: 'eq',
              value: memoId
            });

            // Delete successful

            get().updateStats();
          } catch (error) {
            // Rollback optimistic update
            set(state => ({
              notes: [...state.notes, originalMemo],
              error: error instanceof Error ? error.message : '노트 삭제 실패',
            }));
            throw error;
          }
        },

        getNotes: async (userId: string) => {
          console.log('📋 NoteStore.getNotes:', userId);

          try {
            set({ loading: true, error: null });

            const notes = await queryRLSTableWithJWT('notes', {
              column: 'user_id',
              operator: 'eq',
              value: userId
            }, {
              order: 'position.asc,created_at.desc'
            });

            set({
              notes: notes || [],
              loading: false,
              lastUpdated: new Date(),
              loadState: {
                ...get().loadState,
                hasInitiallyLoaded: true,
                lastFetchTime: Date.now(),
              },
            });

            get().updateStats();
            return notes || [];
          } catch (error) {
            set({
              loading: false,
              error: error instanceof Error ? error.message : '노트 조회 실패',
            });
            throw error;
          }
        },

        getNoteById: (memoId: string) => {
          return get().notes.find(memo => memo.id === memoId) || null;
        },

        // 핀/플로팅 관리
        pinNote: async (memoId: string) => {
          await get().updateNote({ id: memoId, is_pinned: true });
        },

        unpinNote: async (memoId: string) => {
          await get().updateNote({ id: memoId, is_pinned: false });
        },

        toggleFloating: async (memoId: string) => {
          const memo = get().getNoteById(memoId);
          if (memo) {
            await get().updateNote({ id: memoId, is_floating: !memo.is_floating });
          }
        },

        updateNotePosition: async (memoId: string, position: number) => {
          await get().updateNote({ id: memoId, position });
        },

        // 할일 연결 관리 (향상된 버전)
        linkToTask: async (memoId: string, taskId: string | null, options?: {
          linkDate?: string;
          timelineTaskId?: string;
          recurrenceType?: 'single' | 'recurring' | 'instance';
        }) => {
          console.log('🔗 NoteStore.linkToTask:', { memoId, taskId, options });

          const updateData: Partial<Note> = {
            related_task_id: taskId,
            linked_date: options?.linkDate || null,
            linked_timeline_task_id: options?.timelineTaskId || null,
            is_recurring: options?.recurrenceType === 'recurring',
            recurrence_type: options?.recurrenceType || 'single',
          };

          // 노트 업데이트
          await get().updateNote({ id: memoId, ...updateData });

          // 반복 메모로 설정된 경우 인스턴스 생성 로직은 TaskLinkModal에서 처리
          console.log('✅ 노트 할일 연결 완료:', updateData);
        },

        unlinkFromTask: async (memoId: string) => {
          await get().updateNote({ 
            id: memoId, 
            related_task_id: null,
            linked_date: null,
            linked_timeline_task_id: null,
          });
        },

        getNotesByTaskId: (taskId: string) => {
          return get().notes.filter(memo => memo.related_task_id === taskId);
        },

        getLinkedNotesByTaskId: (taskId: string) => {
          return get().notes.filter(memo => 
            memo.related_task_id === taskId || 
            memo.linked_timeline_task_id === taskId
          );
        },

        deleteLinkedNotes: async (taskId: string) => {
          console.log('🗑️ NoteStore.deleteLinkedNotes:', taskId);
          
          const linkedMemos = get().getLinkedNotesByTaskId(taskId);
          
          if (linkedMemos.length === 0) {
            return 0;
          }

          let deletedCount = 0;
          const failedMemos: string[] = [];

          for (const memo of linkedMemos) {
            try {
              await get().deleteNote(memo.id);
              deletedCount++;
            } catch (error) {
              console.error(`노트 ${memo.id} 삭제 실패:`, error);
              failedMemos.push(memo.id);
            }
          }

          if (failedMemos.length > 0) {
            console.warn(`일부 노트 삭제 실패: ${failedMemos.join(', ')}`);
          }

          return deletedCount;
        },

        // 특정 할일에 연결된 메모들을 가져오되, 반복 메모의 경우 해당 날짜의 인스턴스를 우선 표시
        getDisplayNotesForTask: async (taskId: string, date?: string) => {
          console.log('📝 NoteStore.getDisplayNotesForTask:', { taskId, date });

          try {
            // 기본 연결된 메모들 가져오기
            const linkedMemos = get().getLinkedNotesByTaskId(taskId);
            const displayMemos: Array<Note | NoteInstance> = [];

            // Capacitor 백업 인증 패턴으로 사용자 ID 확보
            let userId: string | null = null;

            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                userId = session.user.id;
              }
            } catch (authError) {
              console.log('⚠️ 웹 세션 확보 실패:', authError);
            }

            if (!userId && isCapacitorEnvironment()) {
              const { Preferences } = await import('@capacitor/preferences');
              const { value } = await Preferences.get({ key: 'supabase_auth_session' });
              if (value) {
                const session = JSON.parse(value);
                userId = session.user?.id;
              }
            }

            for (const memo of linkedMemos) {
              // 1. 특정 날짜 인스턴스 메모인 경우 날짜 필터링
              if (memo.recurrence_type === 'instance' && memo.linked_date && date) {
                // linked_date와 현재 date가 일치하는 경우만 표시
                if (memo.linked_date === date) {
                  console.log('📅 특정 날짜 인스턴스 노트 표시:', memo.id, memo.linked_date, date);
                  displayMemos.push(memo);
                }
                continue;
              }

              // 2. 반복 메모이고 날짜가 제공된 경우, 해당 날짜의 인스턴스를 확인
              if (memo.is_recurring && memo.recurrence_type === 'recurring' && date && userId) {
                try {
                  const memoInstance = await fetchMemoInstanceByDateWithJWT(userId, memo.id, date);
                  if (memoInstance) {
                    // 노트 인스턴스가 있으면 이를 우선 표시
                    console.log('📅 노트 인스턴스 발견:', memoInstance.id, date);
                    displayMemos.push({
                      ...memoInstance,
                      // 노트 인스턴스임을 표시하기 위한 추가 필드
                      _isInstance: true,
                      _originalMemo: memo
                    } as any);
                    continue;
                  }
                } catch (error) {
                  console.log('⚠️ 노트 인스턴스 조회 실패:', error);
                }
              }

              // 3. 일반 메모이거나 인스턴스가 없는 경우 원본 노트 표시
              // (단, instance 타입이 아닌 경우만)
              if (memo.recurrence_type !== 'instance') {
                displayMemos.push(memo);
              }
            }

            console.log('✅ 표시할 노트 목록:', displayMemos.length);
            return displayMemos;
          } catch (error) {
            console.error('❌ 표시 노트 조회 실패:', error);
            // 에러 시 기본 연결된 메모들 반환
            return get().getLinkedNotesByTaskId(taskId);
          }
        },

        // 필터링 및 정렬
        setFilter: (filter: Partial<NoteStoreState['filters']>) => {
          set(state => ({
            filters: { ...state.filters, ...filter }
          }));
        },

        getFilteredNotes: () => {
          const { notes, filters } = get();
          
          return notes.filter(memo => {
            // 검색 쿼리 필터
            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase();
              if (!memo.content.toLowerCase().includes(query)) {
                return false;
              }
            }

            // 핀 상태 필터
            if (!filters.showPinned && memo.is_pinned) {
              return false;
            }

            // 플로팅 상태 필터
            if (!filters.showFloating && memo.is_floating) {
              return false;
            }

            return true;
          });
        },

        clearFilters: () => {
          set({
            filters: {
              searchQuery: '',
              showPinned: true,
              showFloating: true,
            }
          });
        },

        // 실시간 구독 관리
        subscribeToNotes: async (userId: string) => {
          if (get().isSubscribed) return;

          const channel = supabase
            .channel('notes_changes')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notes',
                filter: `user_id=eq.${userId}`,
              },
              (payload) => {
                console.log('📡 NoteStore.realtimeUpdate:', payload);

                const { eventType, new: newRecord, old: oldRecord } = payload;

                set(state => {
                  let newMemos = [...state.notes];

                  switch (eventType) {
                    case 'INSERT':
                      if (newRecord && !newMemos.find(m => m.id === newRecord.id)) {
                        newMemos.push(newRecord as Note);
                      }
                      break;
                    case 'UPDATE':
                      if (newRecord) {
                        newMemos = newMemos.map(memo =>
                          memo.id === newRecord.id ? newRecord as Note : memo
                        );
                      }
                      break;
                    case 'DELETE':
                      if (oldRecord) {
                        newMemos = newMemos.filter(memo => memo.id !== oldRecord.id);
                      }
                      break;
                  }

                  // 실시간 업데이트 후에도 정렬 순서 적용
                  newMemos.sort((a, b) => {
                    // 1. position 오름차순 (0이 최상단)
                    if (a.position !== b.position) {
                      return a.position - b.position;
                    }
                    // 2. created_at 내림차순 (최신이 위)
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  });

                  return {
                    notes: newMemos,
                  };
                });

                get().updateStats();
              }
            )
            .subscribe();

          set({ 
            isSubscribed: true, 
            channel,
          });
        },

        unsubscribeFromNotes: () => {
          const { channel } = get();
          if (channel) {
            supabase.removeChannel(channel);
          }
          set({ 
            isSubscribed: false, 
            channel: null,
          });
        },

        // UI 상태 관리
        setBottomSheetOpen: (open: boolean) => {
          set(state => ({
            ui: { ...state.ui, bottomSheetOpen: open }
          }));
        },

        setBottomSheetMode: (mode: 'compact' | 'expanded') => {
          set(state => ({
            ui: { ...state.ui, bottomSheetMode: mode }
          }));
        },

        setSelectedNoteForEdit: (memo: Note | null) => {
          set(state => ({
            ui: { ...state.ui, selectedNoteForEdit: memo }
          }));
        },

        setFloatingCardVisible: (visible: boolean) => {
          set(state => ({
            ui: { ...state.ui, isFloatingCardVisible: visible }
          }));
        },

        setFloatingCardPosition: (position: { x: number; y: number }) => {
          set(state => ({
            ui: { ...state.ui, floatingCardPosition: position }
          }));
        },

        // 통계 업데이트
        updateStats: () => {
          const { notes } = get();
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

          const stats = {
            totalCount: notes.length,
            pinnedCount: notes.filter(memo => memo.is_pinned).length,
            floatingCount: notes.filter(memo => memo.is_floating).length,
            todayCount: notes.filter(memo => {
              const createdAt = new Date(memo.created_at);
              return createdAt >= todayStart;
            }).length,
          };

          set({ 
            stats,
            pinnedNotes: notes.filter(memo => memo.is_pinned),
            floatingNotes: notes.filter(memo => memo.is_floating),
          });
        },

        // 초기화 및 정리
        initialize: async (userId: string) => {
          console.log('🚀 NoteStore.initialize:', userId);

          const state = get();
          const now = Date.now();
          const cacheValid = state.loadState.hasInitiallyLoaded && 
            (now - state.loadState.lastFetchTime) < state.loadState.cacheValidityPeriod;

          if (cacheValid) {
            console.log('💾 Note 캐시 유효, 스킵');
            return;
          }

          try {
            await get().getNotes(userId);
            await get().subscribeToNotes(userId);
          } catch (error) {
            console.error('❌ Note 스토어 초기화 실패:', error);
          }
        },

        reset: () => {
          get().unsubscribeFromNotes();
          set({
            notes: [],
            selectedNote: null,
            pinnedNotes: [],
            floatingNotes: [],
            loading: false,
            error: null,
            lastUpdated: null,
            loadState: {
              hasInitiallyLoaded: false,
              lastFetchTime: 0,
              cacheValidityPeriod: 300000,
            },
            filters: {
              searchQuery: '',
              showPinned: true,
              showFloating: true,
            },
            isSubscribed: false,
            channel: null,
            stats: {
              totalCount: 0,
              pinnedCount: 0,
              floatingCount: 0,
              todayCount: 0,
            },
            ui: {
              bottomSheetOpen: false,
              bottomSheetMode: 'compact',
              selectedNoteForEdit: null,
              isFloatingCardVisible: false,
              floatingCardPosition: { x: 0, y: 0 },
            },
          });
        },

        refresh: async (userId: string) => {
          console.log('🔄 NoteStore.refresh:', userId);
          set(state => ({
            loadState: {
              ...state.loadState,
              hasInitiallyLoaded: false,
              lastFetchTime: 0,
            }
          }));
          await get().initialize(userId);
        },

        // 노트 인스턴스 관리 함수들
        createNoteInstance: async (input: CreateNoteInstanceInput) => {
          console.log('📝 NoteStore.createNoteInstance:', input);

          try {
            const result = await createMemoInstanceWithJWT(input);
            console.log('✅ 노트 인스턴스 생성 성공:', result);
            return result;
          } catch (error) {
            console.error('❌ 노트 인스턴스 생성 실패:', error);
            throw error;
          }
        },

        updateNoteInstance: async (input: UpdateNoteInstanceInput) => {
          console.log('📝 NoteStore.updateNoteInstance:', input);

          try {
            const result = await updateMemoInstanceWithJWT(input.id, input);
            console.log('✅ 노트 인스턴스 업데이트 성공:', result);
            return result;
          } catch (error) {
            console.error('❌ 노트 인스턴스 업데이트 실패:', error);
            throw error;
          }
        },

        deleteNoteInstance: async (instanceId: string) => {
          console.log('📝 NoteStore.deleteNoteInstance:', instanceId);

          try {
            await deleteMemoInstanceWithJWT(instanceId);
            console.log('✅ 노트 인스턴스 삭제 성공');
          } catch (error) {
            console.error('❌ 노트 인스턴스 삭제 실패:', error);
            throw error;
          }
        },

        getMemoInstancesByMemoId: async (memoId: string) => {
          console.log('📝 NoteStore.getMemoInstancesByMemoId:', memoId);

          try {
            // Capacitor 백업 인증 패턴으로 사용자 ID 확보
            let userId: string | null = null;

            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                userId = session.user.id;
              }
            } catch (authError) {
              console.log('⚠️ 웹 세션 확보 실패:', authError);
            }

            if (!userId && isCapacitorEnvironment()) {
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const { value } = await Preferences.get({ key: 'supabase_auth_session' });
                if (value) {
                  const session = JSON.parse(value);
                  if (session?.user?.id) {
                    userId = session.user.id;
                  }
                }
              } catch (capacitorError) {
                console.log('⚠️ Capacitor 백업 인증 실패:', capacitorError);
              }
            }

            if (!userId) {
              throw new Error('사용자 ID를 확보할 수 없습니다');
            }

            const instances = await fetchMemoInstancesByMemoIdWithJWT(userId, memoId);
            console.log('✅ 노트 인스턴스들 조회 성공:', instances.length);
            return instances;
          } catch (error) {
            console.error('❌ 노트 인스턴스들 조회 실패:', error);
            return [];
          }
        },

        getMemoInstancesByDate: async (date: string) => {
          console.log('📝 NoteStore.getMemoInstancesByDate:', date);

          try {
            // Capacitor 백업 인증 패턴으로 사용자 ID 확보
            let userId: string | null = null;

            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                userId = session.user.id;
              }
            } catch (authError) {
              console.log('⚠️ 웹 세션 확보 실패:', authError);
            }

            if (!userId && isCapacitorEnvironment()) {
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const { value } = await Preferences.get({ key: 'supabase_auth_session' });
                if (value) {
                  const session = JSON.parse(value);
                  if (session?.user?.id) {
                    userId = session.user.id;
                  }
                }
              } catch (capacitorError) {
                console.log('⚠️ Capacitor 백업 인증 실패:', capacitorError);
              }
            }

            if (!userId) {
              throw new Error('사용자 ID를 확보할 수 없습니다');
            }

            const instances = await fetchMemoInstancesByDateWithJWT(userId, date);
            console.log('✅ 특정 날짜 노트 인스턴스들 조회 성공:', instances.length);
            return instances;
          } catch (error) {
            console.error('❌ 특정 날짜 노트 인스턴스들 조회 실패:', error);
            return [];
          }
        },

        getMemoInstanceByDate: async (memoId: string, date: string) => {
          console.log('📝 NoteStore.getMemoInstanceByDate:', { memoId, date });

          try {
            // Capacitor 백업 인증 패턴으로 사용자 ID 확보
            let userId: string | null = null;

            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                userId = session.user.id;
              }
            } catch (authError) {
              console.log('⚠️ 웹 세션 확보 실패:', authError);
            }

            if (!userId && isCapacitorEnvironment()) {
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const { value } = await Preferences.get({ key: 'supabase_auth_session' });
                if (value) {
                  const session = JSON.parse(value);
                  if (session?.user?.id) {
                    userId = session.user.id;
                  }
                }
              } catch (capacitorError) {
                console.log('⚠️ Capacitor 백업 인증 실패:', capacitorError);
              }
            }

            if (!userId) {
              throw new Error('사용자 ID를 확보할 수 없습니다');
            }

            const instance = await fetchMemoInstanceByDateWithJWT(userId, memoId, date);
            console.log('✅ 특정 메모의 특정 날짜 인스턴스 조회 성공:', instance);
            return instance;
          } catch (error) {
            console.error('❌ 특정 메모의 특정 날짜 인스턴스 조회 실패:', error);
            return null;
          }
        },

        getMemoInstancesByTaskId: async (taskId: string) => {
          console.log('📝 NoteStore.getMemoInstancesByTaskId:', taskId);

          try {
            // Capacitor 백업 인증 패턴으로 사용자 ID 확보
            let userId: string | null = null;

            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                userId = session.user.id;
              }
            } catch (authError) {
              console.log('⚠️ 웹 세션 확보 실패:', authError);
            }

            if (!userId && isCapacitorEnvironment()) {
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const { value } = await Preferences.get({ key: 'supabase_auth_session' });
                if (value) {
                  const session = JSON.parse(value);
                  if (session?.user?.id) {
                    userId = session.user.id;
                  }
                }
              } catch (capacitorError) {
                console.log('⚠️ Capacitor 백업 인증 실패:', capacitorError);
              }
            }

            if (!userId) {
              throw new Error('사용자 ID를 확보할 수 없습니다');
            }

            const instances = await fetchMemoInstancesByTaskIdWithJWT(userId, taskId);
            console.log('✅ 특정 할일의 노트 인스턴스들 조회 성공:', instances.length);
            return instances;
          } catch (error) {
            console.error('❌ 특정 할일의 노트 인스턴스들 조회 실패:', error);
            return [];
          }
        },

        createRecurringMemoInstances: async (memoId: string, dates: string[], taskId?: string) => {
          console.log('📝 NoteStore.createRecurringMemoInstances:', { memoId, dates, taskId });

          try {
            // 원본 노트 조회
            const originalMemo = get().getNoteById(memoId);
            if (!originalMemo) {
              throw new Error('원본 메모를 찾을 수 없습니다');
            }

            // Capacitor 백업 인증 패턴으로 사용자 ID 확보
            let userId: string | null = null;

            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                userId = session.user.id;
              }
            } catch (authError) {
              console.log('⚠️ 웹 세션 확보 실패:', authError);
            }

            if (!userId && isCapacitorEnvironment()) {
              try {
                const { Preferences } = await import('@capacitor/preferences');
                const { value } = await Preferences.get({ key: 'supabase_auth_session' });
                if (value) {
                  const session = JSON.parse(value);
                  if (session?.user?.id) {
                    userId = session.user.id;
                  }
                }
              } catch (capacitorError) {
                console.log('⚠️ Capacitor 백업 인증 실패:', capacitorError);
              }
            }

            if (!userId) {
              throw new Error('사용자 ID를 확보할 수 없습니다');
            }

            const instances = await createMultipleMemoInstancesWithJWT(
              userId,
              memoId,
              originalMemo.content,
              dates,
              taskId || null
            );

            console.log('✅ 반복 노트 인스턴스들 생성 성공:', instances.length);
            return instances;
          } catch (error) {
            console.error('❌ 반복 노트 인스턴스들 생성 실패:', error);
            throw error;
          }
        },

        // 노트 인스턴스 생성 또는 업데이트 (upsert) - 스마트한 원본 비교 로직 포함
        upsertMemoInstance: async (memoId: string, date: string, content: string, taskId?: string | null) => {
          console.log('📝 NoteStore.upsertMemoInstance:', { memoId, date, content, taskId });

          try {
            // Capacitor 백업 인증 패턴으로 사용자 ID 확보
            let userId: string | null = null;

            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                userId = session.user.id;
              }
            } catch (authError) {
              console.log('⚠️ 웹 세션 확보 실패:', authError);
            }

            if (!userId && isCapacitorEnvironment()) {
              const { Preferences } = await import('@capacitor/preferences');
              const { value } = await Preferences.get({ key: 'supabase_auth_session' });
              if (value) {
                const session = JSON.parse(value);
                userId = session.user?.id;
              }
            }

            if (!userId) {
              throw new Error('사용자 인증이 필요합니다');
            }

            // 원본 노트 조회
            const originalMemo = get().getNoteById(memoId);
            if (!originalMemo) {
              throw new Error('원본 메모를 찾을 수 없습니다');
            }

            // 기존 인스턴스 확인
            const existingInstance = await fetchMemoInstanceByDateWithJWT(userId, memoId, date);

            // 📊 원본과 수정된 내용 비교 (정규화된 비교)
            const originalContent = originalMemo.content.trim();
            const modifiedContent = content.trim();
            const isContentSame = originalContent === modifiedContent;

            console.log('🔍 내용 비교:', { isContentSame, existingInstance: !!existingInstance });

            if (isContentSame) {
              // 원본과 동일한 경우 - 인스턴스 정리
              if (existingInstance) {
                console.log('🧹 원본과 동일하므로 인스턴스 정리:', existingInstance.id);
                await deleteMemoInstanceWithJWT(existingInstance.id);

                // null을 반환하여 인스턴스가 제거되었음을 표시
                return null;
              } else {
                console.log('✨ 원본과 동일하므로 인스턴스 불필요');
                return null;
              }
            } else {
              // 원본과 다른 경우 - 인스턴스 생성/업데이트
              if (existingInstance) {
                // 기존 인스턴스 업데이트
                const result = await updateMemoInstanceWithJWT(existingInstance.id, {
                  content: modifiedContent,
                  is_modified: true,
                  related_task_id: taskId || existingInstance.related_task_id,
                });
                return result;
              } else {
                // 새 인스턴스 생성
                const result = await createMemoInstanceWithJWT({
                  original_memo_id: memoId,
                  user_id: userId,
                  instance_date: date,
                  content: modifiedContent,
                  is_modified: true,
                  related_task_id: taskId || null,
                });
                return result;
              }
            }
          } catch (error) {
            console.error('❌ 노트 인스턴스 upsert 실패:', error);
            throw error;
          }
        },
      };
    },
    {
      name: 'note-store',
      partialize: (state) => ({
        // UI 상태는 영구저장에서 제외
        notes: state.notes,
        filters: state.filters,
        loadState: state.loadState,
      }),
    }
  )
);