/**
 * TodoEditOverlay
 * 풀스크린 편집 오버레이 — TickTick Edit 스타일
 * - 아래→위 슬라이드 진입 애니메이션
 * - Header → 날짜요약+체크박스 → ScrollView(제목+설명)
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Keyboard,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import Animated, {
  SlideInDown,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AnimatedPressable} from '@/components/core';
import {getDateSummary, getDateSummaryExtras} from './useTodoForm';
import {useTheme} from '@/theme';
import {ChevronLeft, Square, CheckSquare, Shield, Star, Zap, FolderOpen, Palette, Sparkles, Check, X} from 'lucide-react-native';
import {useProjectStore} from '@/stores/projectStore';
import {useMotivationStore, type Note} from '@/stores/motivationStore';
import {useAuthStore} from '@/stores/authStore';
import {useTodoStore} from '@/stores/todoStore';
import {supabase} from '@/lib/supabase';
import {ProjectPickerModal} from './ProjectPickerModal';
import {InlineIconPicker} from './InlineIconPicker';
import {EMOTION_CONFIG} from '@/lib/motivationUtils';
import type {UseTodoFormReturn} from './useTodoForm';

const TODO_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#14B8A6',
  '#3B82F6', '#6366F1', '#9333EA', '#EC4899', '#6B7280',
];

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
  const {primaryColor, colors} = useTheme();
  const insets = useSafeAreaInsets();
  const titleInputRef = useRef<TextInput>(null);
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);
  const [iconColorModalVisible, setIconColorModalVisible] = useState(false);
  const [motivationModalVisible, setMotivationModalVisible] = useState(false);

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

  return (
    <Animated.View
      entering={SlideInDown.duration(300)}
      style={[styles.overlay, {paddingTop: 0}]}>
      <View style={styles.flex}>
        {/* ──────── 헤더 ──────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AnimatedPressable
              onPress={handleClosePress}
              hapticType="light"
              style={styles.closeBtn}>
              <ChevronLeft size={20} color="#374151" strokeWidth={2.5} />
            </AnimatedPressable>

            {/* 프로젝트 */}
            <Pressable
              onPress={() => setProjectPickerVisible(true)}
              hitSlop={4}
              style={({pressed}) => [
                styles.iconColorToggle,
                linkedProject && {backgroundColor: (linkedProject.color ?? '#A8DADC') + '18'},
                pressed && {opacity: 0.7},
              ]}>
              <FolderOpen size={16} color={linkedProject ? (linkedProject.color ?? '#A8DADC') : '#D1D5DB'} />
            </Pressable>

            {/* 아이콘/색상 편집 */}
            <Pressable
              onPress={() => setIconColorModalVisible(true)}
              hitSlop={4}
              style={({pressed}) => [
                styles.iconColorToggle,
                pressed && {opacity: 0.7},
              ]}>
              <Palette size={16} color="#9CA3AF" />
            </Pressable>

            {/* 원동력 연결 */}
            <Pressable
              onPress={() => setMotivationModalVisible(true)}
              hitSlop={4}
              style={({pressed}) => [
                styles.iconColorToggle,
                pressed && {opacity: 0.7},
              ]}>
              <Sparkles size={16} color="#9CA3AF" />
            </Pressable>
          </View>

          <View style={styles.headerActions}>
            <AnimatedPressable
              onPress={handleDeletePress}
              hapticType="light"
              style={styles.deleteBtn}>
              <Text style={[styles.deleteBtnText, {color: colors.error}]}>삭제</Text>
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
          {/* 제목 */}
          <View style={styles.titleSection}>
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

      {/* 아이콘/색상 선택 모달 */}
      <IconColorPickerModal
        visible={iconColorModalVisible}
        selectedIcon={form.icon}
        selectedColor={form.color}
        onIconChange={v => updateField('icon', v)}
        onColorChange={v => updateField('color', v)}
        onClose={() => setIconColorModalVisible(false)}
      />

      {/* 원동력 선택 모달 */}
      {editingTodo && (
        <MotivationPickerModal
          visible={motivationModalVisible}
          todoId={editingTodo.id}
          onClose={() => setMotivationModalVisible(false)}
        />
      )}
    </Animated.View>
  );
}

// ============================================
// IconColorPickerModal
// ============================================

interface IconColorPickerModalProps {
  visible: boolean;
  selectedIcon: string;
  selectedColor: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  onClose: () => void;
}

