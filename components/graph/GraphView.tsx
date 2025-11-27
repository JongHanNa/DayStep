/**
 * GraphView - 그래프 뷰 메인 컨테이너
 * 옵시디언 스타일의 물리 시뮬레이션 기반 그래프 시각화
 */

'use client';

import { useState, useCallback } from 'react';
import { Network, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useGraphData } from './hooks/useGraphData';
import { useFilteredGraphData } from './hooks/useFilteredGraphData';
import { GraphCanvas } from './GraphCanvas';
import { GraphControls } from './GraphControls';
import { GraphFAB } from './GraphFAB';
import { GraphLegend } from './GraphLegend';
import { GraphCreateModal } from './GraphCreateModal';
import { useGraphStore, useGraphEditModal } from '@/state/stores/graphStore';

// 편집 모달들
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import GoalEditDialog from '@/components/second-brain/GoalEditDialog';
import AreaResourceEditModal from '@/components/ui/AreaResourceEditModal';
import NoteEditModal from '@/components/second-brain/NoteEditModal';

// Store들
import { useTodoStore } from '@/state/stores/todoStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';

// 타입
import type { TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import type { NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import type { Project, Goal, AreaResource, Note } from '@/types/second-brain';
import type { SecondBrainItemType } from '@/types/settings';
import type { Clarification } from '@/types';

export default function GraphView() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { graphData, loading, error, refetch } = useGraphData();
  const { filteredData, nodeCount, linkCount, isFiltered } = useFilteredGraphData(graphData);
  const { isOpen: isEditModalOpen, node: editingNode } = useGraphEditModal();
  const { closeEditModal } = useGraphStore();

  // Store 데이터 및 액션 가져오기
  const updateTodo = useTodoStore((state) => state.updateTodo);
  const deleteTodo = useTodoStore((state) => state.deleteTodo);

  const { projects, updateProject, deleteProject } = useProjectStore();
  const { goals, updateGoal, deleteGoal } = useGoalStore();
  const { areas, updateArea, deleteArea } = useAreaStore();
  const { resources, updateResource, deleteResource } = useResourceStore();
  const { notes, updateNote, deleteNote } = useNoteStore();

  // Todo 편집 상태
  const [editingTodoData, setEditingTodoData] = useState<TodoFormData | null>(null);

  // Note 편집 상태
  const [editingNoteData, setEditingNoteData] = useState<NoteFormData | null>(null);

  // Project 편집 상태
  const [editingProjectData, setEditingProjectData] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);

  // Goal 편집 상태
  const [editingGoalData, setEditingGoalData] = useState<(Goal & { isNew?: boolean; paraSelection?: string }) | null>(null);

  // Area/Resource 편집 상태
  const [editingAreaResourceData, setEditingAreaResourceData] = useState<(AreaResource & { isNew?: boolean }) | null>(null);
  const [areaResourceItemType, setAreaResourceItemType] = useState<SecondBrainItemType>('area');

  // 모달 닫기 핸들러
  const handleCloseEditModal = useCallback(() => {
    closeEditModal();
    setEditingTodoData(null);
    setEditingNoteData(null);
    setEditingProjectData(null);
    setEditingGoalData(null);
    setEditingAreaResourceData(null);
  }, [closeEditModal]);

  // 인증 대기
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // 로그인 필요
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <div className="text-center space-y-4">
          <Network className="w-16 h-16 mx-auto text-base-content/30" />
          <div>
            <h2 className="text-xl font-semibold">로그인이 필요합니다</h2>
            <p className="text-base-content/60 mt-1">
              그래프 뷰를 사용하려면 로그인하세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-error/10 rounded-full flex items-center justify-center">
            <Network className="w-8 h-8 text-error" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-error">오류 발생</h2>
            <p className="text-base-content/60 mt-1">{error}</p>
          </div>
          <button onClick={refetch} className="btn btn-primary btn-sm rounded-full gap-2">
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (loading && graphData.nodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/60">그래프 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 빈 데이터 상태
  if (graphData.nodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300 relative">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
            <Network className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">아직 데이터가 없습니다</h2>
            <p className="text-base-content/60 mt-1">
              오른쪽 하단의 + 버튼을 눌러<br />
              첫 번째 항목을 추가해보세요!
            </p>
          </div>
        </div>
        <GraphFAB />
        <GraphCreateModal />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--header-total-height))] bg-base-300 relative overflow-hidden">
      {/* 메인 그래프 캔버스 */}
      <GraphCanvas graphData={filteredData} />

      {/* 필터 컨트롤 패널 */}
      <GraphControls
        nodeCount={nodeCount}
        linkCount={linkCount}
        isFiltered={isFiltered}
      />

      {/* 범례 */}
      <GraphLegend />

      {/* FAB 버튼 (노드 생성) */}
      <GraphFAB />

      {/* 생성 모달 */}
      <GraphCreateModal />

      {/* 로딩 인디케이터 (데이터 새로고침 시) */}
      {loading && graphData.nodes.length > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-base-100/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            <span className="text-xs">동기화 중...</span>
          </div>
        </div>
      )}

      {/* 새로고침 버튼 */}
      <button
        onClick={refetch}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 btn btn-sm btn-ghost bg-base-100/90 backdrop-blur-sm shadow-lg rounded-full gap-2"
        title="새로고침"
      >
        <RefreshCw className="w-4 h-4" />
        <span className="text-xs">새로고침</span>
      </button>

      {/* 노드 편집 모달 - 타입별 분기 */}
      {isEditModalOpen && editingNode && userId && (
        <>
          {/* Todo 편집 */}
          {editingNode.type === 'todo' && (
            <TodoEditModal
              open={true}
              todo={editingTodoData || editingNode.originalData}
              onClose={handleCloseEditModal}
              onSave={async () => {
                if (editingTodoData) {
                  // TodoFormData → CreateTodoInput 변환
                  let startTimeISO: string | undefined;
                  if (editingTodoData.scheduledDate) {
                    const date = new Date(editingTodoData.scheduledDate);
                    if (editingTodoData.scheduleType === 'timed' && editingTodoData.startTime) {
                      const [hours, minutes] = editingTodoData.startTime.split(':');
                      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    }
                    startTimeISO = date.toISOString();
                  }

                  await updateTodo(editingNode.id, {
                    title: editingTodoData.title,
                    clarification: editingTodoData.clarification as Clarification | undefined,
                    schedule_type: editingTodoData.scheduleType || 'none',
                    start_time: startTimeISO,
                    completed: editingTodoData.completed,
                    is_today_highlight: editingTodoData.isHighlight,
                    next_action_context_ids: editingTodoData.nextActionContextIds,
                    color: editingTodoData.color,
                    icon: editingTodoData.icon,
                  });
                }
                handleCloseEditModal();
                refetch();
              }}
              onChange={(data) => setEditingTodoData(data)}
              onDelete={async () => {
                await deleteTodo(editingNode.id);
                handleCloseEditModal();
                refetch();
              }}
            />
          )}

          {/* Project 편집 */}
          {editingNode.type === 'project' && (
            <ProjectEditDialog
              open={true}
              editingProject={editingProjectData || editingNode.originalData}
              onSave={async (data) => {
                await updateProject(userId, editingNode.id, data);
                handleCloseEditModal();
                refetch();
              }}
              onCancel={handleCloseEditModal}
              onDelete={async () => {
                await deleteProject(userId, editingNode.id);
                handleCloseEditModal();
                refetch();
              }}
              onProjectChange={(project) => setEditingProjectData(project)}
            />
          )}

          {/* Goal 편집 */}
          {editingNode.type === 'goal' && (
            <GoalEditDialog
              open={true}
              editingGoal={editingGoalData || editingNode.originalData}
              areas={areas}
              resources={resources}
              projects={projects}
              onSave={async (data) => {
                await updateGoal(userId, editingNode.id, data);
                handleCloseEditModal();
                refetch();
              }}
              onCancel={handleCloseEditModal}
              onDelete={async () => {
                await deleteGoal(userId, editingNode.id);
                handleCloseEditModal();
                refetch();
              }}
              onGoalChange={(goal) => setEditingGoalData(goal)}
            />
          )}

          {/* Area 편집 */}
          {editingNode.type === 'area' && (
            <AreaResourceEditModal
              open={true}
              editingItem={editingAreaResourceData || editingNode.originalData}
              itemType={areaResourceItemType}
              pageType="area"
              onCancel={handleCloseEditModal}
              onSave={async () => {
                if (editingAreaResourceData) {
                  const { title, color, icon, is_pinned } = editingAreaResourceData;
                  await updateArea(userId, editingNode.id, { title, color, icon, is_pinned });
                }
                handleCloseEditModal();
                refetch();
              }}
              onDelete={async () => {
                await deleteArea(userId, editingNode.id);
                handleCloseEditModal();
                refetch();
              }}
              onItemChange={(item) => setEditingAreaResourceData(item)}
              onItemTypeChange={(type) => setAreaResourceItemType(type)}
            />
          )}

          {/* Resource 편집 */}
          {editingNode.type === 'resource' && (
            <AreaResourceEditModal
              open={true}
              editingItem={editingAreaResourceData || editingNode.originalData}
              itemType={areaResourceItemType}
              pageType="resource"
              onCancel={handleCloseEditModal}
              onSave={async () => {
                if (editingAreaResourceData) {
                  const { title, color, icon, is_pinned } = editingAreaResourceData;
                  await updateResource(userId, editingNode.id, { title, color, icon, is_pinned });
                }
                handleCloseEditModal();
                refetch();
              }}
              onDelete={async () => {
                await deleteResource(userId, editingNode.id);
                handleCloseEditModal();
                refetch();
              }}
              onItemChange={(item) => setEditingAreaResourceData(item)}
              onItemTypeChange={(type) => setAreaResourceItemType(type)}
            />
          )}

          {/* Note 편집 */}
          {editingNode.type === 'note' && (
            <NoteEditModal
              open={true}
              note={editingNoteData || editingNode.originalData}
              areas={areas}
              resources={resources}
              onClose={handleCloseEditModal}
              onSave={async () => {
                if (editingNoteData) {
                  // NoteFormData → UpdateNoteInput 변환
                  // linkedAreaOrResource: 'area-xxx' | 'resource-xxx' → area_resource_id
                  let areaResourceId: string | undefined;
                  if (editingNoteData.linkedAreaOrResource) {
                    const [, id] = editingNoteData.linkedAreaOrResource.split('-');
                    areaResourceId = id;
                  }

                  await updateNote(editingNode.id, userId, {
                    title: editingNoteData.title,
                    content: editingNoteData.content,
                    note_category: editingNoteData.note_category,
                    area_resource_id: areaResourceId,
                    is_pinned: editingNoteData.isPinned,
                  });
                }
                handleCloseEditModal();
                refetch();
              }}
              onChange={(data) => setEditingNoteData(data)}
              onDelete={async () => {
                await deleteNote(editingNode.id, userId);
                handleCloseEditModal();
                refetch();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
