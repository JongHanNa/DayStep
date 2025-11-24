'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useReviewStore } from '@/lib/stores/reviewStore';
import { useAuth } from '@/app/context/AuthContext';
import InboxTabs, { type InboxTabType } from '@/components/second-brain/clarify/InboxTabs';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import TodoInboxList from '@/components/second-brain/clarify/TodoInboxList';
import NoteInboxList from '@/components/second-brain/clarify/NoteInboxList';
import ProjectInboxList from '@/components/second-brain/clarify/ProjectInboxList';
import GoalInboxList from '@/components/second-brain/clarify/GoalInboxList';

interface EmptySectionProps {
  isExpanded: boolean;
}

export default function EmptySection({ isExpanded }: EmptySectionProps) {
  const { user } = useAuth();
  const {
    emptyChecklists,
    checklistStates,
    toggleChecklistItem,
    addChecklistItem,
    removeChecklistItem,
  } = useReviewStore();

  const { inboxItems, fetchInboxItems } = useInboxStore();
  const { projects } = useProjectStore();
  const { notes } = useNoteStore();
  const { goals } = useGoalStore();

  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceLabel, setNewSourceLabel] = useState('');
  const [activeInboxTab, setActiveInboxTab] = useState<InboxTabType>('todos');

  // 편집 모드 관련 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);

  // 체크리스트 항목별 체크 상태 확인
  const isChecked = (itemId: string) => {
    return checklistStates.get(itemId)?.is_checked || false;
  };

  // 새 매체 추가 핸들러
  const handleAddSource = async () => {
    if (!user || !newSourceLabel.trim()) return;

    try {
      await addChecklistItem(user.id, 'empty', newSourceLabel.trim());
      setNewSourceLabel('');
      setIsAddingSource(false);
    } catch (error) {
      console.error('Failed to add source:', error);
    }
  };

  // 커스텀 매체 삭제
  const handleRemoveSource = async (itemId: string) => {
    if (!user) return;
    if (!confirm('이 수집 매체를 삭제하시겠습니까?')) return;

    try {
      await removeChecklistItem(user.id, itemId);
    } catch (error) {
      console.error('Failed to remove source:', error);
    }
  };

  // 편집 모드 핸들러
  const handleSelectionChange = (id: string, isChecked: boolean, shiftKey: boolean, index: number) => {
    const newSelected = new Set(selectedIds);
    if (isChecked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSwipe = (itemId: string | null) => {
    setSwipedItemId(itemId);
  };

  const handleDeleteClick = (itemId: string) => {
    if (confirm('이 항목을 삭제하시겠습니까?')) {
      // 삭제 로직은 TodoInboxList 내부에서 처리
    }
  };

  const handleRefresh = () => {
    if (user) {
      fetchInboxItems(user.id);
    }
  };

  // 수집함 카운트 및 필터링
  const todos = inboxItems.filter((item) => item.item_type === 'todo');
  const noteItems = inboxItems.filter((item) => item.item_type === 'note');

  // 프로젝트와 목표는 inboxItems가 아니라 실제 projects/goals 스토어에서 필터링
  // 수집함 규칙: status/end_date/area/resource가 없는 것들
  const projectItems = projects.filter((project) =>
    !project.status || !project.end_date
  );
  const goalItems = goals.filter((goal) =>
    !goal.end_date || (!goal.area_id && !goal.resource_id)
  );

  const inboxCounts = {
    todos: todos.length,
    notes: noteItems.length,
    projects: projectItems.length,
    goals: goalItems.length,
  };

  if (!isExpanded) return null;
  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* 수집 매체 체크리스트 */}
      <div className="p-4 bg-base-200 rounded-lg">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="text-lg">📥</span>
          어디부터 점검해볼까요
        </h4>

        {/* 체크박스 그리드 (3컬럼) */}
        <div className="grid grid-cols-3 gap-3">
          {emptyChecklists.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={isChecked(item.id)}
                  onChange={() => user && toggleChecklistItem(user.id, item.id)}
                  className="checkbox checkbox-sm"
                />
                <span className="text-sm">{item.label}</span>
              </label>
              {!item.is_default && (
                <button
                  onClick={() => handleRemoveSource(item.id)}
                  className="btn btn-ghost btn-xs text-error"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 새로운 매체 추가 */}
        {isAddingSource ? (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newSourceLabel}
              onChange={(e) => setNewSourceLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
              placeholder="새로운 수집 매체 입력"
              className="input input-sm flex-1 border-2"
              autoFocus
            />
            <button onClick={handleAddSource} className="btn btn-primary btn-sm rounded-full">
              추가
            </button>
            <button
              onClick={() => {
                setIsAddingSource(false);
                setNewSourceLabel('');
              }}
              className="btn btn-ghost btn-sm rounded-full"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingSource(true)}
            className="btn btn-ghost btn-sm rounded-full mt-3"
          >
            <Plus className="w-4 h-4" />
            새로운 매체 추가
          </button>
        )}
      </div>

      {/* 수집함 비우기 섹션 (명료화 페이지와 동일) */}
      <div>
        <InboxTabs
          activeTab={activeInboxTab}
          onTabChange={setActiveInboxTab}
          counts={inboxCounts}
        />

        {/* 탭별 내용 - 명료화 페이지 컴포넌트 재사용 */}
        <div className="mt-4">
          {activeInboxTab === 'todos' && (
            <TodoInboxList
              todos={todos}
              projects={projects}
              notes={notes}
              onRefresh={handleRefresh}
              userId={user.id}
              isEditMode={isEditMode}
              selectedIds={selectedIds}
              swipedItemId={swipedItemId}
              onSelectionChange={handleSelectionChange}
              onSwipe={handleSwipe}
              onDeleteClick={handleDeleteClick}
            />
          )}
          {activeInboxTab === 'notes' && (
            <NoteInboxList
              notes={noteItems}
              areas={[]}
              resources={[]}
              projects={projects}
              todos={[]}
              allNotes={notes}
              onRefresh={handleRefresh}
              isEditMode={isEditMode}
              selectedIds={selectedIds}
              swipedItemId={swipedItemId}
              onSelectionChange={handleSelectionChange}
              onSwipe={handleSwipe}
              onDeleteClick={handleDeleteClick}
            />
          )}
          {activeInboxTab === 'projects' && (
            <ProjectInboxList
              projects={projectItems}
              isEditMode={isEditMode}
              selectedIds={selectedIds}
              swipedItemId={swipedItemId}
              onSelectionChange={handleSelectionChange}
              onSwipe={handleSwipe}
              onDeleteClick={handleDeleteClick}
            />
          )}
          {activeInboxTab === 'goals' && (
            <GoalInboxList
              goals={goalItems}
              isEditMode={isEditMode}
              selectedIds={selectedIds}
              swipedItemId={swipedItemId}
              onSelectionChange={handleSelectionChange}
              onSwipe={handleSwipe}
              onDeleteClick={handleDeleteClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
