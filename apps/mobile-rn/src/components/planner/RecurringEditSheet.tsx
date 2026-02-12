/**
 * RecurringEditSheet
 * 반복 할일 수정 시 3가지 선택지를 보여주는 바텀시트
 * 웹의 RecurringUpdateDialog.tsx 참고
 */
import React, {
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import BottomSheet, {BottomSheetBackdrop} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {RefreshCw} from 'lucide-react-native';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';

export type RecurringUpdateType = 'this' | 'future' | 'all';

interface PendingUpdate {
  todoId: string;
  todoTitle: string;
  updates: Record<string, any>;
  occurrenceDate: string; // YYYY-MM-DD
}

export interface RecurringEditSheetRef {
  open: (pending: PendingUpdate) => void;
  close: () => void;
}

interface RecurringEditSheetProps {
  onChoice: (
    todoId: string,
    updates: Record<string, any>,
    updateType: RecurringUpdateType,
    occurrenceDate: string,
  ) => Promise<void>;
}

export const RecurringEditSheet = forwardRef<
  RecurringEditSheetRef,
  RecurringEditSheetProps
>(function RecurringEditSheet({onChoice}, ref) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [pending, setPending] = useState<PendingUpdate | null>(null);
  const [processing, setProcessing] = useState(false);
  const {primaryColor} = useTheme();

  const snapPoints = useMemo(() => ['42%'], []);

  useImperativeHandle(ref, () => ({
    open: (p: PendingUpdate) => {
      setPending(p);
      bottomSheetRef.current?.snapToIndex(0);
    },
    close: () => {
      bottomSheetRef.current?.close();
      setPending(null);
    },
  }));

  const handleChoice = useCallback(
    async (type: RecurringUpdateType) => {
      if (!pending || processing) return;
      try {
        setProcessing(true);
        await onChoice(
          pending.todoId,
          pending.updates,
          type,
          pending.occurrenceDate,
        );
        bottomSheetRef.current?.close();
        setPending(null);
      } catch (err) {
        console.error('[RecurringEditSheet] Error:', err);
      } finally {
        setProcessing(false);
      }
    },
    [pending, processing, onChoice],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    [],
  );

  const dateLabel = pending
    ? format(new Date(pending.occurrenceDate), 'M월 d일 (E)', {locale: ko})
    : '';

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <RefreshCw size={18} color={primaryColor} />
          <Text style={styles.headerTitle}>반복 할일 수정</Text>
        </View>

        {pending && (
          <>
            <Text style={styles.todoTitle}>"{pending.todoTitle}"</Text>
            <Text style={styles.dateText}>{dateLabel}</Text>
          </>
        )}

        {/* 선택지 */}
        <View style={styles.options}>
          <AnimatedPressable
            onPress={() => handleChoice('this')}
            hapticType="light"
            scaleValue={0.98}
            style={[styles.optionBtn, processing && styles.optionDisabled]}>
            <Text style={styles.optionTitle}>이 일정만 변경</Text>
            <Text style={styles.optionDesc}>
              {dateLabel} 일정만 변경합니다
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => handleChoice('future')}
            hapticType="light"
            scaleValue={0.98}
            style={[styles.optionBtn, processing && styles.optionDisabled]}>
            <Text style={styles.optionTitle}>이후 모든 항목 변경</Text>
            <Text style={styles.optionDesc}>
              {dateLabel} 이후의 모든 반복 일정 변경
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => handleChoice('all')}
            hapticType="light"
            scaleValue={0.98}
            style={[styles.optionBtn, processing && styles.optionDisabled]}>
            <Text style={styles.optionTitle}>모든 일정 변경</Text>
            <Text style={styles.optionDesc}>
              과거/현재/미래 모든 반복 일정 변경
            </Text>
          </AnimatedPressable>
        </View>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: 36,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  todoTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  options: {
    gap: 8,
  },
  optionBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  optionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
