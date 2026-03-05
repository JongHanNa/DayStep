/**
 * AIPlan Screen — 내 계획 보기
 * 프로젝트 목록 + 상태 필터 + 생성/편집
 */
import React, {useEffect, useState, useCallback, useMemo} from 'react';
import {
  Text,
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {ScreenContainer, AnimatedCard, AnimatedPressable} from '@/components/core';
import {
  ChevronLeft,
  Plus,
  FolderKanban,
  Play,
  Pause,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Edit3,
} from 'lucide-react-native';
import {useProjectStore} from '@/stores/projectStore';
import {useAuthStore} from '@/stores/authStore';
import {useLimitCheck} from '@/hooks/useLimitCheck';
import {LimitReachedModal} from '@/components/subscription/LimitReachedModal';
import type {Project, ProjectStatus} from '@/types/project';
import {PROJECT_COLORS, PROJECT_ICONS} from '@/types/project';

const STATUS_FILTERS: {key: ProjectStatus | 'all'; label: string}[] = [
  {key: 'all', label: '전체'},
  {key: 'not_started', label: '시작안함'},
  {key: 'in_progress', label: '진행중'},
  {key: 'on_hold', label: '중단'},
  {key: 'completed', label: '완료'},
];

const STATUS_LABELS: Record<ProjectStatus, {label: string; color: string; bg: string}> = {
  not_started: {label: '시작안함', color: '#6B7280', bg: '#F3F4F6'},
  in_progress: {label: '진행중', color: '#3B82F6', bg: '#EFF6FF'},
  on_hold: {label: '중단', color: '#F59E0B', bg: '#FFFBEB'},
  completed: {label: '완료', color: '#22C55E', bg: '#F0FDF4'},
};

function StatusFilterBar({
  selected,
  onSelect,
}: {
  selected: ProjectStatus | 'all';
  onSelect: (status: ProjectStatus | 'all') => void;
}) {
  return (
    <ScrollView
      style={{flexGrow: 0}}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 8}}>
      {STATUS_FILTERS.map(({key, label}) => (
        <TouchableOpacity
          key={key}
          onPress={() => onSelect(key)}
          className={`mr-2 px-4 py-2 rounded-full ${
            selected === key ? 'bg-blue-500' : 'bg-gray-100'
          }`}>
          <Text
            className={`text-sm font-medium ${
              selected === key ? 'text-white' : 'text-gray-600'
            }`}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function ProjectCard({
  project,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  project: Project;
  onStatusChange: (status: ProjectStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusInfo = STATUS_LABELS[project.status] ?? STATUS_LABELS.not_started;

  return (
    <View className="mx-4 mb-3">
      <AnimatedCard enterDelay={0}>
        {/* 색상 바 */}
        <View
          className="h-1 rounded-full mb-3 -mt-2 -mx-4"
          style={{
            backgroundColor: project.color ?? '#A8DADC',
            marginTop: -16,
            marginHorizontal: -16,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        />

        {/* 헤더 */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            {project.icon && (
              <Text className="text-lg mr-2">{project.icon}</Text>
            )}
            <Text className="text-base font-semibold text-gray-800 flex-1" numberOfLines={1}>
              {project.title}
            </Text>
          </View>
          <View
            className="px-2 py-0.5 rounded-full"
            style={{backgroundColor: statusInfo.bg}}>
            <Text className="text-xs font-medium" style={{color: statusInfo.color}}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* 설명 */}
        {project.description && (
          <Text className="text-sm text-gray-500 mb-3" numberOfLines={2}>
            {project.description}
          </Text>
        )}

        {/* 상태 전환 버튼 */}
        <View className="flex-row items-center justify-between border-t border-gray-100 pt-3 mt-1">
          <View className="flex-row">
            {project.status !== 'in_progress' && project.status !== 'completed' && (
              <TouchableOpacity
                onPress={() => onStatusChange('in_progress')}
                className="flex-row items-center bg-blue-50 rounded-lg px-3 py-1.5 mr-2">
                <Play size={14} color="#3B82F6" />
                <Text className="text-xs text-blue-600 ml-1">시작</Text>
              </TouchableOpacity>
            )}
            {project.status === 'in_progress' && (
              <>
                <TouchableOpacity
                  onPress={() => onStatusChange('on_hold')}
                  className="flex-row items-center bg-yellow-50 rounded-lg px-3 py-1.5 mr-2">
                  <Pause size={14} color="#F59E0B" />
                  <Text className="text-xs text-yellow-600 ml-1">중단</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onStatusChange('completed')}
                  className="flex-row items-center bg-green-50 rounded-lg px-3 py-1.5 mr-2">
                  <CheckCircle2 size={14} color="#22C55E" />
                  <Text className="text-xs text-green-600 ml-1">완료</Text>
                </TouchableOpacity>
              </>
            )}
            {project.status === 'on_hold' && (
              <TouchableOpacity
                onPress={() => onStatusChange('in_progress')}
                className="flex-row items-center bg-blue-50 rounded-lg px-3 py-1.5 mr-2">
                <RotateCcw size={14} color="#3B82F6" />
                <Text className="text-xs text-blue-600 ml-1">재개</Text>
              </TouchableOpacity>
            )}
          </View>
          <View className="flex-row">
            <TouchableOpacity
              onPress={onEdit}
              className="p-2"
              hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
              <Edit3 size={16} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              className="p-2 ml-1"
              hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
              <Trash2 size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedCard>
    </View>
  );
}

export default function AIPlanScreen() {
  const user = useAuthStore(s => s.user);
  const {
    projects,
    statusFilter,
    loading,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    startProject,
    holdProject,
    completeProject,
    resumeProject,
    setStatusFilter,
  } = useProjectStore();
  const {checkLimit, isLimitReached, limitedEntity, currentCount, maxCount, closeLimitModal} = useLimitCheck();

  // 생성/편집 폼
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState<string>(PROJECT_COLORS[0]);
  const [formIcon, setFormIcon] = useState<string>(PROJECT_ICONS[0]);

  useEffect(() => {
    if (user?.id) {
      fetchProjects(user.id);
    }
  }, [user?.id]);

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return projects;
    return projects.filter(p => p.status === statusFilter);
  }, [projects, statusFilter]);

  const handleStatusChange = useCallback(
    async (projectId: string, status: ProjectStatus) => {
      if (!user?.id) return;
      switch (status) {
        case 'in_progress':
          await startProject(user.id, projectId);
          break;
        case 'on_hold':
          await holdProject(user.id, projectId);
          break;
        case 'completed':
          await completeProject(user.id, projectId);
          break;
      }
    },
    [user?.id],
  );

  const handleDelete = useCallback(
    (projectId: string) => {
      Alert.alert('프로젝트 삭제', '이 프로젝트를 삭제할까요?', [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => user?.id && deleteProject(user.id, projectId),
        },
      ]);
    },
    [user?.id, deleteProject],
  );

  const handleEdit = useCallback((project: Project) => {
    setEditingProject(project);
    setFormTitle(project.title);
    setFormDesc(project.description ?? '');
    setFormColor(project.color ?? PROJECT_COLORS[0]);
    setFormIcon(project.icon ?? PROJECT_ICONS[0]);
    setShowForm(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingProject(null);
    setFormTitle('');
    setFormDesc('');
    setFormColor(PROJECT_COLORS[0]);
    setFormIcon(PROJECT_ICONS[0]);
    setShowForm(true);
  }, []);

  const handleSaveForm = useCallback(async () => {
    if (!user?.id || !formTitle.trim()) return;

    if (editingProject) {
      await updateProject(user.id, {
        id: editingProject.id,
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        color: formColor,
        icon: formIcon,
      });
      setShowForm(false);
    } else {
      const allowed = await checkLimit('project');
      if (!allowed) return;
      await createProject(user.id, {
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        color: formColor,
        icon: formIcon,
      });
      setShowForm(false);
    }
  }, [user?.id, editingProject, formTitle, formDesc, formColor, formIcon, checkLimit]);

  // ── 생성/편집 폼 ──
  if (showForm) {
    return (
      <ScreenContainer gradient="warmBackground">
        <ScrollView
          contentContainerStyle={{paddingBottom: 100}}
          showsVerticalScrollIndicator={false}>
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="px-4 pt-2 pb-4 flex-row items-center">
            <TouchableOpacity
              onPress={() => setShowForm(false)}
              className="flex-row items-center"
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <ChevronLeft size={24} color="#374151" />
              <Text className="text-lg font-bold text-gray-800 ml-1">
                {editingProject ? '프로젝트 수정' : '새 프로젝트'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View className="px-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">제목</Text>
            <TextInput
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="프로젝트 제목"
              placeholderTextColor="#9CA3AF"
              className="bg-white rounded-xl p-4 text-sm text-gray-800 mb-4"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">설명</Text>
            <TextInput
              value={formDesc}
              onChangeText={setFormDesc}
              placeholder="프로젝트 설명 (선택)"
              placeholderTextColor="#9CA3AF"
              multiline
              className="bg-white rounded-xl p-4 text-sm text-gray-800 min-h-[80px] mb-4"
              textAlignVertical="top"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">색상</Text>
            <View className="flex-row flex-wrap mb-4">
              {PROJECT_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setFormColor(color)}
                  className={`w-10 h-10 rounded-full mr-2 mb-2 ${
                    formColor === color ? 'border-2 border-gray-800' : ''
                  }`}
                  style={{backgroundColor: color}}
                />
              ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">아이콘</Text>
            <View className="flex-row flex-wrap mb-6">
              {PROJECT_ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  onPress={() => setFormIcon(icon)}
                  className={`w-10 h-10 rounded-xl mr-2 mb-2 items-center justify-center ${
                    formIcon === icon
                      ? 'bg-blue-100 border border-blue-400'
                      : 'bg-gray-50'
                  }`}>
                  <Text className="text-lg">{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSaveForm}
              className="bg-blue-500 rounded-xl py-4 items-center">
              <Text className="text-white font-bold text-base">
                {editingProject ? '수정하기' : '만들기'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ── 메인 목록 ──
  return (
    <ScreenContainer gradient="warmBackground">
      {/* 헤더 */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="px-4 pt-2 pb-2 flex-row items-center justify-end">
        <TouchableOpacity
          onPress={handleCreate}
          className="bg-blue-500 rounded-full w-9 h-9 items-center justify-center">
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* 상태 필터 */}
      <StatusFilterBar selected={statusFilter} onSelect={setStatusFilter} />

      {/* 프로젝트 목록 */}
      <FlatList
        style={{flex: 1}}
        data={filteredProjects}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <ProjectCard
            project={item}
            onStatusChange={(status) => handleStatusChange(item.id, status)}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={{paddingBottom: 100, paddingTop: 8}}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <FolderKanban size={48} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4 text-center">
              {loading ? '로딩 중...' : '프로젝트가 없어요\n+ 버튼으로 추가해보세요'}
            </Text>
          </View>
        }
      />
      <LimitReachedModal
        visible={isLimitReached}
        onClose={closeLimitModal}
        entityType={limitedEntity}
        currentCount={currentCount}
        maxCount={maxCount}
      />
    </ScreenContainer>
  );
}
