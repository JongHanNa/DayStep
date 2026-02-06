'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { StickyNote, ChevronDown } from 'lucide-react';
import { useNoteStore } from '@/state/stores/noteStore';
import MarkdownViewer from '@/components/notes/MarkdownViewer';

interface LinkedNotesProps {
  taskId: string | null;
}

const LinkedNotes: React.FC<LinkedNotesProps> = ({ taskId }) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const { notes, setSelectedNoteForEdit } = useNoteStore();

  // 연결된 노트 상태 관리
  const [linkedNotes, setLinkedNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 연결된 노트 로드 (junction table API 사용)
  useEffect(() => {
    const loadLinkedNotes = async () => {
      if (!taskId) {
        setLinkedNotes([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { getNotesByTaskId } = useNoteStore.getState();
        const notes = await getNotesByTaskId(taskId);
        setLinkedNotes(notes);
      } catch (error) {
        console.error('연결된 노트 조회 실패:', error);
        setLinkedNotes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLinkedNotes();
  }, [taskId]);

  const hasLinkedNotes = linkedNotes.length > 0;

  // taskId가 없거나, 로딩 중이거나, 연결된 노트가 없으면 렌더링하지 않음
  if (!taskId || isLoading || !hasLinkedNotes) {
    return null;
  }

  // 노트 클릭 핸들러
  const handleNoteClick = (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNoteForEdit(note);
  };

  // 노트 내용 변경 핸들러
  const handleNoteContentChange = async (note: any, newContent: string) => {
    try {
      const { updateNote } = useNoteStore.getState();
      await updateNote({
        id: note.id,
        content: newContent,
      });
    } catch (error) {
      console.error('노트 내용 업데이트 실패:', error);
    }
  };

  return (
    <div className="mx-4 my-2">
      {/* 연결된 노트 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setIsNotesExpanded(!isNotesExpanded)}
          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
        >
          <StickyNote className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            연결된 노트
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full min-w-[24px] text-center">
            {linkedNotes.length}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200',
              isNotesExpanded && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* 아코디언 형태로 연결된 노트 표시 */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isNotesExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-2 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {linkedNotes.map((note) => (
            <div
              key={note.id}
              className="group py-2 px-1 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/20 rounded-md transition-all duration-200"
              onClick={(e) => handleNoteClick(note, e)}
            >
              <div className="flex items-start gap-3">
                <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0 mt-1 group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    <MarkdownViewer
                      content={note.content}
                      className="note-markdown-content"
                      interactive={true}
                      onContentChange={(newContent) => handleNoteContentChange(note, newContent)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                      노트
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {format(new Date(note.created_at), 'M월 d일 HH:mm', { locale: ko })}
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

export default LinkedNotes;