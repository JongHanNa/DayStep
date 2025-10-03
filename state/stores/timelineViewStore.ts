// @ts-nocheck 
// TODO: Fix TypeScript issues and remove @ts-nocheck - requires interface updates for TimelineItem.dueDate
// Timeline View Store - Manages state for the main timeline component
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  isToday,
  isThisWeek,
  isThisMonth,
  format,
  getHours
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  navigateDate,
  navigateToToday,
  getDateRangeForViewMode,
  isDateInViewRange,
  adjustDateForViewMode,
  generateHourSlots,
  generateWeekDays,
  generateMonthWeeks,
  safeParseDate,
  getCurrentTimeInTimezone,
  convertKstDateToUtcRange,
  convertUtcToKst,
  getKSTCurrentDate,
  DATE_FORMATS,
  DEFAULT_LOCALE
} from '@/lib/date-utils';
import { 
  generateAllRecurrenceInstances, 
  isRecurringTodo 
} from '@/lib/recurrence-utils';
import {
  TimelineViewMode,
  TimelineItem,
  TimelineItemType,
  TimelineViewFilters,
  TimelineViewSortOptions,
  TimelineScrollState,
  TimelineGroup,
  TimelineDayData,
  TimelineWeekData,
  TimelineMonthData,
  TimelineHourSlot,
  TimelineViewport,
  TimelineAnimationState,
  TimelineItemDimensions
} from '@/types/timeline-view';
import { Todo, RepositoryItem, TimelineTask } from '@/types';
import { supabase } from '@/lib/supabase';
import { 
  loadTimelineDisplayPreferencesWithJWT, 
  saveTimelineDisplayPreferencesWithJWT 
} from '@/lib/supabaseWebViewHelper';
import { useSettingsStore } from './settingsStore';

interface TimelineViewState {
  // View mode and date navigation
  viewMode: TimelineViewMode;
  currentDate: Date;
  selectedDate: Date | null;
  
  // Data
  items: TimelineItem[];
  isLoading: boolean;
  error: string | null;
  
  // Display settings
  showDayStartGap: boolean; // 하루 시작 간격 표시 여부 (오전 12:00 "계획 없음")
  showPastGaps: boolean; // 오늘 날짜에서 현재 시간 이전의 "계획 없음" 간격 표시 여부
  
  // Filters and sorting
  filters: TimelineViewFilters;
  sortOptions: TimelineViewSortOptions;
  
  // Virtualization
  viewport: TimelineViewport;
  itemDimensions: Map<string, TimelineItemDimensions>;
  
  // Animation and interaction
  animationState: TimelineAnimationState;
  
  // Scroll state
  scrollState: TimelineScrollState;
  
  // Computed data based on view mode
  dayData: TimelineDayData | null;
  weekData: TimelineWeekData | null;
  monthData: TimelineMonthData | null;
  
  // Actions
  setViewMode: (mode: TimelineViewMode) => void;
  setCurrentDate: (date: Date) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  navigateToToday: () => void;
  
  // Data actions
  setItems: (items: TimelineItem[]) => void;
  addItem: (item: TimelineItem) => void;
  updateItem: (id: string, updates: Partial<TimelineItem>) => void;
  removeItem: (id: string) => void;
  moveItemToDate: (itemId: string, newDate: Date) => void;
  
  // Display settings actions
  setShowDayStartGap: (show: boolean) => void;
  setShowPastGaps: (show: boolean) => void;
  
  // Timeline display settings combined
  setTodayTimelineDisplay: (enabled: boolean) => void;
  
  // Supabase 연동 함수
  loadTimelinePreferences: () => Promise<void>;
  saveTimelinePreferences: () => Promise<void>;
  
  // AuthContext에서 사용자 정보를 직접 사용하는 함수들
  saveTimelinePreferencesWithUserId: (userId: string) => Promise<void>;
  
  // Filter actions
  setFilters: (filters: Partial<TimelineViewFilters>) => void;
  resetFilters: () => void;
  toggleItemType: (type: TimelineItemType) => void;
  
  // Sort actions
  setSortOptions: (options: TimelineViewSortOptions) => void;
  
  // Virtualization actions
  updateViewport: (viewport: Partial<TimelineViewport>) => void;
  setItemDimension: (itemId: string, dimension: TimelineItemDimensions) => void;
  
  // Animation actions
  toggleItemExpanded: (itemId: string) => void;
  setHighlightedItems: (itemIds: string[]) => void;
  setDraggedItem: (itemId: string | undefined) => void;
  setDropTargetDate: (date: Date | undefined) => void;
  
  // Scroll actions
  saveScrollPosition: (position: number) => void;
  restoreScrollPosition: () => number;
  
  // Utility actions
  loadItemsFromSources: (todos: any[], repositoryItems: any[], timelineTasks: any[]) => Promise<void>;
  getFilteredAndSortedItems: () => TimelineItem[];
  getItemsForDateRange: (start: Date, end: Date) => TimelineItem[];
  computeViewData: () => void;
}

// 더 넓은 날짜 범위로 기본 필터 설정 (과거 1년 ~ 미래 1년)
const defaultFilters: TimelineViewFilters = {
  itemTypes: ['todo', 'repository', 'timeline-task', 'calendar'],
  dateRange: {
    start: subYears(new Date(), 1), // 1년 전부터
    end: addYears(new Date(), 1)    // 1년 후까지
  },
  showCompleted: true,
  showCancelled: false,
  priorities: ['low', 'medium', 'high']
};

const defaultSortOptions: TimelineViewSortOptions = {
  field: 'startTime',
  direction: 'asc'
};

// 호출 횟수 추적을 위한 카운터
let setItemsCallCount = 0;
let loadItemsCallCount = 0;
let computeViewDataCallCount = 0;

