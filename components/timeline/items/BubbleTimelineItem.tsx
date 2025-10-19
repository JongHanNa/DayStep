'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { TimelineItem } from '@/types/timeline-view';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { getUnifiedIcon, UnifiedIconKey } from '@/lib/icon-collection';
import { Check } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';
import { useMotivationStore } from '@/state/stores/motivationStore';
import { useQuickMemoStore } from '@/state/stores/quickMemoStore';
import { useSettingsStore } from '@/state/stores/settingsStore';
import MotivationBadge from '@/components/motivation/MotivationBadge';

// 🎨 테마 색상 상수 (CSS 변수 사용)
const THEME_COLORS = {
  DEFAULT_TODO: 'hsl(var(--status-pending))',         // #3B82F6 → CSS 변수
  CONNECTOR: 'hsl(var(--timeline-connector))',        // #E5E5E5 → CSS 변수
  TIMELINE_BG_LIGHT: 'hsl(var(--timeline-bg))',       // #f8f8f8 → CSS 변수
  COMPLETED: 'hsl(var(--status-completed))',          // #22C55E → CSS 변수
  BORDER_DEFAULT: 'hsl(var(--border))',                // #D1D5DB → CSS 변수
} as const;

interface BubbleTimelineItemProps {
  item: TimelineItem;
  prevItem: TimelineItem | null;
  nextItem: TimelineItem | null;
  isDragging: boolean;
  dragOffset: number;
  isToday: boolean;
  currentTime: Date;
  currentDate: Date;  // viewing date (어제/오늘/내일 등)
  dateStatus: 'past' | 'today' | 'future';  // 부모로부터 전달받는 날짜 상태
  onTodoClick: (itemId: string) => void;
  onToggleComplete: (itemId: string) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
  onGapClick?: (startTime: Date, endTime: Date) => void;  // 간격 클릭 핸들러
}

/**
 * 버블 스타일 타임라인 아이템 컴포넌트
 *
 * 주요 기능:
 * - 버블 아이콘 + 할일 제목 카드 형태
 * - 시간 진행에 따른 색상 변화 (회색 → 할일 색상)
 * - 롱프레스 드래그 지원
 */
