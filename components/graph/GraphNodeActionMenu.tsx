/**
 * GraphNodeActionMenu - 그래프 노드 클릭 시 액션 선택 메뉴
 * 노트 노드 클릭 시 편집/삭제 선택지를 제공
 */

'use client';

import { useEffect, useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, closeActionMenu]);

  // ESC 키로 메뉴 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeActionMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeActionMenu]);

  if (!isOpen || !node || !position) return null;

  const handleEdit = () => {
    closeActionMenu();
    onEdit(node);
  };

  const handleDelete = () => {
    closeActionMenu();
    onDelete(node);
  };

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-base-100 rounded-lg shadow-xl border border-base-300 overflow-hidden min-w-[120px]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(8px, -50%)',  // 오른쪽 중앙에 표시 (노드 제목 가림 방지)
      }}
    >
      <button
        onClick={handleEdit}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-base-content hover:bg-base-200 transition-colors"
      >
        <Pencil className="w-4 h-4" />
        <span>편집</span>
      </button>
      <div className="h-px bg-base-300" />
      <button
        onClick={handleDelete}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-error/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        <span>삭제</span>
      </button>
    </div>
  );
}

export default GraphNodeActionMenu;
