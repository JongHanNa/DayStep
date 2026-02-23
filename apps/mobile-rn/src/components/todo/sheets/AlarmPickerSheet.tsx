/**
 * AlarmPickerSheet
 * 알람 오프셋 서브시트 — 7개 옵션 칩
 */
import React, {useCallback, useMemo, forwardRef, useImperativeHandle, useRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {BottomSheetModal, BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {Bell, BellOff} from 'lucide-react-native';
import {ALARM_OPTIONS, type AlarmOffsetValue} from '@/lib/notifications';

export interface AlarmPickerSheetRef {
  open: () => void;
  close: () => void;
}

interface AlarmPickerSheetProps {
  alarmOffsetMinutes: number | null;
  onAlarmChange: (v: number | null) => void;
}

export const AlarmPickerSheet = forwardRef<
  AlarmPickerSheetRef,
  AlarmPickerSheetProps
>(function AlarmPickerSheet({alarmOffsetMinutes, onAlarmChange}, ref) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const snapPoints = useMemo(() => ['35%'], []);

  useImperativeHandle(ref, () => ({
    open: () => bottomSheetRef.current?.present(),
    close: () => bottomSheetRef.current?.dismiss(),
  }));

  const currentLabel = useMemo(() => {
    const opt = ALARM_OPTIONS.find(o => o.value === alarmOffsetMinutes);
    return opt?.label ?? '없음';
  }, [alarmOffsetMinutes]);

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
          <Bell size={18} color={primaryColor} />
          <Text style={styles.headerTitle}>알림</Text>
        </View>

        {/* 현재 상태 뱃지 */}
        <View style={styles.badgeRow}>
          {alarmOffsetMinutes !== null ? (
            <Bell size={14} color={primaryColor} />
          ) : (
            <BellOff size={14} color={primaryColor} />
          )}
          <Text style={[styles.badge, {color: primaryColor}]}>
            {alarmOffsetMinutes !== null ? currentLabel : '알림 없음'}
          </Text>
        </View>

        {/* 옵션 칩 */}
        <View style={styles.chipRow}>
          {ALARM_OPTIONS.map(option => {
            const isSelected = alarmOffsetMinutes === option.value;
            return (
              <AnimatedPressable
                key={option.label}
                onPress={() => {
                  haptic.selection();
                  onAlarmChange(option.value as AlarmOffsetValue);
                }}
                haptic={false}
                style={[
                  styles.chip,
                  isSelected && styles.chipActive,
                  isSelected && {borderColor: primaryColor},
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    isSelected && {color: primaryColor, fontWeight: '700'},
                  ]}>
                  {option.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
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
    marginBottom: 12,
  },
  headerTitle: {fontSize: 17, fontWeight: '600', color: '#1F2937'},
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  badge: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#EEF2FF',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
});