// 중복 호출 방지를 위한 데이터 해시 추적
let lastDataHash = '';

// 세션별 전역 플래그: 타임라인 데이터 로드 완료 여부 (세션마다 초기화)
let hasLoadedTimelineData = false;

export const useTimelineViewStore = create<TimelineViewState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        viewMode: 'daily',
        currentDate: getKSTCurrentDate(), // KST 기준 현재 날짜
        selectedDate: null,
        items: [],
        isLoading: false,
        error: null,
        showDayStartGap: true, // 기본값: 하루 시작 간격 표시
        showPastGaps: false, // 기본값: 과거 간격 숨김 (현재 시간 이전)
        filters: defaultFilters,
        sortOptions: defaultSortOptions,
        viewport: {
          startIndex: 0,
          endIndex: 0,
          visibleItemCount: 0,
          totalItemCount: 0,
          scrollOffset: 0
        },
        itemDimensions: new Map(),
        animationState: {
          expandedItems: new Set(),
          highlightedItems: new Set()
        },
        scrollState: {
          viewMode: 'daily',
          currentDate: getKSTCurrentDate(), // KST 기준 현재 날짜
          scrollPosition: 0
        },
        dayData: null,
        weekData: null,
        monthData: null,

        // View mode and navigation actions
        setViewMode: (mode) => set((state) => {
          const oldViewMode = state.viewMode;
          const currentDate = state.currentDate instanceof Date ? 
            state.currentDate : new Date(state.currentDate);
          
          state.viewMode = mode;
          // 뷰 모드 변경시 날짜 자동 조정
          state.currentDate = adjustDateForViewMode(currentDate, mode, oldViewMode);
          state.computeViewData();
        }),

        setCurrentDate: (date) => set((state) => {
          state.currentDate = date;
          state.computeViewData();
        }),

        navigateNext: () => {
          const store = get();
          const oldDate = store.currentDate instanceof Date ? 
            store.currentDate : new Date(store.currentDate);
          
          console.log('🔄 navigateNext 시작:', {
            이전날짜: oldDate.toISOString(),
            viewMode: store.viewMode,
            direction: 'next'
          });
          
          const newDate = navigateDate(oldDate, store.viewMode, 'next');
          
          // 먼저 상태 업데이트
          set((state) => {
            state.currentDate = newDate;
          });
          
          console.log('🔄 navigateNext 완료:', {
            새날짜: newDate.toISOString(),
            업데이트됨: get().currentDate.toISOString()
          });
          
          // 상태 업데이트 후 computeViewData 호출
          get().computeViewData();
        },

        navigatePrevious: () => {
          const store = get();
          const oldDate = store.currentDate instanceof Date ? 
            store.currentDate : new Date(store.currentDate);
          
          console.log('🔄 navigatePrevious 시작:', {
            이전날짜: oldDate.toISOString(),
            viewMode: store.viewMode,
            direction: 'previous'
          });
          
          const newDate = navigateDate(oldDate, store.viewMode, 'previous');
          
          // 먼저 상태 업데이트
          set((state) => {
            state.currentDate = newDate;
          });
          
          console.log('🔄 navigatePrevious 완료:', {
            새날짜: newDate.toISOString(),
            업데이트됨: get().currentDate.toISOString()
          });
          
          // 상태 업데이트 후 computeViewData 호출
          get().computeViewData();
        },

        navigateToToday: () => set((state) => {
          state.currentDate = navigateToToday();
          state.computeViewData();
        }),

        // Data actions
        setItems: (items) => set((state) => {
          setItemsCallCount++;
          console.log('📊 timelineViewStore.setItems 호출:', {
            호출횟수: `${setItemsCallCount}번 (의도: 1-2번 내외)`,
            newItemsLength: items.length,
            currentItemsLength: state.items.length,
            문제여부: setItemsCallCount > 3 ? '⚠️ 과도한 호출!' : '✅ 정상',
            newItemIds: items.slice(0, 5).map(item => ({ id: item.id, title: item.title, type: item.type })),
            stackTrace: new Error().stack?.split('\n').slice(1, 4)
          });
          state.items = items;
          state.computeViewData();
        }),

        addItem: (item) => set((state) => {
          state.items.push(item);
          state.computeViewData();
        }),

        updateItem: (id, updates) => set((state) => {
          const index = state.items.findIndex(item => item.id === id);
          if (index !== -1) {
            state.items[index] = { ...state.items[index], ...updates };
            state.computeViewData();
          }
        }),

        removeItem: (id) => set((state) => {
          state.items = state.items.filter(item => item.id !== id);
          state.computeViewData();
        }),

        moveItemToDate: (itemId, newDate) => set((state) => {
          const index = state.items.findIndex(item => item.id === itemId);
          if (index !== -1) {
            state.items[index].startTime = newDate;
            // @ts-ignore - 모든 타임라인 아이템이 date 속성을 가지지 않을 수 있음
            state.items[index].date = newDate;
            state.computeViewData();
          }
        }),

        // Display settings actions
        setShowDayStartGap: (show) => set((state) => {
          state.showDayStartGap = show;
          // Capacitor 환경에서는 저장하지 않음 (설정 페이지에서 직접 처리)
          if (typeof window === 'undefined' || window.location.protocol !== 'capacitor:') {
            setTimeout(() => get().saveTimelinePreferences(), 500);
          }
        }),

        setShowPastGaps: (show) => set((state) => {
          state.showPastGaps = show;
          // Capacitor 환경에서는 저장하지 않음 (설정 페이지에서 직접 처리)
          if (typeof window === 'undefined' || window.location.protocol !== 'capacitor:') {
            setTimeout(() => get().saveTimelinePreferences(), 500);
          }
        }),
        
        // 통합 설정 함수
        setTodayTimelineDisplay: (enabled) => set((state) => {
          state.showDayStartGap = enabled;
          state.showPastGaps = enabled;
          // Capacitor 환경에서는 저장하지 않음 (설정 페이지에서 직접 처리)
          if (typeof window === 'undefined' || window.location.protocol !== 'capacitor:') {
            setTimeout(() => get().saveTimelinePreferences(), 500);
          }
        }),
        
        // Supabase 연동 함수들 (JWT 방식)
        loadTimelinePreferences: async () => {
          try {
            // 세션 체크를 더 robust하게 처리
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('❌ Timeline 설정 로드: 세션 조회 오류', sessionError);
              return;
            }
            
            if (!session?.user?.id) {
              console.log('🔐 Timeline 설정 로드: 인증되지 않은 사용자, 스킵');
              return;
            }
            
            console.log('✅ Timeline 설정 로드: 인증된 사용자 확인됨', { userId: session.user.id });
            const preferences = await loadTimelineDisplayPreferencesWithJWT(session.user.id);
            
            if (preferences) {
              console.log('✅ Timeline 설정 로드 성공:', preferences);
              
              set((state) => {
                // DB에서 로드한 설정 적용 (localStorage 덮어쓰기 방지를 위해 직접 설정)
                state.showDayStartGap = preferences.showDayStartGap;
                state.showPastGaps = preferences.showPastGaps;
              });
            } else {
              console.log('🔧 Timeline 설정 로드: 설정이 없음, 기본값 사용');
            }
          } catch (error) {
            console.error('❌ Timeline 설정 로드 중 예외:', error);
          }
        },
        
        saveTimelinePreferences: async () => {
          try {
            // Capacitor 환경에서는 이 함수를 사용하지 않음 (AuthContext 방식 사용)
            if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') {
              console.log('🔧 Capacitor 환경에서는 saveTimelinePreferencesWithUserId() 사용');
              return;
            }
            
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('❌ Timeline 설정 저장: 세션 조회 오류', sessionError);
              return;
            }
            
            if (!session?.user?.id) {
              console.log('🔐 Timeline 설정 저장: 인증되지 않은 사용자, 스킵');
              return;
            }
            
            const state = get();
            const success = await saveTimelineDisplayPreferencesWithJWT(
              session.user.id,
              state.showDayStartGap,
              state.showPastGaps
            );
            
            if (success) {
              console.log('✅ Timeline 설정 저장 성공:', {
                showDayStartGap: state.showDayStartGap,
                showPastGaps: state.showPastGaps
              });
            } else {
              console.error('❌ Timeline 설정 저장 실패');
            }
          } catch (error) {
            console.error('❌ Timeline 설정 저장 중 예외:', error);
          }
        },
        
        // AuthContext에서 사용자 ID를 직접 받는 함수 (Capacitor 세션 문제 해결용)
        saveTimelinePreferencesWithUserId: async (userId: string) => {
          try {
            console.log('🐛 사용자 ID로 Timeline 설정 저장:', { userId });
            
            if (!userId) {
              console.log('🔐 사용자 ID 없음, 저장 스킵');
              return;
            }
            
            const state = get();
            const success = await saveTimelineDisplayPreferencesWithJWT(
              userId,
              state.showDayStartGap,
              state.showPastGaps
            );
            
            if (success) {
              console.log('✅ 사용자 ID로 Timeline 설정 저장 성공:', {
                showDayStartGap: state.showDayStartGap,
                showPastGaps: state.showPastGaps
              });
            } else {
              console.error('❌ 사용자 ID로 Timeline 설정 저장 실패');
            }
          } catch (error) {
            console.error('❌ 사용자 ID로 Timeline 설정 저장 중 예외:', error);
          }
        },

        // Filter actions
        setFilters: (filters) => set((state) => {
          state.filters = { ...state.filters, ...filters };
          state.computeViewData();
        }),

        resetFilters: () => set((state) => {
          state.filters = defaultFilters;
          state.computeViewData();
        }),

        toggleItemType: (type) => set((state) => {
          const types = state.filters.itemTypes;
          const index = types.indexOf(type);
          if (index === -1) {
            types.push(type);
          } else {
            types.splice(index, 1);
          }
          state.computeViewData();
        }),

        // Sort actions
        setSortOptions: (options) => set((state) => {
          state.sortOptions = options;
          state.computeViewData();
        }),

        // Virtualization actions
        updateViewport: (viewport) => set((state) => {
          state.viewport = { ...state.viewport, ...viewport };
        }),

        setItemDimension: (itemId, dimension) => set((state) => {
          state.itemDimensions.set(itemId, dimension);
        }),

        // Animation actions
        toggleItemExpanded: (itemId) => set((state) => {
          const expanded = state.animationState.expandedItems;
          if (expanded.has(itemId)) {
            expanded.delete(itemId);
          } else {
            expanded.add(itemId);
          }
        }),

        setHighlightedItems: (itemIds) => set((state) => {
          state.animationState.highlightedItems = new Set(itemIds);
        }),

        setDraggedItem: (itemId) => set((state) => {
          state.animationState.draggedItem = itemId;
        }),

        setDropTargetDate: (date) => set((state) => {
          state.animationState.dropTargetDate = date;
        }),

        // Scroll actions
        saveScrollPosition: (position) => set((state) => {
          state.scrollState = {
            viewMode: state.viewMode,
            currentDate: state.currentDate,
            scrollPosition: position
          };
        }),

        restoreScrollPosition: () => {
          const state = get();
          return state.scrollState.scrollPosition;
        },

        // Utility actions
        loadItemsFromSources: async (todos, repositoryItems, timelineTasks) => {
          try {
            // 중복 호출 방지: 데이터 해시로 실제 변경 감지 (내용 변경도 포함)
            const storeCurrentDate = get().currentDate instanceof Date ? get().currentDate : new Date(get().currentDate);
            const currentDataHash = JSON.stringify({
              currentDate: format(storeCurrentDate, 'yyyy-MM-dd'), // 🔧 날짜 포함으로 반복 할일 처리 보장
              todos: todos.map(t => ({ 
                id: t.id, 
                updated_at: t.updated_at, 
                content: t.content, 
                start_time: t.start_time,
                schedule_type: t.schedule_type 
              })),
              repositoryItems: repositoryItems.map(ri => ({ id: ri.id, updated_at: ri.updated_at, content: ri.content })),
              timelineTasks: timelineTasks.map(tt => ({ id: tt.id, updated_at: tt.updated_at, title: tt.title, start_time: tt.start_time }))
            });
            
            // 이전 데이터와 동일한지 확인
            if (lastDataHash === currentDataHash) {
              return;
            }
            
            lastDataHash = currentDataHash;
            
            loadItemsCallCount++;
            const state = get();
            const currentStoreDate = state.currentDate instanceof Date ? state.currentDate : new Date(state.currentDate);
            
            // 🔧 KST 날짜를 UTC 범위로 변환하여 DB UTC 데이터와 정확히 매칭
            const { utcStart, utcEnd, kstDateString } = convertKstDateToUtcRange(currentStoreDate);
          
          
          const items: TimelineItem[] = [];
          

          // 서버에서 받은 할일 데이터 분석
          console.log('📝 서버에서 받은 할일 데이터 분석:', {
            앱화면날짜_KST: kstDateString,
            DB필터범위_UTC: `${utcStart.toISOString()} ~ ${utcEnd.toISOString()}`,
            totalTodos: todos.length,
            todoDetails: todos.map(t => ({ 
              id: t.id, 
              content: t.content,
              scheduleType: t.scheduleType || t.schedule_type || '없음',
              startTime: t.startTime || t.start_time || '없음',
              createdAt: t.createdAt || t.created_at,
              isRecurring: t.schedule_type?.includes('recurring') || false
            }))
          });

          // 🔄 반복 할일 처리: 반복 할일들을 분리하여 가상 인스턴스 생성
          const regularTodos: any[] = [];
          const recurringTodos: any[] = [];
          
          todos.forEach(todo => {
            const isRecurring = isRecurringTodo(todo);
            
            if (isRecurring) {
              recurringTodos.push(todo);
            } else {
              regularTodos.push(todo);
            }
          });
          
          console.log('🔄 반복 할일 분류 결과:', {
            원본할일수: todos.length,
            일반할일수: regularTodos.length,
            반복할일수: recurringTodos.length,
            일반할일제목들: regularTodos.map(t => t.content),
            반복할일제목들: recurringTodos.map(t => t.content)
          });
          
          // 반복 할일의 가상 인스턴스들 생성 (현재 보는 날짜 범위에서, 제외 날짜 고려)
          // Capacitor 백업 인증 패턴으로 사용자 ID 확보
          let userId: string | undefined;
          try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              userId = session.user.id;
            }
          } catch (authError) {
            // 웹에서 실패했거나 Capacitor 환경인 경우 백업 방식 사용
            try {
              const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
              if (isCapacitor) {
                const { Preferences } = await import('@capacitor/preferences');
                const { value } = await Preferences.get({ key: 'supabase_auth_session' });
                if (value) {
                  const session = JSON.parse(value);
                  if (session?.user?.id) {
                    userId = session.user.id;
                  }
                }
              }
            } catch (capacitorError) {
              console.warn('⚠️ 사용자 정보 조회 실패, 제외 날짜 없이 진행:', capacitorError);
            }
          }
          
          const recurrenceInstances = await generateAllRecurrenceInstances(
            recurringTodos,
            utcStart,
            utcEnd,
            userId
          );
          
          console.log('🔄 반복 할일 인스턴스 생성 결과:', {
            반복할일수: recurringTodos.length,
            생성된인스턴스수: recurrenceInstances.length,
            인스턴스제목들: recurrenceInstances.map(inst => inst.data.content)
          });
          
          // 일반 할일과 반복 할일 인스턴스를 합쳐서 처리
          const allTodosToProcess = [
            ...regularTodos,
            ...recurrenceInstances.map(inst => inst.data)
          ];
          
          console.log('🎯 최종 처리할 할일 목록:', {
            일반할일수: regularTodos.length,
            반복할일인스턴스수: recurrenceInstances.length,
            총처리할할일수: allTodosToProcess.length,
            처리할할일제목들: allTodosToProcess.map(t => t.content)
          });

          // Convert todos to timeline items using new schema
          allTodosToProcess.forEach(todo => {
            try {
              // 🔧 새 스키마 기반: Todo 엔티티의 속성 사용 (Date 문자열 안전 처리)
              let startTime: Date;
              let endTime: Date | undefined;
              let isAllDay: boolean;
              
              // Date 문자열을 안전하게 Date 객체로 변환하는 헬퍼 함수
              const safeParseDate = (dateValue: any, fieldName: string): Date | null => {
                if (!dateValue) return null;
                
                // 이미 Date 객체인 경우
                if (dateValue instanceof Date) {
                  return !isNaN(dateValue.getTime()) ? dateValue : null;
                }
                
                // 문자열인 경우 Date 객체로 변환
                if (typeof dateValue === 'string') {
                  const parsed = new Date(dateValue);
                  return !isNaN(parsed.getTime()) ? parsed : null;
                }
                
                console.warn(`⚠️ [할일 ${todo.id}] ${fieldName} 타입 불일치:`, typeof dateValue, dateValue);
                return null;
              };
              
              // scheduleType에 따라 시간 정보 설정 (안전한 Date 파싱)
              const scheduleType = todo.scheduleType || todo.schedule_type;
              if (scheduleType === 'all_day') {
                // 종일 일정: Todo의 startTime 속성 사용
                const parsedStartTime = safeParseDate(todo.startTime || todo.start_time, 'startTime');
                if (parsedStartTime) {
                  startTime = parsedStartTime;
                } else {
                  const parsedCreatedAt = safeParseDate(todo.createdAt, 'createdAt');
                  if (parsedCreatedAt) {
                    startTime = parsedCreatedAt;
                  } else {
                    console.warn(`⚠️ [할일 ${todo.id}] all_day 스케줄에서 날짜 파싱 실패, 현재 시간 사용`);
                    startTime = new Date();
                  }
                }
                // 🔧 endTime 파싱: camelCase와 snake_case 모두 지원 (반복 인스턴스 호환성)
                endTime = safeParseDate(todo.endTime, 'endTime') || safeParseDate(todo.end_time, 'end_time') || undefined;
                isAllDay = true;
              } else if (scheduleType === 'timed') {
                // 시간 지정 일정: Todo의 startTime, endTime 속성 사용
                const parsedStartTime = safeParseDate(todo.startTime || todo.start_time, 'startTime');
                if (!parsedStartTime) {
                  console.warn(`⚠️ [할일 ${todo.id}] timed 스케줄이지만 startTime 없거나 파싱 실패, createdAt 사용`);
                  const parsedCreatedAt = safeParseDate(todo.createdAt, 'createdAt');
                  if (parsedCreatedAt) {
                    startTime = parsedCreatedAt;
                  } else {
                    console.warn(`⚠️ [할일 ${todo.id}] createdAt도 파싱 실패, 현재 시간 사용`);
                    startTime = new Date();
                  }
                } else {
                  startTime = parsedStartTime;
                }
                // 🔧 endTime 파싱: camelCase와 snake_case 모두 지원 (반복 인스턴스 호환성)
                endTime = safeParseDate(todo.endTime, 'endTime') || safeParseDate(todo.end_time, 'end_time') || undefined;
                isAllDay = false;
              } else if (scheduleType === 'anytime') {
                // 언제든지 일정: Todo의 createdAt 사용, 종일로 처리
                const parsedCreatedAt = safeParseDate(todo.createdAt, 'createdAt');
                if (parsedCreatedAt) {
                  startTime = parsedCreatedAt;
                } else {
                  console.warn(`⚠️ [할일 ${todo.id}] anytime 스케줄에서 createdAt 파싱 실패, 현재 시간 사용`);
                  startTime = new Date();
                }
                endTime = undefined;
                isAllDay = true;
              } else {
                // 🔧 기존 데이터 호환성: scheduleType이 없거나 undefined인 경우
                
                // 기존 스키마 호환: scheduledTime 또는 created_at 사용
                const rawTime = (todo as any).scheduledTime || todo.created_at;
                if (rawTime && rawTime !== 'Invalid Date' && !isNaN(new Date(rawTime).getTime())) {
                  startTime = new Date(rawTime);
                  // scheduledTime이 있으면 시간별, 없으면 종일로 처리 (기존 로직)
                  isAllDay = !(todo as any).scheduledTime;
                } else {
                  // 날짜 파싱 실패 시 현재 시간을 기본값으로 사용
                  console.warn(`⚠️ [할일 ${todo.id}] 날짜 파싱 실패, 현재 시간을 기본값으로 사용`);
                  console.warn(`⚠️ [할일 ${todo.id}] created_at 값:`, todo.created_at, typeof todo.created_at);
                  startTime = new Date(); // 현재 시간을 사용
                  isAllDay = true;
                }
                endTime = undefined;
              }
              
              // 날짜 변환: UTC → KST (반복할일 인스턴스는 제외)
              const isUtcFormat = (dateStr: string) => typeof dateStr === 'string' && dateStr.endsWith('Z');
              const isRecurrenceInstance = typeof todo.id === 'string' && todo.id.includes('recurrence');
              
              const safeStartTime = startTime instanceof Date ? startTime : new Date(startTime);
              const finalStartTime = (!isRecurrenceInstance && isUtcFormat(todo.start_time || todo.created_at))
                ? convertUtcToKst(safeStartTime) 
                : safeStartTime;
                
              const safeEndTime = endTime ? (endTime instanceof Date ? endTime : new Date(endTime)) : undefined;
              const finalEndTime = (safeEndTime && !isRecurrenceInstance && isUtcFormat(todo.end_time || ''))
                ? convertUtcToKst(safeEndTime) 
                : safeEndTime;
              
              // 타임라인 아이템 생성
              const timelineItem: TimelineItem = {
                id: `todo-${todo.id}`,
                type: 'todo' as const,
                title: todo.content,
                description: todo.description,
                startTime: finalStartTime,
                endTime: finalEndTime,
                isAllDay,
                color: todo.priority === 'high' ? '#EF4444' : todo.priority === 'medium' ? '#F59E0B' : '#10B981',
                userId: todo.user_id,
                createdAt: todo.created_at && !isNaN(new Date(todo.created_at).getTime()) 
                  ? convertUtcToKst(new Date(todo.created_at)) 
                  : new Date(),
                updatedAt: (todo.updated_at && !isNaN(new Date(todo.updated_at).getTime()))
                  ? convertUtcToKst(new Date(todo.updated_at))
                  : (todo.created_at && !isNaN(new Date(todo.created_at).getTime()))
                    ? convertUtcToKst(new Date(todo.created_at))
                    : new Date(),
                data: todo,
                isCompleted: todo.completed,
                priority: todo.priority || 'medium'
              };
              
              
              // ✅ 서버에서 이미 날짜별 필터링 완료 - 클라이언트 필터링 불필요
              // 모든 할일 데이터를 직접 추가 (서버 필터링 신뢰)
              items.push(timelineItem);
              
              // 새로운 스키마 변환 과정을 로그 (첫 번째 호출에서 처음 5개만 또는 과도한 호출일 때)
              if ((loadItemsCallCount === 1 && items.length <= 5) || loadItemsCallCount > 3) {
              }
            } catch (error) {
              console.error(`❌ [할일 ${todo.id}] 타임라인 아이템 생성 중 오류:`, error);
              console.error(`❌ [할일 ${todo.id}] 할일 데이터:`, {
                content: todo.content,
                scheduleType: todo.scheduleType,
                start_time: todo.start_time,
                end_time: todo.end_time,
                created_at: todo.created_at,
                앱화면날짜_KST: kstDateString
              });
            }
          });

          // Convert repository items to timeline items
          repositoryItems.forEach(item => {
            const safeStartTime = new Date(item.created_at);
            const safeCreatedAt = new Date(item.created_at);
            const safeUpdatedAt = new Date(item.updated_at || item.created_at);
            
            items.push({
              id: `repository-${item.id}`,
              type: 'repository',
              title: item.title,
              description: item.description,
              startTime: safeStartTime,
              isAllDay: true,
              color: '#8B5CF6', // purple
              userId: item.user_id,
              createdAt: safeCreatedAt,
              updatedAt: safeUpdatedAt,
              data: item,
              sourceType: item.item_type
            });
          });

          // Convert timeline tasks to timeline items
          timelineTasks.forEach(task => {
            const safeStartTime = task.planned_start_time ? new Date(task.planned_start_time) : new Date(task.created_at);
            const safeEndTime = task.planned_end_time ? new Date(task.planned_end_time) : undefined;
            const safeCreatedAt = new Date(task.created_at);
            const safeUpdatedAt = new Date(task.updated_at || task.created_at);
            
            items.push({
              id: `timeline-task-${task.id}`,
              type: 'timeline-task',
              title: task.title,
              description: task.description,
              startTime: safeStartTime,
              endTime: safeEndTime,
              isAllDay: false,
              color: task.priority === 'high' ? '#DC2626' : task.priority === 'medium' ? '#F97316' : '#22C55E',
              userId: task.user_id,
              createdAt: safeCreatedAt,
              updatedAt: safeUpdatedAt,
              data: task,
              status: task.status,
              priority: task.priority,
              plannedDuration: task.planned_duration || undefined
            });
          });

            set((state) => {
              console.log('📊 TimelineViewStore에 최종 저장:', {
                원본서버데이터: todos.length,
                처리한할일수: allTodosToProcess.length,
                생성된타임라인아이템수: items.length,
                타임라인아이템제목들: items.map(item => item.title)
              });
              
              state.items = items;
              
              // ✅ 중복 호출 방지: computeViewData 호출하지 않음
              // TimelineContainer의 별도 useEffect에서 items 변경을 감지하여 처리
            });
            
          } catch (error) {
            console.error('❌ loadItemsFromSources 에러:', error);
            // 에러 발생 시 빈 배열로 설정하여 앱이 크래시되지 않도록 함
            set((state) => {
              console.log('📊 loadItemsFromSources - 에러로 인한 빈 배열 설정:', {
                호출횟수: `loadItemsFromSources ${loadItemsCallCount}번 (에러 발생)`,
                문제여부: '❌ 에러 발생!',
                앱화면날짜_KST: convertKstDateToUtcRange(state.currentDate instanceof Date ? state.currentDate : new Date(state.currentDate)).kstDateString,
                currentItemsLength: state.items.length,
                errorMessage: error instanceof Error ? error.message : String(error),
                stackTrace: new Error().stack?.split('\n').slice(1, 4)
              });
              state.items = [];
              state.computeViewData();
            });
          }
        },

        getFilteredAndSortedItems: () => {
          const state = get();
          let filtered = state.items;

          // Apply filters
          const { filters, viewMode, currentDate } = state;
          
          // 일간 뷰일 때는 현재 날짜로 날짜 범위 제한
          let safeStartDate: Date, safeEndDate: Date;
          
          if (viewMode === 'daily') {
            const current = currentDate instanceof Date ? currentDate : new Date(currentDate);
            // 🔧 KST 날짜를 UTC 범위로 변환하여 DB UTC 데이터와 정확히 매칭
            const { utcStart, utcEnd } = convertKstDateToUtcRange(current);
            safeStartDate = utcStart;
            safeEndDate = utcEnd;
            // console.log('🔍 일간 뷰 - KST→UTC 변환으로 필터 범위 제한:', {
            //   viewMode: 'daily',
            //   kstDate: current.toISOString(),
            //   kstDateLocal: current.toLocaleString('ko-KR'),
            //   utcStart: safeStartDate.toISOString(),
            //   utcEnd: safeEndDate.toISOString()
            // });
          } else {
            // 주간/월간 뷰는 기본 필터 범위 사용
            safeStartDate = filters.dateRange.start instanceof Date 
              ? filters.dateRange.start 
              : new Date(filters.dateRange.start);
            safeEndDate = filters.dateRange.end instanceof Date 
              ? filters.dateRange.end 
              : new Date(filters.dateRange.end);
          }
            
          // 🔍 필터 설정 로그 (성능 최적화를 위해 주석 처리)
          // console.log('🔍 필터 설정:', {
          //   viewMode: state.viewMode,
          //   itemTypes: filters.itemTypes,
          //   dateRangeStart: safeStartDate.toISOString(),
          //   dateRangeEnd: safeEndDate.toISOString(),
          //   showCompleted: filters.showCompleted
          // });
          
          // Filter by item types
          filtered = filtered.filter(item => filters.itemTypes.includes(item.type));

          // Filter by date range - 서버에서 이미 날짜별로 필터링했으므로 일간 뷰에서는 스킵
          if (viewMode !== 'daily') {
            filtered = filtered.filter(item => {
              // 🎯 종일 일정도 due_date 기준으로 날짜 필터링
              if (item.isAllDay) {
                // due_date가 있으면 due_date 기준으로 필터링
                if (item.dueDate) {
                  const dueDate = new Date(item.dueDate);
                  const dueTime = dueDate.getTime();
                  const startTime = safeStartDate.getTime();
                  const endTime = safeEndDate.getTime();
                  const isInRange = dueTime >= startTime && dueTime <= endTime;
                  
                  
                  return isInRange;
                }
                
                // due_date가 없으면 createdAt 기준 (예외적 경우)
                if (item.createdAt) {
                  const createdDate = new Date(item.createdAt);
                  const createdTime = createdDate.getTime();
                  const startTime = safeStartDate.getTime();
                  const endTime = safeEndDate.getTime();
                  return createdTime >= startTime && createdTime <= endTime;
                }
                
                return false; // due_date도 createdAt도 없으면 제외
              }
            
            // 🔧 시간 지정 일정과 anytime 할일 날짜 필터링
            let itemDate: Date;
            
            // 1순위: startTime이 있는 경우 (시간 지정 할일)
            if (item.startTime) {
              itemDate = new Date(item.startTime);
              const itemTime = itemDate.getTime();
              const startTime = safeStartDate.getTime();
              const endTime = safeEndDate.getTime();
              const isInRange = itemTime >= startTime && itemTime <= endTime;
              
              console.log(`🔍 시간 지정 할일 날짜 확인: ${item.title.substring(0, 20)}`, {
                itemId: item.id.substring(0, 8),
                itemDate: itemDate.toISOString(),
                itemTime: itemTime,
                startTime: startTime,
                endTime: endTime,
                isInRange
              });
              
              return isInRange;
            }
            
            // 2순위: due_date가 있는 경우 (anytime 할일)
            if (item.dueDate) {
              const dueDate = new Date(item.dueDate);
              const dueTime = dueDate.getTime();
              const startTime = safeStartDate.getTime();
              const endTime = safeEndDate.getTime();
              const isInRange = dueTime >= startTime && dueTime <= endTime;
              
              
              return isInRange;
            }
            
            // 3순위: createdAt 기준 (예외적 경우)
            if (item.createdAt) {
              const createdDate = new Date(item.createdAt);
              const createdTime = createdDate.getTime();
              const startTime = safeStartDate.getTime();
              const endTime = safeEndDate.getTime();
              return createdTime >= startTime && createdTime <= endTime;
            }
            
            return false; // 날짜 정보가 없으면 제외
            });
          }
          
          // console.log('🔍 날짜 범위 필터 후:', { count: filtered.length });


          // Filter completed items - 설정에 따라 다르게 처리
          const settings = useSettingsStore.getState();
          const completionBehavior = settings.todoCompletion.behavior;
          
          if (completionBehavior === 'move-to-completed') {
            // 기존 동작: 완료된 할일을 완료 영역으로 이동 (showCompleted 설정에 따라)
            if (!filters.showCompleted) {
              filtered = filtered.filter(item => {
                if (item.type === 'todo') return !item.isCompleted;
                if (item.type === 'timeline-task') return item.status !== 'completed';
                return true;
              });
            }
          } else if (completionBehavior === 'strikethrough-inline') {
            // 새 기능: 현재 위치에서 취소선 표시 (showCompletedItems 설정에 따라)
            if (!settings.todoCompletion.showCompletedItems) {
              filtered = filtered.filter(item => {
                if (item.type === 'todo') return !item.isCompleted;
                if (item.type === 'timeline-task') return item.status !== 'completed';
                return true;
              });
            }
            // showCompletedItems가 true면 완료된 할일도 표시 (취소선 스타일로)
          }

          // Filter cancelled items
          if (!filters.showCancelled) {
            filtered = filtered.filter(item => {
              if (item.type === 'timeline-task') return item.status !== 'cancelled';
              return true;
            });
          }

          // Filter by priorities
          if (filters.priorities && filters.priorities.length > 0) {
            filtered = filtered.filter(item => {
              if (item.type === 'todo' && item.priority) {
                return filters.priorities!.includes(item.priority);
              }
              if (item.type === 'timeline-task') {
                return filters.priorities!.includes(item.priority);
              }
              return true;
            });
          }

          // Apply search query
          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(item => 
              item.title.toLowerCase().includes(query) ||
              (item.description && item.description.toLowerCase().includes(query))
            );
          }

          // Sort items
          const { sortOptions } = state;
          filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortOptions.field) {
              case 'startTime':
                // 🔧 반복 할일 인스턴스의 올바른 시간 계산
                const getAdjustedTime = (item: any) => {
                  if (!item.startTime) return new Date();
                  
                  // 반복 할일 인스턴스인지 확인
                  if (typeof item.id === 'string' && item.id.includes('recurrence')) {
                    const match = item.id.match(/recurrence-(\d{4}-\d{2}-\d{2})/);
                    if (match) {
                      const instanceDateString = match[1]; // 2025-08-21
                      const originalTime = item.startTime instanceof Date ? item.startTime : new Date(item.startTime);
                      
                      // 인스턴스 날짜 + 원본 시간으로 조합
                      const adjustedTime = new Date(instanceDateString);
                      adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds(), originalTime.getMilliseconds());
                      
                      return adjustedTime;
                    }
                  }
                  
                  // 일반 할일은 그대로 반환
                  return item.startTime instanceof Date ? item.startTime : new Date(item.startTime);
                };
                
                const aTime = getAdjustedTime(a);
                const bTime = getAdjustedTime(b);
                comparison = aTime.getTime() - bTime.getTime();
                break;
              case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
              case 'priority':
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                const aPriority = (a.type === 'todo' || a.type === 'timeline-task') ? a.priority || 'medium' : 'medium';
                const bPriority = (b.type === 'todo' || b.type === 'timeline-task') ? b.priority || 'medium' : 'medium';
                comparison = priorityOrder[bPriority] - priorityOrder[aPriority];
                break;
              case 'type':
                comparison = a.type.localeCompare(b.type);
                break;
              case 'createdAt':
                comparison = a.createdAt.getTime() - b.createdAt.getTime();
                break;
            }

            return sortOptions.direction === 'asc' ? comparison : -comparison;
          });

          return filtered;
        },

        getItemsForDateRange: (start, end) => {
          const items = get().getFilteredAndSortedItems();
          return items.filter(item => {
            const itemDate = item.startTime;
            return itemDate >= start && itemDate <= end;
          });
        },

        computeViewData: () => set((state) => {
          computeViewDataCallCount++;
          console.log('🔧 computeViewData 호출:', {
            호출횟수: `${computeViewDataCallCount}번 (의도: 2-3번 내외)`,
            문제여부: computeViewDataCallCount > 5 ? '⚠️ 과도한 호출!' : '✅ 정상',
            rawItemsLength: state.items.length,
            stackTrace: new Error().stack?.split('\n').slice(1, 3)
          });
          
          const { viewMode } = state;
          const currentDate = state.currentDate instanceof Date ? 
            state.currentDate : new Date(state.currentDate);
          
          // KST 기준으로 날짜 계산 (TimelineContainer와 동일한 로직)
          // UTC 시간을 KST로 변환: UTC + 9시간
          const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
          const kstDate = new Date(currentDate.getTime() + kstOffset);
          const kstDisplayDate = format(kstDate, 'yyyy년 MM월 dd일 EEEE', { locale: ko });
          
          // TimelineContainer와 동일한 방식으로 KST 날짜 요소 추출
          const year = kstDate.getFullYear();
          const month = kstDate.getMonth(); // 0-based
          const date = kstDate.getDate();
          
          const items = state.getFilteredAndSortedItems();

          // Daily 뷰 데이터 계산 (${items.length}개 아이템)

          switch (viewMode) {
            case 'daily': {
              // TimelineContainer와 동일한 방식으로 UTC 범위 계산
              // KST 00:00 = UTC 15:00 (전날), KST 23:59 = UTC 14:59 (당일)
              const utcDayStart = new Date(Date.UTC(year, month, date, 0, 0, 0, 0) - 9 * 60 * 60 * 1000);
              const utcDayEnd = new Date(Date.UTC(year, month, date, 23, 59, 59, 999) - 9 * 60 * 60 * 1000);
              
              const dayItems = items.filter(item => {
                // 1순위: startTime이 있는 경우 (시간 지정 할일)
                if (item.startTime) {
                  const itemStart = new Date(item.startTime);
                  return itemStart >= utcDayStart && itemStart <= utcDayEnd;
                }
                
                // 2순위: due_date가 있는 경우 (종일/언제든지 할일)
                if (item.dueDate) {
                  const itemDue = new Date(item.dueDate);
                  return itemDue >= utcDayStart && itemDue <= utcDayEnd;
                }
                
                // 3순위: createdAt 기준 (due_date가 없는 예외적인 경우)
                if (item.createdAt) {
                  const itemCreated = new Date(item.createdAt);
                  return itemCreated >= utcDayStart && itemCreated <= utcDayEnd;
                }
                
                return false;
              });

              // 시간 슬롯 생성 (0-23시)
              const hourSlots: TimelineHourSlot[] = [];
              for (let hour = 0; hour < 24; hour++) {
                const hourItems = dayItems.filter(item => {
                  if (!item.startTime) return false;
                  return getHours(new Date(item.startTime)) === hour;
                });
                
                hourSlots.push({
                  hour,
                  items: hourItems
                });
              }

              const allDayItems = dayItems.filter(item => item.isAllDay || false);

              state.dayData = {
                date: currentDate,
                hourSlots,
                allDayItems,
                totalItems: dayItems.length
              };
              
              // Daily 뷰 최종 데이터: ${dayItems.length}개 아이템, ${hourSlots.filter(slot => slot.items.length > 0).length}개 시간 슬롯
              break;
            }

            case 'weekly': {
              // 주간 뷰 기본 구조만 설정
              state.weekData = {
                weekStart: startOfWeek(currentDate, { locale: ko }),
                weekEnd: endOfWeek(currentDate, { locale: ko }),
                days: [],
                weekNumber: parseInt(format(currentDate, 'w')),
                totalItems: 0
              };
              break;
            }

            case 'monthly': {
              // 월간 뷰 기본 구조만 설정
              state.monthData = {
                year: currentDate.getFullYear(),
                month: currentDate.getMonth(),
                weeks: [],
                totalItems: 0
              };
              break;
            }
          }
        }),
        
        // 기타 헬퍼 메서드들...
      })),
      {
        name: 'timeline-view-store',
        partialize: (state) => ({
          viewMode: state.viewMode,
          currentDate: state.currentDate,
          showDayStartGap: state.showDayStartGap,
          showPastGaps: state.showPastGaps,
          filters: state.filters,
          sortOptions: state.sortOptions,
          scrollState: state.scrollState
        }),
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            const parsed = JSON.parse(str);
            // Date 객체 복원
            if (parsed.state?.currentDate) {
              parsed.state.currentDate = new Date(parsed.state.currentDate);
            }
            return parsed;
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name) => {
            localStorage.removeItem(name);
          }
        }
      }
    ),
    {
      name: 'TimelineViewStore'
    }
  )
);