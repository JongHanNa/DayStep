/**
 * TodoEditOverlay
 * 풀스크린 편집 오버레이 — TickTick Edit 스타일
 * - 아래→위 슬라이드 진입 애니메이션
 * - Header → 날짜요약+체크박스 → ScrollView(제목+설명)
 */
import {useCallback, useMemo, useRef, useState} from 'react';
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
import {ClipboardList, Square, CheckSquare, Shield, Star, Zap, FolderOpen} from 'lucide-react-native';
import {useProjectStore} from '@/stores/projectStore';
import {ProjectPickerModal} from './ProjectPickerModal';
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
  mode,
  editingTodo,
}: TodoEditOverlayProps) {
  const {primaryColor} = useTheme();
  const insets = useSafeAreaInsets();
  const titleInputRef = useRef<TextInput>(null);
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);

  const projects = useProjectStore(s => s.projects);
  const linkedProject = useMemo(
    () =>
      form.projectId
        ? projects.find(p => p.id === form.projectId) ?? null
        : null,
    [form.projectId, projects],
  );

  const handleProjectSelect = useCallback(
    async (projectId: string | null) => {
      updateField('projectId', projectId);
      // edit 모드일 때 Supabase 즉시 저장
      if (mode === 'edit' && editingTodo) {
        try {
          const {supabase} = await import('@/lib/supabase');
          await supabase
            .from('todos')
            .update({project_id: projectId})
            .eq('id', editingTodo.id);
        } catch {
          // 저장 실패 시 무시 (최종 저장 버튼에서 반영)
        }
      }
    },
    [updateField, mode, editingTodo],
  );

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
          <View style={styles.headerLeft}>
            <AnimatedPressable
              onPress={handleClosePress}
              hapticType="light"
              style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>← 닫기</Text>
            </AnimatedPressable>

            {/* 프로젝트 배지 */}
            <Pressable
              onPress={() => setProjectPickerVisible(true)}
              hitSlop={4}
              style={({pressed}) => [
                styles.projectBadge,
                linkedProject && {backgroundColor: (linkedProject.color ?? '#A8DADC') + '18'},
                pressed && styles.projectBadgePressed,
              ]}>
              {linkedProject ? (
                <>
                  <View
                    style={[
                      styles.projectDot,
                      {backgroundColor: linkedProject.color ?? '#A8DADC'},
                    ]}
                  />
                  <Text style={styles.projectBadgeText} numberOfLines={1}>
                    {linkedProject.title}
                  </Text>
                </>
              ) : (
                <FolderOpen size={16} color="#D1D5DB" />
              )}
            </Pressable>
          </View>

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
            <Text style={[styles.dateSummaryText, {flex: 1}]} numberOfLines={1}>
              {[dateSummary, ...dateSummaryExtras].join(' · ')}
            </Text>
          </Pressable>
        </View>

        {/* ──────── 태그 행 ──────── */}
        {(form.isReluctantMustDo || form.importance || form.urgency) && (
          <View style={styles.tagRow}>
            {form.isReluctantMustDo && (
              <View style={styles.tag}>
                <Shield size={12} color="#6B7280" />
                <Text style={styles.tagText}>해야 할 일</Text>
              </View>
            )}
            {form.importance && (
              <View style={styles.tag}>
                <Star size={12} color="#6B7280" />
                <Text style={styles.tagText}>중요</Text>
              </View>
            )}
            {form.urgency && (
              <View style={styles.tag}>
                <Zap size={12} color="#6B7280" />
                <Text style={styles.tagText}>긴급</Text>
              </View>
            )}
          </View>
        )}

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

      {/* 프로젝트 선택 모달 */}
      <ProjectPickerModal
        visible={projectPickerVisible}
        selectedProjectId={form.projectId}
        onSelect={handleProjectSelect}
        onClose={() => setProjectPickerVisible(false)}
      />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
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
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 140,
  },
  projectBadgePressed: {
    opacity: 0.7,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    flexShrink: 1,
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
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateSummaryRowPressed: {
    backgroundColor: '#F3F4F6',
  },
  dateSummaryText: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Tags
  tagRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    color: '#6B7280',
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