export const BubbleTimelineItem: React.FC<BubbleTimelineItemProps> = ({
  item,
  prevItem,
  nextItem,
  isDragging,
  dragOffset,
  isToday,
  currentTime,
  currentDate,  // viewing date (어제/오늘/내일 등)
  dateStatus,  // 부모로부터 전달받는 날짜 상태
  onTodoClick,
  onToggleComplete,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onGapClick,  // 간격 클릭 핸들러
}) => {
  // 버블 위치 계산을 위한 ref
  const bubbleWrapperRef = React.useRef<HTMLDivElement>(null);

  // 버블 너비 (고정) - useMemo보다 먼저 선언
  const bubbleWidth = 64;

  // 스토어 훅
  const { todos, todoCompletions } = useTodoStore();
  const { getMotivationsForTodo } = useMotivationStore();
  const { memos } = useQuickMemoStore();
  const { bubbleShape } = useSettingsStore();

  // 타임라인 ID에서 실제 UUID 추출
  const extractTaskId = (timelineId: string) => {
    let taskId = timelineId.replace(/^todo-/, '');
    if (taskId.includes('-recurrence-')) {
      taskId = taskId.split('-recurrence-')[0];
    }
    return taskId;
  };

  const actualTaskId = extractTaskId(item.id);

  // 동기부여 메시지
  const linkedMotivationMessages = item.type === 'todo' ? getMotivationsForTodo(actualTaskId) : [];

  // 메모 확인
  const linkedMemos = item.type === 'todo'
    ? memos.filter(memo =>
        memo.related_task_id === actualTaskId ||
        memo.linked_timeline_task_id === actualTaskId
      )
    : [];

  // 완료 상태 계산
  const isCompleted = useMemo(() => {
    if (item.type !== 'todo') return false;
    const todoData = item.data;
    if (!todoData) return false;

    const isRecurring = (todoData as any).is_recurrence_instance ||
                       (todoData.recurrence_pattern && todoData.recurrence_pattern !== 'none');

    if (isRecurring) {
      const originalId = (todoData as any).recurrence_source_id || todoData.id;
      const occurrenceDate = (todoData as any).recurrence_occurrence_date;
      const { isRecurrenceCompleted } = useTodoStore.getState();
      return isRecurrenceCompleted(originalId, occurrenceDate);
    } else {
      const actualTodoId = item.id.startsWith('todo-') ? item.id.replace('todo-', '') : item.id;
      const storeCurrentTodo = todos.find(t => t.id === actualTodoId);
      return storeCurrentTodo ? storeCurrentTodo.completed : (todoData.completed || false);
    }
  }, [item.type, item.data, item.id, todos, todoCompletions]);

  // 아이콘 결정 - getUnifiedIcon 활용
  const IconComponent = useMemo(() => {
    if (item.type !== 'todo') return Icons.Circle;

    const iconKey = item.data?.icon;
    if (!iconKey) return Icons.Circle;

    const iconData = getUnifiedIcon(iconKey as UnifiedIconKey);
    if (iconData) {
      return iconData.component;
    }

    // 폴백: lucide-react 아이콘
    if (iconKey in Icons) {
      return Icons[iconKey as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    }

    return Icons.Circle;
  }, [item.type, item.data]);

  // 버블의 화면 절대 좌표 계산
  const bubbleFixedPosition = useMemo(() => {
    if (!isDragging || !bubbleWrapperRef.current) return null;

    const rect = bubbleWrapperRef.current.getBoundingClientRect();
    return {
      left: rect.left, // 원래 위치 그대로 사용
      top: rect.top + dragOffset,
      centerX: rect.left + bubbleWidth / 2, // 시간 표시 중앙 정렬용
    };
  }, [isDragging, dragOffset]);

  // 할일 색상
  const itemColor = item.color || THEME_COLORS.DEFAULT_TODO;

  // 시작/종료 시간 (원본)
  const originalStartTime = item.startTime ? new Date(item.startTime) : null;
  const originalEndTime = item.endTime ? new Date(item.endTime) : null;

  // 같은 날인지 확인하는 함수
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // 시간 정규화: startTime과 endTime을 같은 날로 변환
  // (원본 반복 할일의 경우 endTime이 반복 종료일로 설정되어 있어서 정규화 필요)
  // ✅ 반복 인스턴스는 이미 정확한 날짜가 설정되어 있으므로 정규화 제외
  const startTime = originalStartTime;
  const endTime = useMemo(() => {
    if (!originalStartTime || !originalEndTime) return null;

    // 이미 같은 날이면 그대로 사용
    if (isSameDay(originalStartTime, originalEndTime)) {
      return originalEndTime;
    }

    // ✅ 원본 반복 할일만 정규화 (반복 인스턴스는 정규화 제외)
    // 반복 인스턴스는 recurrence-utils.ts에서 이미 정확한 날짜로 생성됨
    const isRecurrenceInstance = 'is_recurrence_instance' in item.data && item.data.is_recurrence_instance === true;

    if (item.type === 'todo' && item.data.recurrence_pattern !== 'none' && !isRecurrenceInstance) {
      // 다른 날이면 startTime의 날짜에 endTime의 시간을 적용
      const normalized = new Date(
        originalStartTime.getFullYear(),
        originalStartTime.getMonth(),
        originalStartTime.getDate(),
        originalEndTime.getHours(),
        originalEndTime.getMinutes(),
        originalEndTime.getSeconds()
      );

      return normalized;
    }

    // 일반 할일 및 반복 인스턴스는 원본 endTime 사용
    return originalEndTime;
  }, [originalStartTime, originalEndTime, item.type, item.data]);

  // 할일 시간 간격(분) 계산
  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 10; // 기본값 10분

    let minutes = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));

    // 음수면 다음날 종료 (24시간 더하기)
    if (minutes < 0) {
      minutes += 24 * 60; // 1440분 추가
    }

    // 24시간 초과 체크 (반복 할일의 비정상 값)
    if (minutes > 1440) {
      return 10;
    }

    return Math.max(1, minutes); // 최소 1분
  }, [startTime, endTime]);

  // 다음 할일까지의 간격(분) 계산
  const gapMinutes = useMemo(() => {
    if (!endTime || !nextItem?.startTime) return 10; // 기본 간격 10분

    const originalNextStart = new Date(nextItem.startTime);

    // 다음 할일 시작 시간도 현재 할일 종료 날짜 기준으로 정규화
    const nextStart = isSameDay(endTime, originalNextStart)
      ? originalNextStart
      : new Date(
          endTime.getFullYear(),
          endTime.getMonth(),
          endTime.getDate(),
          originalNextStart.getHours(),
          originalNextStart.getMinutes(),
          originalNextStart.getSeconds()
        );

    const gap = Math.round((nextStart.getTime() - endTime.getTime()) / (60 * 1000));

    // 비정상 값 체크 (24시간 = 1440분 초과 또는 음수)
    if (gap > 1440 || gap < 0) {
      return 10;
    }

    // ✅ 간격 그대로 반환 (0~10분은 동일한 간격으로 처리)
    return gap;
  }, [endTime, nextItem]);

  // 버블 높이 계산 (10분 단위로 10px씩 증가, 최대 500px)
  const bubbleHeight = useMemo(() => {
    const baseHeight = 80; // 1-10분: 80px (arrow 위아래 20px씩 고려)

    // 11분 이상일 때만 추가 높이 적용
    if (durationMinutes <= 10) return baseHeight;

    // 10분 초과분에 대해 10분당 10px 추가
    // 예: 11-20분 → 10px 추가 → 90px
    //     1시간(60분) → 50분 추가 → 50px 추가 → 130px
    //     7시간(420분) → 410분 추가 → 410px 추가 → 490px
    const extraMinutes = durationMinutes - 10;
    const extraHeight = Math.ceil(extraMinutes / 10) * 10;
    return Math.min(baseHeight + extraHeight, 500); // 최대 500px (약 7.5시간)
  }, [durationMinutes]);

  // borderRadius 계산 (형태별 + 타원형 효과)
  const borderRadius = useMemo(() => {
    // 사각형: 고정 borderRadius
    if (bubbleShape === 'square') return '12px';

    // 화살표: 약간 둥근 모서리
    if (bubbleShape === 'arrow') return '8px';

    // 원형 (circle): 모두 타원형(돔 모양)으로 통일
    return `${bubbleWidth / 2}px / ${Math.min(bubbleHeight / 2, bubbleWidth / 2)}px`;
  }, [bubbleShape, bubbleHeight]);

  // 연결 막대 높이 계산 (간격에 비례, 최대 500px)
  const connectorHeight = useMemo(() => {
    const baseHeight = 16; // 0-10분: 16px (동일한 간격)

    // ✅ 0~10분 간격은 모두 동일한 16px 높이
    if (gapMinutes <= 10) return baseHeight;

    // 10분 초과분에 대해 10분당 10px 추가
    // 예: 11-20분 → 10px 추가 → 26px
    //     1시간(60분) → 50분 추가 → 66px
    //     12시간(720분) → 710분 추가 → 726px → 최대 500px 제한
    const extraMinutes = gapMinutes - 10;
    const extraHeight = Math.ceil(extraMinutes / 10) * 10;
    return Math.min(baseHeight + extraHeight, 500); // 최대 500px (약 8시간 간격)
  }, [gapMinutes]);

  // 다음 할일의 색상
  const nextItemColor = nextItem?.color || THEME_COLORS.DEFAULT_TODO;

  // 다음 할일의 시작 시간 기준 진행률 계산
  const nextProgressPercentage = useMemo(() => {
    if (!nextItem || !nextItem.startTime || !nextItem.endTime) return 0;

    const nextStartTime = new Date(nextItem.startTime);
    const nextEndTime = new Date(nextItem.endTime);

    // 날짜 상태에 따라 진행률 계산
    if (dateStatus === 'past') return 100; // 과거는 100%
    if (dateStatus === 'future') return 0; // 미래는 0%

    // 오늘: 현재 시간이 다음 할일 시작 시간 이전이면 0%
    const nowHour = currentTime.getHours();
    const nowMinute = currentTime.getMinutes();
    const nowTimeOfDay = nowHour * 60 + nowMinute;

    const nextStartHour = nextStartTime.getHours();
    const nextStartMinute = nextStartTime.getMinutes();
    const nextStartTimeOfDay = nextStartHour * 60 + nextStartMinute;

    if (nowTimeOfDay < nextStartTimeOfDay) return 0;

    // 이미 시작했으면 진행률 계산 (간단히 >0으로 처리)
    const nextEndHour = nextEndTime.getHours();
    const nextEndMinute = nextEndTime.getMinutes();
    const nextEndTimeOfDay = nextEndHour * 60 + nextEndMinute;

    if (nowTimeOfDay >= nextEndTimeOfDay) return 100;

    return Math.round(((nowTimeOfDay - nextStartTimeOfDay) / (nextEndTimeOfDay - nextStartTimeOfDay)) * 100);
  }, [nextItem, dateStatus, currentTime]);

  // ✅ 전날 시작 여부 판단 (크로스데이 할일의 전날 부분)
  const isPreviousDay = useMemo(() => {
    if (!startTime || !endTime || !currentDate) return false;

    // 크로스데이 여부 확인 (시간만 비교)
    const startTimeOfDay = startTime.getHours() * 60 + startTime.getMinutes();
    const endTimeOfDay = endTime.getHours() * 60 + endTime.getMinutes();
    const isCrossDay = endTimeOfDay < startTimeOfDay;

    if (!isCrossDay) return false;  // 일반 할일은 전날 시작 아님

    // 크로스데이 할일: startTime의 날짜가 currentDate보다 이전이면 전날 시작
    const currentDay = new Date(currentDate);
    currentDay.setHours(0, 0, 0, 0);

    const startDay = new Date(startTime);
    startDay.setHours(0, 0, 0, 0);

    return startDay.getTime() < currentDay.getTime();
  }, [startTime, endTime, currentDate, item.data.title]);

  // 현재 시간 기준 진행률 계산 (0-100)
  // 크로스데이 할일 처리: currentDate 날짜의 시작(00:00)과 끝(23:59:59)을 기준으로 계산
  const progressPercentage = useMemo(() => {
    if (!startTime || !endTime) return 0;

    // currentDate (viewing date)의 00:00:00 ~ 23:59:59 범위 계산
    const viewingDate = new Date(currentDate);  // ✅ currentDate 사용
    const dayStart = new Date(viewingDate.getFullYear(), viewingDate.getMonth(), viewingDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(viewingDate.getFullYear(), viewingDate.getMonth(), viewingDate.getDate(), 23, 59, 59, 999);

    // 과거 날짜: 크로스데이 할일은 종료 시점 확인 후 진행률, 일반 할일은 100%
    if (dateStatus === 'past') {
      // 시작/종료 시간 (분 단위)
      const startTimeOfDay = startTime.getHours() * 60 + startTime.getMinutes();
      const endTimeOfDay = endTime.getHours() * 60 + endTime.getMinutes();

      // 크로스데이 할일인지 확인
      const isCrossDay = endTimeOfDay < startTimeOfDay;

      if (isCrossDay) {
        // endTime이 viewing date(보고 있는 날짜) 안에 있는지 확인
        const endDate = new Date(endTime);
        endDate.setHours(0, 0, 0, 0);

        const viewingDate = new Date(currentDate);
        viewingDate.setHours(0, 0, 0, 0);

        // endTime이 viewing date 안에 있으면 이미 종료됨 (100%)
        if (endDate.getTime() <= viewingDate.getTime()) {
          return 100;
        }

        // endTime이 viewing date 이후면 진행 중 (현재 시간 기준)
        const nowHour = currentTime.getHours();
        const nowMinute = currentTime.getMinutes();
        const nowTimeOfDay = nowHour * 60 + nowMinute;

        // 전체 시간: (시작 ~ 23:59) + (00:00 ~ 종료)
        const totalDuration = (1439 - startTimeOfDay) + endTimeOfDay;

        // 아직 종료 전이면 진행률 계산
        if (nowTimeOfDay < endTimeOfDay) {
          // 진행: (시작 ~ 23:59) + (00:00 ~ 현재)
          const progress = (1439 - startTimeOfDay) + nowTimeOfDay;
          const percentage = Math.round((progress / totalDuration) * 100);
          return percentage;
        }

        // 종료 후면 100%
        return 100;
      }

      // 일반 할일: 과거 날짜는 100%
      return 100;
    }

    // 미래 날짜: 0% (회색)
    if (dateStatus === 'future') return 0;

    // 오늘: 00:00 ~ 현재 시간까지의 진행률 (시간만 비교)
    if (dateStatus === 'today') {
      const nowHour = currentTime.getHours();
      const nowMinute = currentTime.getMinutes();
      const nowTimeOfDay = nowHour * 60 + nowMinute; // 현재 시간 (분)

      // 시작 시간 (분 단위)
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const startTimeOfDay = startHour * 60 + startMinute;

      // 종료 시간 (분 단위)
      const endHour = endTime.getHours();
      const endMinute = endTime.getMinutes();
      const endTimeOfDay = endHour * 60 + endMinute;

      // ✅ 전날 시작 크로스데이 (예: 어제 22:30 ~ 오늘 05:30)
      // 전체 할일 시간 기준으로 진행률 계산
      if (isPreviousDay) {
        // 종료 전이면 진행률 계산
        if (nowTimeOfDay < endTimeOfDay) {
          // 전체 시간: (어제 시작 ~ 23:59) + (오늘 00:00 ~ 종료)
          const totalDuration = (1439 - startTimeOfDay) + endTimeOfDay;

          // 진행: (어제 시작 ~ 23:59) + (오늘 00:00 ~ 현재)
          const progress = (1439 - startTimeOfDay) + nowTimeOfDay;
          const percentage = Math.round((progress / totalDuration) * 100);
          return percentage;
        }

        // 종료 후면 100%
        return 100;
      }

      // ✅ 오늘 시작 크로스데이 (예: 오늘 22:30 ~ 내일 05:30+1)
      // 오늘 날짜 뷰에서는 "오늘 시작하는" 할일만 표시
      if (endTimeOfDay < startTimeOfDay) {
        // 아직 시작 전 (00:00 ~ startTime)
        if (nowTimeOfDay < startTimeOfDay) {
          return 0;
        }

        // ✅ 진행 중 (startTime ~ 23:59)
        // 진행 = 현재 시간 - 시작 시간
        const progress = nowTimeOfDay - startTimeOfDay;
        const totalDuration = (1439 - startTimeOfDay) + endTimeOfDay;
        const percentage = Math.round((progress / totalDuration) * 100);

        return percentage;
      }

      // 일반 할일: 시작 전이면 0%, 종료 후면 100%, 진행 중이면 비율
      if (nowTimeOfDay < startTimeOfDay) {
        return 0;
      }

      if (nowTimeOfDay >= endTimeOfDay) {
        return 100;
      }

      const percentage = Math.round(((nowTimeOfDay - startTimeOfDay) / (endTimeOfDay - startTimeOfDay)) * 100);

      return percentage;
    }

    return 0;
  }, [dateStatus, startTime, endTime, currentTime, currentDate, isPreviousDay]);


  // 연결 막대 진행률 계산 (현재 종료 ~ 다음 시작 사이)
  const connectorProgressPercentage = useMemo(() => {
    if (!nextItem || !endTime || !nextItem.startTime) return 0;

    // 조건 1: 현재 버블이 100% 완료되지 않았으면 연결 막대는 0%
    if (progressPercentage < 100) return 0;

    // 조건 2: 다음 버블이 이미 시작했으면 연결 막대는 100%
    if (nextProgressPercentage > 0) return 100;

    // 조건 3: 현재 종료 ~ 다음 시작 사이
    // 날짜 상태 확인
    if (dateStatus === 'past') return 100; // 과거는 100%
    if (dateStatus === 'future') return 0; // 미래는 0%

    // 오늘: 현재 시간 기준 진행률 계산
    const nowHour = currentTime.getHours();
    const nowMinute = currentTime.getMinutes();
    const nowTimeOfDay = nowHour * 60 + nowMinute;

    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();
    const endTimeOfDay = endHour * 60 + endMinute;

    const nextStartTime = new Date(nextItem.startTime);
    const nextStartHour = nextStartTime.getHours();
    const nextStartMinute = nextStartTime.getMinutes();
    const nextStartTimeOfDay = nextStartHour * 60 + nextStartMinute;

    // 아직 현재 할일 종료 전이면 0%
    if (nowTimeOfDay < endTimeOfDay) return 0;

    // 다음 할일 시작 후면 100%
    if (nowTimeOfDay >= nextStartTimeOfDay) return 100;

    // 사이 구간: 진행률 계산
    const elapsed = nowTimeOfDay - endTimeOfDay;
    const total = nextStartTimeOfDay - endTimeOfDay;

    // total이 0이거나 음수면 0% 반환
    if (total <= 0) return 0;

    return Math.min(100, Math.round((elapsed / total) * 100));
  }, [progressPercentage, nextProgressPercentage, dateStatus, currentTime, endTime, nextItem]);

  // 연결 막대 색상 (그라데이션: 이전 색 → 다음 색) - 중앙에서 부드러운 블렌딩
  const connectorGradient = useMemo(() => {
    if (connectorProgressPercentage === 0) {
      // 아직 시작 전이면 회색
      return THEME_COLORS.CONNECTOR;
    }

    if (connectorProgressPercentage === 100) {
      // 완전히 완료되면 부드러운 그라데이션 (이전 색 → 중앙 블렌딩 → 다음 색)
      return `linear-gradient(to bottom, ${itemColor} 0%, ${itemColor} 40%, ${nextItemColor} 60%, ${nextItemColor} 100%)`;
    }

    // 진행 중: 진행률에 따라 점진적 색칠
    // 0-50%: 이전 색으로 색칠
    // 50-100%: 다음 색으로 색칠 (중앙 블렌딩 포함)
    if (connectorProgressPercentage <= 50) {
      // 0-50% 구간: 이전 색으로 진행률만큼 색칠
      return `linear-gradient(to bottom, ${itemColor} 0%, ${itemColor} ${connectorProgressPercentage}%, ${THEME_COLORS.CONNECTOR} ${connectorProgressPercentage}%, ${THEME_COLORS.CONNECTOR} 100%)`;
    } else {
      // 50-100% 구간: 이전 색 40% + 블렌딩 40-60% + 다음 색으로 진행률만큼 색칠
      const blendStart = 40;
      const blendEnd = 60;
      return `linear-gradient(to bottom, ${itemColor} 0%, ${itemColor} ${blendStart}%, ${nextItemColor} ${blendEnd}%, ${nextItemColor} ${connectorProgressPercentage}%, ${THEME_COLORS.CONNECTOR} ${connectorProgressPercentage}%, ${THEME_COLORS.CONNECTOR} 100%)`;
    }
  }, [connectorProgressPercentage, itemColor, nextItemColor]);

  // 버블 스타일 결정 (색상 + 크기 + 점진적 색칠)
  const bubbleStyle = useMemo(() => {
    // arrow 모양일 때 위아래 고정 크기 (px)
    const arrowTopHeight = 20; // 위쪽 V자 높이
    const arrowBottomHeight = 20; // 아래쪽 뾰족 높이

    const baseStyle = {
      width: `${bubbleWidth}px`,
      height: `${bubbleHeight}px`,
      borderRadius: bubbleShape === 'arrow' ? 0 : borderRadius, // arrow는 날카롭게, 나머지는 기존값
      // arrow 모양일 때 clip-path 추가 (위아래 고정, 중간 가변)
      ...(bubbleShape === 'arrow' && {
        clipPath: `polygon(
          0px 0px,
          ${bubbleWidth / 2}px ${arrowTopHeight}px,
          ${bubbleWidth}px 0px,
          ${bubbleWidth}px ${bubbleHeight - arrowBottomHeight}px,
          ${bubbleWidth / 2}px ${bubbleHeight}px,
          0px ${bubbleHeight - arrowBottomHeight}px
        )`
      })
    };

    // 진행률에 따라 점진적으로 색칠 (위에서 아래로)
    if (progressPercentage > 0) {
      return {
        ...baseStyle,
        background: `linear-gradient(to bottom, ${itemColor} 0%, ${itemColor} ${progressPercentage}%, ${THEME_COLORS.CONNECTOR} ${progressPercentage}%, ${THEME_COLORS.CONNECTOR} 100%)`,
      };
    }

    // 아직 시작 전이면 회색
    return {
      ...baseStyle,
      backgroundColor: THEME_COLORS.CONNECTOR,
    };
  }, [progressPercentage, itemColor, bubbleWidth, bubbleHeight, borderRadius, bubbleShape]);

  // 드래그 중 변경된 시간 계산
  const displayStartTime = useMemo(() => {
    if (!startTime) return null;
    if (isDragging && dragOffset !== 0) {
      const minutesChange = Math.round(dragOffset);
      return new Date(startTime.getTime() + minutesChange * 60 * 1000);
    }
    return startTime;
  }, [startTime, isDragging, dragOffset]);

  const displayEndTime = useMemo(() => {
    if (!endTime) return null;
    if (isDragging && dragOffset !== 0) {
      const minutesChange = Math.round(dragOffset);
      return new Date(endTime.getTime() + minutesChange * 60 * 1000);
    }
    return endTime;
  }, [endTime, isDragging, dragOffset]);

  // 다음날 종료 여부 판단
  const isNextDay = useMemo(() => {
    if (!startTime || !endTime) return false;

    // ✅ 전날 시작 크로스데이는 다음날 종료가 아님 (상호 배타적)
    if (isPreviousDay) {
      return false;
    }

    // 종료 시간이 시작 시간보다 작으면 다음날 종료
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    return endMinutes < startMinutes;
  }, [startTime, endTime, isPreviousDay, item.data.title]);

  // 시간 포맷
  const formatTime = (date: Date | null) => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 남은 시간 계산 (현재 진행 중인 할일일 때)
  const remainingMinutes = useMemo(() => {
    if (!endTime || dateStatus !== 'today') return null;

    const nowHour = currentTime.getHours();
    const nowMinute = currentTime.getMinutes();
    const nowTimeOfDay = nowHour * 60 + nowMinute;

    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();
    const endTimeOfDay = endHour * 60 + endMinute;

    const startHour = startTime?.getHours() || 0;
    const startMinute = startTime?.getMinutes() || 0;
    const startTimeOfDay = startHour * 60 + startMinute;

    // 현재 진행 중인지 확인
    if (nowTimeOfDay >= startTimeOfDay && nowTimeOfDay < endTimeOfDay) {
      return endTimeOfDay - nowTimeOfDay;
    }

    return null;
  }, [endTime, startTime, currentTime, dateStatus]);

  // 간격 메시지 생성
  const gapMessage = useMemo(() => {
    if (!nextItem || gapMinutes <= 0) {
      return null;
    }

    // ✅ 간격이 20분 미만이면 메시지 표시 안 함
    if (gapMinutes < 20) {
      return null;
    }

    // 과거 날짜
    if (dateStatus === 'past') {
      return '지나간 순간들';
    }

    // 미래 날짜
    if (dateStatus === 'future') {
      return '준비하세요';
    }

    // 오늘
    if (dateStatus === 'today') {
      // 현재 할일이 끝났는지 확인
      if (!endTime) {
        return null;
      }

      const nowHour = currentTime.getHours();
      const nowMinute = currentTime.getMinutes();
      const nowTimeOfDay = nowHour * 60 + nowMinute;

      const endHour = endTime.getHours();
      const endMinute = endTime.getMinutes();
      const endTimeOfDay = endHour * 60 + endMinute;

      // 아직 현재 할일 진행 중
      if (nowTimeOfDay < endTimeOfDay) {
        return null;
      }

      // 다음 할일 시작 시간 확인
      const nextStartTime = nextItem.startTime ? new Date(nextItem.startTime) : null;
      if (!nextStartTime) {
        return null;
      }

      const nextStartHour = nextStartTime.getHours();
      const nextStartMinute = nextStartTime.getMinutes();
      const nextStartTimeOfDay = nextStartHour * 60 + nextStartMinute;

      // 다음 할일까지 남은 시간
      const remainingGap = nextStartTimeOfDay - nowTimeOfDay;

      if (remainingGap > 0) {
        // ✅ 1시간(60분) 이상이면 시간+분 형식으로 표시
        const hours = Math.floor(remainingGap / 60);
        const minutes = remainingGap % 60;

        if (hours > 0) {
          return minutes > 0
            ? `다음 일정까지 남은 시간 ${hours}시간 ${minutes}분`
            : `다음 일정까지 남은 시간 ${hours}시간`;
        }
        return `다음 일정까지 남은 시간 ${remainingGap}분`;
      } else if (remainingGap === 0) {
        return '다음 일정 시작!';
      } else {
        // ✅ "다음 일정 진행 중" → "지나간 순간들"로 변경
        return '지나간 순간들';
      }
    }

    return '당연히 쉬어야 할 시간';
  }, [nextItem, gapMinutes, dateStatus, currentTime, endTime]);

  return (
    <>
      {/* 클릭 가능한 영역: 버블 + 카드 전체 포함 (호버 효과도 포함) */}
      <div
        className={cn(
          'flex items-start gap-4',
          'cursor-pointer select-none transition-all',
          !isDragging && process.env.BUILD_TARGET === 'web' && 'hover:shadow-[0_0_12px_rgba(0,0,0,0.1)] rounded-lg'
        )}
        onClick={(e) => {
          // 체크박스 클릭이 아닐 때만 할일 수정 모달 열기
          const target = e.target as HTMLElement;
          if (!target.closest('.completion-checkbox')) {
            onTodoClick(item.id);
          }
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {/* 왼쪽: 버블 영역 */}
        <div className="flex flex-col relative" style={{ width: '64px', zIndex: isDragging ? 9999 : 20 }}>
          {/* 버블과 할일 카드가 정렬될 영역 */}
          <div ref={bubbleWrapperRef} className="relative flex items-center" style={{ height: `${bubbleHeight}px` }}>
            {/* 버블 뒤에 숨은 연결 막대 (버블과 동일한 높이) */}
            <div
              className="absolute w-1"
              style={{
                left: 'calc(50% - 2px)', // 버블 중심 정렬
                top: 0,
                height: `${bubbleHeight}px`,
                background: isDragging
                  ? (progressPercentage > 0 ? itemColor : THEME_COLORS.CONNECTOR)  // 드래그 중이어도 진행률 체크
                  : (progressPercentage > 0
                      ? `linear-gradient(to bottom, ${itemColor} 0%, ${itemColor} ${progressPercentage}%, ${THEME_COLORS.CONNECTOR} ${progressPercentage}%, ${THEME_COLORS.CONNECTOR} 100%)`
                      : THEME_COLORS.CONNECTOR),
                zIndex: 1, // 버블 뒤로 배치
              }}
            />

            {/* 버블 아이콘 (드래그 시 fixed positioning) */}
            <div
              className="flex items-center justify-center"
              style={{
                position: isDragging && bubbleFixedPosition ? 'fixed' : 'absolute',
                left: isDragging && bubbleFixedPosition ? `${bubbleFixedPosition.left}px` : 0,
                top: isDragging && bubbleFixedPosition ? `${bubbleFixedPosition.top}px` : 0,
                width: `${bubbleWidth}px`,
                height: `${bubbleHeight}px`,
                transform: !isDragging ? undefined : undefined,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                zIndex: isDragging ? 9999 : 10, // 드래그 시 최상단 레이어, 일반 시 막대보다 앞에
              }}
            >
              {/* 버블 아이콘 */}
              <div
                className="flex items-center justify-center transition-all duration-300"
                style={bubbleStyle}
              >
                {/* 모든 모양에서 할일 아이콘 표시 */}
                <IconComponent className={cn('w-8 h-8', progressPercentage > 0 ? 'text-white' : 'text-gray-500')} />
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 할일 카드 (버블과 같은 높이로 정렬) */}
        <div
          className="flex items-center flex-1 min-w-0"
          style={{ height: `${bubbleHeight}px` }}
        >
          <div
            className={cn(
              "bg-timeline-bg rounded-lg w-full transition-all relative",
              isDragging && "opacity-0"
            )}
          >
            {/* 시간 표시 - 할일 제목 위 */}
            {startTime && endTime && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5 flex-wrap">
                <span>
                  {formatTime(startTime)}
                  {isPreviousDay && <span className="text-xs font-medium text-orange-600 dark:text-orange-400 ml-1">-1</span>}
                  {' ~ '}
                  {formatTime(endTime)}
                  {isNextDay && <span className="text-xs font-medium text-blue-600 dark:text-blue-400 ml-1">+1</span>}
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  ({(() => {
                    if (durationMinutes >= 60) {
                      const hours = Math.floor(durationMinutes / 60);
                      const minutes = durationMinutes % 60;
                      return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
                    }
                    return `${durationMinutes}분`;
                  })()})
                </span>
                {remainingMinutes !== null && remainingMinutes > 0 && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    ({(() => {
                      if (remainingMinutes >= 60) {
                        const hours = Math.floor(remainingMinutes / 60);
                        const minutes = remainingMinutes % 60;
                        return minutes > 0 ? `${hours}시간 ${minutes}분 남음` : `${hours}시간 남음`;
                      }
                      return `${remainingMinutes}분 남음`;
                    })()})
                  </span>
                )}
                {item.type === 'todo' && item.data.recurrence_pattern !== 'none' && (
                  <span>🔄</span>
                )}
              </div>
            )}

            {/* 제목과 동기부여 메시지 - 우측 패딩 추가 (버튼 공간 확보) */}
            <div className="flex items-center gap-3 w-full pr-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className={cn(
                    "font-medium text-base text-gray-900 dark:text-gray-100",
                    isCompleted && "line-through decoration-red-500 dark:decoration-red-400 decoration-2"
                  )}>
                    {item.title}
                  </h3>

                  {/* 동기부여 메시지 배지들 - 제목과 같은 라인에 표시 */}
                  {linkedMotivationMessages.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 ml-1 overflow-hidden">
                      <MotivationBadge
                        message={linkedMotivationMessages[0]}
                        variant="compact"
                        size="sm"
                        className="flex-1 min-w-0 max-w-none"
                      />
                      {linkedMotivationMessages.length > 1 && (
                        <div className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md flex-shrink-0">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            외 {linkedMotivationMessages.length - 1}개
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 메모 드롭다운 */}
            {linkedMemos.length > 0 && (
              <div className="relative mt-1.5" onClick={(e) => e.stopPropagation()}>
                <div className="dropdown dropdown-bottom">
                  <div
                    tabIndex={0}
                    role="button"
                    className="btn btn-ghost btn-xs gap-1 h-auto min-h-0 px-2 py-1"
                  >
                    <span className="text-xs">📝 {linkedMemos.length}</span>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div
                    tabIndex={0}
                    className="dropdown-content menu bg-base-100 rounded-box z-[1] w-72 p-3 shadow-lg border border-base-300 mt-1"
                  >
                    <div className="space-y-2">
                      {linkedMemos.map((memo) => (
                        <div
                          key={memo.id}
                          className={cn(
                            "p-2 rounded-md text-sm",
                            "bg-gray-50 dark:bg-gray-800",
                            memo.is_pinned && "border-l-4 border-blue-500"
                          )}
                        >
                          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {memo.content}
                          </div>
                          {memo.created_at && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(memo.created_at).toLocaleString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 완료 체크박스 - 카드 우측 중앙에 절대 위치 */}
            {item.type === 'todo' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(item.id);
                  }}
                  className={cn(
                    'completion-checkbox w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 relative overflow-hidden',
                    'transition-all duration-300 ease-out',
                    process.env.BUILD_TARGET === 'web' && 'hover:scale-110',
                    isCompleted
                      ? 'border-transparent text-white transform scale-105'
                      : 'bg-white'
                  )}
                  style={{
                    backgroundColor: isCompleted ? (item.color || THEME_COLORS.COMPLETED) : 'white',
                    borderColor: isCompleted ? 'transparent' : (item.color || THEME_COLORS.BORDER_DEFAULT)
                  }}
                >
                  {/* 체크마크 배경 채우기 효과 */}
                  <div
                    className={cn(
                      'absolute inset-0 rounded-full transition-all duration-500 ease-out',
                      isCompleted ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    )}
                    style={{
                      backgroundColor: item.color || THEME_COLORS.COMPLETED
                    }}
                  />

                  {/* 체크마크 */}
                  <Check
                    className={cn(
                      'w-4 h-4 text-white transition-all duration-700 ease-out transform relative z-10',
                      isCompleted
                        ? 'opacity-100 scale-100 rotate-0'
                        : 'opacity-0 scale-0 rotate-180'
                    )}
                    style={{
                      transitionDelay: isCompleted ? '200ms' : '0ms'
                    }}
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 연결 간격 공간 - 클릭 가능 영역 */}
      {nextItem && (
        <div
          className={cn(
            "relative flex items-start gap-4",
            // ✅ 미래 시간 간격이면 클릭 가능 (호버 효과 제거, 커서만 pointer)
            dateStatus === 'today' && connectorProgressPercentage < 100 && "cursor-pointer"
          )}
          onClick={() => {
            // ✅ 미래 시간 간격만 클릭 가능 (아직 시작 안 한 간격)
            if (dateStatus === 'today' && connectorProgressPercentage < 100 && onGapClick && endTime && nextItem.startTime) {
              onGapClick(endTime, new Date(nextItem.startTime));
            }
          }}
        >
          {/* 왼쪽: 간격 공간 (버블 너비와 동일) */}
          <div className="relative" style={{ width: '64px', height: `${connectorHeight}px` }}>
            {/* 연결 막대 (버블 중심 정렬, 시간 진행에 따라 색칠) */}
            <div
              className="absolute w-1"
              style={{
                left: 'calc(50% - 2px)', // 버블 중심 정렬
                top: 0,
                height: `${connectorHeight}px`,
                background: connectorGradient,
                zIndex: 0,
              }}
            />
          </div>
          {/* 오른쪽: 간격 정보 표시 */}
          <div className="flex-1 flex items-center" style={{ height: `${connectorHeight}px` }}>
            {gapMessage && (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic px-2">
                {gapMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 드래그 중 시간 표시 (fixed position으로 항상 위에 표시) */}
      {isDragging && bubbleFixedPosition && displayStartTime && (
        <div
          className="text-xs font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300"
          style={{
            position: 'fixed',
            left: `${bubbleFixedPosition.centerX}px`,
            top: `${bubbleFixedPosition.top - 30}px`,
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '4px 10px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {formatTime(displayStartTime)}
        </div>
      )}

      {isDragging && bubbleFixedPosition && displayEndTime && (
        <div
          className="text-xs font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300"
          style={{
            position: 'fixed',
            left: `${bubbleFixedPosition.centerX}px`,
            top: `${bubbleFixedPosition.top + bubbleHeight + 8}px`,
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '4px 10px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {formatTime(displayEndTime)}
        </div>
      )}
    </>
  );
};
