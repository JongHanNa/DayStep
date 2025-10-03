'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTodoStore } from '@/state/stores/todoStore';

interface UseDragAndDropProps {
  currentDate: Date;
  timeFormat: string;
  todos: any[];
  timedItems?: any[]; // 타임라인 아이템들 (반복 할일 인스턴스 포함)
}

/**
 * React Portal 기반 드래그 앤 드롭 시스템
 * - 완전한 스크롤 분리: Portal로 타임라인과 독립적 레이어
 * - 절대 좌표 추적: viewport 기준 정확한 위치 계산
 * - 강력한 scroll lock: body + 타임라인 컨테이너 동시 제어
 */
export const useDragAndDrop = ({ currentDate, timeFormat, todos, timedItems = [] }: UseDragAndDropProps) => {
  // 🎯 핵심 드래그 상태 (간소화)
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [currentDragY, setCurrentDragY] = useState(0);
  const [currentDragX, setCurrentDragX] = useState(0);
  const [previewTime, setPreviewTime] = useState<string>('');
  const [draggedTodo, setDraggedTodo] = useState<any>(null);
  const [cardOffsetY, setCardOffsetY] = useState(0); // 터치 위치와 카드 중앙의 차이
  const savedScrollPositionRef = useRef(0);
  const savedBodyScrollPositionRef = useRef(0);
  const scrollWatcherRef = useRef<number | null>(null);
  const autoScrollRafRef = useRef<number | null>(null); // 자동 스크롤 애니메이션 프레임
  
  // 🎯 길게 누르기 상태 (단순화)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressStartPos, setPressStartPos] = useState({ x: 0, y: 0 });
  
  // 🎯 타임라인 영역 참조 (한 번만 계산)
  const timelineRef = useRef<HTMLElement | null>(null);
  
  // 🎯 이벤트 리스너 참조
  const preventScrollRef = useRef<((e: Event) => void) | null>(null);
  
  // 🎯 완전한 터치 스크롤 차단 시스템
  const enableScrollLock = useCallback(() => {
    // 스크롤 위치는 이미 handleTouchStart에서 저장됨 - 중복 저장 제거
    const timelineContainer = document.querySelector('.w-full.overflow-auto.relative.pb-4') as HTMLElement;
    
    // 2. 이벤트 리스너로 스크롤 완전 차단
    const preventScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    preventScrollRef.current = preventScroll;
    
    // 모든 스크롤 관련 이벤트 차단
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('scroll', preventScroll, { passive: false });
    
    // 3. Body 전체 터치 스크롤 차단
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    // 4. 타임라인 컨테이너 터치 스크롤 완전 차단
    if (timelineContainer) {
      timelineContainer.style.touchAction = 'none';
      timelineContainer.style.overflowY = 'hidden';
    }
    
    // 5. 모든 스크롤 가능 요소 차단
    document.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach(element => {
      const el = element as HTMLElement;
      el.style.touchAction = 'none';
      el.style.overflow = 'hidden';
    });
    
    // 6. CSS 클래스 기반 강화 차단
    document.body.classList.add('dragging-active');
    
    // 7. 스크롤 위치 강제 고정 감시 시작 (타임라인도 포함)
    const watchScroll = () => {
      // Body 스크롤 강제 고정 (ref 값 사용)
      if (window.pageYOffset !== savedBodyScrollPositionRef.current) {
        window.scrollTo(0, savedBodyScrollPositionRef.current);
      }
      
      // 타임라인 스크롤 고정 (자동 스크롤 중일 때는 완전 건너뛰기)
      if (!autoScrollRafRef.current) {
        const container = document.querySelector('.w-full.overflow-auto.relative.pb-4') as HTMLElement;
        if (container && container.scrollTop !== savedScrollPositionRef.current) {
          container.scrollTop = savedScrollPositionRef.current;
        }
      }
      
      scrollWatcherRef.current = requestAnimationFrame(watchScroll);
    };
    
    scrollWatcherRef.current = requestAnimationFrame(watchScroll);
    
    console.log('🔒 이벤트 기반 스크롤 차단 활성화', { 
      bodyScroll: window.pageYOffset || document.documentElement.scrollTop, 
      timelineScroll: timelineContainer?.scrollTop 
    });
  }, []);
  
  const disableScrollLock = useCallback(() => {
    // 1. 스크롤 감시 해제
    if (scrollWatcherRef.current) {
      cancelAnimationFrame(scrollWatcherRef.current);
      scrollWatcherRef.current = null;
    }
    
    // 2. 이벤트 리스너 완전 해제
    if (preventScrollRef.current) {
      document.removeEventListener('touchmove', preventScrollRef.current);
      document.removeEventListener('wheel', preventScrollRef.current);
      document.removeEventListener('scroll', preventScrollRef.current);
      preventScrollRef.current = null;
    }
    
    // 모든 이벤트 차단을 완전히 해제하기 위한 강제 새로고침
    // (브라우저의 이벤트 캐시 문제 해결)
    
    // 3. Body 스타일 개별 복원 (removeAttribute 사용 안 함)
    document.body.style.overflow = 'initial';
    document.body.style.touchAction = 'auto';
    document.body.style.userSelect = 'auto';
    document.body.style.webkitUserSelect = 'auto';
    document.body.style.position = 'static';
    document.body.style.width = 'auto';
    document.body.classList.remove('dragging-active');
    
    // 4. 타임라인 컨테이너 완전 복원
    const timelineContainer = document.querySelector('.w-full.overflow-auto.relative.pb-4') as HTMLElement;
    if (timelineContainer) {
      // 원래 스타일로 명시적 복원
      timelineContainer.style.touchAction = 'auto';
      timelineContainer.style.overflowY = 'auto';
      timelineContainer.style.overflow = 'auto';
      
      // 저장된 스크롤 위치로 복원 (ref 사용)
      setTimeout(() => {
        if (savedScrollPositionRef.current >= 0) {
          timelineContainer.scrollTop = savedScrollPositionRef.current;
          }
      }, 0);
    }
    
    // 4. Body 스크롤 위치 복원 (ref 사용)
    if (savedBodyScrollPositionRef.current >= 0) {
      setTimeout(() => {
        window.scrollTo(0, savedBodyScrollPositionRef.current);
      }, 0);
    }
    
    // 6. 모든 스크롤 요소 완전 복원
    document.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach(element => {
      const el = element as HTMLElement;
      el.style.touchAction = 'auto';
      el.style.overflow = 'auto';
      el.style.overflowY = 'auto';
    });
    
    // 7. 강제 스타일 재설정 및 스크롤 테스트
    setTimeout(() => {
      // 타임라인 컨테이너의 원래 클래스 기반 스타일 강제 적용
      if (timelineContainer) {
        timelineContainer.className = timelineContainer.className; // 클래스 재적용
        
        // 스크롤 기능 강제 테스트
        const originalScrollTop = timelineContainer.scrollTop;
        timelineContainer.scrollTop += 1;
        timelineContainer.scrollTop = originalScrollTop;
        
        console.log('📍 타임라인 스타일 재적용 및 스크롤 테스트 완료');
      }
      
      // body에서 혹시 남아있을 수 있는 style 속성들 확인
      console.log('🔍 Body 스타일 상태:', {
        overflow: document.body.style.overflow,
        touchAction: document.body.style.touchAction,
        position: document.body.style.position,
        className: document.body.className
      });
    }, 10);
    
    console.log('🔄 이벤트 기반 스크롤 차단 해제', {
      이벤트리스너해제: !preventScrollRef.current,
      스크롤감시해제: !scrollWatcherRef.current,
      CSS클래스제거: !document.body.classList.contains('dragging-active')
    });
  }, []);

  // 🎯 타임라인 영역 정보 가져오기 (캐시됨)
  const getTimelineSection = useCallback(() => {
    if (!timelineRef.current) {
      timelineRef.current = document.getElementById('timed-items-section');
    }
    return timelineRef.current;
  }, []);

  // 🎯 할일 찾기 헬퍼 함수
  const findTodo = useCallback((itemId: string) => {
    const todoId = itemId.replace('todo-', '');
    const todo = todos.find(t => t.id === todoId) || 
                 (timedItems && timedItems.find(item => item.data?.id === todoId))?.data;
    
    // 디버깅 로그 추가
    console.log('🔍 [findTodo] 할일 검색 결과:', {
      itemId,
      todoId,
      foundTodo: todo ? {
        id: todo.id,
        content: todo.content,
        startTime: todo.startTime, // camelCase 확인
        start_time: todo.start_time, // snake_case 확인
        scheduleType: todo.scheduleType,
        schedule_type: todo.schedule_type
      } : null
    });
    
    return todo;
  }, [todos, timedItems]);

  // 🎯 절대 좌표로 시간 계산
  const calculateTimeFromPosition = useCallback((clientY: number): string | null => {
    const timeline = getTimelineSection();
    if (!timeline) {
      return null;
    }
    
    const rect = timeline.getBoundingClientRect();
    // 🎯 수정: 타임라인 범위를 벗어나는 것을 허용하되, 시간 범위는 제한
    const relativeY = clientY - rect.top;
    
    // 0-1440분 (24시간) 매핑
    const totalMinutes = 24 * 60;
    let timeInMinutes = Math.round((relativeY / rect.height) * totalMinutes / 5) * 5; // 5분 스냅
    
    // 🚨 중요: 시간 범위 제한 (00:00 ~ 23:59)
    timeInMinutes = Math.max(0, Math.min(timeInMinutes, 23 * 60 + 59));
    
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    
    const timeDate = new Date(currentDate);
    timeDate.setHours(hours, minutes, 0, 0);
    
    return timeFormat === '24h' 
      ? format(timeDate, 'HH:mm')
      : format(timeDate, 'a h:mm', { locale: ko });
  }, [getTimelineSection, currentDate, timeFormat]);


  // 🎯 길게 누르기 시작 (할일 아이템 전용)
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent, itemId: string) => {
    // 할일 아이템이 아니면 처리하지 않음
    if (!itemId || !itemId.startsWith('todo-')) {
      console.log('🚫 드래그 불가능한 아이템:', itemId);
      return;
    }
    
    // 드래그 가능한 할일인지 미리 확인
    const todo = findTodo(itemId);
    const startTime = todo?.startTime || todo?.start_time;
    if (!startTime) {
      console.log('🚫 시간이 없는 할일:', { 
        itemId, 
        todo: todo?.content, 
        startTime: todo?.startTime, 
        start_time: todo?.start_time 
      });
      return;
    }
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    setPressStartPos({ x: clientX, y: clientY });
    
    console.log('🎯 드래그 가능한 할일 터치 감지:', { itemId, todo: todo.content });
    
    // 터치 즉시 현재 스크롤 위치 저장 (타임라인 상단 이동 방지)
    savedBodyScrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    const timelineContainer = document.querySelector('.w-full.overflow-auto.relative.pb-4') as HTMLElement;
    if (timelineContainer) {
      savedScrollPositionRef.current = timelineContainer.scrollTop;
      console.log('💾 터치 시작 시 스크롤 위치 즉시 저장:', {
        bodyScroll: savedBodyScrollPositionRef.current,
        timelineScroll: savedScrollPositionRef.current
      });
    }
    
    // 이벤트 타겟을 직접 사용하여 정확한 카드 위치 계산
    const todoElement = e.currentTarget as HTMLElement;
    const todoRect = todoElement.getBoundingClientRect();
    
    // 카드를 터치 위치로 이동시키는 오프셋 계산
    const cardCenterY = todoRect.top + (todoRect.height / 2);
    const touchOffsetY = clientY - cardCenterY; // 터치 위치로 카드를 이동시키기 위한 오프셋
    setCardOffsetY(touchOffsetY); // 카드를 터치 위치에 맞추기 위한 변위
    
    // 터치한 바로 그 위치에서 드래그 시작
    setCurrentDragY(clientY);
    setCurrentDragX(clientX);
    
    console.log('🎯 터치 위치와 카드 관계 분석:', { 
      할일요소: itemId,
      카드정보: { top: todoRect.top, height: todoRect.height, centerY: cardCenterY },
      터치위치: { x: clientX, y: clientY },
      터치오프셋: touchOffsetY, // 양수면 카드중앙보다 아래, 음수면 위
      드래그시작위치: { x: clientX, y: clientY },
      예상반투명카드위치: cardCenterY + touchOffsetY, // = clientY (터치 위치와 일치해야 함)
      계산검증: clientY === (cardCenterY + touchOffsetY) ? '✅ 정확' : '❌ 계산오류'
    });
    
    // 할일의 실제 시간으로 미리보기 설정
    const actualStartTime = new Date(startTime);
    const actualTimeStr = timeFormat === '24h' 
      ? format(actualStartTime, 'HH:mm')
      : format(actualStartTime, 'a h:mm', { locale: ko });
    setPreviewTime(actualTimeStr);
    
    // 300ms 후 드래그 모드 확정 (좌표는 이미 설정됨)
    const timer = setTimeout(() => {
      
      // 드래그 상태 활성화 (좌표 재설정 없이)
      setIsDragging(true);
      setDraggedItemId(itemId);
      setDraggedTodo(todo);
      
      // 드래그 확정 시 카드 위치 변화 감지
      const currentTodoElement = document.querySelector(`[data-todo-id="${itemId}"]`) as HTMLElement;
      if (currentTodoElement) {
        const currentRect = currentTodoElement.getBoundingClientRect();
        const positionChanged = Math.abs(currentRect.top - todoRect.top) > 1;
        
        console.log('🔍 드래그 확정 시 카드 위치 변화 감지:', {
          초기위치: { top: todoRect.top, height: todoRect.height },
          현재위치: { top: currentRect.top, height: currentRect.height },
          위치변화: positionChanged ? `${Math.round(currentRect.top - todoRect.top)}px 이동` : '변화없음',
          터치기준차이: Math.round((currentRect.top + (currentRect.height / 2) - clientY) * 100) / 100
        });
      }
      
      // 완전한 스크롤 차단으로 전환
      enableScrollLock();
      
      // 햅틱 피드백
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
      
      console.log('🎯 드래그 확정:', { itemId, todo: todo.content });
    }, 300);
    
    setLongPressTimer(timer);
  }, [findTodo, enableScrollLock, timeFormat]);

  // 🎯 드래그 취소
  const cancelDrag = useCallback((reason = '취소') => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // 실제로 드래그 중인 경우에만 스크롤 차단 해제
    if (isDragging) {
      disableScrollLock();
    }
    
    console.log(`🎯 드래그 취소: ${reason}`);
  }, [longPressTimer, isDragging, disableScrollLock]);

  // 🎯 터치 이동 핸들러 (스크롤 감지 & 드래그)
  const handlePressMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    
    // 길게 누르기 중일 때: 움직임이 크면 스크롤로 인식하고 취소
    if (longPressTimer && !isDragging) {
      const moveDistance = Math.sqrt(
        Math.pow(clientX - pressStartPos.x, 2) + 
        Math.pow(clientY - pressStartPos.y, 2)
      );
      
      if (moveDistance > 50) { 
        // 50px 이상 이동하면 스크롤로 판단 (임계값 증가)
        cancelDrag('스크롤 감지');
        return;
      }
    }
    
    // 드래그 모드일 때: 위치 업데이트 + 자동 스크롤
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      
      // 🎯 드래그 중에는 스크롤 완전 고정, 위치와 시간만 업데이트
      // 파란선이 타임라인 범위를 벗어나지 않도록 제한
      const timelineForConstraint = getTimelineSection();
      let constrainedY = clientY; // 기본값은 원본 위치
      
      if (timelineForConstraint) {
        const rect = timelineForConstraint.getBoundingClientRect();
        
        // 🚨 중요: 부드러운 경계 처리 - 경계에서 갑작스러운 변화 방지
        const EDGE_BUFFER = 20; // 경계 근처 완충 구간
        
        if (clientY < rect.top) {
          constrainedY = rect.top;
        } else if (clientY > rect.bottom) {
          // 🎯 하단 경계: 완충 구간에서 점진적 제한
          const overshoot = clientY - rect.bottom;
          if (overshoot <= EDGE_BUFFER) {
            // 완충 구간: 점진적으로 속도 감소 (easing out)
            const easingFactor = 1 - (overshoot / EDGE_BUFFER) * 0.8;
            constrainedY = rect.bottom - (EDGE_BUFFER * (1 - easingFactor));
          } else {
            constrainedY = rect.bottom;
          }
        }
        
        setCurrentDragY(constrainedY);
      } else {
        setCurrentDragY(clientY);
      }
      setCurrentDragX(clientX);
      
      // 🚀 브라우저 뷰포트 기반 자동 스크롤 (Production 방식)
      const SCROLL_ZONE = 240; // 뷰포트 가장자리 240px 영역 (확장됨)
      const MAX_SCROLL_SPEED = 24; // 최대 스크롤 속도 (더 빠르게 조정)
      
      const timeline = getTimelineSection();
      if (timeline) {
        // Production 방식: 브라우저 뷰포트 경계 기준 감지
        const viewportHeight = window.innerHeight;
        const isNearTopEdge = clientY < SCROLL_ZONE; // 뷰포트 상단에서 80px 이내
        const isNearBottomEdge = clientY > viewportHeight - SCROLL_ZONE; // 뷰포트 하단에서 80px 이내
        
        
        // 이전 애니메이션 프레임 취소
        if (autoScrollRafRef.current) {
          cancelAnimationFrame(autoScrollRafRef.current);
        }
        
        if (isNearTopEdge) {
          // 상단 가장자리 - 브라우저 전체 위로 스크롤
          const distance = SCROLL_ZONE - clientY;
          const normalizedDistance = Math.min(distance / SCROLL_ZONE, 1); // 0-1 범위
          // 🎯 자연스러운 속도 곡선: 제곱근 함수로 부드러운 가속
          const scrollSpeed = Math.pow(normalizedDistance, 0.7) * MAX_SCROLL_SPEED;
          
          const smoothScrollUp = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > 0) {
              // 🔓 핵심: 스크롤 락 잠깐 해제하고 브라우저 스크롤 적용
              disableScrollLock();
              
              const newScrollY = Math.max(0, currentScrollY - scrollSpeed);
              window.scrollTo({ top: newScrollY, behavior: 'auto' });
              
              // 🎯 중요: 자동 스크롤 후 저장된 위치 업데이트
              savedBodyScrollPositionRef.current = newScrollY;
              
              console.log('⬆️ 뷰포트 기반 자동 스크롤 (위):', { 
                scrollSpeed, 
                currentScrollY, 
                newScrollY,
                저장된위치업데이트: savedBodyScrollPositionRef.current,
                락해제됨: true 
              });
              
              // 🔒 스크롤 락만 복원 (위치 복원 생략)
              requestAnimationFrame(() => {
                // 위치 복원 없이 기본 이벤트 차단만 설정
                const preventScroll = (e: Event) => {
                  if (isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                };
                
                preventScrollRef.current = preventScroll;
                document.addEventListener('touchmove', preventScroll, { passive: false });
                document.addEventListener('wheel', preventScroll, { passive: false });
                document.addEventListener('scroll', preventScroll, { passive: false });
              });
              
              if (newScrollY > 0) {
                autoScrollRafRef.current = requestAnimationFrame(smoothScrollUp);
              } else {
                console.log('⬆️ 자동 스크롤 완료 (최상단 도달)');
                autoScrollRafRef.current = null;
              }
            } else {
              console.log('⬆️ 자동 스크롤 완료 (이미 최상단)');
              autoScrollRafRef.current = null;
            }
          };
          autoScrollRafRef.current = requestAnimationFrame(smoothScrollUp);
          
        } else if (isNearBottomEdge) {
          // 하단 가장자리 - 브라우저 전체 아래로 스크롤  
          const distance = clientY - (viewportHeight - SCROLL_ZONE);
          const normalizedDistance = Math.min(distance / SCROLL_ZONE, 1); // 0-1 범위
          // 🎯 자연스러운 속도 곡선: 제곱근 함수로 부드러운 가속
          const scrollSpeed = Math.pow(normalizedDistance, 0.7) * MAX_SCROLL_SPEED;
          
          const smoothScrollDown = () => {
            const currentScrollY = window.scrollY;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            if (currentScrollY < maxScroll) {
              // 🔓 핵심: 스크롤 락 잠깐 해제하고 브라우저 스크롤 적용
              disableScrollLock();
              
              const newScrollY = Math.min(maxScroll, currentScrollY + scrollSpeed);
              window.scrollTo({ top: newScrollY, behavior: 'auto' });
              
              // 🎯 중요: 자동 스크롤 후 저장된 위치 업데이트
              savedBodyScrollPositionRef.current = newScrollY;
              
              console.log('⬇️ 뷰포트 기반 자동 스크롤 (아래):', { 
                scrollSpeed, 
                currentScrollY,
                newScrollY,
                maxScroll,
                저장된위치업데이트: savedBodyScrollPositionRef.current,
                락해제됨: true 
              });
              
              // 🔒 스크롤 락만 복원 (위치 복원 생략)
              requestAnimationFrame(() => {
                // 위치 복원 없이 기본 이벤트 차단만 설정
                const preventScroll = (e: Event) => {
                  if (isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                };
                
                preventScrollRef.current = preventScroll;
                document.addEventListener('touchmove', preventScroll, { passive: false });
                document.addEventListener('wheel', preventScroll, { passive: false });
                document.addEventListener('scroll', preventScroll, { passive: false });
              });
              
              if (newScrollY < maxScroll) {
                autoScrollRafRef.current = requestAnimationFrame(smoothScrollDown);
              } else {
                console.log('⬇️ 자동 스크롤 완료 (최하단 도달)');
                autoScrollRafRef.current = null;
              }
            } else {
              console.log('⬇️ 자동 스크롤 완료 (이미 최하단)');
              autoScrollRafRef.current = null;
            }
          };
          autoScrollRafRef.current = requestAnimationFrame(smoothScrollDown);
        }
      }
      
      // 실시간 시간 미리보기 (제한된 좌표 사용)
      const time = calculateTimeFromPosition(constrainedY);
      if (time) {
        setPreviewTime(time);
      }
    }
  }, [longPressTimer, isDragging, pressStartPos, cancelDrag, calculateTimeFromPosition, getTimelineSection]);

  // 🎯 드래그 완료 핸들러 (간소화됨)
  const handleDragEnd = useCallback((onRecurringUpdate?: (data: {
    todoId: string;
    originalTime: { start: Date; end?: Date };
    newTime: { start: Date; end?: Date };
    occurrenceDate: Date;
  }) => void) => {
    // 타이머 정리
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (!isDragging || !draggedItemId || !draggedTodo) {
      return;
    }
    
    try {
      const timeline = getTimelineSection();
      if (!timeline) {
        return;
      }
      
      const rect = timeline.getBoundingClientRect();
      
      // 🚨 중요: 시간 미리보기와 동일한 제한된 좌표 사용
      const constrainedY = Math.max(rect.top, Math.min(currentDragY, rect.bottom));
      const relativeY = constrainedY - rect.top;
      
      // 시간 계산 (5분 단위 스냅)
      const totalMinutes = 24 * 60;
      const timeInMinutes = Math.round((relativeY / rect.height) * totalMinutes / 5) * 5;
      const finalMinutes = Math.min(timeInMinutes, 23 * 60 + 59);
      
      console.log('🎯 드래그 완료 시간 계산:', {
        currentDragY,
        constrainedY,
        relativeY,
        timelineHeight: rect.height,
        rawTimeInMinutes: (relativeY / rect.height) * totalMinutes,
        timeInMinutes,
        finalMinutes,
        차이: timeInMinutes - finalMinutes
      });
      
      const hours = Math.floor(finalMinutes / 60);
      const minutes = finalMinutes % 60;
      
      // 새로운 시작 시간
      const newStartTime = new Date(currentDate);
      newStartTime.setHours(hours, minutes, 0, 0);
      
      // 종료 시간 계산
      let newEndTime: Date | null = null;
      const originalEndTime = draggedTodo.endTime || draggedTodo.end_time;
      const originalStartTime = draggedTodo.startTime || draggedTodo.start_time;
      
      if (originalEndTime && originalStartTime) {
        const duration = new Date(originalEndTime).getTime() - new Date(originalStartTime).getTime();
        newEndTime = new Date(newStartTime.getTime() + duration);
      }
      
      // 반복 할일 확인
      const recurrencePattern = draggedTodo.recurrencePattern || draggedTodo.recurrence_pattern;
      const isRecurring = (recurrencePattern && recurrencePattern !== 'none') || 
                         (draggedTodo.id && draggedTodo.id.includes('-recurrence-'));
      
      console.log('🔍 [드래그완료] 반복 일정 확인:', {
        draggedTodoId: draggedTodo.id,
        recurrencePattern: draggedTodo.recurrencePattern,
        recurrence_pattern: draggedTodo.recurrence_pattern,
        최종패턴: recurrencePattern,
        isRecurring: isRecurring,
        hasRecurrenceInId: draggedTodo.id && draggedTodo.id.includes('-recurrence-')
      });
      
      if (isRecurring && onRecurringUpdate) {
        // 반복 할일: 선택 메뉴 표시
        onRecurringUpdate({
          todoId: draggedTodo.id.includes('-recurrence-') ? 
            draggedTodo.id.split('-recurrence-')[0] : draggedTodo.id,
          originalTime: { 
            start: new Date(originalStartTime), 
            end: originalEndTime ? new Date(originalEndTime) : undefined 
          },
          newTime: { 
            start: newStartTime, 
            end: newEndTime || undefined 
          },
          occurrenceDate: currentDate
        });
      } else {
        // 일반 할일: 바로 업데이트
        const { updateTodo } = useTodoStore.getState();
        updateTodo(draggedTodo.id.replace('todo-', ''), {
          start_time: newStartTime.toISOString(),
          end_time: newEndTime?.toISOString() || undefined,
        });
      }
      
      console.log('✅ 드래그 완료:', { 
        todoId: draggedTodo.id,
        newTime: format(newStartTime, 'a h:mm', { locale: ko })
      });
      
    } catch (error) {
      console.error('드래그 완료 처리 오류:', error);
    } finally {
      // 상태 정리
      setIsDragging(false);
      setDraggedItemId(null);
      setCurrentDragY(0);
      setCurrentDragX(0);
      setPreviewTime('');
      setDraggedTodo(null);
      setPressStartPos({ x: 0, y: 0 });
      setCardOffsetY(0); // 오프셋 초기화
      
      // 자동 스크롤 애니메이션 정리
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
      
      // 🎯 중요: 스크롤 차단 해제 시 현재 위치 유지
      const currentBodyScroll = window.scrollY;
      const timelineContainer = document.querySelector('.w-full.overflow-auto.relative.pb-4') as HTMLElement;
      const currentTimelineScroll = timelineContainer?.scrollTop || 0;
      
      console.log('🧹 드래그 완료 - 현재 스크롤 위치 유지:', {
        bodyScroll: currentBodyScroll,
        timelineScroll: currentTimelineScroll
      });
      
      // 현재 위치를 저장하여 복원 로직이 현재 위치를 유지하도록 함
      savedBodyScrollPositionRef.current = currentBodyScroll;
      savedScrollPositionRef.current = currentTimelineScroll;
      
      // 스크롤 차단 해제 (현재 위치 유지하며)
      disableScrollLock();
    }
  }, [longPressTimer, isDragging, draggedItemId, draggedTodo, currentDragY, currentDate, getTimelineSection, disableScrollLock]);

  // 🎯 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
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
      
      console.log('🧹 컴포넌트 언마운트 시 드래그 정리 완료');
    };
  }, []);

  return {
    // 🎯 드래그 상태 (간소화)
    isDragging,
    draggedItemId,
    currentDragY,
    currentDragX,
    previewTime,
    draggedTodo,
    cardOffsetY, // 카드 위치 보정값
    
    // 🎯 드래그 핸들러 (간소화)
    handleTouchStart,
    handlePressMove,
    handleDragEnd,
    handleDragMove: () => {}, // 빈 함수로 호환성 유지
  };
};