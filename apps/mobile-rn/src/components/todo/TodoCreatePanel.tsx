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
  useEffect,
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
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {useUIStore} from '@/stores/uiStore';
import BottomSheet, {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {AnimatedPressable, Popover} from '@/components/core';
import {AttributeToolbar, type AnchorRect} from './AttributeToolbar';
import {InlineIconPicker} from './InlineIconPicker';
import {useTheme} from '@/theme';
import {fixedColors} from '@/theme/colors';
import {useHaptic} from '@/hooks/useHaptic';
import {Flag, Star, Zap, AlertCircle, AlertTriangle, Minus, X} from 'lucide-react-native';
import type {UseTodoFormReturn} from './useTodoForm';

// ============================================
// Types
// ============================================

type ActivePop = 'none' | 'priority' | 'iconColor';

const TODO_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#14B8A6',
  '#3B82F6', '#6366F1', '#9333EA', '#EC4899', '#6B7280',
];

interface ToolbarCallbacks {
  onDatePress: () => void;
}

export interface TodoCreatePanelRef {
  expand: () => void;
  close: () => void;
  hideForSub: () => void;
  restoreFromSub: () => void;
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
    const {width: screenWidth, height: screenHeight} = useWindowDimensions();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const iconColorSheetRef = useRef<BottomSheetModal>(null);
    const titleInputRef = useRef<any>(null);
    const descInputRef = useRef<any>(null);
    const pendingFocusRef = useRef(false);
    const lastFocusRef = useRef<'title' | 'desc'>('title');
    const [activePop, setActivePop] = useState<ActivePop>('none');
    const [popAnchor, setPopAnchor] = useState<AnchorRect | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [sheetKey, setSheetKey] = useState(0);
    const [hiddenForSub, setHiddenForSub] = useState(false);
    const iconColorSnapPoints = useMemo(() => ['65%'], []);

