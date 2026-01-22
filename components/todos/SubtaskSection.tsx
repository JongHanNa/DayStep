'use client';

import { useEffect, useCallback } from 'react';
import { useTodoStore } from '@/state/stores/todoStore';
import SubtaskList from './SubtaskList';

interface SubtaskSectionProps {
  todoId: string;
  userId: string;
  todoColor?: string;
}

/**
 * 할일 편집 모달용 서브태스크 섹션
 *
 * - 서브태스크 목록 표시 (펼침/접힘)
 * - 진행률 배지 표시
 * - 새 서브태스크 추가 기능
 * - Store 연동 (createSubtask, toggleSubtask)
 */
export default function SubtaskSection({
  todoId,
  userId,
  todoColor,
}: SubtaskSectionProps) {
  const { createSubtask, fetchSubtasks, deleteSubtask } = useTodoStore();

  // 모달 열릴 때 서브태스크 조회
  useEffect(() => {
    if (todoId) {
      fetchSubtasks(todoId);
    }
  }, [todoId, fetchSubtasks]);

  // 서브태스크 추가 핸들러
  const handleAddSubtask = useCallback(async (title: string) => {
    if (!todoId) return;
    await createSubtask(todoId, title);
  }, [todoId, createSubtask]);

  // 서브태스크 삭제 핸들러
  const handleDeleteSubtask = useCallback(async (subtaskId: string) => {
    await deleteSubtask(subtaskId);
  }, [deleteSubtask]);

  return (
    <div className="my-4">
      {/* 섹션 헤더 */}
      <label className="text-sm font-medium block mb-2">세부 단계</label>

      {/* 서브태스크 목록 래퍼 */}
      <div className="p-3 rounded-lg bg-base-100 border border-base-300">
        <SubtaskList
          parentTodoId={todoId}
          defaultExpanded={true}
          editable={true}
          onAddSubtask={handleAddSubtask}
          onDeleteSubtask={handleDeleteSubtask}
        />
      </div>
    </div>
  );
}
