'use client';

import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { CalendarEvent } from '@/types/calendar';

interface CalendarEventCardProps {
  /** 캘린더 이벤트 데이터 */
  event: CalendarEvent;
  /** 종일 이벤트 여부 */
  isAllDay?: boolean;
  /** 컴팩트 모드 (작은 화면용) */
  compact?: boolean;
  /** 클릭 핸들러 */
  onClick?: () => void;
}

/**
 * Google Calendar 이벤트를 표시하는 카드 컴포넌트
 * DayStep의 소프트 미니멀리즘 디자인에 맞춰 구현
 */
export function CalendarEventCard({
  event,
  isAllDay = false,
  compact = false,
  onClick
}: CalendarEventCardProps) {
  const startDate = parseISO(event.start);
  const endDate = parseISO(event.end);

  return (
    <div
      className={`
        bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200
        border-l-4 border-blue-500
        ${compact ? 'p-2' : 'p-3'}
        ${onClick ? 'cursor-pointer hover:bg-card/80' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start gap-3">
        {/* 구글 캘린더 인디케이터 */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* 카테고리 표시 */}
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              구글 캘린더
            </span>
          </div>
        </div>
      </div>

      {/* 이벤트 내용 */}
      <div className="space-y-2">
        {/* 제목 */}
        <h3 className={`
          font-medium text-foreground truncate
          ${compact ? 'text-sm' : 'text-sm'}
        `}>
          {event.title}
        </h3>

        {/* 시간 정보 */}
        {!isAllDay && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>
              {format(startDate, 'HH:mm', { locale: ko })}
              {' - '}
              {format(endDate, 'HH:mm', { locale: ko })}
            </span>
          </div>
        )}

        {/* 위치 정보 */}
        {event.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate" title={event.location}>
              {event.location}
            </span>
          </div>
        )}

        {/* 참석자 정보 (컴팩트 모드가 아닐 때만) */}
        {!compact && event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3 h-3 flex-shrink-0" />
            <span>
              {event.attendees.length}명 참석
            </span>
          </div>
        )}

        {/* 설명 (컴팩트 모드가 아니고 설명이 있을 때만) */}
        {!compact && event.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}

        {/* 종일 이벤트 표시 */}
        {isAllDay && (
          <div className="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-950/30 rounded-md">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              종일
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 다수의 캘린더 이벤트를 리스트로 표시하는 컴포넌트
 */
interface CalendarEventsListProps {
  /** 이벤트 목록 */
  events: CalendarEvent[];
  /** 제목 */
  title?: string;
  /** 빈 상태 메시지 */
  emptyMessage?: string;
  /** 컴팩트 모드 */
  compact?: boolean;
  /** 이벤트 클릭 핸들러 */
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarEventsList({
  events,
  title = "캘린더 이벤트",
  emptyMessage = "연결된 캘린더에 이벤트가 없습니다.",
  compact = false,
  onEventClick
}: CalendarEventsListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold text-foreground">
          {title}
        </h3>
      )}

      <div className="space-y-2">
        {events.map((event) => (
          <CalendarEventCard
            key={event.id}
            event={event}
            isAllDay={event.isAllDay}
            compact={compact}
            onClick={onEventClick ? () => onEventClick(event) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 캘린더 이벤트 요약 통계를 표시하는 컴포넌트
 */
interface CalendarEventsSummaryProps {
  /** 이벤트 목록 */
  events: CalendarEvent[];
  /** 선택된 날짜 */
  selectedDate?: Date;
}

export function CalendarEventsSummary({ events, selectedDate }: CalendarEventsSummaryProps) {
  const allDayEvents = events.filter(event => event.isAllDay);
  const timedEvents = events.filter(event => !event.isAllDay);

  const dateStr = selectedDate
    ? format(selectedDate, 'M월 d일', { locale: ko })
    : '오늘';

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-blue-600" />
        <h4 className="font-medium text-blue-900 dark:text-blue-100">
          {dateStr} 캘린더 일정
        </h4>
      </div>

      <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
        {allDayEvents.length > 0 && (
          <p>종일 일정 {allDayEvents.length}개</p>
        )}
        {timedEvents.length > 0 && (
          <p>시간 지정 일정 {timedEvents.length}개</p>
        )}
        {events.length === 0 && (
          <p className="text-blue-600 dark:text-blue-400">일정이 없습니다</p>
        )}
      </div>
    </div>
  );
}