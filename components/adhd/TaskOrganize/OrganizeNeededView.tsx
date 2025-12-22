'use client';

import { useEffect, useState, useMemo } from 'react';
import { Inbox, AlertCircle } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';

interface OrganizeNeededViewProps {
  userId: string;
}

/**
 * 정리 탭 - 미분류 할일들 정리
 *
 * ADHD 관점:
 * - 분류 강요 없이, 정리가 필요한 것들만 모아서 표시
 * - 날짜 없는 할일 등
 * - 나중에 연결 OK: 할일 먼저 만들고, 여기서 한꺼번에 정리
 */
export function OrganizeNeededView({ userId }: OrganizeNeededViewProps) {
  const { todos, fetchAllTodos } = useTodoStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAllTodos();
      setIsLoading(false);
    };
    loadData();
  }, [userId, fetchAllTodos]);

  // 날짜 없는 할일 (완료되지 않은 것만)
  const undatedTodos = useMemo(() => {
    return todos.filter(todo => !todo.completed && !todo.startTime);
  }, [todos]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  const totalIssues = undatedTodos.length;

  if (totalIssues === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-base-content/60">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-success" />
        </div>
        <p className="font-semibold text-success">완벽하게 정리되어 있어요!</p>
        <p className="text-sm mt-1">정리할 항목이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* 요약 카드 */}
      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-warning mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">정리가 필요한 항목</span>
        </div>
        <p className="text-sm text-base-content/70">
          총 {totalIssues}개의 항목이 정리를 기다리고 있어요.
          <br />
          <span className="text-xs text-base-content/50">
            (정리하지 않아도 괜찮아요. 필요할 때 하면 됩니다)
          </span>
        </p>
      </div>

      {/* 날짜 없는 할일 */}
      {undatedTodos.length > 0 && (
        <div className="bg-base-200 rounded-xl border border-base-300">
          <div className="flex items-center gap-2 p-4 border-b border-base-300">
            <Inbox className="w-5 h-5 text-warning" />
            <span className="font-semibold">날짜 없는 할일</span>
            <span className="badge badge-sm badge-warning">{undatedTodos.length}</span>
          </div>
          <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
            {undatedTodos.slice(0, 10).map(todo => (
              <div key={todo.id} className="flex items-center gap-2 p-2 bg-base-100 rounded-lg">
                <span className="text-sm truncate flex-1">{todo.title}</span>
              </div>
            ))}
            {undatedTodos.length > 10 && (
              <p className="text-xs text-base-content/50 text-center">
                +{undatedTodos.length - 10}개 더 있음
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
