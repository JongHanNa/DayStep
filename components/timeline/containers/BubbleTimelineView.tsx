'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { cn } from '@/lib/utils';
import { TimelineItem } from '@/types/timeline-view';
import { BubbleTimelineItem } from '../items/BubbleTimelineItem';
import { useCurrentTime } from '@/lib/hooks/useCurrentTime';
import { isRecurringTodo } from '@/lib/utils/recurring';
import { Todo as DbTodo, Clarification } from '@/types';
import TodoFormModal from '@/components/todos/TodoFormModal';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import RecurringUpdateDialog from '@/components/todos/RecurringUpdateDialog';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { format } from 'date-fns';

/**
 * 버블 스타일 타임라인 뷰 컴포넌트
 *
 * 주요 기능:
 * - 버블 아이콘 + 연결 막대 비주얼
 * - 시간 진행에 따른 색상 변화 (회색 → 할일 색상)
 * - 롱프레스 드래그로 시간 이동 (웹/모바일 모두 지원)
 * - 시간 변경 모달로 최종 확인
 */
export const BubbleTimelineView: React.FC = () => {
  const {
    currentDate,
    getFilteredAndSortedItems,
    viewMode,
    items: storeItems  // 🔧 스토어의 실제 items 상태도 의존 (리스트뷰와 동일)
  } = useTimelineViewStore();
  const updateTodo = useTodoStore(state => state.updateTodo);
  const toggleTodo = useTodoStore(state => state.toggleTodo);
  const toggleRecurrenceCompletion = useTodoStore(state => state.toggleRecurrenceCompletion);
  const todos = useTodoStore(state => state.todos);
  const currentTime = useCurrentTime();

  // Second Brain stores
  const { projects } = useProjectStore();
  const { areas } = useAreaStore();
  const { resources } = useResourceStore();

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialTouch, setInitialTouch] = useState<{x: number; y: number} | null>(null);

  // 자동 스크롤 상태 (ref로 변경하여 즉시 반영)
  const autoScrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const autoScrollIntervalRef = useRef<number | null>(null);
  const [autoScrollTrigger, setAutoScrollTrigger] = useState(0); // 렌더링 트리거용
  const scrollAccumulatedRef = useRef(0); // ✅ useState → useRef 변경 (동기 업데이트)
  const [scrollAccumulatedTrigger, setScrollAccumulatedTrigger] = useState(0); // ✅ 리렌더링 트리거 (버블 위치 업데이트용)

  // 스크롤 차단 관련 ref
  const preventScrollRef = useRef<((e: Event) => void) | null>(null);
  const savedScrollPositionRef = useRef(0);
  const savedBodyScrollPositionRef = useRef(0);
  const scrollWatcherRef = useRef<number | null>(null);

  // 🎯 스크롤 컨테이너 ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 드래그 종료 시간 ref (onClick 방지용 - React 배치 업데이트 우회)
  const lastDragEndTimeRef = useRef(0);

  // 반복 할일 업데이트 다이얼로그 상태
  const [recurringUpdateDialog, setRecurringUpdateDialog] = useState<{
    open: boolean;
    data?: {
      todoId: string;
      todoTitle: string;
      originalTime: { start: Date; end?: Date };
      newTime: { start: Date; end?: Date };
      occurrenceDate: Date;
    };
  }>({ open: false });

  // 할일 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalStartTime, setAddModalStartTime] = useState<Date | null>(null);
  const [addModalEndTime, setAddModalEndTime] = useState<Date | null>(null);

  // 할일 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTodoForm, setEditingTodoForm] = useState<TodoFormData | null>(null);
  const [originalTodoId, setOriginalTodoId] = useState<string | null>(null);

  // 필터링된 아이템 (currentDate 변경 시에도 갱신)
  const items = useMemo(() => {
    return getFilteredAndSortedItems();
  }, [getFilteredAndSortedItems, currentDate, storeItems]); // 🔧 storeItems 의존성 추가

  // 시간 지정 할일만 필터링
  const timedItems = useMemo(() => {
    return items.filter(item => item.startTime && item.endTime);
  }, [items]);

  // 🎯 자동 스크롤 상수
  const SCROLL_THRESHOLD = 180; // 경계 감지 영역 (px) - 넓은 트리거 존으로 사용성 개선
  const SCROLL_SPEED = 8; // 스크롤 속도 (px/frame)
  const HEADER_HEIGHT = 64; // 타임라인 헤더 높이
  const BOTTOM_NAV_HEIGHT = 64; // 하단 네비게이션 높이

  // 🎯 자동 스크롤 경계 감지
  const checkAutoScroll = useCallback((clientY: number) => {
    const viewportHeight = window.innerHeight;
    const topBoundary = HEADER_HEIGHT + SCROLL_THRESHOLD;
    // ✅ 수정: 하단 경계는 화면 하단에서 네비게이션과 THRESHOLD 영역 제외
    // (네비게이션 위 180px 영역이 트리거 존)
    const bottomBoundary = viewportHeight - BOTTOM_NAV_HEIGHT - SCROLL_THRESHOLD;

    // 상단 경계 감지
    if (clientY < topBoundary) {
      // ✅ 방향 전환 감지: 아래→위로 바뀌면 누적량 리셋 (ref + 리렌더링 트리거)
      if (autoScrollDirectionRef.current === 'down') {
        scrollAccumulatedRef.current = 0;  // ref 리셋
        setScrollAccumulatedTrigger(prev => prev + 1);  // ✅ 리렌더링 트리거 (버블 위치 업데이트)
      }
      autoScrollDirectionRef.current = 'up';
      setAutoScrollTrigger(prev => prev + 1); // 렌더링 트리거
      return;
    }

    // 하단 경계 감지
    if (clientY > bottomBoundary) {
      // ✅ 방향 전환 감지: 위→아래로 바뀌면 누적량 리셋 (ref + 리렌더링 트리거)
      if (autoScrollDirectionRef.current === 'up') {
        scrollAccumulatedRef.current = 0;  // ref 리셋
        setScrollAccumulatedTrigger(prev => prev + 1);  // ✅ 리렌더링 트리거 (버블 위치 업데이트)
      }
      autoScrollDirectionRef.current = 'down';
      setAutoScrollTrigger(prev => prev + 1); // 렌더링 트리거
      return;
    }

    // 경계 벗어남
    autoScrollDirectionRef.current = null;
    scrollAccumulatedRef.current = 0; // ref 리셋
    setScrollAccumulatedTrigger(prev => prev + 1);  // ✅ 리렌더링 트리거 (버블 위치 업데이트)
    setAutoScrollTrigger(prev => prev + 1); // 렌더링 트리거
  }, []);

  // 🎯 자동 스크롤 실행 useEffect
  useEffect(() => {
    const autoScrollDirection = autoScrollDirectionRef.current;

    if (!isDragging || !autoScrollDirection) {
      // 자동 스크롤 중지
      if (autoScrollIntervalRef.current) {
        cancelAnimationFrame(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
      return;
    }

    // 자동 스크롤 시작
    const scroll = () => {
      const timelineContainer = scrollContainerRef.current;
      const currentDirection = autoScrollDirectionRef.current; // 최신 방향 읽기

      // ✅ 방향이 없으면 조용히 종료 (경쟁 조건 대응)
      if (!timelineContainer || !currentDirection) {
        return;
      }

      const scrollAmount = currentDirection === 'up' ? -SCROLL_SPEED : SCROLL_SPEED;
      const newScrollTop = timelineContainer.scrollTop + scrollAmount;

      // 스크롤 위치 업데이트
      const maxScroll = timelineContainer.scrollHeight - timelineContainer.clientHeight;

      // 스크롤 범위 체크
      if (newScrollTop >= 0 && newScrollTop <= maxScroll) {
        const beforeScroll = timelineContainer.scrollTop;  // ✅ 스크롤 전 위치 저장
        timelineContainer.scrollTop = newScrollTop;
        const afterScroll = timelineContainer.scrollTop;  // ✅ 스크롤 후 실제 위치
        const actualScrolled = afterScroll - beforeScroll;  // ✅ 실제 스크롤된 양 계산

        savedScrollPositionRef.current = newScrollTop;

        // ✅ 실제 스크롤된 양만 누적 (요청량이 아닌 실제 스크롤량 사용)
        scrollAccumulatedRef.current += actualScrolled;
        // ⚡ NOTE: 매 프레임마다 setState는 성능 문제 → 10px마다 한 번만 트리거
        if (Math.abs(scrollAccumulatedRef.current) % 10 < Math.abs(actualScrolled)) {
          setScrollAccumulatedTrigger(prev => prev + 1);  // ✅ 리렌더링 트리거 (버블 위치 업데이트)
        }
      }

      // 다음 프레임 예약 (방향이 여전히 유효할 때만)
      if (autoScrollDirectionRef.current) {
        autoScrollIntervalRef.current = requestAnimationFrame(scroll);
      }
    };

    autoScrollIntervalRef.current = requestAnimationFrame(scroll);

    return () => {
      if (autoScrollIntervalRef.current) {
        cancelAnimationFrame(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };
  }, [isDragging, autoScrollTrigger]); // autoScrollTrigger 의존성으로 변경

  // 🎯 완전한 터치 스크롤 차단 시스템 (리스트뷰와 동일)
  const enableScrollLock = useCallback(() => {
    // 현재 스크롤 위치 저장
    savedBodyScrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    const timelineContainer = scrollContainerRef.current;
    if (timelineContainer) {
      savedScrollPositionRef.current = timelineContainer.scrollTop;
    }

    // 이벤트 리스너로 스크롤 완전 차단
    const preventScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    preventScrollRef.current = preventScroll;

    // 모든 스크롤 관련 이벤트 차단
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('scroll', preventScroll, { passive: false });

    // Body 전체 터치 스크롤 차단
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.userSelect = 'none';

    // 타임라인 컨테이너 터치 스크롤 차단 (overflowY는 자동 스크롤을 위해 유지)
    if (timelineContainer) {
      timelineContainer.style.touchAction = 'none';
      // ✅ overflowY = 'hidden' 제거: 자동 스크롤이 작동하려면 overflow가 활성화되어야 함
      // 수동 스크롤은 이미 touchAction + 이벤트 차단으로 막혀있음
    }

    // 모든 스크롤 가능 요소 차단 (단, 타임라인 컨테이너는 제외 - 자동 스크롤 필요)
    document.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach(element => {
      const el = element as HTMLElement;

      // 🎯 타임라인 컨테이너는 자동 스크롤을 위해 overflow 유지
      if (el === scrollContainerRef.current) {
        el.style.touchAction = 'none'; // touchAction만 차단
        return; // overflow는 건드리지 않음
      }

      el.style.touchAction = 'none';
      el.style.overflow = 'hidden';
    });

    // CSS 클래스 기반 강화 차단
    document.body.classList.add('dragging-active');

    // 스크롤 위치 강제 고정 감시 시작
    const watchScroll = () => {
      // 🎯 자동 스크롤 중이 아닐 때만 위치 고정
      if (!autoScrollDirectionRef.current) {
        // Body 스크롤 강제 고정
        if (window.pageYOffset !== savedBodyScrollPositionRef.current) {
          window.scrollTo(0, savedBodyScrollPositionRef.current);
        }

        // 타임라인 스크롤 고정
        const container = scrollContainerRef.current;
        if (container && container.scrollTop !== savedScrollPositionRef.current) {
          container.scrollTop = savedScrollPositionRef.current;
        }
      }

      scrollWatcherRef.current = requestAnimationFrame(watchScroll);
    };

    scrollWatcherRef.current = requestAnimationFrame(watchScroll);
  }, []); // 의존성 제거 (ref 사용)

  const disableScrollLock = useCallback(() => {
    // 스크롤 감시 해제
    if (scrollWatcherRef.current) {
      cancelAnimationFrame(scrollWatcherRef.current);
      scrollWatcherRef.current = null;
    }

    // 이벤트 리스너 완전 해제
    if (preventScrollRef.current) {
      document.removeEventListener('touchmove', preventScrollRef.current);
      document.removeEventListener('wheel', preventScrollRef.current);
      document.removeEventListener('scroll', preventScrollRef.current);
      preventScrollRef.current = null;
    }

    // Body 스타일 개별 복원
    document.body.style.overflow = 'initial';
    document.body.style.touchAction = 'auto';
    document.body.style.userSelect = 'auto';
    document.body.style.position = 'static';
    document.body.style.width = 'auto';
    document.body.classList.remove('dragging-active');

    // 타임라인 컨테이너 완전 복원
    const timelineContainer = scrollContainerRef.current;
    if (timelineContainer) {
      timelineContainer.style.touchAction = 'auto';
      timelineContainer.style.overflowY = 'auto';
      timelineContainer.style.overflow = 'auto';

      // 저장된 스크롤 위치로 복원
      setTimeout(() => {
        if (savedScrollPositionRef.current >= 0) {
          timelineContainer.scrollTop = savedScrollPositionRef.current;
        }
      }, 0);
    }

    // Body 스크롤 위치 복원
    if (savedBodyScrollPositionRef.current >= 0) {
      setTimeout(() => {
        window.scrollTo(0, savedBodyScrollPositionRef.current);
      }, 0);
    }

    // 모든 스크롤 요소 완전 복원
    document.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach(element => {
      const el = element as HTMLElement;
      el.style.touchAction = 'auto';
      el.style.overflow = 'auto';
      el.style.overflowY = 'auto';
    });
  }, []);

  // 롱프레스 시작 (터치/마우스 통합)
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent, itemId: string) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

    // 🔒 터치 즉시 현재 스크롤 위치 저장 (리스트뷰와 동일)
    savedBodyScrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    const timelineContainer = scrollContainerRef.current;
    if (timelineContainer) {
      savedScrollPositionRef.current = timelineContainer.scrollTop;
    }

    // ✅ 초기 위치만 저장 (타이머는 handleDragMove에서 시작)
    setDragStartY(clientY);
    setInitialTouch({ x: clientX, y: clientY });
    setDraggedItemId(itemId);

    // ⚡ NOTE: preventDefault는 BubbleTimelineItem에서 DOM 레벨로 처리
    // React synthetic events는 Chrome DevTools 모바일 모드에서 passive로 처리되어
    // preventDefault()가 무시되므로, 직접 DOM listener를 사용
  }, []);

  // 드래그 이동 (터치/마우스 통합)
  const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;

    if (isDragging && draggedItemId) {
      // 이미 드래그 중이면 위치 업데이트 (X, Y 모두)
      setDragCurrentY(clientY);
      setDragCurrentX(clientX);

      // 🎯 자동 스크롤 경계 체크
      checkAutoScroll(clientY);
    } else if (initialTouch && !longPressTimer && draggedItemId) {
      // ✅ 정지 상태 확인: 50px 이상 움직였으면 스크롤로 간주 (리스트뷰와 동일)
      const deltaX = Math.abs(clientX - initialTouch.x);
      const deltaY = Math.abs(clientY - initialTouch.y);

      if (deltaX > 50 || deltaY > 50) {
        // 스크롤로 간주하고 초기화
        setInitialTouch(null);
        setDraggedItemId(null);
        return;
      }

      // ✅ 정지 상태 유지 중 → 300ms 타이머 시작 (리스트뷰와 동일)
      const timer = setTimeout(() => {
        setIsDragging(true);
        setDragCurrentY(clientY); // 드래그 시작 시 현재 위치로 설정
        setDragCurrentX(clientX); // X 좌표도 설정

        // 🔒 완전한 스크롤 차단 활성화 (리스트뷰와 동일)
        enableScrollLock();

        // 햅틱 피드백
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }
      }, 300);

      setLongPressTimer(timer);
    } else if (longPressTimer && initialTouch) {
      // ✅ 타이머 진행 중 50px 이상 움직이면 취소 (리스트뷰와 동일)
      const deltaX = Math.abs(clientX - initialTouch.x);
      const deltaY = Math.abs(clientY - initialTouch.y);

      if (deltaX > 50 || deltaY > 50) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
        setInitialTouch(null);
        setDraggedItemId(null);
      }
    }
  }, [isDragging, draggedItemId, initialTouch, longPressTimer, enableScrollLock, checkAutoScroll]);

  // 드래그 종료 (터치/마우스 통합)
  const handleDragEnd = useCallback(async () => {
    // 타이머가 있으면 취소
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // ✅ 실제로 드래그 중이 아니면 무시 (다른 카드의 이벤트로 인한 오작동 방지)
    // 단순 클릭 시에는 lastDragEndTimeRef를 업데이트하지 않아 onClick이 정상 동작함
    if (!isDragging) {
      // 드래그 중이 아니어도 초기 상태 정리
      setDraggedItemId(null);
      setInitialTouch(null);
      return;
    }

    // ✅ 실제 드래그가 있었을 때만 시간 기록 (onClick 방지용 - React 배치 업데이트 우회)
    lastDragEndTimeRef.current = Date.now();

    if (draggedItemId) {
      // Y축 이동 거리를 시간으로 변환 (1px = 1분)
      const deltaY = dragCurrentY - dragStartY;
      const minutesChange = Math.round(deltaY);

      // ✅ 최소 드래그 거리 체크: 1px 미만이면 모달 표시 안 함 (1분 이상 이동 시 모달 열림)
      if (Math.abs(deltaY) < 1) {
        // 실제 드래그 없음 → 상태만 초기화하고 모달 안 띄움
        setIsDragging(false);
        setDraggedItemId(null);
        setDragStartY(0);
        setDragCurrentY(0);
        setDragCurrentX(0);
        setInitialTouch(null);

        // 🎯 자동 스크롤 상태 초기화
        autoScrollDirectionRef.current = null;

        // 🔓 스크롤 차단 해제
        disableScrollLock();
        return;
      }

      // 드래그된 할일 찾기
      const draggedItem = timedItems.find(item => item.id === draggedItemId);

      if (draggedItem && draggedItem.startTime && draggedItem.endTime) {
        const newStartTime = new Date(new Date(draggedItem.startTime).getTime() + minutesChange * 60 * 1000);
        const newEndTime = new Date(new Date(draggedItem.endTime).getTime() + minutesChange * 60 * 1000);

        // 반복 할일 확인
        const draggedTodo = draggedItem.data;
        const recurrencePattern = draggedTodo?.recurrence_pattern || draggedTodo?.recurrencePattern;
        const isRecurring = (recurrencePattern && recurrencePattern !== 'none') ||
                           (draggedItem.id && draggedItem.id.includes('-recurrence-'));

        if (isRecurring) {
          // 반복 할일: RecurringUpdateDialog 표시
          console.log('🔍 [BubbleTimelineView] RecurringUpdateDialog 데이터 설정:', {
            currentDate,
            currentDateType: typeof currentDate,
            currentDateString: currentDate?.toISOString(),
            draggedItemStartTime: draggedItem.startTime,
            draggedItemStartTimeType: typeof draggedItem.startTime
          });

          setRecurringUpdateDialog({
            open: true,
            data: {
              todoId: draggedItem.id.includes('-recurrence-') ?
                draggedItem.id.split('-recurrence-')[0] : draggedItem.id,
              todoTitle: draggedItem.title || '할일',
              originalTime: {
                start: new Date(draggedItem.startTime),
                end: new Date(draggedItem.endTime)
              },
              newTime: {
                start: newStartTime,
                end: newEndTime
              },
              occurrenceDate: currentDate
            }
          });
        } else {
          // 일반 할일: 바로 업데이트
          await updateTodo(draggedItem.id, {
            start_time: newStartTime.toISOString(),
            end_time: newEndTime.toISOString(),
          });
        }
      }
    }

    // 드래그 상태 초기화 (모달은 유지)
    setIsDragging(false);
    setDraggedItemId(null);
    setDragStartY(0);
    setDragCurrentY(0);
    setDragCurrentX(0);
    setInitialTouch(null);

    // 🎯 자동 스크롤 상태 초기화
    autoScrollDirectionRef.current = null;

    // 🔓 스크롤 차단 해제 (리스트뷰와 동일)
    disableScrollLock();
  }, [isDragging, draggedItemId, dragStartY, dragCurrentY, timedItems, longPressTimer, disableScrollLock, currentDate, updateTodo]);;

  // 🎯 드래그 중 전역 마우스 이벤트 처리 (아이템 영역 벗어나도 추적)
  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // MouseEvent를 React.MouseEvent처럼 처리
      handleDragMove(e as any);
    };

    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };

    // 전역 이벤트 리스너 등록 (화면 어디서든 마우스 추적)
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      // 정리
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // 반복 할일 업데이트 선택 핸들러
  const handleRecurringUpdateChoice = useCallback(async (choice: 'this-only' | 'from-now' | 'all') => {
    if (!recurringUpdateDialog.data) {
      return;
    }

    const { todoId, newTime } = recurringUpdateDialog.data;

    try {
      if (choice === 'this-only') {
        // 해당 인스턴스만 수정
        await updateTodo(todoId, {
          start_time: newTime.start.toISOString(),
          end_time: newTime.end?.toISOString(),
        });
      } else if (choice === 'from-now') {
        // 해당 날짜 이후 모든 인스턴스 수정
        // TODO: 반복 할일 이후 업데이트 로직 구현 필요
        await updateTodo(todoId, {
          start_time: newTime.start.toISOString(),
          end_time: newTime.end?.toISOString(),
        });
      } else if (choice === 'all') {
        // 모든 인스턴스 수정
        await updateTodo(todoId, {
          start_time: newTime.start.toISOString(),
          end_time: newTime.end?.toISOString(),
        });
      }

      // 다이얼로그 닫기
      setRecurringUpdateDialog({ open: false });
    } catch (error) {
      console.error('반복 할일 시간 변경 실패:', error);
    }
  }, [recurringUpdateDialog, updateTodo]);

  // DB 데이터 → TodoFormData 변환 함수
  const mapDbTodoToFormData = useCallback((dbTodo: any): TodoFormData => {
    // 시간 추출 (HH:mm 형식)
    let startTimeStr: string | undefined;
    let endTimeStr: string | undefined;

    if (dbTodo.start_time) {
      const startDate = new Date(dbTodo.start_time);
      startTimeStr = format(startDate, 'HH:mm');
    }

    // end_time도 HH:mm 형식으로 변환
    if (dbTodo.end_time) {
      const endDate = new Date(dbTodo.end_time);
      endTimeStr = format(endDate, 'HH:mm');
    }

    const scheduleType = dbTodo.schedule_type || 'anytime';
    const hasEndTime = !!dbTodo.end_time;

    return {
      title: dbTodo.title || '',
      clarification: dbTodo.clarification || '',
      nextActionStatuses: [],
      nextActionContextIds: dbTodo.next_action_context_ids || [],
      scheduledDate: dbTodo.start_time ? new Date(dbTodo.start_time) : new Date(),
      isHighlight: dbTodo.is_today_highlight || false,
      completed: dbTodo.completed || false,
      projectIds: dbTodo.project_ids || [],
      noteIds: [],
      scheduleType,
      startTime: startTimeStr,
      endTime: endTimeStr,
      includeTime: scheduleType === 'timed',
      // ✅ 종료일 관련 필드 추가
      includeEndDate: hasEndTime,  // end_time이 있으면 토글 활성화
      endDate: dbTodo.end_time ? new Date(dbTodo.end_time) : undefined,
      icon: dbTodo.icon,
      color: dbTodo.color,

      // 반복 설정 매핑
      recurrencePattern: dbTodo.recurrence_pattern || 'none',
      recurrenceInterval: dbTodo.recurrence_interval || 1,
      recurrenceEndType: dbTodo.recurrence_end_type || 'never',
      recurrenceEndDate: dbTodo.recurrence_end_date
        ? new Date(dbTodo.recurrence_end_date)
        : undefined,
      recurrenceCount: dbTodo.recurrence_count,
      selectedDaysOfWeek: dbTodo.recurrence_days_of_week || [],

      // 반복 할일 원본 날짜 (편집 시 표시용)
      originalCreatedDate: dbTodo.created_at ? new Date(dbTodo.created_at) : undefined,
    };
  }, []);

  // 할일 수정 저장 핸들러
  const handleEditSave = useCallback(async (formData: TodoFormData) => {
    if (!originalTodoId) return;

    try {
      // 시간 처리
      let finalDateTime: string | undefined;
      if (formData.scheduledDate) {
        const dateObj = new Date(formData.scheduledDate);
        if (formData.scheduleType === 'timed' && formData.startTime) {
          const [hours, minutes] = formData.startTime.split(':');
          dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        finalDateTime = dateObj.toISOString();
      }

      await updateTodo(originalTodoId, {
        title: formData.title,
        clarification: formData.clarification as Clarification | undefined,
        schedule_type: formData.scheduleType,
        start_time: finalDateTime,
        end_time: formData.endTime,
        is_today_highlight: formData.isHighlight,
        completed: formData.completed,
        project_ids: formData.projectIds,
        icon: formData.icon,
        color: formData.color,
        next_action_context_ids: formData.nextActionContextIds,
      });

      setIsEditModalOpen(false);
      setEditingTodoForm(null);
      setOriginalTodoId(null);
    } catch (error) {
      console.error('할일 수정 실패:', error);
    }
  }, [originalTodoId, updateTodo]);

  // 간격 클릭 핸들러 (할일 추가 모달 표시)
  const handleGapClick = useCallback((startTime: Date, endTime: Date) => {
    setAddModalStartTime(startTime);
    setAddModalEndTime(endTime);
    setIsAddModalOpen(true);
  }, []);

  // 오늘인지 확인
  const isToday = useMemo(() => {
    const today = new Date();
    return (
      today.getFullYear() === currentDate.getFullYear() &&
      today.getMonth() === currentDate.getMonth() &&
      today.getDate() === currentDate.getDate()
    );
  }, [currentDate]);


  // 🎯 컴포넌트 언마운트 시 정리 (리스트뷰와 동일)
  React.useEffect(() => {
    return () => {
      // 🎯 자동 스크롤 정리
      if (autoScrollIntervalRef.current) {
        cancelAnimationFrame(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }

      // 컴포넌트가 언마운트될 때 스크롤 차단 완전 해제
      if (preventScrollRef.current) {
        document.removeEventListener('touchmove', preventScrollRef.current);
        document.removeEventListener('wheel', preventScrollRef.current);
        document.removeEventListener('scroll', preventScrollRef.current);
      }

      if (scrollWatcherRef.current) {
        cancelAnimationFrame(scrollWatcherRef.current);
      }

      // 모든 스타일 명시적 복원
      document.body.style.overflow = 'initial';
      document.body.style.touchAction = 'auto';
      document.body.style.userSelect = 'auto';
      document.body.style.position = 'static';
      document.body.style.width = 'auto';
      document.body.classList.remove('dragging-active');

      // 모든 스크롤 요소 복원
      document.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach(element => {
        const el = element as HTMLElement;
        el.style.touchAction = 'auto';
        el.style.overflow = 'auto';
        el.style.overflowY = 'auto';
      });
    };
  }, []);


  return (
    <div ref={scrollContainerRef} className="w-full overflow-y-auto">
      {/* 타임라인 컨테이너 */}
      <div className="relative">
        {/* 버블 아이템 리스트 */}
        <div className="relative space-y-0" style={{ zIndex: 1 }}>
          {timedItems.map((item, index) => {
            const prevItem = index > 0 ? timedItems[index - 1] : null;
            const nextItem = index < timedItems.length - 1 ? timedItems[index + 1] : null;

            // 각 할일별로 dateStatus 계산 (currentDate 기준)
            const itemDateStatus: 'past' | 'today' | 'future' = (() => {
              const today = new Date();
              const compareDate = new Date(currentDate);

              // 날짜만 비교 (시간 제외)
              const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const compareDateOnly = new Date(compareDate.getFullYear(), compareDate.getMonth(), compareDate.getDate());

              if (compareDateOnly < todayDateOnly) {
                return 'past';
              }
              if (compareDateOnly > todayDateOnly) {
                return 'future';
              }
              return 'today';
            })();

            return (
              <BubbleTimelineItem
                key={item.id}
                item={item}
                prevItem={prevItem}
                nextItem={nextItem}
                isDragging={isDragging && draggedItemId === item.id}
                dragOffset={isDragging && draggedItemId === item.id ? dragCurrentY - dragStartY : 0}
                scrollOffset={isDragging && draggedItemId === item.id ? scrollAccumulatedRef.current : 0}
                dragCurrentY={isDragging && draggedItemId === item.id ? dragCurrentY : undefined}
                lastDragEndTime={lastDragEndTimeRef.current}
                isToday={isToday}
                currentTime={currentTime}
                currentDate={currentDate}
                dateStatus={itemDateStatus}
                onTodoClick={(itemId: string) => {
                  // 리스트뷰와 동일한 로직 적용
                  const timelineItem = timedItems.find(t => t.id === itemId);

                  if (timelineItem && timelineItem.type === 'todo') {
                    // 반복 할일인지 확인
                    const isRecurring = isRecurringTodo(timelineItem);

                    if (isRecurring || itemId.includes('-recurrence-')) {
                      // 반복 할일: 원본 할일 데이터 + 인스턴스 시간 조합
                      if (itemId.includes('-recurrence-')) {
                        // 반복 인스턴스: 원본 할일 ID로 원본 데이터 찾기
                        const originalId = (timelineItem.data as any)?.recurrence_source_id || timelineItem.data?.id;
                        const originalTodo: any = todos.find(t => t.id === originalId);

                        if (originalTodo && timelineItem.data) {
                          // 원본 할일의 반복 설정 + 인스턴스의 조정된 시간 조합
                          const combinedData: DbTodo & { _instanceInfo?: any } = {
                            id: originalTodo.id,
                            user_id: originalTodo.userId || originalTodo.user_id,
                            title: originalTodo.title,
                            completed: timelineItem.data.completed || originalTodo.completed,
                            order_index: originalTodo.orderIndex || originalTodo.order_index || 0,
                            created_at: (() => {
                              const date = originalTodo.createdAt || originalTodo.created_at;
                              if (date && typeof date === 'string') { return date; }
                              if (date instanceof Date) { return date.toISOString(); }
                              return new Date().toISOString();
                            })(),
                            updated_at: (() => {
                              const date = originalTodo.updatedAt || originalTodo.updated_at;
                              if (date && typeof date === 'string') { return date; }
                              if (date instanceof Date) { return date.toISOString(); }
                              return new Date().toISOString();
                            })(),
                            priority: originalTodo.priority,
                            icon: originalTodo.icon,
                            color: originalTodo.color,
                            schedule_type: originalTodo.schedule_type || originalTodo.scheduleType ||
                                          (originalTodo.start_time || originalTodo.startTime ? 'timed' : 'anytime'),
                            start_time: (() => {
                              const originalTime = originalTodo.start_time || originalTodo.startTime;
                              const occurrenceDate = (timelineItem.data as any).recurrence_occurrence_date;
                              const override = (timelineItem.data as any).time_override; // 🔧 override 데이터 추가

                              // 🔧 override가 있으면 우선 사용
                              if (override && override.start_time) {
                                return override.start_time;
                              }

                              // 반복 인스턴스: occurrence_date + 원본 시간 조합
                              if (occurrenceDate && originalTime) {
                                try {
                                  const startDate = new Date(originalTime);
                                  const startHour = startDate.getHours();
                                  const startMinute = startDate.getMinutes();

                                  // occurrence_date + 시작 시간 조합
                                  const instanceStart = new Date(`${occurrenceDate}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`);

                                  return instanceStart.toISOString();
                                } catch (e) {
                                  console.warn('반복 할일 시작시간 계산 실패:', e);
                                }
                              }

                              // 일반 할일 또는 fallback
                              if (originalTime) {
                                if (typeof originalTime === 'string') { return originalTime; }
                                if (originalTime instanceof Date) { return originalTime.toISOString(); }
                                try { return new Date(originalTime).toISOString(); } catch { /* fallback */ }
                              }
                              if (timelineItem.data.start_time) { return timelineItem.data.start_time; }
                              if (timelineItem.startTime) {
                                if (typeof timelineItem.startTime === 'string') { return timelineItem.startTime; }
                                if (timelineItem.startTime instanceof Date) { return timelineItem.startTime.toISOString(); }
                              }
                              return null;
                            })(),
                            end_time: (() => {
                              const originalStartTime = originalTodo.start_time || originalTodo.startTime;
                              const originalEndTime = originalTodo.end_time || originalTodo.endTime;
                              const occurrenceDate = (timelineItem.data as any).recurrence_occurrence_date;
                              const override = (timelineItem.data as any).time_override; // 🔧 override 데이터 추가

                              // 🔧 override가 있으면 우선 사용
                              if (override && override.end_time) {
                                return override.end_time;
                              }

                              // 반복 인스턴스: occurrence_date + 원본 시간 조합
                              if (occurrenceDate && originalStartTime && originalEndTime) {
                                try {
                                  const startDate = new Date(originalStartTime);
                                  const endDate = new Date(originalEndTime);

                                  // 원본 시간 추출
                                  const startHour = startDate.getHours();
                                  const startMinute = startDate.getMinutes();
                                  const endHour = endDate.getHours();
                                  const endMinute = endDate.getMinutes();

                                  // occurrence_date + 시작 시간 조합
                                  const instanceStart = new Date(`${occurrenceDate}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`);

                                  // 소요 시간 계산
                                  const durationMs = endDate.getTime() - startDate.getTime();
                                  const instanceEnd = new Date(instanceStart.getTime() + durationMs);

                                  return instanceEnd.toISOString();
                                } catch (e) {
                                  console.warn('반복 할일 종료시간 계산 실패:', e);
                                }
                              }

                              // 일반 할일 또는 fallback
                              if (timelineItem.data.end_time) { return timelineItem.data.end_time; }
                              if (timelineItem.endTime) {
                                if (typeof timelineItem.endTime === 'string') { return timelineItem.endTime; }
                                if (timelineItem.endTime instanceof Date) { return timelineItem.endTime.toISOString(); }
                              }
                              return null;
                            })(),

                            recurrence_pattern: originalTodo.recurrence_pattern || originalTodo.recurrencePattern || 'none',
                            recurrence_end_date: (() => {
                              const date = originalTodo.recurrence_end_date || originalTodo.recurrenceEndDate;
                              if (!date) { return null; }
                              if (typeof date === 'string') {
                                return date.includes('T') ? date.split('T')[0] : date;
                              }
                              if (date instanceof Date) { return date.toISOString().split('T')[0]; }
                              try { return new Date(date).toISOString().split('T')[0]; } catch { return null; }
                            })(),
                            recurrence_count: originalTodo.recurrence_count || originalTodo.recurrenceCount || null,
                            recurrence_interval: originalTodo.recurrence_interval || originalTodo.recurrenceInterval || 1,
                            recurrence_days_of_week: originalTodo.recurrence_days_of_week || originalTodo.recurrenceDaysOfWeek || null,
                            recurrence_day_of_month: originalTodo.recurrence_day_of_month || originalTodo.recurrenceDayOfMonth || null,
                            departure_location: originalTodo.departure_location || originalTodo.departureLocation || null,
                            departure_time: (() => {
                              const time = originalTodo.departure_time || originalTodo.departureTime;
                              if (!time) {
                                return null;
                              }
                              if (typeof time === 'string') {
                                return time;
                              }
                              if (time instanceof Date) {
                                return time.toISOString();
                              }
                              try {
                                return new Date(time).toISOString();
                              } catch {
                                return null;
                              }
                            })(),
                            parent_todo_id: originalTodo.parent_todo_id || originalTodo.parentTodoId || null,
                            anytime_duration: originalTodo.anytime_duration || null,
                            // Second Brain 필드들 추가
                            clarification: originalTodo.clarification || 'none',
                            next_action_context_ids: originalTodo.next_action_context_ids || null,
                            is_today_highlight: originalTodo.is_today_highlight || false,
                            assigned_to: originalTodo.assigned_to || null,
                            assigned_date: (() => {
                              const date = originalTodo.assigned_date;
                              if (!date) { return null; }
                              if (typeof date === 'string') { return date; }
                              if (date instanceof Date) { return date.toISOString(); }
                              try { return new Date(date).toISOString(); } catch { return null; }
                            })(),
                            _instanceInfo: {
                              instanceId: timelineItem.id,
                              instanceDate: (timelineItem.data as any).recurrence_occurrence_date,
                              startTime: timelineItem.startTime,
                              endTime: timelineItem.endTime
                            }
                          };

                          setOriginalTodoId(combinedData.id);
                          setEditingTodoForm(mapDbTodoToFormData(combinedData));
                        } else {
                          setOriginalTodoId(timelineItem.data?.id || itemId);
                          setEditingTodoForm(mapDbTodoToFormData(timelineItem.data));
                        }
                      } else {
                        setOriginalTodoId(timelineItem.data?.id || itemId);
                        setEditingTodoForm(mapDbTodoToFormData(timelineItem.data));
                      }
                      setIsEditModalOpen(true);
                    } else {
                      // 일반 할일: 타임라인에 실제 표시된 시간으로 업데이트
                      if (timelineItem.data) {
                        const updatedTodoData = {
                          ...timelineItem.data,
                          schedule_type: timelineItem.data?.schedule_type ||
                                        (timelineItem.data as any)?.scheduleType ||
                                        (timelineItem.startTime ? 'timed' : 'anytime'),
                          start_time: (() => {
                            if (timelineItem.startTime) {
                              if (typeof timelineItem.startTime === 'string') { return timelineItem.startTime; }
                              if (timelineItem.startTime instanceof Date) { return timelineItem.startTime.toISOString(); }
                            }
                            return timelineItem.data?.start_time || null;
                          })(),
                          end_time: (() => {
                            if (timelineItem.endTime) {
                              if (typeof timelineItem.endTime === 'string') { return timelineItem.endTime; }
                              if (timelineItem.endTime instanceof Date) { return timelineItem.endTime.toISOString(); }
                            }
                            return timelineItem.data?.end_time || null;
                          })()
                        };

                        setOriginalTodoId(updatedTodoData.id || itemId);
                        setEditingTodoForm(mapDbTodoToFormData(updatedTodoData));
                        setIsEditModalOpen(true);
                      }
                    }
                  }
                }}
                onToggleComplete={async (itemId: string) => {
                  // 완료 상태 토글
                  const item = timedItems.find(t => t.id === itemId);

                  if (item && item.type === 'todo') {
                    const todoData = item.data as any;
                    const isRecurring = todoData?.is_recurrence_instance ||
                                      (todoData?.recurrence_pattern && todoData.recurrence_pattern !== 'none');

                    if (isRecurring) {
                      // 반복 할일: 날짜별 완료 토글
                      const originalId = todoData.recurrence_source_id || todoData.id;
                      await toggleRecurrenceCompletion(originalId, currentDate);
                    } else {
                      // 일반 할일: 기존 완료 토글 (todo- 프리픽스 제거)
                      const actualId = itemId.replace('todo-', '');
                      await toggleTodo(actualId);
                    }
                  }
                }}
                onTouchStart={(e) => handleDragStart(e, item.id)}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
                onMouseDown={(e) => handleDragStart(e, item.id)}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onGapClick={handleGapClick}
              />
            );
          })}
        </div>
      </div>

      {/* 반복 할일 업데이트 다이얼로그 */}
      {recurringUpdateDialog.data && (
        <RecurringUpdateDialog
          open={recurringUpdateDialog.open}
          onOpenChange={(open) => setRecurringUpdateDialog({ open })}
          todoTitle={recurringUpdateDialog.data.todoTitle}
          originalTime={recurringUpdateDialog.data.originalTime}
          newTime={recurringUpdateDialog.data.newTime}
          occurrenceDate={recurringUpdateDialog.data.occurrenceDate}
          onUpdateChoice={handleRecurringUpdateChoice}
        />
      )}

      {/* 드래그 프리뷰 카드 (손가락 따라다님) */}
      {isDragging && draggedItemId && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            top: dragCurrentY,
            left: dragCurrentX,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-3 shadow-2xl border-2 border-blue-400 dark:border-blue-500">
            {(() => {
              const item = timedItems.find(i => i.id === draggedItemId);
              if (!item) {
                return <div className="text-sm font-medium">시간 이동 중...</div>;
              }

              return (
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.title}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 할일 추가 모달 */}
      <TodoFormModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        initialStartTime={addModalStartTime}
        initialEndTime={addModalEndTime}
      />

      {/* 할일 수정 모달 - TodoEditModal 사용 */}
      <TodoEditModal
        open={isEditModalOpen}
        todo={editingTodoForm}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTodoForm(null);
          setOriginalTodoId(null);
        }}
        onSave={handleEditSave}
        onChange={setEditingTodoForm}
        projects={projects}
        areas={areas}
        resources={resources}
        showScheduledDate={true}
        showHighlight={true}
        showProjects={true}
      />
    </div>
  );
};
