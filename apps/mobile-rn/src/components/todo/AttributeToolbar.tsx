/**
 * AttributeToolbar
 * 할일 속성 요약 가로 스크롤 툴바
 * 각 칩: lucide 아이콘 + 현재값, 누르면 서브시트 열림
 */
import React, {useRef} from 'react';
import {ScrollView, View, Text, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {format, parseISO, isToday, isTomorrow} from 'date-fns';
import {ko} from 'date-fns/locale';
import {getAlarmsLabel} from '@/lib/notifications';
import {
  Calendar,
  Clock,
  Bell,
  Repeat,
  Flag,
  Sparkles,
  Palette,
} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';
import {fixedColors} from '@/theme/colors';

// ============================================
// Types
// ============================================

export type AnchorRect = {x: number; y: number; width: number; height: number};

type ScheduleType = 'anytime' | 'timed' | 'all_day';
type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly';

interface ToolbarForm {
  scheduledDate: string;
  scheduleType: ScheduleType;
  startTime: Date | null;
  endTime: Date | null;
  anytimeDuration: number | null;
  alarmOffsets: number[];
  recurrencePattern: RecurrencePattern;
  recurrenceDaysOfWeek: number[];
  importance: boolean;
  urgency: boolean;
  color?: string;
}

interface AttributeToolbarProps {
  form: ToolbarForm;
  onDatePress: () => void;
  onPriorityPress: (anchor: AnchorRect) => void;
  onIconPress?: (anchor: AnchorRect) => void;
  onColorPress?: (anchor: AnchorRect) => void;
  // Legacy: 기존 Edit 모드에서 사용 (서브시트 직접 열기)
  onTimePress?: () => void;
  onAlarmPress?: () => void;
  onRecurrencePress?: () => void;
  /** true면 compact 모드 (Create), false면 기존 5-chip 모드 (Edit) */
  compact?: boolean;
}

// ============================================
// Helpers
// ============================================

function getDateChipLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return '오늘';
  if (isTomorrow(date)) return '내일';
  return format(date, 'M/d (EEE)', {locale: ko});
}

function getTimeChipLabel(form: ToolbarForm): string {
  if (form.scheduleType === 'timed' && form.startTime) {
    const start = format(form.startTime, 'HH:mm');
    const end = form.endTime ? format(form.endTime, 'HH:mm') : '';
    return end ? `${start}~${end}` : start;
  }
  if (form.scheduleType === 'all_day') return '종일';
  return '언제든지';
}

function getRecurrenceChipLabel(form: ToolbarForm): string {
  if (form.recurrencePattern === 'daily') return '매일';
  if (form.recurrencePattern === 'weekly') {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const days = form.recurrenceDaysOfWeek
      .sort()
      .map(d => dayNames[d])
      .join(',');
    return days ? `매주 ${days}` : '매주';
  }
  if (form.recurrencePattern === 'monthly') return '매월';
  return '없음';
}

function getPriorityChipLabel(form: ToolbarForm): string {
  if (form.importance && form.urgency) return '긴급+중요';
  if (form.importance) return '중요';
  if (form.urgency) return '긴급';
  return '보통';
}

function getPriorityChipStyle(form: ToolbarForm): {bg: string; border: string; text: string} {
  if (form.importance && form.urgency) return {bg: '#FEF2F2', border: fixedColors.priorityReluctant, text: '#DC2626'};
  if (form.importance) return {bg: '#FFFBEB', border: fixedColors.priorityImportance, text: '#B45309'};
  if (form.urgency) return {bg: '#EFF6FF', border: fixedColors.priorityUrgency, text: '#1D4ED8'};
  return {bg: '#F3F4F6', border: 'transparent', text: '#4B5563'};
}

// ============================================
// Component
// ============================================

