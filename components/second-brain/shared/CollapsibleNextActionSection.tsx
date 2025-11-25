'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Zap, Search, ChevronDown, ChevronUp, Plus, X, Pencil, Check } from 'lucide-react';
import type { NextActionContextItem } from '@/types';

interface CollapsibleNextActionSectionProps {
  selectedContextIds: string[];
  allContexts: NextActionContextItem[];
  onChange: (contextIds: string[]) => void;
  onCreateContext?: (title: string) => Promise<NextActionContextItem | null>;
  onUpdateContext?: (id: string, title: string) => Promise<NextActionContextItem | null>;
  onDeleteContext?: (id: string) => Promise<boolean>;
  todoColor?: string;
  todoId?: string;
  userId?: string;
  onImmediateSave?: (contextIds: string[]) => Promise<void>;
}

export default function CollapsibleNextActionSection({
  selectedContextIds = [],
  allContexts = [],
  onChange,
  onCreateContext,
  onUpdateContext,
  onDeleteContext,
  todoColor = '#808080',
  todoId,
  userId,
  onImmediateSave,
}: CollapsibleNextActionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // 편집 모드 시 input에 포커스
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // 검색 필터링
  const filteredContexts = useMemo(() => {
    if (!searchQuery.trim()) return allContexts;

    const query = searchQuery.toLowerCase();
    return allContexts.filter(context =>
      context.title.toLowerCase().includes(query)
    );
  }, [allContexts, searchQuery]);

  // 선택된 항목과 다른 항목 분리
  const selectedItems = useMemo(() =>
    filteredContexts.filter(ctx => selectedContextIds.includes(ctx.id)),
    [filteredContexts, selectedContextIds]
  );

  const unselectedItems = useMemo(() =>
    filteredContexts.filter(ctx => !selectedContextIds.includes(ctx.id)),
    [filteredContexts, selectedContextIds]
  );

  // 검색어와 정확히 일치하는 항목이 있는지 확인
  const exactMatchExists = useMemo(() => {
    if (!searchQuery.trim()) return true;
    return allContexts.some(
      ctx => ctx.title.toLowerCase() === searchQuery.trim().toLowerCase()
    );
  }, [allContexts, searchQuery]);

  // 항목 선택/해제 토글
  const toggleContext = async (contextId: string) => {
    const newIds = selectedContextIds.includes(contextId)
      ? selectedContextIds.filter(id => id !== contextId)
      : [...selectedContextIds, contextId];

    // 로컬 상태 즉시 업데이트
    onChange(newIds);

    // DB에 즉시 저장 (선택적)
    if (onImmediateSave) {
      try {
        await onImmediateSave(newIds);
      } catch (error) {
        console.error('다음행동상황 연결 저장 실패:', error);
        // 실패 시 원래 상태로 되돌리기
        onChange(selectedContextIds);
      }
    }
  };

  // 항목 생성 및 자동 연결
  const handleCreateContext = async () => {
    if (!onCreateContext || !searchQuery.trim()) return;

    try {
      const newContext = await onCreateContext(searchQuery.trim());
      if (newContext) {
        const newIds = [...selectedContextIds, newContext.id];

        // 로컬 상태 즉시 업데이트
        onChange(newIds);

        // DB에 즉시 저장 (선택적)
        if (onImmediateSave) {
          await onImmediateSave(newIds);
        }

        // 검색어 초기화
        setSearchQuery('');
      }
    } catch (error) {
      console.error('다음행동상황 생성 실패:', error);
    }
  };

  // 인라인 편집 시작
  const startEditing = (context: NextActionContextItem) => {
    setEditingId(context.id);
    setEditingTitle(context.title);
  };

  // 인라인 편집 저장
  const saveEditing = async () => {
    if (!editingId || !editingTitle.trim() || !onUpdateContext) return;

    try {
      await onUpdateContext(editingId, editingTitle.trim());
      setEditingId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('다음행동상황 수정 실패:', error);
    }
  };

  // 인라인 편집 취소
  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  // 항목 삭제
  const handleDelete = async (contextId: string) => {
    if (!onDeleteContext) return;

    try {
      const success = await onDeleteContext(contextId);
      if (success) {
        // 선택된 상태에서도 제거
        if (selectedContextIds.includes(contextId)) {
          const newIds = selectedContextIds.filter(id => id !== contextId);
          onChange(newIds);
          if (onImmediateSave) {
            await onImmediateSave(newIds);
          }
        }
      }
    } catch (error) {
      console.error('다음행동상황 삭제 실패:', error);
    }
  };

  // 키보드 이벤트 핸들러
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // 항목 렌더링 함수
  const renderContextItem = (context: NextActionContextItem, isSelected: boolean) => {
    const isEditing = editingId === context.id;

    return (
      <div
        key={context.id}
        className="flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors group"
      >
        {/* 체크박스 - 연결/해제 */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            toggleContext(context.id);
          }}
          className="checkbox checkbox-sm cursor-pointer"
          style={isSelected ? {
            borderColor: todoColor,
            backgroundColor: todoColor,
          } : {
            borderColor: todoColor,
          }}
        />

        {/* 아이콘 */}
        <Zap
          className="h-4 w-4 flex-shrink-0"
          style={{ color: todoColor, opacity: isSelected ? 1 : 0.5 }}
        />

        {/* 인라인 편집 모드 */}
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              ref={editInputRef}
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={saveEditing}
              className="input input-sm input-bordered flex-1"
            />
            <button
              type="button"
              onClick={saveEditing}
              className="btn btn-ghost btn-xs btn-circle"
            >
              <Check className="h-3 w-3 text-success" />
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              className="btn btn-ghost btn-xs btn-circle"
            >
              <X className="h-3 w-3 text-error" />
            </button>
          </div>
        ) : (
          <>
            {/* 클릭 가능 영역 - 인라인 편집 */}
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => onUpdateContext && startEditing(context)}
            >
              <span className="text-sm">{context.title}</span>
            </div>

            {/* 편집/삭제 버튼 (hover 시 표시) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onUpdateContext && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(context);
                  }}
                  className="btn btn-ghost btn-xs btn-circle"
                >
                  <Pencil className="h-3 w-3 text-base-content/50" />
                </button>
              )}
              {onDeleteContext && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(context.id);
                  }}
                  className="btn btn-ghost btn-xs btn-circle"
                >
                  <X className="h-3 w-3 text-error" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // 축약 상태 렌더링
  if (!isExpanded) {
    return (
      <div className="my-4">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 rounded-lg bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5" style={{ color: todoColor }} />
              <span className="text-lg font-semibold" style={{ color: '#666666' }}>
                다음행동상황 {selectedContextIds.length}개
              </span>
            </div>
            <ChevronDown className="h-5 w-5 text-base-content/50" />
          </div>
        </button>
      </div>
    );
  }

  // 확장 상태 렌더링
  return (
    <div className="my-4">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        className="w-full p-3 rounded-t-lg bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5" style={{ color: todoColor }} />
            <span className="text-lg font-semibold" style={{ color: '#666666' }}>
              다음행동상황 {selectedContextIds.length}개
            </span>
          </div>
          <ChevronUp className="h-5 w-5 text-base-content/50" />
        </div>
      </button>

      {/* 확장된 내용 */}
      <div className="border border-t-0 border-base-300 rounded-b-lg bg-base-100">
        {/* 검색 입력창 */}
        <div className="p-3 border-b border-base-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/50" />
            <input
              type="text"
              placeholder="다음행동상황 검색 또는 생성"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
        </div>

        {/* 선택된 항목 */}
        {selectedItems.length > 0 && (
          <div className="p-3 border-b border-base-300">
            <div className="text-sm text-base-content/70 mb-2">
              선택됨 {selectedItems.length}개
            </div>
            <div className="space-y-1">
              {selectedItems.map(context => renderContextItem(context, true))}
            </div>
          </div>
        )}

        {/* 미선택 항목 */}
        {unselectedItems.length > 0 && (
          <div className="p-3">
            <div className="text-sm text-base-content/70 mb-2">
              다른 항목들
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {unselectedItems.map(context => renderContextItem(context, false))}
            </div>
          </div>
        )}

        {/* 검색 결과가 없을 때 */}
        {filteredContexts.length === 0 && searchQuery && !onCreateContext && (
          <div className="p-8 text-center text-base-content/50">
            &quot;{searchQuery}&quot;에 대한 검색 결과가 없습니다
          </div>
        )}

        {/* 항목이 없을 때 (검색어 없을 때만) */}
        {filteredContexts.length === 0 && !searchQuery && (
          <div className="p-8 text-center text-base-content/50">
            다음행동상황 항목이 없습니다
          </div>
        )}

        {/* 검색어가 있고 정확히 일치하는 항목이 없을 때 생성 버튼 표시 */}
        {onCreateContext && searchQuery.trim() && !exactMatchExists && (
          <div className="p-3 border-t border-base-300">
            <button
              type="button"
              onClick={handleCreateContext}
              className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors text-left"
            >
              <Plus className="h-5 w-5 text-base-content/70" />
              <Zap className="h-5 w-5" style={{ color: todoColor }} />
              <span className="text-sm">
                새로운 <strong>{searchQuery}</strong> 항목 생성
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
