import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { format, isToday, startOfMonth, differenceInMonths, getDate, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTodoStore } from '@/state/stores/todoStore';
import { isRecurringTodo } from '@/lib/recurrence-utils';
import type { TimelineItem } from '../types';
import { DAY_NAMES } from '../types';

interface UseTimelineNavigationParams {
  userId: string;
  isLoading: boolean;
  dateRange: { rangeStart: Date; rangeEnd: Date };
  recurrenceInstances: TimelineItem[];
  pastMonthsLoaded: number;
  futureMonthsLoaded: number;
  setPastMonthsLoaded: React.Dispatch<React.SetStateAction<number>>;
  setFutureMonthsLoaded: React.Dispatch<React.SetStateAction<number>>;
}

export function useTimelineNavigation({
  userId,
  isLoading,
  dateRange,
  recurrenceInstances,
}: UseTimelineNavigationParams) {
  const { todos } = useTodoStore();

  const [navigatedMonth, setNavigatedMonth] = useState<Date>(new Date());
  const [viewAnchorMonth, setViewAnchorMonth] = useState<Date>(startOfMonth(new Date()));
  const [hasScrolledToToday, setHasScrolledToToday] = useState(false);
  const [isScrollReady, setIsScrollReady] = useState(false);
  const [expandedFuelId, setExpandedFuelId] = useState<string | null>(null);

  // Refs
  const monthSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const todaySectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loggedOngoingTasksRef = useRef<Set<string>>(new Set());

  // userId 변경 시 스크롤 상태 초기화
  useEffect(() => {
    setHasScrolledToToday(false);
    setIsScrollReady(false);
  }, [userId]);

  // 할일의 표시 날짜 결정
  const getDisplayDate = useCallback((item: TimelineItem): Date => {
    if (item.startTime instanceof Date) {
      return item.startTime;
    }
    if (item.createdAt instanceof Date) {
      return item.createdAt;
    }
    return new Date();
  }, []);

  // 타임라인 아이템 생성 (일반 할일 + 반복 인스턴스 병합)
  const timelineItems = useMemo(() => {
    const nonRecurringItems: TimelineItem[] = todos
      .filter(todo => {
        if (isRecurringTodo(todo)) return false;
        if (todo.parentTodoId) return false;
        if (!todo.startTime) return false;
        const todoDate = new Date(todo.startTime);
        return todoDate >= dateRange.rangeStart && todoDate <= dateRange.rangeEnd;
      })
      .map(todo => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        startTime: todo.startTime,
        endTime: todo.endTime,
        scheduleType: todo.scheduleType || 'timed',
        createdAt: todo.createdAt,
        projectId: todo.projectId,
        goalId: todo.goalId,
        departmentId: todo.departmentId,
        icon: todo.icon,
        color: todo.color,
        orderIndex: todo.orderIndex,
        recurrencePattern: todo.recurrencePattern,
        recurrenceInterval: todo.recurrenceInterval,
        recurrenceEndDate: todo.recurrenceEndDate,
        recurrenceCount: todo.recurrenceCount,
        recurrenceDaysOfWeek: todo.recurrenceDaysOfWeek,
        isRecurrenceInstance: false,
        skipStatus: todo.skipStatus as 'not_needed' | 'missed' | null | undefined,
        originalTodo: todo,
        originalStartTime: todo.originalStartTime?.toISOString(),
        originalEndTime: todo.originalEndTime?.toISOString()
      }));

    const allItems = [...nonRecurringItems, ...recurrenceInstances];

    return allItems.sort((a, b) => {
      const dateA = getDisplayDate(a).getTime();
      const dateB = getDisplayDate(b).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    });
  }, [todos, recurrenceInstances, dateRange.rangeStart, dateRange.rangeEnd, getDisplayDate]);

  // 월별 > 날짜별 그룹핑
  const groupedByMonth = useMemo(() => {
    const monthGroups: Record<string, Record<string, { date: Date; items: TimelineItem[] }>> = {};

    timelineItems.forEach(item => {
      const date = getDisplayDate(item);
      const monthKey = format(date, 'yyyy년 M월', { locale: ko });
      const dayNumber = getDate(date);
      const dayOfWeek = DAY_NAMES[getDay(date)];
      const dayKey = `${dayNumber}_${dayOfWeek}`;

      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = {};
      }
      if (!monthGroups[monthKey][dayKey]) {
        monthGroups[monthKey][dayKey] = { date, items: [] };
      }
      monthGroups[monthKey][dayKey].items.push(item);
    });

    // 오늘 날짜 섹션 보장
    const today = new Date();
    const todayMonthKey = format(today, 'yyyy년 M월', { locale: ko });
    const todayDayNumber = getDate(today);
    const todayDayOfWeek = DAY_NAMES[getDay(today)];
    const todayDayKey = `${todayDayNumber}_${todayDayOfWeek}`;

    if (!monthGroups[todayMonthKey]) {
      monthGroups[todayMonthKey] = {};
    }
    if (!monthGroups[todayMonthKey][todayDayKey]) {
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      monthGroups[todayMonthKey][todayDayKey] = {
        date: todayDate,
        items: []
      };
    }

    return monthGroups;
  }, [timelineItems, getDisplayDate]);

  // 월별 키 목록 (정렬됨)
  const sortedMonthKeys = useMemo(() => {
    return Object.keys(groupedByMonth).sort((a, b) => {
      const parseMonthKey = (key: string) => {
        const match = key.match(/(\d+)년 (\d+)월/);
        if (match) {
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1);
        }
        return new Date();
      };
      return parseMonthKey(a).getTime() - parseMonthKey(b).getTime();
    });
  }, [groupedByMonth]);

  // View Anchor 기반 가시 월 키
  const visibleMonthKeys = useMemo(() => {
    const anchorKey = format(viewAnchorMonth, 'yyyy년 M월', { locale: ko });
    const anchorIndex = sortedMonthKeys.indexOf(anchorKey);
    if (anchorIndex < 0) return sortedMonthKeys;
    return sortedMonthKeys.slice(anchorIndex);
  }, [sortedMonthKeys, viewAnchorMonth]);

  // 오늘로 이동
  const handleTodayClick = useCallback(() => {
    const today = new Date();
    setViewAnchorMonth(startOfMonth(today));
    setNavigatedMonth(today);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const todayStr = format(today, 'yyyy-MM-dd');
        const todayEl = todaySectionRef.current
          || document.querySelector(`[data-date="${todayStr}"]`) as HTMLElement;
        if (todayEl) {
          todayEl.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
        }
      });
    });
  }, []);

  // 월 변경 핸들러 (View Anchor 패턴)
  const handleMonthChange = useCallback((date: Date) => {
    const targetMonth = startOfMonth(date);

    // 범위 확장은 오케스트레이터에서 처리
    setViewAnchorMonth(targetMonth);
    setNavigatedMonth(date);

    requestAnimationFrame(() => {
      const scrollContainer = document.querySelector('.overflow-y-auto') as HTMLElement;
      if (scrollContainer) scrollContainer.scrollTop = 0;
    });
  }, []);

  // 첫 로드 시 오늘 날짜로 이동
  useEffect(() => {
    if (isLoading || hasScrolledToToday) return;

    const today = new Date();
    setViewAnchorMonth(startOfMonth(today));
    setNavigatedMonth(today);

    const timer = setTimeout(() => {
      const todayStr = format(today, 'yyyy-MM-dd');
      const todayEl = todaySectionRef.current
        || document.querySelector(`[data-date="${todayStr}"]`) as HTMLElement;
      if (todayEl) {
        todayEl.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
      }
      setHasScrolledToToday(true);
      setIsScrollReady(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [isLoading, hasScrolledToToday]);

  // IntersectionObserver로 현재 보이는 월 감지
  useEffect(() => {
    if (!isScrollReady || visibleMonthKeys.length === 0) return;

    const visibleMonths = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const monthKey = entry.target.getAttribute('data-month-key');
          if (!monthKey) return;
          if (entry.isIntersecting) {
            visibleMonths.set(monthKey, entry.intersectionRatio);
          } else {
            visibleMonths.delete(monthKey);
          }
        });

        if (visibleMonths.size > 0) {
          for (const monthKey of visibleMonthKeys) {
            if (visibleMonths.has(monthKey)) {
              const match = monthKey.match(/(\d+)년 (\d+)월/);
              if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                setNavigatedMonth(new Date(year, month, 1));
              }
              break;
            }
          }
        }
      },
      {
        root: null,
        rootMargin: '-80px 0px -50% 0px',
        threshold: [0, 0.1, 0.5, 1]
      }
    );

    visibleMonthKeys.forEach((monthKey) => {
      const element = monthSectionRefs.current[monthKey];
      if (element) {
        element.setAttribute('data-month-key', monthKey);
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [isScrollReady, visibleMonthKeys]);

  // 현재 범위 정보 텍스트
  const rangeInfoText = useMemo(() => {
    const startText = format(dateRange.rangeStart, 'yyyy년 M월');
    const endText = format(dateRange.rangeEnd, 'yyyy년 M월');
    return `${startText} ~ ${endText}`;
  }, [dateRange]);

  return {
    // State
    navigatedMonth,
    viewAnchorMonth,
    isScrollReady,
    expandedFuelId,
    // Setters
    setNavigatedMonth,
    setViewAnchorMonth,
    setExpandedFuelId,
    // Refs
    monthSectionRefs,
    todaySectionRef,
    scrollContainerRef,
    loggedOngoingTasksRef,
    // Memos
    timelineItems,
    groupedByMonth,
    sortedMonthKeys,
    visibleMonthKeys,
    rangeInfoText,
    // Callbacks
    getDisplayDate,
    handleTodayClick,
    handleMonthChange,
  };
}
