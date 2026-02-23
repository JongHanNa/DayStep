/**
 * TodoCreatePanel
 * TickTick 스타일 — 키보드 바로 위에 붙는 인라인 입력 패널
 * - 반투명 backdrop (탭하면 닫기)
 * - 제목 + 설명 + 4칩 툴바
 * - activePanel 상태로 키보드/패널 전환
 *   'none': 키보드 표시
 *   'schedule': 키보드 숨김, 통합 일정 패널
 *   'icon': 키보드 유지, 인라인 아이콘 피커
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Keyboard,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AnimatedPressable} from '@/components/core';
import {AttributeToolbar} from './AttributeToolbar';
import {SchedulePanel} from './SchedulePanel';
import {InlineIconPicker} from './InlineIconPicker';
import {useKeyboardHeight} from '@/hooks/useKeyboardHeight';
import {useTheme} from '@/theme';
import type {UseTodoFormReturn} from './useTodoForm';

// ============================================
// Types
// ============================================

type ActivePanel = 'none' | 'schedule' | 'icon';

interface ToolbarCallbacks {
  onPriorityPress: () => void;
  onTimePress: () => void;
  onAlarmPress: () => void;
  onRecurrencePress: () => void;
}

interface TodoCreatePanelProps extends UseTodoFormReturn {
  visible: boolean;
  onClose: () => void;
  toolbarCallbacks: ToolbarCallbacks;
}

// ============================================
// Component
// ============================================

export function TodoCreatePanel({
  visible,
  onClose,
  form,
  updateField,
  saving,
  handleSave,
  toolbarCallbacks,
}: TodoCreatePanelProps) {
  const {primaryColor} = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const titleInputRef = useRef<TextInput>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');

  // 열리면 auto-focus + 패널 리셋
  useEffect(() => {
    if (visible) {
      setActivePanel('none');
      const timer = setTimeout(() => titleInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // 패널 bottom 위치:
  // schedule 패널 → bottom = insets.bottom (키보드 없음)
  // icon 패널 → 키보드 위
  // none → 키보드 위
  const panelAnimatedStyle = useAnimatedStyle(() => {
    if (activePanel === 'schedule') {
      return {transform: [{translateY: -insets.bottom}]};
    }
    const kbHeight = keyboardHeight.value;
    const bottom = kbHeight > 0 ? kbHeight : insets.bottom;
    return {transform: [{translateY: -bottom}]};
  });

  const handleBackdropPress = useCallback(() => {
    Keyboard.dismiss();
    setActivePanel('none');
    setTimeout(() => onClose(), 100);
  }, [onClose]);

  const handleSavePress = useCallback(() => {
    handleSave(() => {
      Keyboard.dismiss();
      setActivePanel('none');
      onClose();
    });
  }, [handleSave, onClose]);

  // 날짜 칩 → 일정 패널 토글
  const handleDatePress = useCallback(() => {
    if (activePanel === 'schedule') {
      // 패널 닫고 키보드 복귀
      setActivePanel('none');
      titleInputRef.current?.focus();
    } else {
      Keyboard.dismiss();
      setActivePanel('schedule');
    }
  }, [activePanel]);

  // 아이콘 칩 → 인라인 아이콘 피커 토글
  const handleIconPress = useCallback(() => {
    if (activePanel === 'icon') {
      setActivePanel('none');
    } else {
      // 키보드 유지하면서 아이콘 패널 표시
      setActivePanel('icon');
    }
  }, [activePanel]);

  // 일정 패널 닫기
  const handleScheduleClose = useCallback(() => {
    setActivePanel('none');
    titleInputRef.current?.focus();
  }, []);

  // 일정 패널 확인
  const handleScheduleConfirm = useCallback(() => {
    setActivePanel('none');
    titleInputRef.current?.focus();
  }, []);

  // 서브시트 콜백 래퍼: 일정 패널에서 서브시트 열 때
  const handleSubsheetOpen = useCallback(
    (cb: () => void) => () => {
      cb();
    },
    [],
  );

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.panelWrapper, panelAnimatedStyle]}>
        <View style={styles.panel}>
          {/* 제목 행 (아이콘 버튼 제거됨) */}
          <View style={styles.titleRow}>
            <TextInput
              ref={titleInputRef}
              value={form.title}
              onChangeText={v => updateField('title', v)}
              placeholder="할일을 입력하세요"
              placeholderTextColor="#9CA3AF"
              style={styles.titleInput}
              returnKeyType="next"
            />

            <AnimatedPressable
              onPress={handleSavePress}
              hapticType="medium"
              style={[styles.saveBtn, {backgroundColor: primaryColor}]}>
              <Text style={styles.saveBtnText}>
                {saving ? '...' : '저장'}
              </Text>
            </AnimatedPressable>
          </View>

          {/* 설명 */}
          <TextInput
            value={form.content}
            onChangeText={v => updateField('content', v)}
            placeholder="설명 추가"
            placeholderTextColor="#D1D5DB"
            style={styles.descInput}
            multiline
            numberOfLines={1}
          />

          {/* 구분선 + 4칩 툴바 */}
          <View style={styles.divider} />
          <AttributeToolbar
            form={form}
            compact
            onDatePress={handleDatePress}
            onPriorityPress={toolbarCallbacks.onPriorityPress}
            onIconPress={handleIconPress}
            onMorePress={() => {}}
          />

          {/* 조건부 패널 영역 */}
          {activePanel === 'icon' && (
            <InlineIconPicker
              selectedIcon={form.icon}
              onIconChange={v => updateField('icon', v)}
            />
          )}
        </View>

        {/* 일정 패널 — 패널 아래 (키보드 대체 영역) */}
        {activePanel === 'schedule' && (
          <SchedulePanel
            form={form}
            updateField={updateField}
            onClose={handleScheduleClose}
            onConfirm={handleScheduleConfirm}
            onTimePress={handleSubsheetOpen(toolbarCallbacks.onTimePress)}
            onAlarmPress={handleSubsheetOpen(toolbarCallbacks.onAlarmPress)}
            onRecurrencePress={handleSubsheetOpen(toolbarCallbacks.onRecurrencePress)}
          />
        )}
      </Animated.View>
    </>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 99,
  },
  panelWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  descInput: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 4,
    paddingBottom: 8,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
});
