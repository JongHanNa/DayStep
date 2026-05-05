import React from 'react';
import {Text, View} from 'react-native';
import type {GoogleCalendarEvent} from '@/lib/googleCalendarApi';

interface CalendarEventChipProps {
  event: GoogleCalendarEvent;
}

export function CalendarEventChip({event}: CalendarEventChipProps) {
  const color = event.color || '#4285F4';
  const bg = `${color}15`; // 연한 배경 (9% opacity)

  return (
    <View
      className="rounded mb-0.5 overflow-hidden"
      style={{
        backgroundColor: bg,
        borderLeftWidth: 2,
        borderLeftColor: color,
        paddingLeft: 2,
        paddingRight: 4,
      }}>
      <Text
        numberOfLines={1}
        style={{fontSize: 9, color, fontWeight: '500'}}>
        {event.title}
      </Text>
    </View>
  );
}
