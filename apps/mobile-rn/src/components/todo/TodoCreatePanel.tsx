/**
 * TodoCreatePanel
 * TickTick 스타일 — 키보드 바로 위에 붙는 인라인 입력 패널
 * - 반투명 backdrop (탭하면 닫기)
 * - 제목 + 설명 + AttributeToolbar
 * - 키보드 위치에 따라 패널 bottom 위치 애니메이션
 */
import React, {useCallback, useEffect, useRef} from 'react';
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
import {useKeyboardHeight} from '@/hooks/useKeyboardHeight';
import {useTheme} from '@/theme';
import {resolveTodoIcon} from '@/lib/iconMap';
import {ClipboardList} from 'lucide-react-native';
import type {UseTodoFormReturn} from './useTodoForm';

// ============================================
// Types
// ============================================

interface ToolbarCallbacks {
  onDatePress: () => void;
  onTimePress: () => void;
  onAlarmPress: () => void;
  onRecurrencePress: () => void;
  onPriorityPress: () => void;
  onIconPress: () => void;
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

  // 열리면 auto-focus
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => titleInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // 패널 bottom 위치: 키보드 높이 - safe area bottom (키보드가 이미 safe area를 포함)
  const panelAnimatedStyle = useAnimatedStyle(() => {
    const kbHeight = keyboardHeight.value;
    // 키보드가 있으면 키보드 위, 없으면 safe area bottom 위
    const bottom = kbHeight > 0 ? kbHeight : insets.bottom;
    return {
      transform: [{translateY: -bottom}],
    };
  });

  const handleBackdropPress = useCallback(() => {
    Keyboard.dismiss();
    // 키보드가 사라진 후 닫기
    setTimeout(() => onClose(), 100);
  }, [onClose]);

  const handleSavePress = useCallback(() => {
    handleSave(() => {
      Keyboard.dismiss();
      onClose();
    });
  }, [handleSave, onClose]);

  // 서브시트 콜백 래퍼: 키보드 닫고 서브시트 열기
  const wrapToolbarCallback = useCallback(
    (cb: () => void) => () => {
      Keyboard.dismiss();
      // 키보드가 내려간 후 서브시트 열기
      setTimeout(cb, 200);
    },
    [],
  );

  if (!visible) return null;

  const ResolvedIcon = resolveTodoIcon(form.icon);

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
          {/* 제목 행 */}
          <View style={styles.titleRow}>
            <AnimatedPressable
              onPress={wrapToolbarCallback(toolbarCallbacks.onIconPress)}
              hapticType="selection"
              style={styles.iconBtn}>
              {ResolvedIcon ? (
                <ResolvedIcon size={22} color="#6B7280" />
              ) : (
                <ClipboardList size={22} color="#9CA3AF" />
              )}
            </AnimatedPressable>

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

          {/* 구분선 + 툴바 */}
          <View style={styles.divider} />
          <AttributeToolbar
            form={form}
            onDatePress={wrapToolbarCallback(toolbarCallbacks.onDatePress)}
            onTimePress={wrapToolbarCallback(toolbarCallbacks.onTimePress)}
            onAlarmPress={wrapToolbarCallback(toolbarCallbacks.onAlarmPress)}
            onRecurrencePress={wrapToolbarCallback(toolbarCallbacks.onRecurrencePress)}
            onPriorityPress={wrapToolbarCallback(toolbarCallbacks.onPriorityPress)}
          />
        </View>
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
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
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
