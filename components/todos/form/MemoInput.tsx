'use client';

import React, { useState } from 'react';
import { StickyNote, ChevronDown, Trash2, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getColorById } from '@/lib/color-palette';
import MemoEditorModal from '@/components/memos/MemoEditorModal';
import MarkdownViewer from '@/components/memos/MarkdownViewer';

export interface MemoData {
  id: string;
  content: string;
}

interface MemoInputProps {
  memos: MemoData[];
  onMemosChange: (memos: MemoData[]) => void;
  selectedColor?: string;
}

const MemoInput: React.FC<MemoInputProps> = ({ memos, onMemosChange, selectedColor }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [markdownEditorOpen, setMarkdownEditorOpen] = useState(false);
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [isSavingMemo, setIsSavingMemo] = useState(false); // 중복 저장 방지

  // 노트 추가 - 마크다운 에디터 열기
  const addMemo = () => {
    setEditingMemoIndex(null); // 새 노트 추가
    setMarkdownEditorOpen(true);
    setIsExpanded(true);
  };

  // 기존 노트 편집
  const editMemo = (index: number) => {
    setEditingMemoIndex(index);
    setMarkdownEditorOpen(true);
  };

  // 마크다운 에디터에서 노트 저장
  const handleMemoSave = (content: string) => {
    if (isSavingMemo) {
      console.log('🚫 노트 저장 중복 방지: 이미 저장 중입니다.');
      return; // 이미 저장 중이면 중복 실행 방지
    }

    setIsSavingMemo(true);

    try {
      if (editingMemoIndex !== null) {
        // 기존 노트 수정
        const updatedMemos = [...memos];
        updatedMemos[editingMemoIndex] = {
          ...updatedMemos[editingMemoIndex],
          content: content
        };
        onMemosChange(updatedMemos);
        console.log('✅ 기존 노트 수정 완료:', editingMemoIndex);
      } else {
        // 새 노트 추가
        if (content.trim()) {
          const newMemo: MemoData = {
            id: `temp-memo-${Date.now()}-${Math.random()}`,
            content: content
          };
          onMemosChange([...memos, newMemo]);
          console.log('✅ 새 노트 추가 완료:', newMemo.id);
        }
      }

      // 저장 완료 후 로그만 기록 (모달은 사용자가 수동으로 닫도록 함)
      console.log('✅ 노트 저장 완료, 모달은 사용자가 직접 닫을 수 있습니다.');
    } finally {
      // 저장 상태 초기화 (약간의 지연을 두어 완전히 처리되도록)
      setTimeout(() => {
        setIsSavingMemo(false);
      }, 100);
    }
  };

  // 노트 내용 업데이트
  const updateMemoContent = (memoId: string, content: string) => {
    const updatedMemos = memos.map(memo =>
      memo.id === memoId ? { ...memo, content } : memo
    );
    onMemosChange(updatedMemos);
  };


  // 노트 삭제
  const removeMemo = (memoId: string) => {
    const updatedMemos = memos.filter(memo => memo.id !== memoId);
    onMemosChange(updatedMemos);
    
    // 모든 노트가 삭제되면 접기
    if (updatedMemos.length === 0) {
      setIsExpanded(false);
    }
  };

  const getMemoTypeLabel = (type: string) => {
    switch (type) {
      case 'quick': return '퀵노트';
      case 'daily': return '일일노트';
      case 'reflection': return '묵상노트';
      default: return '노트';
    }
  };

  // 선택된 색상 정보 가져오기
  const colorData = selectedColor ? getColorById(selectedColor) : null;

  return (
    <div className="mx-4 my-2">
      {/* 노트 섹션 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
        >
          <StickyNote className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            함께 추가할 노트
          </span>
          {memos.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full min-w-[24px] text-center">
              {memos.length}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </button>

        {/* 노트 추가 버튼 */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMemo}
          className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <StickyNote className="h-3 w-3 mr-1" />
          노트 추가
        </Button>
      </div>

      {/* 노트 입력 폼들 */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
        )}
      >
        {memos.length > 0 && (
          <div className="space-y-2">
            {memos.map((memo, index) => (
              <div
                key={memo.id}
                className="group py-3 px-1 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 rounded-md transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0 mt-1 group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors" />
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* 노트 헤더 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          노트 {index + 1}
                        </span>
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          퀵노트
                        </span>
                      </div>

                      {/* 편집 버튼 */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editMemo(index)}
                        className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>

                      {/* 삭제 버튼 */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMemo(memo.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* 노트 내용 미리보기 */}
                    <div
                      className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors"
                      onClick={() => editMemo(index)}
                    >
                      {memo.content ? (
                        <div className="max-h-32 overflow-hidden">
                          <MarkdownViewer content={memo.content} />
                          {memo.content.length > 150 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              ...클릭하여 전체 보기
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">
                          클릭하여 노트를 입력하세요...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 마크다운 편집 모달 */}
      <MemoEditorModal
        open={markdownEditorOpen}
        onOpenChange={setMarkdownEditorOpen}
        initialContent={editingMemoIndex !== null ? memos[editingMemoIndex]?.content || '' : ''}
        onSave={handleMemoSave}
        title={editingMemoIndex !== null ? '노트 수정' : '새 노트 작성'}
        placeholder="노트 내용을 입력하세요..."
        mode="both"
      />
    </div>
  );
};

export default MemoInput;