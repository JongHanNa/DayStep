'use client';

import { useState, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import InboxTabs, { type InboxTabType } from './InboxTabs';
import TodoInboxList from './TodoInboxList';
import NoteInboxList from './NoteInboxList';
import ProjectInboxList from './ProjectInboxList';
import GoalInboxList from './GoalInboxList';
import InboxGuidePopover from './InboxGuidePopover';
import type { InboxItem, Project, Goal, Note, AreaResource } from '@/types/second-brain';

interface InboxListSectionProps {
  // 수집함 데이터
  todos: InboxItem[];
  noteItems: InboxItem[];
  projects: Project[];
  goals: Goal[];

  // 컨텍스트 데이터 (리스트 컴포넌트에 전달)
  allProjects: Project[];
  allNotes: Note[];
  areas: AreaResource[];
  resources: AreaResource[];

  // 이벤트 핸들러
  onRefresh: () => void;
  userId: string;

  // 프로젝트/목표 클릭 핸들러
  onProjectClick: (project: Project) => void;
  onGoalClick: (goal: Goal) => void;

  // 삭제 핸들러 (탭별 삭제 로직이 다름)
  onBulkDelete?: (selectedIds: Set<string>, activeTab: InboxTabType) => Promise<void>;
  onSingleDelete?: (itemId: string, activeTab: InboxTabType) => Promise<void>;

  // 편집 모드 제어 (외부에서 제어할 경우)
  isEditMode?: boolean;
  onEditModeChange?: (isEditMode: boolean) => void;

  // 탭 변경 콜백 (외부에서 탭 변경 감지할 경우)
  onTabChange?: (tab: InboxTabType) => void;

  // 편집 모드 액션 바 표시 여부
  showEditModeActionBar?: boolean;
}

export default function InboxListSection({
  todos,
  noteItems,
  projects,
  goals,
  allProjects,
  allNotes,
  areas,
  resources,
  onRefresh,
  userId,
  onProjectClick,
  onGoalClick,
  onBulkDelete,
  onSingleDelete,
  isEditMode: externalEditMode,
  onEditModeChange,
  onTabChange: externalTabChange,
  showEditModeActionBar = false,
}: InboxListSectionProps) {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<InboxTabType>('todos');

  // 편집 모드 상태 (외부 제어 또는 내부 상태)
  const [internalEditMode, setInternalEditMode] = useState(false);
  const isEditMode = externalEditMode ?? internalEditMode;
  const setIsEditMode = (value: boolean) => {
    if (onEditModeChange) {
      onEditModeChange(value);
    } else {
      setInternalEditMode(value);
    }
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // 스와이프 상태
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);

  // 수집함 카운트
  const inboxCounts = useMemo(() => ({
    todos: todos.length,
    notes: noteItems.length,
    projects: projects.length,
    goals: goals.length,
  }), [todos.length, noteItems.length, projects.length, goals.length]);

  // 현재 활성화된 탭의 항목 배열 반환
  const getCurrentTabItems = (): Array<InboxItem | Project | Goal> => {
    switch (activeTab) {
      case 'todos': return todos;
      case 'notes': return noteItems;
      case 'projects': return projects;
      case 'goals': return goals;
      default: return [];
    }
  };

  // Shift + 클릭 범위 선택 처리
  const handleRangeSelection = (
    currentIndex: number,
    isChecked: boolean,
    itemId: string
  ) => {
    const currentItems = getCurrentTabItems();

    if (lastSelectedIndex === null) {
      const newSet = new Set(selectedIds);
      if (isChecked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      setSelectedIds(newSet);
      setLastSelectedIndex(currentIndex);
      return;
    }

    const start = Math.min(lastSelectedIndex, currentIndex);
    const end = Math.max(lastSelectedIndex, currentIndex);

    const newSet = new Set(selectedIds);
    for (let i = start; i <= end; i++) {
      if (isChecked) {
        newSet.add(currentItems[i].id);
      } else {
        newSet.delete(currentItems[i].id);
      }
    }

    setSelectedIds(newSet);
    setLastSelectedIndex(currentIndex);
  };

  // 통합 선택 핸들러
  const handleSelectionChange = (
    itemId: string,
    isChecked: boolean,
    shiftKey: boolean,
    index: number
  ) => {
    if (shiftKey) {
      handleRangeSelection(index, isChecked, itemId);
    } else {
      const newSet = new Set(selectedIds);
      if (isChecked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      setSelectedIds(newSet);
      setLastSelectedIndex(index);
    }
  };

  // 일괄 삭제 핸들러
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      if (onBulkDelete) {
        await onBulkDelete(selectedIds, activeTab);
      }
      setSelectedIds(new Set());
      setIsEditMode(false);
    } catch (error) {
      console.error('❌ 일괄 삭제 실패:', error);
      alert('일부 항목 삭제에 실패했습니다.');
    }
  };

  // 스와이프 삭제 버튼 클릭 핸들러
  const handleDeleteClick = async (itemId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        if (onSingleDelete) {
          await onSingleDelete(itemId, activeTab);
        }
        setSwipedItemId(null);
      } catch (error) {
        console.error('삭제 실패:', error);
      }
    }
  };

  // 탭 변경 시 선택 초기화
  const handleTabChange = (newTab: InboxTabType) => {
    setActiveTab(newTab);
    if (isEditMode) {
      setSelectedIds(new Set());
      setLastSelectedIndex(null);
    }
    // 외부 탭 변경 콜백 호출
    if (externalTabChange) {
      externalTabChange(newTab);
    }
  };

  return (
    <div>
      {/* 수집함 탭 */}
      <InboxTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={inboxCounts}
      />

      {/* 편집 모드 액션 바 */}
      {showEditModeActionBar && isEditMode && (
        <div className="mt-3 p-3 bg-base-100 rounded-lg flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={selectedIds.size === getCurrentTabItems().length && getCurrentTabItems().length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(new Set(getCurrentTabItems().map(item => item.id)));
                } else {
                  setSelectedIds(new Set());
                }
              }}
            />
            <span className="text-sm font-medium">전체 선택</span>
          </label>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="badge badge-primary">
                {selectedIds.size}개 선택됨
              </span>
            )}
            <button
              onClick={handleBulkDelete}
              className="btn btn-error btn-sm rounded-full"
              disabled={selectedIds.size === 0}
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          </div>
        </div>
      )}

      {/* 가이드 팝오버 */}
      <InboxGuidePopover activeTab={activeTab} />

      {/* 수집함 리스트 */}
      <div className="mt-4">
        {activeTab === 'todos' && (
          <TodoInboxList
            todos={todos}
            projects={allProjects}
            notes={allNotes}
            onRefresh={onRefresh}
            userId={userId}
            isEditMode={isEditMode}
            selectedIds={selectedIds}
            swipedItemId={swipedItemId}
            onSelectionChange={handleSelectionChange}
            onSwipe={setSwipedItemId}
            onDeleteClick={handleDeleteClick}
          />
        )}
        {activeTab === 'notes' && (
          <NoteInboxList
            notes={noteItems}
            areas={areas}
            resources={resources}
            projects={allProjects}
            todos={[]}
            allNotes={allNotes}
            onRefresh={onRefresh}
            isEditMode={isEditMode}
            selectedIds={selectedIds}
            swipedItemId={swipedItemId}
            onSelectionChange={handleSelectionChange}
            onSwipe={setSwipedItemId}
            onDeleteClick={handleDeleteClick}
          />
        )}
        {activeTab === 'projects' && (
          <ProjectInboxList
            projects={projects}
            onProjectClick={onProjectClick}
            isEditMode={isEditMode}
            selectedIds={selectedIds}
            swipedItemId={swipedItemId}
            onSelectionChange={handleSelectionChange}
            onSwipe={setSwipedItemId}
            onDeleteClick={handleDeleteClick}
          />
        )}
        {activeTab === 'goals' && (
          <GoalInboxList
            goals={goals}
            onGoalClick={onGoalClick}
            isEditMode={isEditMode}
            selectedIds={selectedIds}
            swipedItemId={swipedItemId}
            onSelectionChange={handleSelectionChange}
            onSwipe={setSwipedItemId}
            onDeleteClick={handleDeleteClick}
          />
        )}
      </div>
    </div>
  );
}
