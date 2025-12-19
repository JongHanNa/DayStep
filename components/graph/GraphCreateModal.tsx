/**
 * GraphCreateModal - 그래프 뷰에서 Todo/Note 생성 모달
 */

'use client';

import { useState } from 'react';
import { X, CheckSquare, StickyNote } from 'lucide-react';
import { useGraphStore, useGraphCreateModal, useGraphFocus } from '@/state/stores/graphStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore } from '@/state/stores/noteStore';
import { useAuth } from '@/app/context/AuthContext';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/graph-utils';
import type { GraphNodeType } from '@/types/graph';
import type { UsageEntityType } from '@/lib/featureFlags';

// GraphNodeType → UsageEntityType 매핑 (Todo + Note만)
const NODE_TO_USAGE_TYPE: Partial<Record<GraphNodeType, UsageEntityType>> = {
  todo: 'todo',
  note: 'note',
};

// 노드 타입별 아이콘 (Todo + Note만)
const NODE_ICONS: Partial<Record<GraphNodeType, React.ElementType>> = {
  todo: CheckSquare,
  note: StickyNote,
};

export function GraphCreateModal() {
  const { user } = useAuth();
  const userId = user?.id;
  const { isOpen, type } = useGraphCreateModal();
  const { closeCreateModal } = useGraphStore();
  const { setFocusNodeId } = useGraphFocus();

  // 스토어 액션들
  const { createTodo } = useTodoStore();
  const { createNote } = useNoteStore();

  // 용량 체크 훅
  const { checkAndProceed, limitResult, isModalOpen, closeModal, onCreateSuccess } = useUsageLimitCheck();

  // 폼 상태
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Todo/Note 타입이 아니면 모달 표시하지 않음
  if (!isOpen || !type || (type !== 'todo' && type !== 'note')) return null;

  const Icon = NODE_ICONS[type] || CheckSquare;
  const color = NODE_TYPE_COLORS[type];
  const label = NODE_TYPE_LABELS[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !title.trim()) return;

    // 용량 체크 후 생성 진행
    const usageType = NODE_TO_USAGE_TYPE[type];
    if (!usageType) return;

    await checkAndProceed(usageType, async () => {
      setLoading(true);
      setError(null);

      try {
        let newNodeId: string | null = null;

        switch (type) {
          case 'todo': {
            const created = await createTodo({
              title: title.trim(),
              schedule_type: 'anytime',
              priority: 'medium',
            });
            newNodeId = created?.id || null;
            break;
          }

          case 'note': {
            const created = await createNote({
              title: title.trim(),
              content: '',
              note_category: 'none',
              is_pinned: false,
              user_id: userId,
            });
            newNodeId = created.id;
            break;
          }
        }

        // 성공 시 카운트 증가 및 닫기
        onCreateSuccess(usageType);
        setTitle('');
        closeCreateModal();

        // 새 노드로 포커스 (모달 닫힌 후 실행되도록 setTimeout 사용)
        if (newNodeId) {
          setTimeout(() => {
            setFocusNodeId(newNodeId);
          }, 100);
        }
      } catch (err) {
        console.error(`❌ ${label} 생성 실패:`, err);
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
