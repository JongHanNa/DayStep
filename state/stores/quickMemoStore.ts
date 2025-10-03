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
import type { MemoInstance, CreateMemoInstanceInput, UpdateMemoInstanceInput } from '@/types';

// Quick Memo 타입 정의
export interface QuickMemo {
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
  is_recurring?: boolean; // 반복 메모 여부
  recurrence_type?: 'single' | 'recurring' | 'instance'; // 메모 반복 타입
}

// Quick Memo 생성 입력 타입
export interface CreateQuickMemoInput {
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

// Quick Memo 업데이트 입력 타입
export interface UpdateQuickMemoInput extends Partial<CreateQuickMemoInput> {
  id: string;
}

/**
 * Quick Memo 스토어 상태 타입 정의
 */
interface QuickMemoStoreState {
  // 데이터 상태
  memos: QuickMemo[];
  selectedMemo: QuickMemo | null;
  pinnedMemos: QuickMemo[];
  floatingMemos: QuickMemo[];

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
    selectedMemoForEdit: QuickMemo | null;
    isFloatingCardVisible: boolean;
    floatingCardPosition: { x: number; y: number };
  };
}

/**
 * Quick Memo 스토어 액션 타입 정의
 */
interface QuickMemoStoreActions {
  // 메모 CRUD 작업
  createMemo: (input: CreateQuickMemoInput) => Promise<QuickMemo>;
  updateMemo: (input: UpdateQuickMemoInput) => Promise<QuickMemo>;
  deleteMemo: (memoId: string) => Promise<void>;
  getMemos: (userId: string) => Promise<QuickMemo[]>;
  getMemoById: (memoId: string) => QuickMemo | null;

  // 핀/플로팅 관리
  pinMemo: (memoId: string) => Promise<void>;
  unpinMemo: (memoId: string) => Promise<void>;
  toggleFloating: (memoId: string) => Promise<void>;
  updateMemoPosition: (memoId: string, position: number) => Promise<void>;

  // 할일 연결 관리
  linkToTask: (memoId: string, taskId: string | null, options?: {
    linkDate?: string;
    timelineTaskId?: string;
    recurrenceType?: 'single' | 'recurring' | 'instance';
  }) => Promise<void>;
  unlinkFromTask: (memoId: string) => Promise<void>;
  getMemosByTaskId: (taskId: string) => QuickMemo[];
  getLinkedMemosByTaskId: (taskId: string) => QuickMemo[];
  deleteLinkedMemos: (taskId: string) => Promise<number>;
  getDisplayMemosForTask: (taskId: string, date?: string) => Promise<Array<QuickMemo | MemoInstance>>;

  // 메모 인스턴스 관리
  createMemoInstance: (input: CreateMemoInstanceInput) => Promise<MemoInstance>;
  updateMemoInstance: (input: UpdateMemoInstanceInput) => Promise<MemoInstance>;
  deleteMemoInstance: (instanceId: string) => Promise<void>;
  getMemoInstancesByMemoId: (memoId: string) => Promise<MemoInstance[]>;
  getMemoInstancesByDate: (date: string) => Promise<MemoInstance[]>;
  getMemoInstanceByDate: (memoId: string, date: string) => Promise<MemoInstance | null>;
  getMemoInstancesByTaskId: (taskId: string) => Promise<MemoInstance[]>;
  createRecurringMemoInstances: (memoId: string, dates: string[], taskId?: string) => Promise<MemoInstance[]>;
  upsertMemoInstance: (memoId: string, date: string, content: string, taskId?: string | null) => Promise<MemoInstance | null>;

  // 필터링 및 정렬
  setFilter: (filter: Partial<QuickMemoStoreState['filters']>) => void;
  getFilteredMemos: () => QuickMemo[];
  clearFilters: () => void;

  // 실시간 구독 관리
  subscribeToMemos: (userId: string) => Promise<void>;
  unsubscribeFromMemos: () => void;

