/**
 * PostponeBottomSheet
 * 미루기 옵션 바텀시트 — 3가지 옵션
 * 1. 시간 지정하여 미룸 (reschedule) — 시간 선택
 * 2. 시간지정 없이 미룸 (anytime) — 시간 미정으로 변환
 * 3. 지금 바로 하기 (start_now) — FocusTimer로 이동
 */
import React, {useState, useEffect, useMemo} from 'react';
import {View, Text, Modal, StyleSheet, Pressable} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {
  Clock,
  Cloud,
  Play,
  Check,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import type {Todo} from '@daystep/shared-core';

export type PostponeAction = 'reschedule' | 'anytime' | 'start_now';

interface PostponeBottomSheetProps {
  visible: boolean;
  todo: Todo | null;
  onClose: () => void;
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

export function PostponeBottomSheet({
  visible,
  todo,
  onClose,
  onConfirm,
}: PostponeBottomSheetProps) {
  const {primaryColor} = useTheme();
  const resolvedOptions = useMemo(() =>
    OPTIONS.map(opt =>
      opt.action === 'anytime'
        ? {...opt, color: primaryColor, bgColor: primaryColor + '10', borderColor: primaryColor + '33'}
        : opt,
    ),
    [primaryColor],
  );
  const [selectedAction, setSelectedAction] =
    useState<PostponeAction>('reschedule');
  const [hour, setHour] = useState(14);
  const [minute, setMinute] = useState(0);

  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (visible) {
      setSelectedAction('reschedule');
      // 현재 시간 + 1시간을 기본값으로
      const now = new Date();
      const defaultHour = (now.getHours() + 1) % 24;
      setHour(defaultHour);
      setMinute(0);
    }
  }, [visible]);

  const handleConfirm = () => {
    if (selectedAction === 'reschedule') {
      const hh = String(hour).padStart(2, '0');
      const mm = String(minute).padStart(2, '0');
      onConfirm('reschedule', `${hh}:${mm}`);
    } else {
      onConfirm(selectedAction);
    }
  };

  const adjustHour = (delta: number) => {
    setHour(h => {
      const next = h + delta;
      if (next < 0) return 23;
      if (next > 23) return 0;
      return next;
    });
  };

  const adjustMinute = (delta: number) => {
    setMinute(m => {
      const next = m + delta;
      if (next < 0) return 45;
      if (next >= 60) return 0;
      return next;
    });
  };

  if (!todo) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={{flex: 1}}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {todo.title}
              </Text>
              <Text style={styles.headerSubtitle}>
                이 할일을 어떻게 처리할까요?
              </Text>
            </View>
            <AnimatedPressable
              onPress={onClose}
              hapticType="light"
              scaleValue={0.85}
              style={styles.closeBtn}>
              <X size={20} color="#6B7280" />
            </AnimatedPressable>
          </View>

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
                      backgroundColor: isSelected
                        ? option.bgColor
                        : '#F9FAFB',
                      borderColor: isSelected
                        ? option.borderColor
                        : '#E5E7EB',
                    },
                  ]}>
                  <View
                    style={[
                      styles.optionIconWrap,
                      {
                        backgroundColor: isSelected
                          ? option.bgColor
                          : '#F3F4F6',
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

          {/* 시간 선택 (reschedule) */}
          {selectedAction === 'reschedule' && (
            <View style={styles.timePickerSection}>
              <Text style={styles.timePickerLabel}>변경할 시간 선택</Text>
              <View style={styles.timePickerRow}>
                {/* 시간 */}
                <View style={styles.timeColumn}>
                  <AnimatedPressable
                    onPress={() => adjustHour(1)}
                    hapticType="light"
                    scaleValue={0.85}
                    style={styles.timeArrowBtn}>
                    <ChevronUp size={20} color="#2563EB" />
                  </AnimatedPressable>
                  <Text style={styles.timeDigit}>
                    {String(hour).padStart(2, '0')}
                  </Text>
                  <AnimatedPressable
                    onPress={() => adjustHour(-1)}
                    hapticType="light"
                    scaleValue={0.85}
                    style={styles.timeArrowBtn}>
                    <ChevronDown size={20} color="#2563EB" />
                  </AnimatedPressable>
                </View>

                <Text style={styles.timeSeparator}>:</Text>

                {/* 분 (15분 단위) */}
                <View style={styles.timeColumn}>
                  <AnimatedPressable
                    onPress={() => adjustMinute(15)}
                    hapticType="light"
                    scaleValue={0.85}
                    style={styles.timeArrowBtn}>
                    <ChevronUp size={20} color="#2563EB" />
                  </AnimatedPressable>
                  <Text style={styles.timeDigit}>
                    {String(minute).padStart(2, '0')}
                  </Text>
                  <AnimatedPressable
                    onPress={() => adjustMinute(-15)}
                    hapticType="light"
                    scaleValue={0.85}
                    style={styles.timeArrowBtn}>
                    <ChevronDown size={20} color="#2563EB" />
                  </AnimatedPressable>
                </View>
              </View>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
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
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 12,
    textAlign: 'center',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeColumn: {
    alignItems: 'center',
    gap: 4,
  },
  timeArrowBtn: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  timeDigit: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563EB',
    minWidth: 50,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563EB',
    marginHorizontal: 4,
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
