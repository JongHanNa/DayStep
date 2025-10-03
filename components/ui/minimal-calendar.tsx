'use client';

import React from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MinimalCalendarProps {
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
  accentColor?: string;
  className?: string;
}

export function MinimalCalendar({
  selectedDate,
  onDateSelect,
  accentColor = '#DBAC6C',
  className
}: MinimalCalendarProps) {
  const selected = selectedDate ? new Date(selectedDate) : undefined;

  const handleDayClick = (date: Date | undefined) => {
    if (date && onDateSelect) {
      onDateSelect(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={handleDayClick}
      locale={ko}
      showOutsideDays={false}
      fixedWeeks={false}
      className={cn("minimal-calendar", className)}
      components={{
        IconLeft: () => (
          <ChevronLeft
            style={{
              color: accentColor,
              width: 'clamp(16px, 4vw, 20px)',
              height: 'clamp(16px, 4vw, 20px)'
            }}
          />
        ),
        IconRight: () => (
          <ChevronRight
            style={{
              color: accentColor,
              width: 'clamp(16px, 4vw, 20px)',
              height: 'clamp(16px, 4vw, 20px)'
            }}
          />
        ),
      }}
      styles={{
        root: {
          '--rdp-cell-size': 'clamp(36px, 10vw, 44px)',
          '--rdp-caption-font-size': 'clamp(16px, 4vw, 18px)',
          '--rdp-accent-color': accentColor,
          '--rdp-background-color': 'white',
          '--rdp-accent-color-dark': accentColor,
          '--rdp-background-color-dark': 'white',
          '--rdp-outline': `2px solid ${accentColor}`,
          '--rdp-outline-selected': `2px solid ${accentColor}`,
          fontSize: 'clamp(13px, 3.5vw, 14px)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          width: '100%',
          maxWidth: '320px',
          margin: '0 auto',
        } as React.CSSProperties,
        months: {
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        },
        month: {
          margin: 0,
          width: '100%',
        },
        caption: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'clamp(12px, 3vw, 16px) 0',
          marginBottom: 'clamp(6px, 2vw, 8px)',
        },
        caption_label: {
          fontSize: 'clamp(16px, 4vw, 18px)',
          fontWeight: 'bold',
          color: '#1f2937',
        },
        nav: {
          display: 'flex',
          gap: 'clamp(6px, 2vw, 8px)',
        },
        nav_button: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'clamp(28px, 8vw, 32px)',
          height: 'clamp(28px, 8vw, 32px)',
          borderRadius: 'clamp(6px, 2vw, 8px)',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          minWidth: '28px',
          minHeight: '28px',
        },
        nav_button_previous: {
          order: -1,
        },
        nav_button_next: {
          order: 1,
        },
        table: {
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        },
        head: {
          marginBottom: 'clamp(6px, 2vw, 8px)',
        },
        head_row: {
          display: 'flex',
          width: '100%',
          marginBottom: 'clamp(6px, 2vw, 8px)',
        },
        head_cell: {
          flex: 1,
          textAlign: 'center',
          fontSize: 'clamp(11px, 3vw, 12px)',
          fontWeight: '500',
          color: '#9ca3af',
          padding: 'clamp(6px, 2vw, 8px) 0',
          minWidth: 0,
        },
        tbody: {
          width: '100%',
        },
        row: {
          display: 'flex',
          width: '100%',
          marginBottom: 'clamp(2px, 1vw, 4px)',
        },
        cell: {
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(1px, 0.5vw, 2px)',
          minWidth: 0,
        },
        day: {
          width: 'clamp(36px, 10vw, 44px)',
          height: 'clamp(36px, 10vw, 44px)',
          borderRadius: 'clamp(8px, 2.5vw, 12px)',
          border: 'none',
          background: 'transparent',
          fontSize: 'clamp(13px, 3.5vw, 14px)',
          fontWeight: '500',
          color: '#374151',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '36px',
          minHeight: '36px',
          // 터치 영역 확대 (모바일 최적화)
          touchAction: 'manipulation',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        },
      }}
      modifiers={{
        today: new Date(),
      }}
      modifiersStyles={{
        today: {
          backgroundColor: '#f3f4f6',
          color: '#374151',
          fontWeight: '600',
        },
        selected: {
          backgroundColor: accentColor,
          color: 'white',
          fontWeight: '600',
        },
      }}
    />
  );
}