  // UI 상태 관리
  setBottomSheetOpen: (open: boolean) => void;
  setBottomSheetMode: (mode: 'compact' | 'expanded') => void;
  setSelectedMemoForEdit: (memo: QuickMemo | null) => void;
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
export const useQuickMemoStore = create<QuickMemoStoreState & QuickMemoStoreActions>()(
  persist(
    (set, get) => {
      return {
        // 초기 상태
        memos: [],
        selectedMemo: null,
        pinnedMemos: [],
        floatingMemos: [],
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
          selectedMemoForEdit: null,
          isFloatingCardVisible: false,
          floatingCardPosition: { x: 0, y: 0 },
        },

        // 메모 CRUD 작업
        createMemo: async (input: CreateQuickMemoInput) => {
          console.log('📝 QuickMemoStore.createMemo:', input);

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
          const tempMemo: QuickMemo = {
            id: tempId,
            ...memoData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          set(state => {
            // 새 메모를 최상단에 추가하고 정렬 순서 적용
            const newMemos = [tempMemo, ...state.memos].sort((a, b) => {
              // 1. position 오름차순 (0이 최상단)
              if (a.position !== b.position) {
                return a.position - b.position;
              }
              // 2. created_at 내림차순 (최신이 위)
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            return { memos: newMemos };
          });

          try {
            const result = await createWithJWT('quick_memos', memoData);
            
            set(state => {
              // 서버 응답으로 교체하고 다시 정렬
              const updatedMemos = state.memos.map(memo => 
                memo.id === tempId ? result : memo
              ).sort((a, b) => {
                // 1. position 오름차순 (0이 최상단)
                if (a.position !== b.position) {
                  return a.position - b.position;
                }
                // 2. created_at 내림차순 (최신이 위)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });

              return { memos: updatedMemos };
            });

            get().updateStats();
            return result;
          } catch (error) {
            set(state => ({
              memos: state.memos.filter(memo => memo.id !== tempId),
              error: error instanceof Error ? error.message : '메모 생성 실패',
            }));
            throw error;
          }
        },

        updateMemo: async (input: UpdateQuickMemoInput) => {
          console.log('📝 QuickMemoStore.updateMemo:', input);

          const { id, ...updateData } = input;
          const originalMemo = get().memos.find(memo => memo.id === id);
          
          if (!originalMemo) {
            throw new Error('메모를 찾을 수 없습니다.');
          }

          // Optimistic update
          const updatedMemo = { ...originalMemo, ...updateData, updated_at: new Date().toISOString() };

          set(state => ({
            memos: state.memos.map(memo => 
              memo.id === id ? updatedMemo : memo
            ),
          }));

          try {
            const result = await updateWithJWT('quick_memos', {
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
              memos: state.memos.map(memo => 
                memo.id === id ? originalMemo : memo
              ),
              error: error instanceof Error ? error.message : '메모 업데이트 실패',
            }));
            throw error;
          }
        },

        deleteMemo: async (memoId: string) => {
          console.log('📝 QuickMemoStore.deleteMemo:', memoId);

          const originalMemo = get().memos.find(memo => memo.id === memoId);
          
          if (!originalMemo) {
            throw new Error('메모를 찾을 수 없습니다.');
          }

          // Optimistic update
          set(state => ({
            memos: state.memos.filter(memo => memo.id !== memoId),
          }));

          try {
            await deleteWithJWT('quick_memos', {
              column: 'id',
              operator: 'eq',
              value: memoId
            });

            // Delete successful

            get().updateStats();
          } catch (error) {
            // Rollback optimistic update
            set(state => ({
              memos: [...state.memos, originalMemo],
              error: error instanceof Error ? error.message : '메모 삭제 실패',
            }));
            throw error;
          }
        },

        getMemos: async (userId: string) => {
          console.log('📋 QuickMemoStore.getMemos:', userId);

          try {
            set({ loading: true, error: null });

            const memos = await queryRLSTableWithJWT('quick_memos', {
              column: 'user_id',
              operator: 'eq',
              value: userId
            }, {
              order: 'position.asc,created_at.desc'
            });

            set({
              memos: memos || [],
              loading: false,
              lastUpdated: new Date(),
              loadState: {
                ...get().loadState,
                hasInitiallyLoaded: true,
                lastFetchTime: Date.now(),
              },
            });

            get().updateStats();
            return memos || [];
          } catch (error) {
            set({
              loading: false,
              error: error instanceof Error ? error.message : '메모 조회 실패',
            });
            throw error;
          }
        },

        getMemoById: (memoId: string) => {
          return get().memos.find(memo => memo.id === memoId) || null;
        },

        // 핀/플로팅 관리
        pinMemo: async (memoId: string) => {
          await get().updateMemo({ id: memoId, is_pinned: true });
        },

        unpinMemo: async (memoId: string) => {
          await get().updateMemo({ id: memoId, is_pinned: false });
        },

        toggleFloating: async (memoId: string) => {
          const memo = get().getMemoById(memoId);
          if (memo) {
            await get().updateMemo({ id: memoId, is_floating: !memo.is_floating });
          }
        },

        updateMemoPosition: async (memoId: string, position: number) => {
          await get().updateMemo({ id: memoId, position });
        },

        // 할일 연결 관리 (향상된 버전)
        linkToTask: async (memoId: string, taskId: string | null, options?: {
          linkDate?: string;
          timelineTaskId?: string;
          recurrenceType?: 'single' | 'recurring' | 'instance';
        }) => {
          console.log('🔗 QuickMemoStore.linkToTask:', { memoId, taskId, options });

          const updateData: Partial<QuickMemo> = {
            related_task_id: taskId,
            linked_date: options?.linkDate || null,
            linked_timeline_task_id: options?.timelineTaskId || null,
            is_recurring: options?.recurrenceType === 'recurring',
            recurrence_type: options?.recurrenceType || 'single',
          };

          // 메모 업데이트
          await get().updateMemo({ id: memoId, ...updateData });

          // 반복 메모로 설정된 경우 인스턴스 생성 로직은 TaskLinkModal에서 처리
          console.log('✅ 메모 할일 연결 완료:', updateData);
        },

        unlinkFromTask: async (memoId: string) => {
          await get().updateMemo({ 
            id: memoId, 
            related_task_id: null,
            linked_date: null,
            linked_timeline_task_id: null,
          });
        },

        getMemosByTaskId: (taskId: string) => {
          return get().memos.filter(memo => memo.related_task_id === taskId);
        },

        getLinkedMemosByTaskId: (taskId: string) => {
          return get().memos.filter(memo => 
            memo.related_task_id === taskId || 
            memo.linked_timeline_task_id === taskId
          );
        },

        deleteLinkedMemos: async (taskId: string) => {
          console.log('🗑️ QuickMemoStore.deleteLinkedMemos:', taskId);
          
          const linkedMemos = get().getLinkedMemosByTaskId(taskId);
          
          if (linkedMemos.length === 0) {
            return 0;
          }

          let deletedCount = 0;
          const failedMemos: string[] = [];

          for (const memo of linkedMemos) {
            try {
              await get().deleteMemo(memo.id);
              deletedCount++;
            } catch (error) {
              console.error(`메모 ${memo.id} 삭제 실패:`, error);
              failedMemos.push(memo.id);
            }
          }

          if (failedMemos.length > 0) {
            console.warn(`일부 메모 삭제 실패: ${failedMemos.join(', ')}`);
          }

          return deletedCount;
        },

        // 특정 할일에 연결된 메모들을 가져오되, 반복 메모의 경우 해당 날짜의 인스턴스를 우선 표시
        getDisplayMemosForTask: async (taskId: string, date?: string) => {
          console.log('📝 QuickMemoStore.getDisplayMemosForTask:', { taskId, date });

          try {
            // 기본 연결된 메모들 가져오기
            const linkedMemos = get().getLinkedMemosByTaskId(taskId);
            const displayMemos: Array<QuickMemo | MemoInstance> = [];

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
                  console.log('📅 특정 날짜 인스턴스 메모 표시:', memo.id, memo.linked_date, date);
                  displayMemos.push(memo);
                }
                continue;
              }

              // 2. 반복 메모이고 날짜가 제공된 경우, 해당 날짜의 인스턴스를 확인
              if (memo.is_recurring && memo.recurrence_type === 'recurring' && date && userId) {
                try {
                  const memoInstance = await fetchMemoInstanceByDateWithJWT(userId, memo.id, date);
                  if (memoInstance) {
                    // 메모 인스턴스가 있으면 이를 우선 표시
                    console.log('📅 메모 인스턴스 발견:', memoInstance.id, date);
                    displayMemos.push({
                      ...memoInstance,
                      // 메모 인스턴스임을 표시하기 위한 추가 필드
                      _isInstance: true,
                      _originalMemo: memo
                    } as any);
                    continue;
                  }
                } catch (error) {
                  console.log('⚠️ 메모 인스턴스 조회 실패:', error);
                }
              }

              // 3. 일반 메모이거나 인스턴스가 없는 경우 원본 메모 표시
              // (단, instance 타입이 아닌 경우만)
              if (memo.recurrence_type !== 'instance') {
                displayMemos.push(memo);
              }
            }

            console.log('✅ 표시할 메모 목록:', displayMemos.length);
            return displayMemos;
          } catch (error) {
            console.error('❌ 표시 메모 조회 실패:', error);
            // 에러 시 기본 연결된 메모들 반환
            return get().getLinkedMemosByTaskId(taskId);
          }
        },

        // 필터링 및 정렬
        setFilter: (filter: Partial<QuickMemoStoreState['filters']>) => {
          set(state => ({
            filters: { ...state.filters, ...filter }
          }));
        },

        getFilteredMemos: () => {
          const { memos, filters } = get();
          
          return memos.filter(memo => {
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
        subscribeToMemos: async (userId: string) => {
          if (get().isSubscribed) return;

          const channel = supabase
            .channel('quick_memos_changes')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'quick_memos',
                filter: `user_id=eq.${userId}`,
              },
              (payload) => {
                console.log('📡 QuickMemoStore.realtimeUpdate:', payload);

                const { eventType, new: newRecord, old: oldRecord } = payload;

                set(state => {
                  let newMemos = [...state.memos];

                  switch (eventType) {
                    case 'INSERT':
                      if (newRecord && !newMemos.find(m => m.id === newRecord.id)) {
                        newMemos.push(newRecord as QuickMemo);
                      }
                      break;
                    case 'UPDATE':
                      if (newRecord) {
                        newMemos = newMemos.map(memo =>
                          memo.id === newRecord.id ? newRecord as QuickMemo : memo
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
                    memos: newMemos,
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

        unsubscribeFromMemos: () => {
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

        setSelectedMemoForEdit: (memo: QuickMemo | null) => {
          set(state => ({
            ui: { ...state.ui, selectedMemoForEdit: memo }
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
          const { memos } = get();
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

          const stats = {
            totalCount: memos.length,
            pinnedCount: memos.filter(memo => memo.is_pinned).length,
            floatingCount: memos.filter(memo => memo.is_floating).length,
            todayCount: memos.filter(memo => {
              const createdAt = new Date(memo.created_at);
              return createdAt >= todayStart;
            }).length,
          };

          set({ 
            stats,
            pinnedMemos: memos.filter(memo => memo.is_pinned),
            floatingMemos: memos.filter(memo => memo.is_floating),
          });
        },

        // 초기화 및 정리
        initialize: async (userId: string) => {
          console.log('🚀 QuickMemoStore.initialize:', userId);

          const state = get();
          const now = Date.now();
          const cacheValid = state.loadState.hasInitiallyLoaded && 
            (now - state.loadState.lastFetchTime) < state.loadState.cacheValidityPeriod;

          if (cacheValid) {
            console.log('💾 QuickMemo 캐시 유효, 스킵');
            return;
          }

          try {
            await get().getMemos(userId);
            await get().subscribeToMemos(userId);
          } catch (error) {
            console.error('❌ QuickMemo 스토어 초기화 실패:', error);
          }
        },

        reset: () => {
          get().unsubscribeFromMemos();
          set({
            memos: [],
            selectedMemo: null,
            pinnedMemos: [],
            floatingMemos: [],
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
              selectedMemoForEdit: null,
              isFloatingCardVisible: false,
              floatingCardPosition: { x: 0, y: 0 },
            },
          });
        },

        refresh: async (userId: string) => {
          console.log('🔄 QuickMemoStore.refresh:', userId);
          set(state => ({
            loadState: {
              ...state.loadState,
              hasInitiallyLoaded: false,
              lastFetchTime: 0,
            }
          }));
          await get().initialize(userId);
        },

        // 메모 인스턴스 관리 함수들
        createMemoInstance: async (input: CreateMemoInstanceInput) => {
          console.log('📝 QuickMemoStore.createMemoInstance:', input);

          try {
            const result = await createMemoInstanceWithJWT(input);
            console.log('✅ 메모 인스턴스 생성 성공:', result);
            return result;
          } catch (error) {
            console.error('❌ 메모 인스턴스 생성 실패:', error);
            throw error;
          }
        },

        updateMemoInstance: async (input: UpdateMemoInstanceInput) => {
          console.log('📝 QuickMemoStore.updateMemoInstance:', input);

          try {
            const result = await updateMemoInstanceWithJWT(input.id, input);
            console.log('✅ 메모 인스턴스 업데이트 성공:', result);
            return result;
          } catch (error) {
            console.error('❌ 메모 인스턴스 업데이트 실패:', error);
            throw error;
          }
        },

        deleteMemoInstance: async (instanceId: string) => {
          console.log('📝 QuickMemoStore.deleteMemoInstance:', instanceId);

          try {
            await deleteMemoInstanceWithJWT(instanceId);
            console.log('✅ 메모 인스턴스 삭제 성공');
          } catch (error) {
            console.error('❌ 메모 인스턴스 삭제 실패:', error);
            throw error;
          }
        },

        getMemoInstancesByMemoId: async (memoId: string) => {
          console.log('📝 QuickMemoStore.getMemoInstancesByMemoId:', memoId);

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
            console.log('✅ 메모 인스턴스들 조회 성공:', instances.length);
            return instances;
          } catch (error) {
            console.error('❌ 메모 인스턴스들 조회 실패:', error);
            return [];
          }
        },

        getMemoInstancesByDate: async (date: string) => {
          console.log('📝 QuickMemoStore.getMemoInstancesByDate:', date);

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
            console.log('✅ 특정 날짜 메모 인스턴스들 조회 성공:', instances.length);
            return instances;
          } catch (error) {
            console.error('❌ 특정 날짜 메모 인스턴스들 조회 실패:', error);
            return [];
          }
        },

        getMemoInstanceByDate: async (memoId: string, date: string) => {
          console.log('📝 QuickMemoStore.getMemoInstanceByDate:', { memoId, date });

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
          console.log('📝 QuickMemoStore.getMemoInstancesByTaskId:', taskId);

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
            console.log('✅ 특정 할일의 메모 인스턴스들 조회 성공:', instances.length);
            return instances;
          } catch (error) {
            console.error('❌ 특정 할일의 메모 인스턴스들 조회 실패:', error);
            return [];
          }
        },

        createRecurringMemoInstances: async (memoId: string, dates: string[], taskId?: string) => {
          console.log('📝 QuickMemoStore.createRecurringMemoInstances:', { memoId, dates, taskId });

          try {
            // 원본 메모 조회
            const originalMemo = get().getMemoById(memoId);
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

            console.log('✅ 반복 메모 인스턴스들 생성 성공:', instances.length);
            return instances;
          } catch (error) {
            console.error('❌ 반복 메모 인스턴스들 생성 실패:', error);
            throw error;
          }
        },

        // 메모 인스턴스 생성 또는 업데이트 (upsert) - 스마트한 원본 비교 로직 포함
        upsertMemoInstance: async (memoId: string, date: string, content: string, taskId?: string | null) => {
          console.log('📝 QuickMemoStore.upsertMemoInstance:', { memoId, date, content, taskId });

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

            // 원본 메모 조회
            const originalMemo = get().getMemoById(memoId);
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
            console.error('❌ 메모 인스턴스 upsert 실패:', error);
            throw error;
          }
        },
      };
    },
    {
      name: 'quick-memo-store',
      partialize: (state) => ({
        // UI 상태는 영구저장에서 제외
        memos: state.memos,
        filters: state.filters,
        loadState: state.loadState,
      }),
    }
  )
);