'use client';

import { useState, useMemo } from 'react';
import { CheckSquare, Plus, Check, Repeat } from 'lucide-react';
import { PopoverContainer } from './PopoverContainer';
import { PopoverSearchInput } from './PopoverSearchInput';
import type { Todo } from '@/types';

interface TodoLinkPopoverProps {
  position: { x: number; y: number };
  selectedTodoIds: string[];
  allTodos: Todo[];
  onToggle: (todoId: string, isSelected: boolean) => Promise<void>;
  onCreateTodo?: (title: string) => Promise<Todo>;
  onClose: () => void;
}

export function TodoLinkPopover({
  position,
  selectedTodoIds,
  allTodos,
  onToggle,
  onCreateTodo,
  onClose,
}: TodoLinkPopoverProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'normal' | 'recurring'>('normal');

  // 검색 필터링
  const filteredTodos = useMemo(() => {
    let filtered = allTodos;

    // 탭 필터링
    filtered = filtered.filter((todo) => {
      const isRecurring = todo.recurrence_pattern && todo.recurrence_pattern !== 'none';
      if (activeTab === 'normal' && isRecurring) return false;
      if (activeTab === 'recurring' && !isRecurring) return false;
      return true;
    });

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((todo) =>
        todo.title?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allTodos, searchQuery, activeTab]);

  // 연결된 할일과 다른 할일 분리
  const connectedTodos = useMemo(
    () => filteredTodos.filter((t) => selectedTodoIds.includes(t.id)),
    [filteredTodos, selectedTodoIds]
  );

  const otherTodos = useMemo(
    () => filteredTodos.filter((t) => !selectedTodoIds.includes(t.id)),
    [filteredTodos, selectedTodoIds]
  );

  // 할일 토글
  const handleToggle = async (todoId: string) => {
    if (isToggling) return;

    setIsToggling(todoId);
    const isSelected = selectedTodoIds.includes(todoId);

    try {
      await onToggle(todoId, !isSelected);
    } catch (error) {
      console.error('할일 연결 토글 실패:', error);
    } finally {
      setIsToggling(null);
    }
  };

  // 할일 생성 및 연결
  const handleCreateTodo = async () => {
    if (!onCreateTodo || !searchQuery.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newTodo = await onCreateTodo(searchQuery.trim());
      await onToggle(newTodo.id, true);
      setSearchQuery('');
    } catch (error) {
      console.error('할일 생성 실패:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // 일반/반복 개수
  const normalCount = allTodos.filter(
    (t) => !t.recurrence_pattern || t.recurrence_pattern === 'none'
  ).length;
  const recurringCount = allTodos.filter(
    (t) => t.recurrence_pattern && t.recurrence_pattern !== 'none'
  ).length;

  return (
    <PopoverContainer
      position={position}
      onClose={onClose}
      title="할일 연결"
      width={300}
      maxHeight={480}
    >
      {/* 탭 */}
      <div className="flex gap-1 px-3 py-2 border-b border-base-300">
        <button
          onClick={() => setActiveTab('normal')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'normal'
              ? 'bg-primary text-white'
              : 'bg-base-200 hover:bg-base-300'
          }`}
        >
          일반 ({normalCount})
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'recurring'
              ? 'bg-primary text-white'
              : 'bg-base-200 hover:bg-base-300'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          반복 ({recurringCount})
        </button>
      </div>

      <PopoverSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="할일 검색 또는 생성..."
      />

      <div className="px-2 pb-2 space-y-1 max-h-[280px] overflow-y-auto">
        {/* 연결된 할일 */}
        {connectedTodos.length > 0 && (
          <>
            <div className="px-1 py-1.5 text-xs font-medium text-base-content/50">
              연결된 할일 ({connectedTodos.length})
            </div>
            {connectedTodos.map((todo) => {
              const isSelected = selectedTodoIds.includes(todo.id);
              const isLoading = isToggling === todo.id;
              const isRecurring =
                todo.recurrence_pattern && todo.recurrence_pattern !== 'none';

              return (
                <button
                  key={todo.id}
                  onClick={() => handleToggle(todo.id)}
                  disabled={isToggling !== null}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-base-300'
                    }`}
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      isSelected && <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <CheckSquare
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: todo.color || '#808080' }}
                  />
                  <span className="text-sm truncate flex-1">{todo.title}</span>
                  {isRecurring && (
                    <Repeat className="w-3.5 h-3.5 text-base-content/40" />
                  )}
                </button>
              );
            })}
          </>
        )}

        {/* 다른 할일 */}
        {otherTodos.length > 0 && (
          <>
            <div className="px-1 py-1.5 text-xs font-medium text-base-content/50 mt-2">
              다른 할일 ({otherTodos.length})
            </div>
            {otherTodos.map((todo) => {
              const isLoading = isToggling === todo.id;
              const isRecurring =
                todo.recurrence_pattern && todo.recurrence_pattern !== 'none';

              return (
                <button
                  key={todo.id}
                  onClick={() => handleToggle(todo.id)}
                  disabled={isToggling !== null}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200 transition-colors text-left"
                >
                  <div className="w-4 h-4 rounded border border-base-300 flex items-center justify-center flex-shrink-0">
                    {isLoading && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                  </div>
                  <CheckSquare
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: todo.color || '#808080' }}
                  />
                  <span className="text-sm truncate flex-1">{todo.title}</span>
                  {isRecurring && (
                    <Repeat className="w-3.5 h-3.5 text-base-content/40" />
                  )}
                </button>
              );
            })}
          </>
        )}

        {/* 검색 결과 없음 */}
        {filteredTodos.length === 0 && !searchQuery && (
          <div className="px-2 py-3 text-sm text-base-content/40 text-center">
            할일이 없습니다
          </div>
        )}
      </div>

      {/* 할일 생성 버튼 */}
      {onCreateTodo && searchQuery.trim() && activeTab === 'normal' && (
        <div className="px-2 pb-2 border-t border-base-300 pt-2">
          <button
            onClick={handleCreateTodo}
            disabled={isCreating}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-base-200 transition-colors text-left"
          >
            {isCreating ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Plus className="w-4 h-4 text-primary" />
            )}
            <CheckSquare className="w-4 h-4 text-base-content/50" />
            <span className="text-sm">
              <span className="font-medium">{searchQuery}</span> 할일 생성
            </span>
          </button>
        </div>
      )}
    </PopoverContainer>
  );
}
