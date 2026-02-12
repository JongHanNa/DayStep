/**
 * PriorityPickerSheet
 * 우선순위 서브시트 — 중요/긴급/해야할일 토글
 */
import React, {useCallback, useMemo, forwardRef, useImperativeHandle, useRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import BottomSheet, {BottomSheetBackdrop} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {Flag} from 'lucide-react-native';

export interface PriorityPickerSheetRef {
  open: () => void;
  close: () => void;
}

interface PriorityPickerSheetProps {
  importance: boolean;
  urgency: boolean;
  isReluctantMustDo: boolean;
  onImportanceChange: (v: boolean) => void;
  onUrgencyChange: (v: boolean) => void;
  onReluctantChange: (v: boolean) => void;
}

export const PriorityPickerSheet = forwardRef<
  PriorityPickerSheetRef,
  PriorityPickerSheetProps
>(function PriorityPickerSheet(
  {importance, urgency, isReluctantMustDo, onImportanceChange, onUrgencyChange, onReluctantChange},
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

  const priorityLabel = useMemo(() => {
    if (importance && urgency) return '🔴 긴급 + 중요';
    if (importance) return '🟡 중요';
    if (urgency) return '🔵 긴급';
    return '⚪ 보통';
  }, [importance, urgency]);

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
          <Flag size={18} color={primaryColor} />
          <Text style={styles.headerTitle}>우선순위</Text>
        </View>

        {/* 현재 상태 뱃지 */}
        <Text style={[styles.badge, {color: primaryColor}]}>{priorityLabel}</Text>

        {/* 3개 토글 버튼 */}
        <View style={styles.row}>
          <AnimatedPressable
            onPress={() => {
              haptic.selection();
              onImportanceChange(!importance);
            }}
            haptic={false}
            style={[
              styles.btn,
              importance && styles.btnActive,
              importance && {borderColor: '#F59E0B'},
            ]}>
            <Text style={styles.btnText}>⭐ 중요</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              haptic.selection();
              onUrgencyChange(!urgency);
            }}
            haptic={false}
            style={[
              styles.btn,
              urgency && styles.btnActive,
              urgency && {borderColor: '#3B82F6'},
            ]}>
            <Text style={styles.btnText}>⚡ 긴급</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              haptic.selection();
              onReluctantChange(!isReluctantMustDo);
            }}
            haptic={false}
            style={[
              styles.btn,
              isReluctantMustDo && styles.btnActive,
              isReluctantMustDo && {borderColor: '#EF4444'},
            ]}>
            <Text style={styles.btnText}>😤 해야 할 일</Text>
          </AnimatedPressable>
        </View>
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
    marginBottom: 12,
  },
  headerTitle: {fontSize: 17, fontWeight: '600', color: '#1F2937'},
  badge: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  btnActive: {
    backgroundColor: '#FFF7ED',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
});
