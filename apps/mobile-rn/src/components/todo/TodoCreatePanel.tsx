/**
 * TodoCreatePanel
 * TickTick 스타일 — @gorhom/bottom-sheet (non-modal) 기반 인라인 입력 패널
 * - 핸들 숨김 (패널처럼 보이게)
 * - keyboardBehavior="interactive" → iOS 키보드와 네이티브 동기화 (key remount로 stale state 방지)
 * - BottomSheetTextInput → 키보드-패널 gap 해소
 * - enableDynamicSizing → 콘텐츠에 따른 자동 높이
 * - enablePanDownToClose → 아래로 스와이프하면 닫기
 * - 우선순위/아이콘 칩 → Popover (Modal 기반, BottomSheet 위에 표시)
 */
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  Keyboard,
  StyleSheet,
  Dimensions,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {AnimatedPressable, Popover} from '@/components/core';
import {AttributeToolbar, type AnchorRect} from './AttributeToolbar';
import {InlineIconPicker} from './InlineIconPicker';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {Flag, Star, Zap, AlertCircle, AlertTriangle, Minus} from 'lucide-react-native';
import type {UseTodoFormReturn} from './useTodoForm';

// ============================================
// Types
// ============================================

type ActivePop = 'none' | 'priority' | 'icon';

interface ToolbarCallbacks {
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
    const [activePop, setActivePop] = useState<ActivePop>('none');
    const [popAnchor, setPopAnchor] = useState<AnchorRect | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [sheetKey, setSheetKey] = useState(0);

    useImperativeHandle(ref, () => ({
      expand: () => {
        Keyboard.dismiss();
        setActivePop('none');
        pendingFocusRef.current = true;
        bottomSheetRef.current?.expand();
        setIsOpen(true);
      },
      close: () => {
        Keyboard.dismiss();
        setActivePop('none');
        bottomSheetRef.current?.close();
        setIsOpen(false);
      },
    }));

    const handleSheetChange = useCallback((index: number) => {
      if (index === -1) {
        Keyboard.dismiss();
        setIsOpen(false);
        setActivePop('none');
        setSheetKey(prev => prev + 1);
      } else if (index >= 0 && pendingFocusRef.current) {
        pendingFocusRef.current = false;
        setTimeout(() => titleInputRef.current?.focus(), 100);
      }
    }, []);

    const handleSavePress = useCallback(() => {
      handleSave(() => {
        Keyboard.dismiss();
        setActivePop('none');
        bottomSheetRef.current?.close();
        setIsOpen(false);
      });
    }, [handleSave]);

    const handlePriorityPress = useCallback((anchor: AnchorRect) => {
      setPopAnchor(anchor);
      setActivePop('priority');
    }, []);

    const handleIconPress = useCallback((anchor: AnchorRect) => {
      setPopAnchor(anchor);
      setActivePop('icon');
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
      <>
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

              {/* 구분선 + 3칩 툴바 */}
              <View style={styles.divider} />
              <AttributeToolbar
                form={form}
                compact
                onDatePress={toolbarCallbacks.onDatePress}
                onPriorityPress={handlePriorityPress}
                onIconPress={handleIconPress}
              />
            </View>
          </BottomSheetView>
        </BottomSheet>

        {/* 우선순위 팝오버 */}
        {activePop === 'priority' && popAnchor && (
          <Popover
            visible
            onClose={() => setActivePop('none')}
            anchorPosition={popAnchor}
            horizontalAlign="left"
            width={260}>
            <PriorityPopoverContent
              importance={form.importance}
              urgency={form.urgency}
              isReluctantMustDo={form.isReluctantMustDo}
              onImportanceChange={v => updateField('importance', v)}
              onUrgencyChange={v => updateField('urgency', v)}
              onReluctantChange={v => updateField('isReluctantMustDo', v)}
            />
          </Popover>
        )}

        {/* 아이콘 팝오버 */}
        {activePop === 'icon' && popAnchor && (
          <Popover
            visible
            onClose={() => setActivePop('none')}
            anchorPosition={popAnchor}
            horizontalAlign="left"
            width={Math.min(Dimensions.get('window').width - 32, 340)}>
            <InlineIconPicker
              selectedIcon={form.icon}
              onIconChange={v => updateField('icon', v)}
            />
          </Popover>
        )}
      </>
    );
  },
);

