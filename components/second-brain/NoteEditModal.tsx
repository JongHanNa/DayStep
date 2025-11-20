'use client';

import { useEffect, useState } from 'react';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import ContentEditorModal from './ContentEditorModal';
import { useModalStore } from '@/state/stores/modalStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useAuth } from '@/app/context/AuthContext';
import type { AreaResource as Area, AreaResource as Resource, Project, Note } from '@/types/second-brain';
import type { Todo } from '@/types';

interface NoteEditModalProps {
  open: boolean;
  note: NoteFormData | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (note: NoteFormData) => void;
  onDelete?: () => void;
  areas: Area[];
  resources: Resource[];
  projects?: Project[];
  todos?: Todo[];
  notes?: Note[]; // 선택 가능한 노트 목록
  onNoteClick?: (note: Note) => void; // 노트 클릭 시 콜백
  onCreateNote?: (title: string) => Promise<Note>; // 새 노트 생성
  titlePlaceholder?: string;
  contentPlaceholder?: string;
}

export default function NoteEditModal({
  open,
  note,
  onClose,
  onSave,
  onChange,
  onDelete,
  areas,
  resources,
  projects = [],
  todos = [],
  notes = [],
  onNoteClick,
  onCreateNote,
  titlePlaceholder = '',
  contentPlaceholder = '',
}: NoteEditModalProps) {
  const { openModal, closeModal } = useModalStore();
  const { updateNote } = useNoteStore();
  const { user } = useAuth();
  const [isContentEditorOpen, setIsContentEditorOpen] = useState(false);

  // 모달 열림/닫힘 상태 관리 (하단 네비 숨김)
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  // 내용 클릭 핸들러
  const handleContentClick = () => {
    setIsContentEditorOpen(true);
  };

  // 내용 저장 핸들러
  const handleContentSave = () => {
    setIsContentEditorOpen(false);
  };

  // 자동저장 핸들러
  const handleAutoSave = async (content: string) => {
    if (!note?.id || !user?.id) {
      throw new Error('노트 ID 또는 사용자 정보가 없습니다.');
    }

    await updateNote(note.id, user.id, { content });

    // onChange도 호출하여 상위 컴포넌트 상태 동기화
    onChange({ ...note, content });
  };

  if (!open || !note) return null;

  return (
    <dialog open className="modal modal-open">
      <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
        <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-200 z-10`}>
          <button
            onClick={onClose}
            className="btn btn-primary btn-sm rounded-full"
          >
            취소
          </button>

          <h3 className="text-lg font-semibold">노트 편집</h3>

          <div className="flex gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  onClose();
                  onDelete();
                }}
                className="btn btn-ghost btn-sm text-error rounded-full"
              >
                삭제
              </button>
            )}
            <button
              onClick={onSave}
              className="btn btn-primary btn-sm rounded-full"
            >
              저장
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="py-4">
            {note && (
              <NoteFormFields
                note={note}
                onChange={onChange}
                areas={areas}
                resources={resources}
                projects={projects}
                todos={todos}
                notes={notes}
                currentNoteId={note.id}
                onNoteClick={onNoteClick}
                onCreateNote={onCreateNote}
                titlePlaceholder={titlePlaceholder}
                contentPlaceholder={contentPlaceholder}
                onContentClick={handleContentClick}
              />
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />

      {/* 내용 편집 모달 (중첩) */}
      <ContentEditorModal
        open={isContentEditorOpen}
        content={note?.content || ''}
        onClose={() => setIsContentEditorOpen(false)}
        onSave={handleContentSave}
        onChange={(content) => onChange({ ...note!, content })}
        placeholder={contentPlaceholder}
        enableAutoSave={true}
        onAutoSave={handleAutoSave}
      />
    </dialog>
  );
}
