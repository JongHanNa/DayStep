'use client';

import { useMemo } from 'react';
import { parseISO, isSameDay, format } from 'date-fns';
import { ko } from 'date-fns/locale';

import { useGoogleCalendarStore } from '@/state/stores/googleCalendarStore';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import type { CalendarEvent, TimelineCalendarEvent } from '@/types/calendar';
import type { TimelineItem } from '@/types/timeline-view';

export interface TimelineWithCalendarData {
  /** 모든 타임라인 아이템 (기존 할일 + 캘린더 이벤트) */
  allItems: TimelineItem[];
  /** 종일 아이템들 (기존 종일 할일 + 종일 캘린더 이벤트) */
  allDayItems: TimelineItem[];
  /** 시간 지정 아이템들 (기존 시간 할일 + 시간 지정 캘린더 이벤트) */
  timedItems: TimelineItem[];
  /** 캘린더 이벤트만 분리된 데이터 */
  calendarEvents: {
    allDay: TimelineItem[];
    timed: TimelineItem[];
    total: number;
  };
  /** 캘린더 연동 상태 */
  calendarStatus: {
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    lastSyncTime: Date | null;
  };
}

/**
 * Google Calendar 이벤트를 타임라인 시스템에 통합하는 훅
 *
 * @param selectedDate - 선택된 날짜
 * @returns 캘린더 이벤트가 통합된 타임라인 데이터
 */
export function useTimelineWithCalendar(selectedDate: Date): TimelineWithCalendarData {
  // Google Calendar 스토어에서 이벤트와 상태 가져오기
  const {
    events: calendarEvents,
    isAuthenticated,
    isLoading,
    error,
    lastSyncTime
  } = useGoogleCalendarStore();

  // console.log('🔍 [Debug] useTimelineWithCalendar 호출됨:', {
  //   selectedDate: selectedDate.toISOString(),
  //   calendarEventsCount: calendarEvents.length,
  //   isAuthenticated,
  //   isLoading,
  //   error,
  //   lastSyncTime,
  //   calendarEventsPreview: calendarEvents.slice(0, 3).map(e => ({
  //     id: e.id,
  //     title: e.title,
  //     start: e.start,
  //     end: e.end,
  //     calendarId: e.calendarId
  //   }))
  // });

  // 기존 타임라인 데이터 가져오기
  const { getFilteredAndSortedItems } = useTimelineViewStore();

  // 선택된 날짜의 기존 타임라인 아이템들 가져오기
  const existingTimelineItems = useMemo(() => {
    const items = getFilteredAndSortedItems();
    console.log('🔍 [Debug] 기존 타임라인 아이템들:', {
      existingItemsCount: items.length,
      existingItemsPreview: items.slice(0, 3).map(item => ({
        id: item.id,
        type: item.type,
        title: item.title
      }))
    });
    return items;
  }, [getFilteredAndSortedItems]);

  // 선택된 날짜의 캘린더 이벤트들 필터링
  const dateFilteredCalendarEvents = useMemo(() => {
    console.log('🔍 [Debug] 날짜 필터링 시작:', {
      selectedDate: selectedDate.toISOString(),
      totalCalendarEvents: calendarEvents.length
    });

    if (!calendarEvents.length) {
      console.log('⚠️ [Debug] 캘린더 이벤트가 없음');
      return [];
    }

    const filtered = calendarEvents.filter(event => {
      try {
        const eventStart = parseISO(event.start);
        const isSame = isSameDay(eventStart, selectedDate);

        console.log('🔍 [Debug] 이벤트 날짜 비교:', {
          eventTitle: event.title,
          eventStart: event.start,
          eventStartParsed: eventStart.toISOString(),
          selectedDate: selectedDate.toISOString(),
          isSameDay: isSame
        });

        return isSame;
      } catch (error) {
        console.warn('Invalid calendar event date:', event.start, error);
        return false;
      }
    });

    console.log('🔍 [Debug] 날짜 필터링 완료:', {
      filteredEventsCount: filtered.length,
      filteredEventsPreview: filtered.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end
      }))
    });

    return filtered;
  }, [calendarEvents, selectedDate]);

  // 캘린더 이벤트를 타임라인 아이템 형태로 변환
  const convertedCalendarEvents = useMemo(() => {
    console.log('🔄 [Debug] 캘린더 이벤트 변환 시작:', {
      dateFilteredEventsCount: dateFilteredCalendarEvents.length
    });

    const converted = dateFilteredCalendarEvents.map((event: CalendarEvent): TimelineItem => {
      const startTime = parseISO(event.start);
      const endTime = parseISO(event.end);

      const timelineItem = {
        // TimelineItem 필수 필드들
        id: `calendar-${event.id}`,
        type: 'calendar' as const,
        title: event.title,
        description: event.description,
        startTime: startTime,
        endTime: endTime,
        isAllDay: event.isAllDay,
        color: getEventColor(event.calendarId),
        userId: '', // 캘린더 이벤트는 userId가 없음
        createdAt: new Date(),
        updatedAt: new Date(),
        data: event,

        // 캘린더 특화 정보
        source: 'google_calendar',
        calendarName: getCalendarName(event.calendarId),
        priority: 'medium' as const
      };

      console.log('🔄 [Debug] 이벤트 변환 완료:', {
        originalEvent: {
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          isAllDay: event.isAllDay
        },
        convertedItem: {
          id: timelineItem.id,
          type: timelineItem.type,
          title: timelineItem.title,
          startTime: timelineItem.startTime.toISOString(),
          endTime: timelineItem.endTime.toISOString(),
          isAllDay: timelineItem.isAllDay
        }
      });

      return timelineItem;
    });

    console.log('✅ [Debug] 캘린더 이벤트 변환 완료:', {
      convertedEventsCount: converted.length,
      convertedEventsPreview: converted.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        isAllDay: item.isAllDay
      }))
    });

    return converted;
  }, [dateFilteredCalendarEvents]);

  // 종일 이벤트와 시간 지정 이벤트 분리
  const { allDayCalendarEvents, timedCalendarEvents } = useMemo(() => {
    const allDay: TimelineItem[] = [];
    const timed: TimelineItem[] = [];

    convertedCalendarEvents.forEach(event => {
      if (event.isAllDay) {
        allDay.push(event);
      } else {
        timed.push(event);
      }
    });

    return {
      allDayCalendarEvents: allDay,
      timedCalendarEvents: timed
    };
  }, [convertedCalendarEvents]);

  // 기존 타임라인 아이템들을 종일/시간 지정으로 분리
  const { existingAllDayItems, existingTimedItems } = useMemo(() => {
    const allDay: TimelineItem[] = [];
    const timed: TimelineItem[] = [];

    existingTimelineItems.forEach(item => {
      if (item.isAllDay) {
        allDay.push(item);
      } else {
        timed.push(item);
      }
    });

    return {
      existingAllDayItems: allDay,
      existingTimedItems: timed
    };
  }, [existingTimelineItems]);

  // 통합된 타임라인 데이터 생성
  const integratedTimelineData = useMemo((): TimelineWithCalendarData => {
    // 종일 아이템들 통합 (기존 종일 할일 + 종일 캘린더 이벤트)
    const allDayItems: TimelineItem[] = [
      ...existingAllDayItems,
      ...allDayCalendarEvents
    ].sort((a, b) => {
      // 우선순위 기준 정렬: high > medium > low
      const priorityOrder = { high: 3, medium: 2, low: 1 };

      // 타입 안전하게 priority 속성 접근
      const aPriority = (() => {
        if (a.type === 'todo' || a.type === 'timeline-task' || a.type === 'calendar') {
          return priorityOrder[(a as any).priority as keyof typeof priorityOrder] || 2; // medium 기본값
        }
        return 2; // medium 기본값
      })();

      const bPriority = (() => {
        if (b.type === 'todo' || b.type === 'timeline-task' || b.type === 'calendar') {
          return priorityOrder[(b as any).priority as keyof typeof priorityOrder] || 2; // medium 기본값
        }
        return 2; // medium 기본값
      })();

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // 높은 우선순위가 위로
      }

      // 우선순위가 같으면 제목 알파벳 순
      return a.title.localeCompare(b.title, 'ko');
    });

    // 시간 지정 아이템들 통합 (기존 시간 할일 + 시간 지정 캘린더 이벤트)
    const timedItems: TimelineItem[] = [
      ...existingTimedItems,
      ...timedCalendarEvents
    ].sort((a, b) => {
      // 시간 순으로 정렬
      const aTime = a.startTime;
      const bTime = b.startTime;

      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;

      try {
        const aDate = aTime instanceof Date ? aTime : new Date(aTime);
        const bDate = bTime instanceof Date ? bTime : new Date(bTime);
        return aDate.getTime() - bDate.getTime();
      } catch {
        return 0;
      }
    });

    // 모든 아이템들 통합
    const allItems: TimelineItem[] = [...allDayItems, ...timedItems];

    return {
      allItems,
      allDayItems,
      timedItems,
      calendarEvents: {
        allDay: allDayCalendarEvents,
        timed: timedCalendarEvents,
        total: convertedCalendarEvents.length
      },
      calendarStatus: {
        isConnected: isAuthenticated,
        isLoading,
        error,
        lastSyncTime
      }
    };
  }, [
    existingAllDayItems,
    existingTimedItems,
    allDayCalendarEvents,
    timedCalendarEvents,
    convertedCalendarEvents.length,
    isAuthenticated,
    isLoading,
    error,
    lastSyncTime
  ]);

  return integratedTimelineData;
}

