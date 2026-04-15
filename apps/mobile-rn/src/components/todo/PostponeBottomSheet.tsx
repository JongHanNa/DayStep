/**
 * PostponeBottomSheet
 * 미루기 옵션 바텀시트 — 3가지 옵션
 * 1. 시간 지정하여 미룸 (reschedule) — 네이티브 시간 피커
 * 2. 시간지정 없이 미룸 (anytime) — 시간 미정으로 변환
 * 3. 지금 바로 하기 (start_now) — FocusTimer로 이동
 */
import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {BottomSheetModal, BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import {InlineTimePicker} from '@/components/native/InlineTimePicker';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {Clock, Cloud, Play, Check} from 'lucide-react-native';
import type {Todo} from '@daystep/shared-core';

export type PostponeAction = 'reschedule' | 'anytime' | 'start_now';

export interface PostponeBottomSheetRef {
  open: (todo: Todo) => void;
  close: () => void;
}

interface PostponeBottomSheetProps {
  onConfirm: (action: PostponeAction, newTime?: string) => void;
}

interface OptionConfig {
  action: PostponeAction;
  Icon: React.FC<any>;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const OPTIONS: OptionConfig[] = [
  {
    action: 'reschedule',
    Icon: Clock,
    title: '시간 지정하여 미룸',
    description: '오늘 다른 시간으로 미룰래요.',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  {
    action: 'anytime',
    Icon: Cloud,
    title: '시간지정 없이 미룸',
    description: '몇시에 할지 아직 모르겠어요.',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  {
    action: 'start_now',
    Icon: Play,
    title: '지금 바로 하기',
    description: '미뤘지만, 지금이라도 바로 시작할래요!',
    color: '#16A34A',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
];

export const PostponeBottomSheet = forwardRef<
  PostponeBottomSheetRef,
  PostponeBottomSheetProps
>(function PostponeBottomSheet({onConfirm}, ref) {
  const {primaryColor} = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [todo, setTodo] = useState<Todo | null>(null);
  const [selectedAction, setSelectedAction] =
    useState<PostponeAction>('reschedule');
  const [pickerDate, setPickerDate] = useState(new Date());


  const resolvedOptions = useMemo(
    () =>
      OPTIONS.map(opt =>
        opt.action === 'anytime'
          ? {
              ...opt,
              color: primaryColor,
              bgColor: primaryColor + '10',
              borderColor: primaryColor + '33',
            }
          : opt,
      ),
    [primaryColor],
  );

  useImperativeHandle(ref, () => ({
    open: (t: Todo) => {
      setTodo(t);
      setSelectedAction('reschedule');
      // 현재 시간 + 1시간, 15분 단위 반올림
      const now = new Date();
      const defaultDate = new Date();
      defaultDate.setHours((now.getHours() + 1) % 24);
      defaultDate.setMinutes(0);
      defaultDate.setSeconds(0);
      setPickerDate(defaultDate);
      bottomSheetRef.current?.present();
    },
    close: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const handleConfirm = useCallback(() => {
    if (selectedAction === 'reschedule') {
      const hh = String(pickerDate.getHours()).padStart(2, '0');
      const mm = String(pickerDate.getMinutes()).padStart(2, '0');
      onConfirm('reschedule', `${hh}:${mm}`);
    } else {
      onConfirm(selectedAction);
    }
    bottomSheetRef.current?.dismiss();
  }, [selectedAction, pickerDate, onConfirm]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.15}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      backdropComponent={renderBackdrop}
      enableDynamicSizing={true}
      handleIndicatorStyle={styles.handleIndicator}>
      <BottomSheetView style={styles.sheet}>
        {/* 헤더 */}
        {todo && (
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {todo.title}
            </Text>
            <Text style={styles.headerSubtitle}>
              이 할일을 어떻게 처리할까요?
            </Text>
          </View>
        )}

        {/* 옵션 목록 */}
        <View style={styles.optionList}>
          {resolvedOptions.map(option => {
            const OptionIcon = option.Icon;
            const isSelected = selectedAction === option.action;
            return (
              <AnimatedPressable
                key={option.action}
                onPress={() => setSelectedAction(option.action)}
                hapticType="light"
                scaleValue={0.97}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? option.bgColor : '#F9FAFB',
                    borderColor: isSelected ? option.borderColor : '#E5E7EB',
                  },
                ]}>
                <View
                  style={[
                    styles.optionIconWrap,
                    {
                      backgroundColor: isSelected ? option.bgColor : '#F3F4F6',
                    },
                  ]}>
                  <OptionIcon
                    size={20}
                    color={isSelected ? option.color : '#9CA3AF'}
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text
                    style={[
                      styles.optionTitle,
                      {color: isSelected ? option.color : '#1F2937'},
                    ]}>
                    {option.title}
                  </Text>
                  <Text style={styles.optionDesc}>{option.description}</Text>
                </View>
                {isSelected && (
                  <View
                    style={[
                      styles.checkCircle,
                      {backgroundColor: option.bgColor},
                    ]}>
                    <Check size={16} color={option.color} />
                  </View>
                )}
              </AnimatedPressable>
            );
          })}
        </View>

        {/* 네이티브 시간 피커 (reschedule) */}
        {selectedAction === 'reschedule' && (
          <View style={styles.timePickerSection}>
            <Text style={styles.timePickerLabel}>변경할 시간 선택</Text>
            <InlineTimePicker
              value={pickerDate}
              onChange={(date) => setPickerDate(date)}
              minuteInterval={15}
              height={120}
            />
          </View>
        )}

        {/* 확인 버튼 */}
        <AnimatedPressable
          onPress={handleConfirm}
          hapticType="medium"
          scaleValue={0.96}
          style={[styles.confirmBtn, {backgroundColor: primaryColor}]}>
          <Text style={styles.confirmBtnText}>확인</Text>
        </AnimatedPressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: 36,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  optionList: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    gap: 12,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 4,
  },
  timePicker: {
    height: 120,
    width: 200,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