    useEffect(() => {
      const sub = AppState.addEventListener('change', nextState => {
        if (nextState === 'background' || nextState === 'inactive') {
          Keyboard.dismiss();
          titleInputRef.current?.blur();
        }
      });
      return () => sub.remove();
    }, []);

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
      hideForSub: () => hideForSubSheet(),
      restoreFromSub: () => restoreFromSubSheet(),
    }));

    const setBottomSheetOpen = useUIStore(s => s.setBottomSheetOpen);

    const handleSheetChange = useCallback((index: number) => {
      if (index === -1) {
        if (!hiddenForSub) {
          // 정상 닫기 — 폼 리셋
          Keyboard.dismiss();
          setIsOpen(false);
          setActivePop('none');
          setSheetKey(prev => prev + 1);
          setBottomSheetOpen(false);
        }
        // hiddenForSub일 때는 서브시트를 위해 숨긴 것이므로 리셋하지 않음
      } else if (index >= 0) {
        setBottomSheetOpen(true);
        if (pendingFocusRef.current) {
          pendingFocusRef.current = false;
          const target = lastFocusRef.current === 'desc' ? descInputRef : titleInputRef;
          setTimeout(() => target.current?.focus(), 100);
        }
      }
    }, [setBottomSheetOpen]);

    const handleSavePress = useCallback(() => {
      handleSave(() => {
        Keyboard.dismiss();
        setActivePop('none');
        bottomSheetRef.current?.close();
        setIsOpen(false);
      });
    }, [handleSave]);

    // 서브 팝오버/시트 열릴 때: 모달 숨기기 + 키보드 dismiss
    const hideForSubSheet = useCallback(() => {
      Keyboard.dismiss();
      setHiddenForSub(true);
      bottomSheetRef.current?.close();
    }, []);

    // 서브 팝오버/시트 닫힐 때: 모달 복원 + 포커스 복원
    // focus는 handleSheetChange(index >= 0)에서 pendingFocusRef를 소비하여 실행
    // (iOS에서 expand 애니메이션 완료 전 focus가 먼저 실행되면 키보드만 남는 race 방지)
    const restoreFromSubSheet = useCallback(() => {
      setActivePop('none');
      setHiddenForSub(false);
      pendingFocusRef.current = true;
      bottomSheetRef.current?.expand();
    }, []);

    const handlePriorityPress = useCallback((anchor: AnchorRect) => {
      setPopAnchor(anchor);
      setActivePop('priority');
      hideForSubSheet();
    }, [hideForSubSheet]);

    const handleIconColorPress = useCallback(() => {
      hideForSubSheet();
      setActivePop('iconColor');
      setTimeout(() => iconColorSheetRef.current?.present(), 100);
    }, [hideForSubSheet]);

    const handleIconColorDismiss = useCallback(() => {
      setActivePop('none');
      restoreFromSubSheet();
    }, [restoreFromSubSheet]);

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
          maxDynamicContentSize={200}
          enablePanDownToClose
          keyboardBehavior="interactive"
          keyboardBlurBehavior="none"
          android_keyboardInputMode="adjustResize"
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
                  onFocus={() => { lastFocusRef.current = 'title'; }}
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
                ref={descInputRef}
                value={form.content}
                onChangeText={(v: string) => updateField('content', v)}
                placeholder="설명 추가"
                placeholderTextColor="#D1D5DB"
                style={styles.descInput}
                multiline
                scrollEnabled
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => { lastFocusRef.current = 'desc'; }}
              />

              {/* 구분선 + 3칩 툴바 — 빈 영역 터치 시 키보드 유지 */}
              <View
                style={styles.divider}
                onStartShouldSetResponder={() => true}
              />
              <AttributeToolbar
                form={form}
                compact
                onDatePress={toolbarCallbacks.onDatePress}
                onPriorityPress={handlePriorityPress}
                onIconColorPress={handleIconColorPress}
              />
            </View>
          </BottomSheetView>
        </BottomSheet>

        {/* 우선순위 팝오버 */}
        {activePop === 'priority' && popAnchor && (
          <Popover
            visible
            onClose={restoreFromSubSheet}
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

        {/* 아이콘 & 색상 BottomSheetModal */}
        <BottomSheetModal
          ref={iconColorSheetRef}
          snapPoints={iconColorSnapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          handleComponent={null}
          backgroundStyle={styles.sheetBg}
          onDismiss={handleIconColorDismiss}>
          <BottomSheetView style={{flex: 1}}>
            <View style={iconColorStyles.header}>
              <Text style={iconColorStyles.headerTitle}>아이콘 & 색상</Text>
              <AnimatedPressable
                onPress={() => iconColorSheetRef.current?.dismiss()}
                hapticType="light"
                style={iconColorStyles.closeBtn}>
                <X size={20} color="#6B7280" />
              </AnimatedPressable>
            </View>
            <ScrollView
              contentContainerStyle={iconColorStyles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always">
              <Text style={iconColorStyles.sectionLabel}>아이콘</Text>
              <InlineIconPicker
                selectedIcon={form.icon}
                onIconChange={v => updateField('icon', v)}
                popover
              />
              <Text style={[iconColorStyles.sectionLabel, {marginTop: 20}]}>색상</Text>
              <View style={iconColorStyles.colorGrid}>
                {TODO_COLORS.map(color => {
                  const isSelected = form.color === color;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => updateField('color', isSelected ? '' : color)}
                      style={[
                        iconColorStyles.colorSwatch,
                        {backgroundColor: color},
                        isSelected && iconColorStyles.colorSwatchSelected,
                      ]}>
                      {isSelected && <Text style={iconColorStyles.colorCheck}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </BottomSheetView>
        </BottomSheetModal>
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
            importance && {borderColor: fixedColors.priorityImportance},
          ]}>
          <View style={popStyles.btnContent}>
            <Star size={13} color={importance ? fixedColors.priorityImportance : '#4B5563'} />
            <Text style={popStyles.btnText}>중요</Text>
          </View>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => { haptic.selection(); onUrgencyChange(!urgency); }}
          haptic={false}
          style={[
            popStyles.btn,
            urgency && popStyles.btnActive,
            urgency && {borderColor: fixedColors.priorityUrgency},
          ]}>
          <View style={popStyles.btnContent}>
            <Zap size={13} color={urgency ? fixedColors.priorityUrgency : '#4B5563'} />
            <Text style={popStyles.btnText}>긴급</Text>
          </View>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => { haptic.selection(); onReluctantChange(!isReluctantMustDo); }}
          haptic={false}
          style={[
            popStyles.btn,
            isReluctantMustDo && popStyles.btnActive,
            isReluctantMustDo && {borderColor: fixedColors.priorityReluctant},
          ]}>
          <View style={popStyles.btnContent}>
            <AlertCircle size={13} color={isReluctantMustDo ? fixedColors.priorityReluctant : '#4B5563'} />
            <Text style={popStyles.btnText}>해야 할 일</Text>
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}

// ============================================
// ColorPopoverContent — 색상 선택 팝오버
// ============================================

interface ColorPopoverContentProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

function ColorPopoverContent({selectedColor, onColorChange}: ColorPopoverContentProps) {
  const haptic = useHaptic();
  const {primaryColor} = useTheme();

  return (
    <View style={popStyles.container}>
      <View style={popStyles.header}>
        <View style={[colorStyles.headerDot, {backgroundColor: primaryColor}]} />
        <Text style={popStyles.headerTitle}>색상</Text>
      </View>
      <View style={colorStyles.grid}>
        {TODO_COLORS.map(color => {
          const isSelected = selectedColor === color;
          return (
            <AnimatedPressable
              key={color}
              onPress={() => {
                haptic.selection();
                onColorChange(isSelected ? '' : color);
              }}
              haptic={false}
              style={[
                colorStyles.swatch,
                {backgroundColor: color},
                isSelected && colorStyles.swatchSelected,
              ]}>
              {isSelected && <Text style={colorStyles.check}>✓</Text>}
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const colorStyles = StyleSheet.create({
  headerDot: {width: 14, height: 14, borderRadius: 7},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  check: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
});

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
    paddingBottom: 4,
    textAlignVertical: 'top',
    minHeight: 28,
    maxHeight: 80,
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

const iconColorStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#1F2937'},
  closeBtn: {padding: 4},
  content: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40},
  sectionLabel: {fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 10},
  colorGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  colorCheck: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
});
