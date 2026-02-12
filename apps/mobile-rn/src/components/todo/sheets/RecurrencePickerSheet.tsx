/**
 * RecurrencePickerSheet
 * 반복 설정 서브시트 — 패턴 선택 + 요일 토글
 */
import React, {useCallback, useMemo, forwardRef, useImperativeHandle, useRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import BottomSheet, {BottomSheetBackdrop} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {Repeat} from 'lucide-react-native';

type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export interface RecurrencePickerSheetRef {
  open: () => void;
  close: () => void;
}

interface RecurrencePickerSheetProps {
  recurrencePattern: RecurrencePattern;
  recurrenceDaysOfWeek: number[];
  onPatternChange: (pattern: RecurrencePattern) => void;
  onDaysChange: (days: number[]) => void;
}

export const RecurrencePickerSheet = forwardRef<
  RecurrencePickerSheetRef,
  RecurrencePickerSheetProps
>(function RecurrencePickerSheet(
  {recurrencePattern, recurrenceDaysOfWeek, onPatternChange, onDaysChange},
  ref,
) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const snapPoints = useMemo(() => ['40%'], []);

  useImperativeHandle(ref, () => ({
    open: () => bottomSheetRef.current?.snapToIndex(0),
    close: () => bottomSheetRef.current?.close(),
  }));

  const toggleDay = useCallback(
    (day: number) => {
      haptic.selection();
      const newDays = recurrenceDaysOfWeek.includes(day)
        ? recurrenceDaysOfWeek.filter(d => d !== day)
        : [...recurrenceDaysOfWeek, day];
      onDaysChange(newDays);
    },
    [recurrenceDaysOfWeek, onDaysChange, haptic],
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
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Repeat size={18} color={primaryColor} />
          <Text style={styles.headerTitle}>반복 설정</Text>
        </View>

        {/* 패턴 칩 */}
        <View style={styles.chipRow}>
          {(['none', 'daily', 'weekly', 'monthly'] as RecurrencePattern[]).map(p => (
            <AnimatedPressable
              key={p}
              onPress={() => {
                haptic.selection();
                onPatternChange(p);
              }}
              haptic={false}
              style={[
                styles.chip,
                recurrencePattern === p && {backgroundColor: primaryColor},
              ]}>
              <Text
                style={[
                  styles.chipText,
                  recurrencePattern === p && styles.chipTextActive,
                ]}>
                {p === 'none' ? '없음' : p === 'daily' ? '매일' : p === 'weekly' ? '매주' : '매월'}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        {/* 요일 토글 (weekly) */}
        {recurrencePattern === 'weekly' && (
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day, i) => (
              <AnimatedPressable
                key={i}
                onPress={() => toggleDay(i)}
                haptic={false}
                style={[
                  styles.weekdayBtn,
                  recurrenceDaysOfWeek.includes(i) && {
                    backgroundColor: primaryColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.weekdayText,
                    recurrenceDaysOfWeek.includes(i) && styles.weekdayTextActive,
                  ]}>
                  {day}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  );
});

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
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  weekdayText: {fontSize: 13, fontWeight: '600', color: '#4B5563'},
  weekdayTextActive: {color: '#FFFFFF'},
});
