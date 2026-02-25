/**
 * TodoCreatePanel
 * TickTick 스타일 — @gorhom/bottom-sheet (non-modal) 기반 인라인 입력 패널
 * - 핸들 숨김 (패널처럼 보이게)
 * - keyboardBehavior="interactive" → iOS 키보드와 네이티브 동기화 (key remount로 stale state 방지)
 * - BottomSheetTextInput → 키보드-패널 gap 해소
 * - enableDynamicSizing → 아이콘 피커 등 콘텐츠에 따른 자동 높이
 * - enablePanDownToClose → 아래로 스와이프하면 닫기
 */
import React, {useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle} from 'react';
import {
  View,
  Text,
  Keyboard,
  StyleSheet,
  Pressable,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {AttributeToolbar} from './AttributeToolbar';
import {InlineIconPicker} from './InlineIconPicker';
import {useTheme} from '@/theme';
import type {UseTodoFormReturn} from './useTodoForm';

// ============================================
// Types
// ============================================

type ActivePanel = 'none' | 'icon';

interface ToolbarCallbacks {
  onPriorityPress: () => void;
  onDatePress: () => void;
}

export interface TodoCreatePanelRef {
  expand: () => void;
  close: () => void;
}

interface TodoCreatePanelProps extends UseTodoFormReturn {
  toolbarCallbacks: ToolbarCallbacks;
}

// ============================================
// Component
// ============================================

export const TodoCreatePanel = forwardRef<TodoCreatePanelRef, TodoCreatePanelProps>(
  function TodoCreatePanel(
    {
      form,
      updateField,
      saving,
      handleSave,
      toolbarCallbacks,
    },
    ref,
  ) {
    const {primaryColor} = useTheme();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const titleInputRef = useRef<any>(null);
    const pendingFocusRef = useRef(false);
    const [activePanel, setActivePanel] = useState<ActivePanel>('none');
    const [isOpen, setIsOpen] = useState(false);
    const [sheetKey, setSheetKey] = useState(0);

    useImperativeHandle(ref, () => ({
      expand: () => {
        Keyboard.dismiss();
        setActivePanel('none');
        pendingFocusRef.current = true;
        bottomSheetRef.current?.expand();
        setIsOpen(true);
      },
      close: () => {
        Keyboard.dismiss();
        setActivePanel('none');
        bottomSheetRef.current?.close();
        setIsOpen(false);
      },
    }));

    const handleSheetChange = useCallback((index: number) => {
      if (index === -1) {
        Keyboard.dismiss();
        setIsOpen(false);
        setActivePanel('none');
        setSheetKey(prev => prev + 1);
      } else if (index >= 0 && pendingFocusRef.current) {
        pendingFocusRef.current = false;
        setTimeout(() => titleInputRef.current?.focus(), 100);
      }
    }, []);

    const handleSavePress = useCallback(() => {
      handleSave(() => {
        Keyboard.dismiss();
        setActivePanel('none');
        bottomSheetRef.current?.close();
        setIsOpen(false);
      });
    }, [handleSave]);

    // 아이콘 칩 → 인라인 아이콘 피커 토글
    const handleIconPress = useCallback(() => {
      setActivePanel(prev => prev === 'icon' ? 'none' : 'icon');
    }, []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheet
        key={sheetKey}
        ref={bottomSheetRef}
        index={-1}
        enableDynamicSizing
        enablePanDownToClose
        keyboardBehavior="interactive"
        handleComponent={null}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        onChange={handleSheetChange}>
        <BottomSheetView>
          <View style={styles.panel}>
            {/* 제목 행 */}
            <View style={styles.titleRow}>
              <BottomSheetTextInput
                ref={titleInputRef}
                value={form.title}
                onChangeText={(v: string) => updateField('title', v)}
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
            <BottomSheetTextInput
              value={form.content}
              onChangeText={(v: string) => updateField('content', v)}
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
              onDatePress={toolbarCallbacks.onDatePress}
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
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  panel: {
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
