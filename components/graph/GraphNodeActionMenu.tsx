/**
 * GraphNodeActionMenu - 그래프 노드 클릭 시 섹션별 편집 메뉴
 * 노트 노드 클릭 시 각 섹션을 선택하여 팝오버로 바로 편집 가능
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  // 기존 섹션 메뉴용 아이콘 (향후 저장 기능 완료 후 복원)
  // Type,
  // FileText,
  // FolderTree,
  // Folder,
  // CheckSquare,
  // StickyNote,
  Pencil,
  Trash,
} from 'lucide-react';
import { useGraphStore, useGraphActionMenu, useGraphPopover, type NotePopoverType } from '@/state/stores/graphStore';
import type { GraphNode } from '@/types/graph';
import type { Note } from '@/types/second-brain';

interface GraphNodeActionMenuProps {
  onDelete: (node: GraphNode) => void;
  onEdit: (node: GraphNode) => void;
}

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  count?: number;
  variant?: 'default' | 'danger';
  onClick: () => void;
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

function MenuItem({ icon: Icon, label, count, variant, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 flex items-center gap-3 rounded-lg transition-colors ${
        variant === 'danger'
          ? 'hover:bg-red-50 text-error'
          : 'hover:bg-base-200'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left text-sm">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-base-content/50 bg-base-200 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </button>
  );
}

export function GraphNodeActionMenu({ onDelete, onEdit }: GraphNodeActionMenuProps) {
  const { isOpen, node, position } = useGraphActionMenu();
  const { activePopover } = useGraphPopover();
  const { closeActionMenu, openPopover } = useGraphStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<GraphNode | null>(null);

  // 외부 클릭 시 메뉴 닫기 (확인 대화상자 또는 팝오버가 열려있으면 무시)
  useEffect(() => {
    if (!isOpen || showDeleteConfirm || activePopover) return;

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
  }, [isOpen, closeActionMenu, showDeleteConfirm, activePopover]);

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

  // 메뉴가 닫힐 때 확인 대화상자 상태 초기화
  useEffect(() => {
    if (!isOpen && !showDeleteConfirm) {
      setShowDeleteConfirm(false);
      setNodeToDelete(null);
    }
  }, [isOpen, showDeleteConfirm]);

  if (!isOpen || !node || !position) return null;

  // 노트 데이터에서 연결 개수 계산
  const noteData = node.originalData as Note | undefined;
  const projectCount = noteData?.projects?.length || 0;
  const todoCount = noteData?.todos?.length || 0;
  const linkedNoteCount = noteData?.connectedNotes?.length || 0;

  // 섹션 메뉴 클릭 핸들러
  const handleSectionClick = (type: NotePopoverType) => {
    // 팝오버 위치: 메뉴 오른쪽에 표시
    const popoverPosition = {
      x: position.x + 200, // 메뉴 오른쪽
      y: position.y,
    };
    openPopover(type, popoverPosition);
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
        data-action-menu
        className="absolute z-50 bg-base-100 rounded-xl shadow-xl p-2 min-w-[180px]"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(20px, -50%)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* 편집 메뉴 */}
        <MenuItem
          icon={Pencil}
          label="편집"
          onClick={() => {
            onEdit(node);
            closeActionMenu();
          }}
        />

        {/* 구분선 */}
        <div className="border-t border-base-300 my-2" />

        {/* 삭제 버튼 */}
        <MenuItem
          icon={Trash}
          label="삭제"
          variant="danger"
          onClick={handleDeleteClick}
        />

        {/*
         * TODO: 저장 기능 오류 수정 후 아래 섹션 메뉴 복원
         *
         * <MenuItem icon={Type} label="제목" onClick={() => handleSectionClick('title')} />
         * <MenuItem icon={FileText} label="내용" onClick={() => handleSectionClick('content')} />
         * <MenuItem icon={FolderTree} label="영역/자원" onClick={() => handleSectionClick('areaResource')} />
         * <MenuItem icon={Folder} label="프로젝트" count={projectCount} onClick={() => handleSectionClick('project')} />
         * <MenuItem icon={CheckSquare} label="할일" count={todoCount} onClick={() => handleSectionClick('todo')} />
         * <MenuItem icon={StickyNote} label="노트" count={linkedNoteCount} onClick={() => handleSectionClick('note')} />
         */}
      </div>

      {/* 삭제 확인 대화상자 */}
      {showDeleteConfirm && nodeToDelete && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-xs">
            <h3 className="font-bold text-lg">{getNodeTypeLabel(nodeToDelete.type)} 삭제</h3>
            <p className="py-4 text-base-content/70">
              이 {getNodeTypeLabel(nodeToDelete.type)}을(를) 정말 삭제하시겠습니까?
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
