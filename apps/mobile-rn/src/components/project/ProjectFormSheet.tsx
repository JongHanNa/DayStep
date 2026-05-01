/**
 * ProjectFormSheet — BottomSheetModal 프로젝트 생성/편집 폼
 * 시안 C: 미리보기 카드 + 외관 서브뷰 구조
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
import {View, Text, StyleSheet, Keyboard, Modal} from 'react-native';
import Animated, {
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {NativeMenu} from '@/components/native/NativeMenu';
import {NativeProjectFormNative} from '@/components/native/NativeProjectForm';
import {AnimatedPressable} from '@/components/core';
import {SummaryRow} from '@/components/todo/SummaryRow';
import {InlineIconPicker} from '@/components/todo/InlineIconPicker';
import {LinkedTodosSection} from './LinkedTodosSection';
import {PreviewCard} from './PreviewCard';
import {STATUS_LABELS, getStatusMenuItems, formatTodoDate} from './constants';
import {resolveTodoIcon} from '@/lib/iconMap';
import {
  Palette,
  ChevronLeft,
  ActivitySquare,
  RefreshCw,
} from 'lucide-react-native';
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

/* ── 인라인 서브컴포넌트 ── */

function AppearanceSuffix({icon, color}: {icon: string; color: string}) {
  const IconComp = resolveTodoIcon(icon);
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
      {IconComp && <IconComp size={16} color="#6B7280" />}
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function StatusRow({
  project,
  statusMenuItems,
  onStatusChange,
}: {
  project: Project;
  statusMenuItems: Array<{title: string; key: string}>;
  onStatusChange: (status: ProjectStatus) => void;
}) {
  return (
    <View style={statusRowStyles.row}>
      <ActivitySquare size={20} color="#6B7280" style={{marginRight: 12}} />
      <Text style={statusRowStyles.label}>상태</Text>
      <View style={statusRowStyles.trailing}>
        <View
          style={[
            statusRowStyles.badge,
            {backgroundColor: STATUS_LABELS[project.status]?.bg},
          ]}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: STATUS_LABELS[project.status]?.color,
            }}>
            {STATUS_LABELS[project.status]?.label}
          </Text>
        </View>
        <NativeMenu
          systemIconName="arrow.triangle.2.circlepath"
          iconColor="#9CA3AF"
          size={32}
          menuItems={statusMenuItems}
          onSelect={key => onStatusChange(key as ProjectStatus)}
          fallbackIcon={<RefreshCw size={16} color="#9CA3AF" />}
        />
      </View>
    </View>
  );
}

const statusRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});