/**
 * 캘린더 ID를 기반으로 캘린더 이름을 가져오는 헬퍼 함수
 */
function getCalendarName(calendarId: string): string {
  // Google Calendar Store에서 캘린더 정보를 가져와 이름 반환
  const { calendars } = useGoogleCalendarStore.getState();
  const calendar = calendars.find(cal => cal.id === calendarId);
  return calendar?.name || '알 수 없는 캘린더';
}

/**
 * 캘린더 ID를 기반으로 이벤트 색상을 가져오는 헬퍼 함수
 */
function getEventColor(calendarId: string): string {
  // Google Calendar Store에서 캘린더 정보를 가져와 색상 반환
  const { calendars } = useGoogleCalendarStore.getState();
  const calendar = calendars.find(cal => cal.id === calendarId);
  return calendar?.backgroundColor || '#4285F4'; // Google 기본 파란색
}

/**
 * 날짜별 캘린더 이벤트 요약 정보를 제공하는 헬퍼 훅
 */
export function useCalendarEventsSummary(selectedDate: Date) {
  const { events } = useGoogleCalendarStore();

  return useMemo(() => {
    const dayEvents = events.filter(event => {
      try {
        const eventDate = parseISO(event.start);
        return isSameDay(eventDate, selectedDate);
      } catch {
        return false;
      }
    });

    const allDayEvents = dayEvents.filter(event => event.isAllDay);
    const timedEvents = dayEvents.filter(event => !event.isAllDay);

    return {
      total: dayEvents.length,
      allDay: allDayEvents.length,
      timed: timedEvents.length,
      events: dayEvents,
      isEmpty: dayEvents.length === 0
    };
  }, [events, selectedDate]);
}