/**
 * GraphNodeActionMenu - 그래프 노드 클릭 시 액션 선택 메뉴
 * 노트 노드 클릭 시 편집/삭제 선택지를 제공
 */

'use client';

import { useEffect, useRef } from 'react';
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
      className="absolute z-50 bg-base-100 rounded-[28px] shadow-xl p-2 flex flex-col gap-2"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(8px, -50%)',
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
        onClick={handleDelete}
        className="w-11 h-11 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all duration-200 hover:scale-105"
        title="삭제"
      >
        <Trash className="w-4 h-4 text-error" />
      </button>
    </div>
  );
}

export default GraphNodeActionMenu;