/* ── 메인 컴포넌트 ── */

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

  const hasNative = NativeProjectFormNative != null;
  const [nativeVisible, setNativeVisible] = useState(false);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState<string>(PROJECT_COLORS[0]);
  const [formIcon, setFormIcon] = useState<string>(PROJECT_ICONS[0]);
  const [linkedTodos, setLinkedTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'appearance'>(
    'main',
  );
  const isFirstRender = useRef(true);

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      setEditingProject(null);
      setFormTitle('');
      setFormDesc('');
      setFormColor(PROJECT_COLORS[0]);
      setFormIcon(PROJECT_ICONS[0]);
      setLinkedTodos([]);
      setSaving(false);
      setCurrentView('main');
      isFirstRender.current = true;
      if (hasNative) {
        setNativeVisible(true);
      } else {
        bottomSheetRef.current?.present();
      }
    },
    openEdit: (project: Project) => {
      setEditingProject(project);
      setFormTitle(project.title);
      setFormDesc(project.description ?? '');
      setFormColor(project.color ?? PROJECT_COLORS[0]);
      setFormIcon(project.icon ?? PROJECT_ICONS[0]);
      setSaving(false);
      setCurrentView('main');
      isFirstRender.current = true;
      if (hasNative) {
        setNativeVisible(true);
      } else {
        bottomSheetRef.current?.present();
      }
    },
    close: () => {
      Keyboard.dismiss();
      if (hasNative) {
        setNativeVisible(false);
      } else {
        bottomSheetRef.current?.dismiss();
      }
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

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) setCurrentView('main');
  }, []);

  const goToAppearance = useCallback(() => {
    Keyboard.dismiss();
    isFirstRender.current = false;
    setCurrentView('appearance');
  }, []);

  const goToMain = useCallback(() => {
    isFirstRender.current = false;
    setCurrentView('main');
  }, []);

  const handleIconChange = useCallback((icon: string) => {
    if (icon) setFormIcon(icon);
  }, []);

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

  // ─── Native (iOS) 경로 ───────────────────────
  const nativeProjectDataJson = useMemo(
    () =>
      JSON.stringify({
        id: editingProject?.id,
        title: formTitle,
        description: formDesc,
        color: formColor,
        icon: formIcon,
        status: editingProject?.status ?? null,
      }),
    [editingProject?.id, formTitle, formDesc, formColor, formIcon, editingProject?.status],
  );

  const nativeLinkedTodosJson = useMemo(
    () =>
      JSON.stringify(
        linkedTodos.map(t => ({
          id: t.id,
          title: t.title,
          completed: t.completed,
          dateLabel: formatTodoDate(t),
        })),
      ),
    [linkedTodos],
  );

  const nativePaletteColorsJson = useMemo(
    () => JSON.stringify(PROJECT_COLORS),
    [],
  );
  const nativePaletteIconsJson = useMemo(
    () => JSON.stringify(PROJECT_ICONS),
    [],
  );
  const nativeStatusMenuItemsJson = useMemo(
    () => JSON.stringify(statusMenuItems),
    [statusMenuItems],
  );

  const nativeStatusLabel = editingProject
    ? STATUS_LABELS[editingProject.status]?.label ?? ''
    : '';
  const nativeStatusBadgeColor = editingProject
    ? STATUS_LABELS[editingProject.status]?.color ?? '#6B7280'
    : '#6B7280';
  const nativeStatusBadgeBg = editingProject
    ? STATUS_LABELS[editingProject.status]?.bg ?? '#F3F4F6'
    : '#F3F4F6';

  const handleNativeSave = useCallback(
    async (e: {
      nativeEvent: {title: string; description: string; color: string; icon: string};
    }) => {
      const t = e.nativeEvent.title.trim();
      if (!t || saving) return;
      setSaving(true);
      await onSave({
        title: t,
        description: e.nativeEvent.description.trim() || null,
        color: e.nativeEvent.color,
        icon: e.nativeEvent.icon,
        editingId: editingProject?.id,
      });
      setSaving(false);
      setNativeVisible(false);
    },
    [saving, onSave, editingProject?.id],
  );

  const handleNativeStatusChange = useCallback(
    async (e: {nativeEvent: {status: string}}) => {
      const status = e.nativeEvent.status as ProjectStatus;
      await handleSheetStatusChange(status);
    },
    [handleSheetStatusChange],
  );

  const handleNativeUnlinkTodo = useCallback(
    async (e: {nativeEvent: {todoId: string}}) => {
      await handleUnlink(e.nativeEvent.todoId);
    },
    [handleUnlink],
  );

  if (hasNative && NativeProjectFormNative) {
    return (
      <Modal
        visible={nativeVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNativeVisible(false)}>
        <NativeProjectFormNative
          mode={editingProject ? 'edit' : 'create'}
          primaryColor={primaryColor}
          projectData={nativeProjectDataJson}
          linkedTodosData={nativeLinkedTodosJson}
          paletteColors={nativePaletteColorsJson}
          paletteIcons={nativePaletteIconsJson}
          statusMenuItemsData={nativeStatusMenuItemsJson}
          statusLabel={nativeStatusLabel}
          statusBadgeColor={nativeStatusBadgeColor}
          statusBadgeBg={nativeStatusBadgeBg}
          loadingTodos={loadingTodos}
          onSave={handleNativeSave}
          onStatusChange={handleNativeStatusChange}
          onUnlinkTodo={handleNativeUnlinkTodo}
          onClose={() => setNativeVisible(false)}
          style={{flex: 1}}
        />
      </Modal>
    );
  }

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enableDynamicSizing={false}
      handleIndicatorStyle={styles.handleIndicator}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onChange={handleSheetChange}>
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* ── 메인뷰 ── */}
        {currentView === 'main' && (
          <Animated.View
            entering={
              isFirstRender.current
                ? undefined
                : SlideInLeft.duration(250)
            }
            exiting={SlideOutLeft.duration(200)}>
            <Text style={styles.sheetTitle}>
              {editingProject ? '프로젝트 수정' : '새 프로젝트'}
            </Text>

            <PreviewCard
              title={formTitle}
              description={formDesc}
              color={formColor}
              icon={formIcon}
            />

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

            {/* 그룹카드: 외관 + 상태 + 연결된 할일 */}
            <View style={styles.groupCard}>
              <SummaryRow
                Icon={Palette}
                label="외관"
                suffixContent={
                  <AppearanceSuffix icon={formIcon} color={formColor} />
                }
                onPress={goToAppearance}
              />

              {editingProject && statusMenuItems.length > 0 && (
                <StatusRow
                  project={editingProject}
                  statusMenuItems={statusMenuItems}
                  onStatusChange={handleSheetStatusChange}
                />
              )}

              {editingProject && (
                <LinkedTodosSection
                  todos={linkedTodos}
                  loading={loadingTodos}
                  onUnlink={handleUnlink}
                />
              )}
            </View>

            {/* 저장 버튼 */}
            <AnimatedPressable
              onPress={handleSave}
              hapticType="medium"
              scaleValue={0.96}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: formTitle.trim()
                    ? primaryColor
                    : '#D1D5DB',
                },
              ]}>
              <Text style={styles.saveBtnText}>
                {saving
                  ? '저장 중...'
                  : editingProject
                    ? '수정하기'
                    : '만들기'}
              </Text>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* ── 외관 서브뷰 ── */}
        {currentView === 'appearance' && (
          <Animated.View
            entering={SlideInRight.duration(250)}
            exiting={SlideOutRight.duration(200)}>
            {/* 서브뷰 헤더 */}
            <View style={styles.subviewHeader}>
              <AnimatedPressable
                onPress={goToMain}
                hapticType="selection"
                scaleValue={0.9}
                style={styles.backBtn}>
                <ChevronLeft size={20} color="#6B7280" />
              </AnimatedPressable>
              <Text style={styles.sheetTitle}>외관 설정</Text>
            </View>

            <PreviewCard
              title={formTitle}
              description={formDesc}
              color={formColor}
              icon={formIcon}
            />

            {/* 색상 */}
            <Text style={styles.label}>색상</Text>
            <View style={styles.colorGrid}>
              {PROJECT_COLORS.map(color => (
                <AnimatedPressable
                  key={color}
                  onPress={() => setFormColor(color)}
                  hapticType="selection"
                  scaleValue={0.9}
                  style={[
                    styles.colorCircle,
                    {backgroundColor: color},
                    formColor === color && {
                      borderWidth: 2.5,
                      borderColor: '#1F2937',
                    },
                  ]}
                />
              ))}
            </View>

            {/* 아이콘 */}
            <Text style={styles.label}>아이콘</Text>
            <InlineIconPicker
              selectedIcon={formIcon}
              onIconChange={handleIconChange}
              popover
            />

            {/* 완료 버튼 */}
            <AnimatedPressable
              onPress={goToMain}
              hapticType="medium"
              scaleValue={0.96}
              style={[styles.saveBtn, {backgroundColor: primaryColor}]}>
              <Text style={styles.saveBtnText}>완료</Text>
            </AnimatedPressable>
          </Animated.View>
        )}
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
  groupCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  subviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
