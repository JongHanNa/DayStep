'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { StickyNote, ChevronDown } from 'lucide-react';
import { useNoteStore } from '@/state/stores/noteStore';
import MarkdownViewer from '@/components/memos/MarkdownViewer';

interface LinkedMemosProps {
  taskId: string | null;
}

const LinkedMemos: React.FC<LinkedMemosProps> = ({ taskId }) => {
  const [isMemosExpanded, setIsMemosExpanded] = useState(false);
  const { memos, setSelectedMemoForEdit } = useNoteStore();

  // taskId가 없으면 렌더링하지 않음
  if (!taskId) {
    return null;
  }

  // 연결된 메모 필터링
  const linkedMemos = memos.filter(memo => 
    memo.related_task_id === taskId || 
    memo.linked_timeline_task_id === taskId
  );
  
  const hasLinkedMemos = linkedMemos.length > 0;

  // 연결된 메모가 없으면 렌더링하지 않음
  if (!hasLinkedMemos) {
    return null;
  }

  // 메모 클릭 핸들러
  const handleMemoClick = (memo: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMemoForEdit(memo);
  };

  // 메모 내용 변경 핸들러
  const handleMemoContentChange = async (memo: any, newContent: string) => {
    try {
      const { updateMemo } = useNoteStore.getState();
      await updateMemo({
        id: memo.id,
        content: newContent,
      });
    } catch (error) {
      console.error('메모 내용 업데이트 실패:', error);
    }
  };

  return (
    <div className="mx-4 my-2">
      {/* 연결된 메모 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setIsMemosExpanded(!isMemosExpanded)}
          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
        >
          <StickyNote className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            연결된 메모
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full min-w-[24px] text-center">
            {linkedMemos.length}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200',
              isMemosExpanded && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* 아코디언 형태로 연결된 메모 표시 */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isMemosExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-2 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {linkedMemos.map((memo) => (
            <div
              key={memo.id}
              className="group py-2 px-1 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/20 rounded-md transition-all duration-200"
              onClick={(e) => handleMemoClick(memo, e)}
            >
              <div className="flex items-start gap-3">
                <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0 mt-1 group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    <MarkdownViewer
                      content={memo.content}
                      className="memo-markdown-content"
                      interactive={true}
                      onContentChange={(newContent) => handleMemoContentChange(memo, newContent)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                      메모
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {format(new Date(memo.created_at), 'M월 d일 HH:mm', { locale: ko })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LinkedMemos;