export function AttributeToolbar({
  form,
  onDatePress,
  onPriorityPress,
  onIconPress,
  onColorPress,
  onTimePress,
  onAlarmPress,
  onRecurrencePress,
  compact = false,
}: AttributeToolbarProps) {
  const priorityStyle = getPriorityChipStyle(form);
  const priorityChipRef = useRef<View>(null);
  const iconChipRef = useRef<View>(null);
  const colorChipRef = useRef<View>(null);

  const handlePriorityMeasure = () => {
    priorityChipRef.current?.measureInWindow((x, y, w, h) => {
      onPriorityPress({x, y, width: w, height: h});
    });
  };

  const handleIconMeasure = () => {
    iconChipRef.current?.measureInWindow((x, y, w, h) => {
      onIconPress?.({x, y, width: w, height: h});
    });
  };

  const handleColorMeasure = () => {
    colorChipRef.current?.measureInWindow((x, y, w, h) => {
      onColorPress?.({x, y, width: w, height: h});
    });
  };

  if (compact) {
    // Create 모드: 날짜, 우선순위, 아이콘 칩
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbar}
        keyboardShouldPersistTaps="handled">
        <Chip icon={Calendar} label={getDateChipLabel(form.scheduledDate)} onPress={onDatePress} />

        {(form.importance || form.urgency) && (
          <View ref={priorityChipRef} collapsable={false}>
            <AnimatedPressable
              onPress={handlePriorityMeasure}
              hapticType="selection"
              style={[
                styles.chip,
                {backgroundColor: priorityStyle.bg, borderColor: priorityStyle.border, borderWidth: 1.5},
              ]}>
              <Flag size={14} color={priorityStyle.text} />
              <Text style={[styles.chipText, {color: priorityStyle.text}]}>
                {getPriorityChipLabel(form)}
              </Text>
            </AnimatedPressable>
          </View>
        )}

        {onIconPress && (
          <View ref={iconChipRef} collapsable={false}>
            <Chip icon={Sparkles} label="" onPress={handleIconMeasure} />
          </View>
        )}

        {onColorPress && (
          <View ref={colorChipRef} collapsable={false}>
            {form.color ? (
              <AnimatedPressable
                onPress={handleColorMeasure}
                hapticType="selection"
                style={[styles.chip, {borderColor: form.color, borderWidth: 1.5}]}>
                <View style={[styles.colorDot, {backgroundColor: form.color}]} />
              </AnimatedPressable>
            ) : (
              <Chip icon={Palette} label="" onPress={handleColorMeasure} />
            )}
          </View>
        )}
      </ScrollView>
    );
  }

  // Edit 모드: 기존 5칩 (날짜, 시간, 알람, 반복, 우선순위) — lucide 아이콘
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.toolbar}
      keyboardShouldPersistTaps="handled">
      <Chip icon={Calendar} label={getDateChipLabel(form.scheduledDate)} onPress={onDatePress} />
      {onTimePress && (
        <Chip icon={Clock} label={getTimeChipLabel(form)} onPress={onTimePress} />
      )}
      {onAlarmPress && (
        <Chip
          icon={Bell}
          label={getAlarmsLabel(form.alarmOffsets)}
          onPress={onAlarmPress}
        />
      )}
      {onRecurrencePress && (
        <Chip icon={Repeat} label={getRecurrenceChipLabel(form)} onPress={onRecurrencePress} />
      )}

      <View ref={priorityChipRef} collapsable={false}>
        <AnimatedPressable
          onPress={handlePriorityMeasure}
          hapticType="selection"
          style={[
            styles.chip,
            {
              backgroundColor: priorityStyle.bg,
              borderColor: priorityStyle.border,
              borderWidth: 1.5,
            },
          ]}>
          <Flag size={14} color={priorityStyle.text} />
          <Text style={[styles.chipText, {color: priorityStyle.text}]}>
            {getPriorityChipLabel(form)}
          </Text>
        </AnimatedPressable>
      </View>
    </ScrollView>
  );
}

// ============================================
// Chip sub-component
// ============================================

function Chip({
  icon: IconComponent,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} hapticType="selection" style={styles.chip}>
      <IconComponent size={14} color="#4B5563" />
      {label ? <Text style={styles.chipText}>{label}</Text> : null}
    </AnimatedPressable>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