// ============================================
// PriorityPopoverContent — 팝오버 내부 컴포넌트
// ============================================

interface PriorityPopoverContentProps {
  importance: boolean;
  urgency: boolean;
  isReluctantMustDo: boolean;
  onImportanceChange: (v: boolean) => void;
  onUrgencyChange: (v: boolean) => void;
  onReluctantChange: (v: boolean) => void;
}

function PriorityPopoverContent({
  importance,
  urgency,
  isReluctantMustDo,
  onImportanceChange,
  onUrgencyChange,
  onReluctantChange,
}: PriorityPopoverContentProps) {
  const {primaryColor} = useTheme();
  const haptic = useHaptic();

  const priorityInfo = useMemo(() => {
    if (importance && urgency) return {icon: AlertTriangle, color: '#DC2626', label: '긴급 + 중요'};
    if (importance) return {icon: Star, color: '#B45309', label: '중요'};
    if (urgency) return {icon: Zap, color: '#1D4ED8', label: '긴급'};
    return {icon: Minus, color: '#6B7280', label: '보통'};
  }, [importance, urgency]);

  return (
    <View style={popStyles.container}>
      {/* 헤더 */}
      <View style={popStyles.header}>
        <Flag size={16} color={primaryColor} />
        <Text style={popStyles.headerTitle}>우선순위</Text>
      </View>

      {/* 현재 상태 뱃지 */}
      <View style={popStyles.badgeRow}>
        <priorityInfo.icon size={13} color={priorityInfo.color} />
        <Text style={[popStyles.badge, {color: priorityInfo.color}]}>{priorityInfo.label}</Text>
      </View>

      {/* 3개 토글 버튼 */}
      <View style={popStyles.row}>
        <AnimatedPressable
          onPress={() => { haptic.selection(); onImportanceChange(!importance); }}
          haptic={false}
          style={[
            popStyles.btn,
            importance && popStyles.btnActive,
            importance && {borderColor: '#F59E0B'},
          ]}>
          <View style={popStyles.btnContent}>
            <Star size={13} color={importance ? '#F59E0B' : '#4B5563'} />
            <Text style={popStyles.btnText}>중요</Text>
          </View>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => { haptic.selection(); onUrgencyChange(!urgency); }}
          haptic={false}
          style={[
            popStyles.btn,
            urgency && popStyles.btnActive,
            urgency && {borderColor: '#3B82F6'},
          ]}>
          <View style={popStyles.btnContent}>
            <Zap size={13} color={urgency ? '#3B82F6' : '#4B5563'} />
            <Text style={popStyles.btnText}>긴급</Text>
          </View>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => { haptic.selection(); onReluctantChange(!isReluctantMustDo); }}
          haptic={false}
          style={[
            popStyles.btn,
            isReluctantMustDo && popStyles.btnActive,
            isReluctantMustDo && {borderColor: '#EF4444'},
          ]}>
          <View style={popStyles.btnContent}>
            <AlertCircle size={13} color={isReluctantMustDo ? '#EF4444' : '#4B5563'} />
            <Text style={popStyles.btnText}>해야 할 일</Text>
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}

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

const popStyles = StyleSheet.create({
  container: {padding: 16},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  headerTitle: {fontSize: 15, fontWeight: '600', color: '#1F2937'},
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  badge: {fontSize: 13, fontWeight: '600'},
  row: {flexDirection: 'row', gap: 6},
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  btnActive: {backgroundColor: '#FFF7ED'},
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnText: {fontSize: 12, fontWeight: '600', color: '#4B5563'},
});