function IconColorPickerModal({
  visible,
  selectedIcon,
  selectedColor,
  onIconChange,
  onColorChange,
  onClose,
}: IconColorPickerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[modalStyles.container, {paddingTop: 8}]}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.headerTitle}>아이콘 & 색상</Text>
          <Pressable onPress={onClose} hitSlop={8} style={modalStyles.closeBtn}>
            <Text style={modalStyles.closeBtnText}>완료</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[modalStyles.content, {paddingBottom: insets.bottom + 20}]}
          showsVerticalScrollIndicator={false}>
          <Text style={modalStyles.sectionLabel}>아이콘</Text>
          <InlineIconPicker
            selectedIcon={selectedIcon}
            onIconChange={onIconChange}
            popover
          />

          <Text style={[modalStyles.sectionLabel, {marginTop: 20}]}>색상</Text>
          <View style={modalStyles.colorGrid}>
            {TODO_COLORS.map(color => {
              const isSelected = selectedColor === color;
              return (
                <Pressable
                  key={color}
                  onPress={() => onColorChange(isSelected ? '' : color)}
                  style={[
                    modalStyles.colorSwatch,
                    {backgroundColor: color},
                    isSelected && modalStyles.colorSwatchSelected,
                  ]}>
                  {isSelected && <Text style={modalStyles.colorCheck}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
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
  closeBtnText: {fontSize: 15, fontWeight: '600', color: '#3B82F6'},
  content: {paddingHorizontal: 16, paddingTop: 16},
  sectionLabel: {fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 10},
  colorGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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

// ============================================
// MotivationPickerModal
// ============================================

interface MotivationPickerModalProps {
  visible: boolean;
  todoId: string;
  onClose: () => void;
}

function MotivationPickerModal({visible, todoId, onClose}: MotivationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const {primaryColor} = useTheme();
  const {notes, fetchMotivationNotes} = useMotivationStore();
  const user = useAuthStore(s => s.user);
  const {fetchMotivationsForTodos} = useTodoStore();
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [loadingLinks, setLoadingLinks] = useState(true);

  // 모달 열릴 때 데이터 로드
  useEffect(() => {
    if (!visible || !user?.id) return;
    setLoadingLinks(true);
    (async () => {
      try {
        await fetchMotivationNotes(user.id);
        const {data} = await supabase
          .from('todo_motivations')
          .select('motivation_id')
          .eq('todo_id', todoId);
        setLinkedIds(new Set((data ?? []).map(r => r.motivation_id)));
      } finally {
        setLoadingLinks(false);
      }
    })();
  }, [visible, user?.id, todoId, fetchMotivationNotes]);

  const handleToggle = useCallback(async (motivationId: string) => {
    if (!user?.id) return;
    const isLinked = linkedIds.has(motivationId);
    // Optimistic update
    setLinkedIds(prev => {
      const next = new Set(prev);
      if (isLinked) next.delete(motivationId);
      else next.add(motivationId);
      return next;
    });

    try {
      if (isLinked) {
        await supabase
          .from('todo_motivations')
          .delete()
          .eq('todo_id', todoId)
          .eq('motivation_id', motivationId);
      } else {
        await supabase
          .from('todo_motivations')
          .insert({todo_id: todoId, motivation_id: motivationId, user_id: user.id});
      }
    } catch {
      // Rollback
      setLinkedIds(prev => {
        const next = new Set(prev);
        if (isLinked) next.add(motivationId);
        else next.delete(motivationId);
        return next;
      });
    }
  }, [user?.id, todoId, linkedIds]);

  const handleClose = useCallback(() => {
    // 닫힐 때 todoStore의 motivationMap 갱신
    fetchMotivationsForTodos([todoId]);
    onClose();
  }, [todoId, fetchMotivationsForTodos, onClose]);

  const motivationNotes = useMemo(
    () => notes.filter(n => n.category === 'motivation' || !n.category),
    [notes],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <View style={[motModalStyles.container, {paddingTop: 8}]}>
        <View style={motModalStyles.header}>
          <Text style={motModalStyles.headerTitle}>원동력 연결</Text>
          <Pressable onPress={handleClose} hitSlop={8} style={motModalStyles.closeBtn}>
            <Text style={[motModalStyles.closeBtnText, {color: primaryColor}]}>완료</Text>
          </Pressable>
        </View>

        {loadingLinks ? (
          <View style={motModalStyles.emptyContainer}>
            <Text style={motModalStyles.emptyText}>불러오는 중...</Text>
          </View>
        ) : motivationNotes.length === 0 ? (
          <View style={motModalStyles.emptyContainer}>
            <Sparkles size={32} color="#D1D5DB" />
            <Text style={motModalStyles.emptyText}>원동력이 없습니다</Text>
            <Text style={motModalStyles.emptySubText}>홈 화면에서 원동력을 먼저 작성해 주세요</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[motModalStyles.listContent, {paddingBottom: insets.bottom + 20}]}
            showsVerticalScrollIndicator={false}>
            {motivationNotes.map(note => {
              const isLinked = linkedIds.has(note.id);
              const emotionCfg = note.emotion_tag ? EMOTION_CONFIG[note.emotion_tag] : null;
              return (
                <Pressable
                  key={note.id}
                  onPress={() => handleToggle(note.id)}
                  style={({pressed}) => [
                    motModalStyles.noteItem,
                    isLinked && {backgroundColor: `${primaryColor}08`, borderColor: primaryColor},
                    pressed && {opacity: 0.7},
                  ]}>
                  <View style={motModalStyles.noteContent}>
                    {emotionCfg && (
                      <View style={[motModalStyles.emotionBadge, {backgroundColor: emotionCfg.bgColor}]}>
                        <emotionCfg.icon size={14} color={emotionCfg.color} />
                      </View>
                    )}
                    <View style={motModalStyles.noteTextArea}>
                      {note.title ? (
                        <Text style={motModalStyles.noteTitle} numberOfLines={1}>{note.title}</Text>
                      ) : null}
                      <Text style={motModalStyles.noteText} numberOfLines={2}>{note.content}</Text>
                    </View>
                  </View>
                  <View style={[
                    motModalStyles.checkCircle,
                    isLinked && {backgroundColor: primaryColor, borderColor: primaryColor},
                  ]}>
                    {isLinked && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const motModalStyles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
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
  closeBtnText: {fontSize: 15, fontWeight: '600'},
  listContent: {paddingTop: 8, paddingHorizontal: 16},
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    gap: 12,
  },
  noteContent: {flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  emotionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  noteTextArea: {flex: 1},
  noteTitle: {fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 2},
  noteText: {fontSize: 13, color: '#6B7280', lineHeight: 18},
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8},
  emptyText: {fontSize: 15, color: '#9CA3AF', fontWeight: '500'},
  emptySubText: {fontSize: 13, color: '#D1D5DB'},
});

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
    paddingVertical: 6,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconColorToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
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
    textAlignVertical: 'top',
  },
  scrollContent: {
    // paddingBottom은 인라인으로 insets.bottom + 20 처리
  },
});
