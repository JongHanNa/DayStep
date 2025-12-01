/**
 * GraphNodeActionMenu - 그래프 노드 클릭 시 액션 선택 메뉴
 * 노트 노드 클릭 시 편집/삭제 선택지를 제공
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { SquarePen, Trash } from 'lucide-react';
import { useGraphStore, useGraphActionMenu } from '@/state/stores/graphStore';
import type { GraphNode } from '@/types/graph';

interface GraphNodeActionMenuProps {
  onEdit: (node: GraphNode) => void;
  onDelete: (node: GraphNode) => void;
}

export function GraphNodeActionMenu({ onEdit, onDelete }: GraphNodeActionMenuProps) {
  const { isOpen, node, position } = useGraphActionMenu();
  const { closeActionMenu } = useGraphStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<GraphNode | null>(null);

  // 외부 클릭 시 메뉴 닫기 (확인 대화상자가 열려있으면 무시)
  useEffect(() => {
    if (!isOpen || showDeleteConfirm) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeActionMenu();
      }
    };

    // 약간의 딜레이 후 이벤트 등록 (클릭 이벤트와 충돌 방지)
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeActionMenu, showDeleteConfirm]);

  // ESC 키로 메뉴 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          closeActionMenu();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeActionMenu, showDeleteConfirm]);

  // 메뉴가 닫힐 때 확인 대화상자 상태 초기화 (삭제 진행 중이 아닐 때만)
  useEffect(() => {
    if (!isOpen && !showDeleteConfirm) {
      setShowDeleteConfirm(false);
      setNodeToDelete(null);
    }
  }, [isOpen, showDeleteConfirm]);

  if (!isOpen || !node || !position) return null;

  const handleEdit = () => {
    closeActionMenu();
    onEdit(node);
  };

  const handleDeleteClick = () => {
    setNodeToDelete(node);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (nodeToDelete) {
      onDelete(nodeToDelete);
    }
    setShowDeleteConfirm(false);
    setNodeToDelete(null);
    closeActionMenu();
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setNodeToDelete(null);
  };

  return (
    <>
      {/* 액션 메뉴 */}
      <div
        ref={menuRef}
        className="absolute z-50 bg-base-100 rounded-[28px] shadow-xl p-2 flex flex-col gap-2"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(20px, -50%)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <button
          onClick={handleEdit}
          className="w-11 h-11 rounded-full bg-base-200 hover:bg-base-300 flex items-center justify-center transition-all duration-200 hover:scale-105"
          title="편집"
        >
          <SquarePen className="w-4 h-4 text-base-content" />
        </button>
        <button
          onClick={handleDeleteClick}
          className="w-11 h-11 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all duration-200 hover:scale-105"
          title="삭제"
        >
          <Trash className="w-4 h-4 text-error" />
        </button>
      </div>

      {/* 삭제 확인 대화상자 */}
      {showDeleteConfirm && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-xs">
            <h3 className="font-bold text-lg">노트 삭제</h3>
            <p className="py-4 text-base-content/70">
              이 노트를 정말 삭제하시겠습니까?
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost rounded-full"
                onClick={handleDeleteCancel}
              >
                취소
              </button>
              <button
                className="btn btn-error rounded-full"
                onClick={handleDeleteConfirm}
              >
                삭제
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

export default GraphNodeActionMenu;
