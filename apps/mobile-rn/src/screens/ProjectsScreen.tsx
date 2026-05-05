/**
 * Projects Screen — 내 계획 보기
 * 오케스트레이터: 컴포넌트 조합만 담당
 */
import React, {useEffect, useCallback, useMemo, useRef} from 'react';
import {Text, View, FlatList, Alert} from 'react-native';
import {ScreenContainer} from '@/components/core';
import {FolderKanban} from 'lucide-react-native';
import {useProjectStore} from '@/stores/projectStore';
import {useAuthStore} from '@/stores/authStore';
import {useLimitCheck} from '@/hooks/useLimitCheck';
import {useDailyCheckIn} from '@/hooks/useDailyCheckIn';
import {LimitReachedModal} from '@/components/subscription/LimitReachedModal';
import type {ProjectStatus} from '@/types/project';
import {
  StatusFilterBar,
  ProjectCard,
  ProjectFormSheet,
  ProjectFAB,
} from '@/components/project';
import type {ProjectFormSheetRef} from '@/components/project';

export default function ProjectsScreen() {
  useDailyCheckIn('projects');
  const user = useAuthStore(s => s.user);
  const {
    projects,
    statusFilter,
    loading,
    fetchProjects,
    fetchProjectTodos,
    createProject,
    updateProject,
    deleteProject,
    startProject,
    holdProject,
    completeProject,
    resumeProject,
    unstartProject,
    unlinkTodoFromProject,
    setStatusFilter,
  } = useProjectStore();
  const {checkLimit, isLimitReached, limitedEntity, currentCount, maxCount, closeLimitModal} =
    useLimitCheck();

  const formSheetRef = useRef<ProjectFormSheetRef>(null);

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
        case 'not_started':
          await unstartProject(user.id, projectId);
          break;
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

  const handleSave = useCallback(
    async (data: {
      title: string;
      description: string | null;
      color: string;
      icon: string;
      editingId?: string;
    }) => {
      if (!user?.id) return;
      if (data.editingId) {
        await updateProject(user.id, {
          id: data.editingId,
          title: data.title,
          description: data.description,
          color: data.color,
          icon: data.icon,
        });
      } else {
        const allowed = await checkLimit('project');
        if (!allowed) return;
        await createProject(user.id, {
          title: data.title,
          description: data.description,
          color: data.color,
          icon: data.icon,
        });
      }
    },
    [user?.id, checkLimit, createProject, updateProject],
  );

  return (
    <ScreenContainer gradient="warmBackground">
      {/* 상태 필터 */}
      <View style={{paddingTop: 8}}>
        <StatusFilterBar selected={statusFilter} onSelect={setStatusFilter} />
      </View>

      {/* 프로젝트 목록 */}
      <FlatList
        style={{flex: 1}}
        data={filteredProjects}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <ProjectCard
            project={item}
            onStatusChange={status => handleStatusChange(item.id, status)}
            onEdit={() => formSheetRef.current?.openEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={{paddingBottom: 100, paddingTop: 8}}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <FolderKanban size={48} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4 text-center">
              {loading
                ? '로딩 중...'
                : '프로젝트가 없어요\n+ 버튼으로 추가해보세요'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <ProjectFAB onPress={() => formSheetRef.current?.openCreate()} />

      {/* BottomSheet 폼 */}
      <ProjectFormSheet
        ref={formSheetRef}
        userId={user?.id}
        onSave={handleSave}
        onStatusChange={handleStatusChange}
        fetchProjectTodos={fetchProjectTodos}
        unlinkTodoFromProject={unlinkTodoFromProject}
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
