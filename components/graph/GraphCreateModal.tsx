/**
 * GraphCreateModal - 그래프 뷰에서 노드 생성 모달
 * 노드 타입에 따라 적절한 생성 폼 표시
 * TODO: 기존 모달들(AreaResourceEditModal, TodoEditModal 등)과 통합 예정
 */

'use client';

import { useState } from 'react';
import { X, Briefcase, Archive, Target, FolderOpen, CheckSquare, StickyNote } from 'lucide-react';
import { useGraphStore, useGraphCreateModal } from '@/state/stores/graphStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useAuth } from '@/app/context/AuthContext';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import type { GraphNodeType } from '@/types/graph';
import type { UsageEntityType } from '@/lib/featureFlags';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/graph-utils';

// GraphNodeType → UsageEntityType 매핑
const NODE_TO_USAGE_TYPE: Record<GraphNodeType, UsageEntityType> = {
  area: 'area_resource',
  resource: 'area_resource',
  goal: 'goal',
  project: 'project',
  todo: 'todo', // 기본값 (habit은 recurrence에 따라)
  note: 'note',
};

// 노드 타입별 아이콘
const NODE_ICONS: Record<GraphNodeType, React.ElementType> = {
  area: Briefcase,
  resource: Archive,
  goal: Target,
  project: FolderOpen,
  todo: CheckSquare,
  note: StickyNote,
};

export function GraphCreateModal() {
  const { user } = useAuth();
  const { isOpen, type, parentId } = useGraphCreateModal();
  const { closeCreateModal } = useGraphStore();

  // 스토어 액션들
  const { createArea } = useAreaStore();
  const { createResource } = useResourceStore();
  const { createGoal } = useGoalStore();
  const { createProject } = useProjectStore();
  const { createTodo } = useTodoStore();
  const { createNote } = useNoteStore();

  // 용량 체크 훅
  const { checkAndProceed, limitResult, isModalOpen, closeModal, onCreateSuccess } = useUsageLimitCheck();

  // 폼 상태
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !type) return null;

  const Icon = NODE_ICONS[type];
  const color = NODE_TYPE_COLORS[type];
  const label = NODE_TYPE_LABELS[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?.id;
    if (!userId || !title.trim()) return;

    // 용량 체크 후 생성 진행
    const usageType = NODE_TO_USAGE_TYPE[type];

    await checkAndProceed(usageType, async () => {
      setLoading(true);
      setError(null);

      try {
        switch (type) {
          case 'area':
            await createArea(userId, {
              title: title.trim(),
              color: color,
              is_pinned: false,
              order_index: 0,
            });
            break;

          case 'resource':
            await createResource(userId, {
              title: title.trim(),
              color: color,
              is_pinned: false,
              order_index: 0,
            });
            break;

          case 'goal':
            await createGoal(userId, {
              title: title.trim(),
              color: color,
              status: 'not_started',
              // Goal has area_id and resource_id, not area_resource_id
              area_id: parentId || undefined,
            });
            break;

          case 'project':
            await createProject(userId, {
              title: title.trim(),
              color: color,
              status: 'not_started',
              goal_id: parentId || undefined,
              order_index: 0,
            });
            break;

          case 'todo':
            await createTodo({
              title: title.trim(),
              schedule_type: 'anytime',
              priority: 'medium',
            });
            break;

          case 'note':
            await createNote(userId, {
              title: title.trim(),
              content: '',
              note_category: 'none',
              is_pinned: false,
            });
            break;
        }

        // 성공 시 카운트 증가 및 닫기
        onCreateSuccess(usageType);
        setTitle('');
        closeCreateModal();
      } catch (err) {
        console.error('❌ 노드 생성 실패:', err);
        setError(err instanceof Error ? err.message : '생성에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleCancel = () => {
    setTitle('');
    setError(null);
    closeCreateModal();
  };

  return (
    <>
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-sm">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              <Icon className="w-5 h-5 text-white" />
            </span>
            <div>
              <h3 className="font-semibold">새 {label}</h3>
              <p className="text-xs text-base-content/60">
                {type === 'area' && '책임 영역을 정의합니다'}
                {type === 'resource' && '관심 주제나 자원을 추가합니다'}
                {type === 'goal' && '달성하고 싶은 목표를 설정합니다'}
                {type === 'project' && '진행할 프로젝트를 생성합니다'}
                {type === 'todo' && '해야 할 일을 추가합니다'}
                {type === 'note' && '메모나 아이디어를 기록합니다'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <input
              type="text"
              placeholder={`${label} 제목 입력...`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered w-full"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-error text-sm mt-2">{error}</div>
          )}

          {/* 버튼 */}
          <div className="modal-action">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-ghost btn-sm rounded-full"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm rounded-full"
              disabled={loading || !title.trim()}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                '생성'
              )}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleCancel}>close</button>
      </form>
    </dialog>

    {/* 용량 제한 모달 */}
    {isModalOpen && limitResult && (
      <UsageLimitModal
        isOpen={isModalOpen}
        onClose={closeModal}
        result={limitResult}
      />
    )}
  </>
  );
}

export default GraphCreateModal;
