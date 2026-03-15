/**
 * ProjectFormSheet — BottomSheetModal 프로젝트 생성/편집 폼
 * ref 패턴: openCreate(), openEdit(project), close()
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Keyboard} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {LiquidGlassMenu} from '@/components/native/LiquidGlassMenu';
import {AnimatedPressable} from '@/components/core';
import {LinkedTodosSection} from './LinkedTodosSection';
import {STATUS_LABELS, getStatusMenuItems} from './constants';
import {ActivitySquare, RefreshCw} from 'lucide-react-native';
import {useTheme} from '@/theme';
import {PROJECT_COLORS, PROJECT_ICONS} from '@/types/project';
import type {Project, ProjectStatus} from '@/types/project';
import type {Todo} from '@daystep/shared-core';

export interface ProjectFormSheetRef {
  openCreate: () => void;
  openEdit: (project: Project) => void;
  close: () => void;
}

interface ProjectFormSheetProps {
  userId: string | undefined;
  onSave: (data: {
    title: string;
    description: string | null;
    color: string;
    icon: string;
    editingId?: string;
  }) => Promise<void>;
  onStatusChange: (projectId: string, status: ProjectStatus) => Promise<void>;
  fetchProjectTodos: (userId: string, projectId: string) => Promise<Todo[]>;
  unlinkTodoFromProject: (userId: string, todoId: string) => Promise<boolean>;
}

export const ProjectFormSheet = forwardRef<
  ProjectFormSheetRef,
  ProjectFormSheetProps
>(function ProjectFormSheet(
  {userId, onSave, onStatusChange, fetchProjectTodos, unlinkTodoFromProject},
  ref,
) {
  const {primaryColor} = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['70%', '90%'], []);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState<string>(PROJECT_COLORS[0]);
  const [formIcon, setFormIcon] = useState<string>(PROJECT_ICONS[0]);
  const [linkedTodos, setLinkedTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [saving, setSaving] = useState(false);

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      setEditingProject(null);
      setFormTitle('');
      setFormDesc('');
      setFormColor(PROJECT_COLORS[0]);
      setFormIcon(PROJECT_ICONS[0]);
      setLinkedTodos([]);
      setSaving(false);
      bottomSheetRef.current?.present();
    },
    openEdit: (project: Project) => {
      setEditingProject(project);
      setFormTitle(project.title);
      setFormDesc(project.description ?? '');
      setFormColor(project.color ?? PROJECT_COLORS[0]);
      setFormIcon(project.icon ?? PROJECT_ICONS[0]);
      setSaving(false);
      bottomSheetRef.current?.present();
    },
    close: () => {
      Keyboard.dismiss();
      bottomSheetRef.current?.dismiss();
    },
  }));

  // 편집 모드 진입 시 연결된 할일 로드
  useEffect(() => {
    if (editingProject && userId) {
      setLoadingTodos(true);
      fetchProjectTodos(userId, editingProject.id)
        .then(todos => setLinkedTodos(todos))
        .finally(() => setLoadingTodos(false));
    } else {
      setLinkedTodos([]);
    }
  }, [editingProject?.id, userId]);

  const handleSave = useCallback(async () => {
    if (!formTitle.trim() || saving) return;
    setSaving(true);
    await onSave({
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      color: formColor,
      icon: formIcon,
      editingId: editingProject?.id,
    });
    setSaving(false);
    bottomSheetRef.current?.dismiss();
  }, [formTitle, formDesc, formColor, formIcon, editingProject, saving, onSave]);

  const handleUnlink = useCallback(
    async (todoId: string) => {
      if (!userId) return;
      const success = await unlinkTodoFromProject(userId, todoId);
      if (success) {
        setLinkedTodos(prev => prev.filter(t => t.id !== todoId));
      }
    },
    [userId, unlinkTodoFromProject],
  );

  const handleSheetStatusChange = useCallback(
    async (status: ProjectStatus) => {
      if (!editingProject) return;
      await onStatusChange(editingProject.id, status);
      setEditingProject(prev => (prev ? {...prev, status} : null));
    },
    [editingProject, onStatusChange],
  );

  const statusMenuItems = useMemo(
    () => (editingProject ? getStatusMenuItems(editingProject.status) : []),
    [editingProject?.status],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.3}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enableDynamicSizing={false}
      handleIndicatorStyle={styles.handleIndicator}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore">
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.sheetTitle}>
          {editingProject ? '프로젝트 수정' : '새 프로젝트'}
        </Text>

        {/* 제목 */}
        <Text style={styles.label}>제목</Text>
        <BottomSheetTextInput
          value={formTitle}
          onChangeText={setFormTitle}
          placeholder="프로젝트 제목"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
        />

        {/* 설명 */}
        <Text style={styles.label}>설명</Text>
        <BottomSheetTextInput
          value={formDesc}
          onChangeText={setFormDesc}
          placeholder="프로젝트 설명 (선택)"
          placeholderTextColor="#9CA3AF"
          multiline
          style={[styles.input, styles.inputMultiline]}
          textAlignVertical="top"
        />

        {/* 색상 */}
        <Text style={styles.label}>색상</Text>
        <View style={styles.paletteRow}>
          {PROJECT_COLORS.map(color => (
            <TouchableOpacity
              key={color}
              onPress={() => setFormColor(color)}
              style={[
                styles.colorCircle,
                {backgroundColor: color},
                formColor === color && styles.colorCircleSelected,
              ]}
            />
          ))}
        </View>

        {/* 아이콘 */}
        <Text style={styles.label}>아이콘</Text>
        <View style={styles.paletteRow}>
          {PROJECT_ICONS.map(icon => (
            <TouchableOpacity
              key={icon}
              onPress={() => setFormIcon(icon)}
              style={[
                styles.iconBox,
                formIcon === icon && {
                  backgroundColor: primaryColor + '20',
                  borderWidth: 1,
                  borderColor: primaryColor + '66',
                },
              ]}>
              <Text style={styles.iconText}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 연결된 할일 (편집 모드) */}
        {editingProject && (
          <LinkedTodosSection
            todos={linkedTodos}
            loading={loadingTodos}
            onUnlink={handleUnlink}
          />
        )}

        {/* 상태 변경 (편집 모드) */}
        {editingProject && statusMenuItems.length > 0 && (
          <View style={styles.statusSection}>
            <View style={styles.statusHeader}>
              <ActivitySquare size={18} color="#6B7280" />
              <Text style={styles.statusLabel}>상태</Text>
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: STATUS_LABELS[editingProject.status]?.bg},
                ]}>
                <Text
                  style={[
                    styles.statusBadgeText,
                    {color: STATUS_LABELS[editingProject.status]?.color},
                  ]}>
                  {STATUS_LABELS[editingProject.status]?.label}
                </Text>
              </View>
            </View>
            <LiquidGlassMenu
              systemIconName="arrow.triangle.2.circlepath"
              iconColor="#6B7280"
              size={36}
              menuItems={statusMenuItems}
              onSelect={(key) => handleSheetStatusChange(key as ProjectStatus)}
              fallbackIcon={<RefreshCw size={16} color="#6B7280" />}
            />
          </View>
        )}

        {/* 저장 버튼 */}
        <AnimatedPressable
          onPress={handleSave}
          hapticType="medium"
          scaleValue={0.96}
          style={[
            styles.saveBtn,
            {backgroundColor: formTitle.trim() ? primaryColor : '#D1D5DB'},
          ]}>
          <Text style={styles.saveBtnText}>
            {saving ? '저장 중...' : editingProject ? '수정하기' : '만들기'}
          </Text>
        </AnimatedPressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 16,
  },
  inputMultiline: {
    minHeight: 80,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  iconText: {
    fontSize: 18,
  },
  statusSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
