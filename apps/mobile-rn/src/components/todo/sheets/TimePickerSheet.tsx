/**
 * TimePickerSheet
 * 시간 설정 서브시트 — 스케줄 타입 + 시간 조절 + 소요시간
 */
import React, {useCallback, useMemo, forwardRef, useImperativeHandle, useRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {BottomSheetModal, BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {Clock} from 'lucide-react-native';
import {format, addHours, setMinutes} from 'date-fns';

type ScheduleType = 'anytime' | 'timed' | 'all_day';

const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

export interface TimePickerSheetRef {
  open: () => void;
  close: () => void;
}

interface TimePickerSheetProps {
  scheduleType: ScheduleType;
  startTime: Date | null;
  endTime: Date | null;
  anytimeDuration: number | null;
  onScheduleTypeChange: (type: ScheduleType) => void;
  onStartTimeChange: (time: Date) => void;
  onEndTimeChange: (time: Date | null) => void;
  onAnytimeDurationChange: (duration: number | null) => void;
}

export const TimePickerSheet = forwardRef<TimePickerSheetRef, TimePickerSheetProps>(
  function TimePickerSheet(
    {
      scheduleType,
      startTime,
      endTime,
      anytimeDuration,
      onScheduleTypeChange,
      onStartTimeChange,
      onEndTimeChange,
      onAnytimeDurationChange,
    },
    ref,
  ) {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const {primaryColor} = useTheme();
    const haptic = useHaptic();
    const snapPoints = useMemo(() => ['45%'], []);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.present(),
      close: () => bottomSheetRef.current?.dismiss(),
    }));

    const handleTypeChange = useCallback(
      (type: ScheduleType) => {
        haptic.selection();
        onScheduleTypeChange(type);
        if (type === 'timed' && !startTime) {
          const now = new Date();
          const nextHour = addHours(setMinutes(now, 0), 1);
          onStartTimeChange(nextHour);
          onEndTimeChange(addHours(nextHour, 1));
        }
      },
      [startTime, haptic, onScheduleTypeChange, onStartTimeChange, onEndTimeChange],
    );

    const handleHourChange = useCallback(
      (delta: number) => {
        if (!startTime) return;
        haptic.selection();
        const newStart = addHours(startTime, delta);
        onStartTimeChange(newStart);
        if (endTime) {
          onEndTimeChange(addHours(endTime, delta));
        }
      },
      [startTime, endTime, haptic, onStartTimeChange, onEndTimeChange],
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.3}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}>
        <BottomSheetView style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Clock size={18} color={primaryColor} />
            <Text style={styles.headerTitle}>시간 설정</Text>
          </View>

          {/* 스케줄 타입 칩 */}
          <View style={styles.chipRow}>
            {(['anytime', 'timed', 'all_day'] as ScheduleType[]).map(type => (
              <AnimatedPressable
                key={type}
                onPress={() => handleTypeChange(type)}
                haptic={false}
                style={[
                  styles.chip,
                  scheduleType === type && {backgroundColor: primaryColor},
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    scheduleType === type && styles.chipTextActive,
                  ]}>
                  {type === 'anytime' ? '언제든지' : type === 'timed' ? '시간 지정' : '종일'}
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          {/* timed: +/- 시간 컨트롤 */}
          {scheduleType === 'timed' && startTime && (
            <View style={styles.timeRow}>
              <AnimatedPressable
                onPress={() => handleHourChange(-1)}
                hapticType="selection"
                style={styles.timeBtn}>
                <Text style={styles.timeBtnText}>−</Text>
              </AnimatedPressable>
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>
                  {format(startTime, 'HH:mm')}
                </Text>
                {endTime && (
                  <Text style={styles.timeSep}>
                    {' ~ '}{format(endTime, 'HH:mm')}
                  </Text>
                )}
              </View>
              <AnimatedPressable
                onPress={() => handleHourChange(1)}
                hapticType="selection"
                style={styles.timeBtn}>
                <Text style={styles.timeBtnText}>+</Text>
              </AnimatedPressable>
            </View>
          )}

          {/* anytime: 소요시간 칩 */}
          {scheduleType === 'anytime' && (
            <View style={styles.durationRow}>
              {DURATIONS.map(d => (
                <AnimatedPressable
                  key={d}
                  onPress={() => {
                    haptic.selection();
                    onAnytimeDurationChange(anytimeDuration === d ? null : d);
                  }}
                  haptic={false}
                  style={[
                    styles.durationChip,
                    anytimeDuration === d && {backgroundColor: primaryColor},
                  ]}>
                  <Text
                    style={[
                      styles.chipText,
                      anytimeDuration === d && styles.chipTextActive,
                    ]}>
                    {d >= 60 ? `${d / 60}시간` : `${d}분`}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {backgroundColor: '#D1D5DB', width: 36},
  container: {paddingHorizontal: 20, paddingBottom: 20},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerTitle: {fontSize: 17, fontWeight: '600', color: '#1F2937'},
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  chipText: {fontSize: 13, fontWeight: '500', color: '#4B5563'},
  chipTextActive: {color: '#FFFFFF'},
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  timeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: {fontSize: 20, fontWeight: '600', color: '#4B5563'},
  timeDisplay: {flexDirection: 'row', alignItems: 'center'},
  timeText: {fontSize: 28, fontWeight: '700', color: '#1F2937'},
  timeSep: {fontSize: 16, color: '#9CA3AF'},
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
});
