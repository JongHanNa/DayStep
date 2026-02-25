/**
 * TodoEditOverlay
 * 풀스크린 편집 오버레이 — TickTick Edit 스타일
 * - 아래→위 슬라이드 진입 애니메이션
 * - Header → 날짜요약+체크박스 → ScrollView(제목+설명)
 */
import React, {useCallback, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  Keyboard,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated, {
  SlideInDown,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AnimatedPressable} from '@/components/core';
import {getDateSummary, getDateSummaryExtras} from './useTodoForm';
import {useTheme} from '@/theme';
import {resolveTodoIcon} from '@/lib/iconMap';
import {ClipboardList, ChevronRight, Square, CheckSquare} from 'lucide-react-native';
import type {UseTodoFormReturn} from './useTodoForm';

// ============================================
// Types
// ============================================

interface TodoEditOverlayProps extends UseTodoFormReturn {
  visible: boolean;
  onClose: () => void;
  onSchedulePress: () => void;
}

// ============================================
// Component
// ============================================

export function TodoEditOverlay({
  visible,
  onClose,
  onSchedulePress,
  form,
  updateField,
  saving,
  handleSave,
  handleDelete,
}: TodoEditOverlayProps) {
  const {primaryColor} = useTheme();
  const insets = useSafeAreaInsets();
  const titleInputRef = useRef<TextInput>(null);

  const handleSavePress = useCallback(() => {
    Keyboard.dismiss();
    handleSave(() => onClose());
  }, [handleSave, onClose]);

  const handleDeletePress = useCallback(() => {
    handleDelete(() => onClose());
  }, [handleDelete, onClose]);

  const handleClosePress = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleSchedulePress = useCallback(() => {
    Keyboard.dismiss();
    setTimeout(onSchedulePress, 200);
  }, [onSchedulePress]);

  if (!visible) return null;

  const dateSummary = getDateSummary(form);
  const dateSummaryExtras = getDateSummaryExtras(form);
  const ResolvedIcon = resolveTodoIcon(form.icon);

  return (
    <Animated.View
      entering={SlideInDown.duration(300)}
      style={[styles.overlay, {paddingTop: insets.top}]}>
      <View style={styles.flex}>
        {/* ──────── 헤더 ──────── */}
        <View style={styles.header}>
          <AnimatedPressable
            onPress={handleClosePress}
            hapticType="light"
            style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>← 닫기</Text>
          </AnimatedPressable>

          <View style={styles.headerActions}>
            <AnimatedPressable
              onPress={handleDeletePress}
              hapticType="light"
              style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>삭제</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleSavePress}
              hapticType="medium"
              style={[styles.saveBtn, {backgroundColor: primaryColor}]}>
              <Text style={styles.saveBtnText}>
                {saving ? '저장 중...' : '저장'}
              </Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* ──────── 날짜 요약 + 체크박스 ──────── */}
        <View style={styles.dateSummaryOuter}>
          {/* 체크박스 (완료 토글) */}
          <Pressable
            onPress={() => updateField('completed', !form.completed)}
            style={styles.checkboxBtn}
            hitSlop={8}>
            {form.completed ? (
              <CheckSquare size={20} color={primaryColor} />
            ) : (
              <Square size={20} color="#9CA3AF" />
            )}
          </Pressable>

          {/* 날짜 요약 → SchedulePanel 열기 */}
          <Pressable
            onPress={handleSchedulePress}
            style={({pressed}) => [
              styles.dateSummaryRow,
              pressed && styles.dateSummaryRowPressed,
            ]}>
            <View style={styles.dateSummaryContent}>
              <Text style={styles.dateSummaryText} numberOfLines={1}>{dateSummary}</Text>
              {dateSummaryExtras.map((extra, i) => (
                <React.Fragment key={i}>
                  <Text style={styles.dateSummaryDot}>·</Text>
                  <Text style={styles.dateSummaryText}>{extra}</Text>
                </React.Fragment>
              ))}
            </View>
            <ChevronRight size={14} color="#C4C9D4" />
          </Pressable>
        </View>

        {/* ──────── 본문 (ScrollView) ──────── */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + 20},
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* 아이콘 + 제목 */}
          <View style={styles.titleSection}>
            <View style={styles.iconContainer}>
              {ResolvedIcon ? (
                <ResolvedIcon size={20} color="#6B7280" />
              ) : (
                <ClipboardList size={20} color="#9CA3AF" />
              )}
            </View>
            <TextInput
              ref={titleInputRef}
              value={form.title}
              onChangeText={v => updateField('title', v)}
              placeholder="할일을 입력하세요"
              placeholderTextColor="#9CA3AF"
              style={styles.heroTitle}
              multiline
            />
          </View>

          {/* 설명 */}
          <View style={styles.descSection}>
            <TextInput
              value={form.content}
              onChangeText={v => updateField('content', v)}
              placeholder="설명"
              placeholderTextColor="#D1D5DB"
              style={styles.descInput}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  flex: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  closeBtnText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Date summary + checkbox
  dateSummaryOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  checkboxBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateSummaryRowPressed: {
    backgroundColor: '#F3F4F6',
  },
  dateSummaryContent: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateSummaryText: {
    fontSize: 13,
    color: '#6B7280',
  },
  dateSummaryDot: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  // Title
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  heroTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    paddingVertical: 2,
  },
  // Description
  descSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  descInput: {
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 6,
    paddingLeft: 36, // icon width + gap 맞추기
    textAlignVertical: 'top',
  },
  scrollContent: {
    // paddingBottom은 인라인으로 insets.bottom + 20 처리
  },
});
