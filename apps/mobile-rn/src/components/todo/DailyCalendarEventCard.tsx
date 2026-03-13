import React from 'react';
import {Text, View, StyleSheet} from 'react-native';
import type {GoogleCalendarEvent} from '@/lib/googleCalendarApi';
import {format, parseISO} from 'date-fns';

interface DailyCalendarEventCardProps {
  event: GoogleCalendarEvent;
}

export function DailyCalendarEventCard({event}: DailyCalendarEventCardProps) {
  const color = event.color || '#4285F4';

  const timeLabel = event.isAllDay
    ? '종일'
    : `${format(parseISO(event.start), 'HH:mm')} - ${format(parseISO(event.end), 'HH:mm')}`;

  return (
    <View style={[styles.container, {backgroundColor: `${color}10`}]}>
      <View style={[styles.colorBar, {backgroundColor: color}]} />
      <View style={styles.content}>
        <Text style={[styles.time, {color}]}>{timeLabel}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
  },
  colorBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
});
