/**
 * GraphMultiSelectBar - 다중 선택 시 표시되는 액션 바
 * 선택된 노드 개수와 일괄 삭제 버튼을 제공
 */

'use client';

import { useState } from 'react';
import { Trash2, X, CheckCircle } from 'lucide-react';
import { useGraphMultiSelection } from '@/state/stores/graphStore';
import type { GraphNode } from '@/types/graph';

interface GraphMultiSelectBarProps {
  nodes: GraphNode[];
  onDeleteSelected: (nodeIds: string[]) => Promise<void>;
}

// 노드 타입별 한글 라벨
const getNodeTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    note: '노트',
    todo: '할일',
    project: '프로젝트',
    goal: '목표',
    area: '책임',
    resource: '자원',
  };
  return labels[type] || '항목';
};

export function GraphMultiSelectBar({ nodes, onDeleteSelected }: GraphMultiSelectBarProps) {
  const { selectedNodeIds, clearMultiSelection } = useGraphMultiSelection();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 선택된 노드 정보 계산
  const selectedNodes = nodes.filter((node) => selectedNodeIds.includes(node.id));
  const selectedCount = selectedNodes.length;

  // 선택된 노드가 없으면 렌더링하지 않음
  if (selectedCount === 0) return null;

  // 타입별 개수 계산
  const typeCounts: Record<string, number> = {};
  selectedNodes.forEach((node) => {
    typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
  });

  // 타입별 개수 문자열 생성
  const typeCountString = Object.entries(typeCounts)
    .map(([type, count]) => `${getNodeTypeLabel(type)} ${count}개`)
    .join(', ');

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDeleteSelected(selectedNodeIds);
      clearMultiSelection();
    } catch (error) {
      console.error('일괄 삭제 실패:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleClearSelection = () => {
    clearMultiSelection();
  };

  return (
    <>
      {/* 다중 선택 액션 바 */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-base-100 rounded-full shadow-xl px-4 py-2 flex items-center gap-3 border border-base-300">
        {/* 선택 정보 */}
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-sky-500" />
          <span className="text-sm font-medium">
            {selectedCount}개 선택됨
          </span>
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-base-300" />

        {/* 삭제 버튼 */}
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="btn btn-error btn-sm rounded-full gap-2"
        >
          {isDeleting ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          삭제
        </button>

        {/* 선택 해제 버튼 */}
        <button
          onClick={handleClearSelection}
          className="btn btn-ghost btn-sm btn-circle"
          title="선택 해제"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 삭제 확인 대화상자 */}
      {showDeleteConfirm && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg text-error">일괄 삭제</h3>
            <div className="py-4 space-y-2">
              <p className="text-base-content/70">
                선택한 {selectedCount}개 항목을 정말 삭제하시겠습니까?
              </p>
              <p className="text-sm text-base-content/50">
                {typeCountString}
              </p>
              <p className="text-sm text-error/80 mt-2">
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost rounded-full"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                className="btn btn-error rounded-full gap-2"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    삭제 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {selectedCount}개 삭제
                  </>
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleDeleteCancel}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}

export default GraphMultiSelectBar;
