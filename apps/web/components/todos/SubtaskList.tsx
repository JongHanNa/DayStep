'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Check, Clock, Plus, Trash2 } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';
import { Todo } from '@/entities/todo/Todo';

interface SubtaskListProps {
  parentTodoId: string;
  /** 컴팩트 모드: 프로젝트 모달 등에서 사용 */
  compact?: boolean;
  /** 기본 펼침 상태 */
  defaultExpanded?: boolean;
  /** 편집 모드: 서브태스크 추가 UI 표시 */
  editable?: boolean;
  /** 서브태스크 추가 핸들러 */
  onAddSubtask?: (title: string) => Promise<void>;
  /** 서브태스크 삭제 핸들러 */
  onDeleteSubtask?: (subtaskId: string) => Promise<void>;
}

/**
 * 서브태스크 목록 컴포넌트
 *
 * ADHD용 "바보같이 작게 쪼개기" 기능
 * - 부모 할일의 서브태스크를 펼침/접힘 형태로 표시
 * - 완료 토글 시 모든 서브태스크 완료되면 부모 자동 완료
 * - 진행률 뱃지 표시
 * - editable 모드: 새 서브태스크 추가 기능
 */
export default function SubtaskList({
  parentTodoId,
  compact = false,
  defaultExpanded = false,
  editable = false,
  onAddSubtask,
  onDeleteSubtask,
}: SubtaskListProps) {
  const {
    hasSubtasks,
    getSubtasksForTodo,
    getSubtaskProgress,
    fetchSubtasks,
    toggleSubtask,
  } = useTodoStore();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isLoading, setIsLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // 서브태스크 존재 여부 확인
  const hasChildren = hasSubtasks(parentTodoId);
  const subtasks = getSubtasksForTodo(parentTodoId);
  const progress = getSubtaskProgress(parentTodoId);

  // 서브태스크 로드
  useEffect(() => {
    if (isExpanded && subtasks.length === 0 && hasChildren) {
      setIsLoading(true);
      fetchSubtasks(parentTodoId).finally(() => setIsLoading(false));
    }
  }, [isExpanded, parentTodoId, subtasks.length, hasChildren, fetchSubtasks]);

  // editable 모드에서 초기 로드
  useEffect(() => {
    if (editable && defaultExpanded) {
      fetchSubtasks(parentTodoId);
    }
  }, [editable, defaultExpanded, parentTodoId, fetchSubtasks]);

  // 서브태스크가 없고 editable 모드도 아니면 렌더링 안함
  if (!hasChildren && subtasks.length === 0 && !editable) {
    return null;
  }

  // 서브태스크 완료 토글
  const handleToggleSubtask = async (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleSubtask(subtaskId);
  };

  // 서브태스크 삭제
  const handleDeleteSubtask = async (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteSubtask) {
      await onDeleteSubtask(subtaskId);
    }
  };

  // 펼침/접힘 토글
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // 새 서브태스크 추가
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !onAddSubtask) return;

    setIsAdding(true);
    try {
      await onAddSubtask(newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    } catch (error) {
      console.error('서브태스크 추가 실패:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className={compact ? 'mt-1' : 'mt-2'}>
      {/* 펼침/접힘 버튼 + 진행률 */}
      <button
        onClick={handleToggleExpand}
        className="flex items-center gap-1.5 text-xs text-base-content/60 hover:text-base-content/80 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span className="font-medium">세부 단계</span>
        {progress.total > 0 && (
          <span className="badge badge-xs badge-ghost">
            {progress.completed}/{progress.total}
          </span>
        )}
        {progress.total > 0 && progress.completed === progress.total && (
          <Check className="w-3 h-3 text-success" />
        )}
      </button>

      {/* 서브태스크 목록 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`space-y-1 ${compact ? 'mt-1.5 ml-3' : 'mt-2 ml-4'}`}>
              {isLoading ? (
                <div className="flex items-center justify-center py-2">
                  <span className="loading loading-spinner loading-xs" />
                </div>
              ) : subtasks.length === 0 && !editable ? (
                <p className="text-xs text-base-content/40 py-1">
                  서브태스크가 없습니다
                </p>
              ) : (
                <>
                  {subtasks.map((subtask) => (
                    <SubtaskItem
                      key={subtask.id}
                      subtask={subtask}
                      compact={compact}
                      onToggle={handleToggleSubtask}
                      onDelete={onDeleteSubtask ? handleDeleteSubtask : undefined}
                    />
                  ))}

                  {/* 서브태스크 추가 입력 (editable 모드) */}
                  {editable && onAddSubtask && (
                    <form onSubmit={handleAddSubtask} className="flex items-center gap-2 py-1">
                      <div className="flex-shrink-0 w-4 h-4 rounded border-2 border-dashed border-base-content/20" />
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="새 세부 단계 입력..."
                        className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-base-content/30"
                        disabled={isAdding}
                      />
                      {newSubtaskTitle.trim() && (
                        <button
                          type="submit"
                          disabled={isAdding}
                          className="btn btn-ghost btn-xs btn-circle"
                        >
                          {isAdding ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </form>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SubtaskItemProps {
  subtask: Todo;
  compact?: boolean;
  onToggle: (subtaskId: string, e: React.MouseEvent) => void;
  onDelete?: (subtaskId: string, e: React.MouseEvent) => void;
}

/**
 * 서브태스크 개별 아이템
 */
function SubtaskItem({ subtask, compact = false, onToggle, onDelete }: SubtaskItemProps) {
  return (
    <div
      className={`flex items-center gap-2 ${
        compact ? 'py-1' : 'py-1.5'
      } group`}
    >
      {/* 체크박스 */}
      <button
        onClick={(e) => onToggle(subtask.id, e)}
        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
          subtask.completed
            ? 'bg-success border-success'
            : 'border-base-content/30 hover:border-primary'
        }`}
      >
        {subtask.completed && <Check className="w-2.5 h-2.5 text-white" />}
      </button>

      {/* 제목 */}
      <span
        className={`text-sm flex-1 ${
          subtask.completed
            ? 'line-through text-base-content/40'
            : 'text-base-content/80'
        }`}
      >
        {subtask.title}
      </span>

      {/* 소요 시간 (있는 경우) */}
      {subtask.anytimeDuration && subtask.anytimeDuration > 0 && (
        <span className="text-xs text-base-content/40 flex items-center gap-0.5">
          <Clock className="w-3 h-3" />
          {subtask.anytimeDuration}분
        </span>
      )}

      {/* 삭제 버튼 (호버 시 표시) */}
      {onDelete && (
        <button
          onClick={(e) => onDelete(subtask.id, e)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-error/10 rounded"
          title="삭제"
        >
          <Trash2 className="w-3.5 h-3.5 text-error/60 hover:text-error" />
        </button>
      )}
    </div>
  );
}
