'use client';

import { useEffect } from 'react';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { useModalStore } from '@/state/stores/modalStore';
import type { AreaResource as Area, AreaResource as Resource, Project, Note, NoteTag } from '@/types/second-brain';
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
  allTags?: NoteTag[]; // 사용 가능한 태그 목록
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
  allTags = [],
  onNoteClick,
  onCreateNote,
  titlePlaceholder = '',
  contentPlaceholder = '',
}: NoteEditModalProps) {
  const { openModal, closeModal } = useModalStore();

  // 모달 열림/닫힘 상태 관리 (하단 네비 숨김)
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

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

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {note && (
              <NoteFormFields
                note={note}
                onChange={onChange}
                areas={areas}
                resources={resources}
                projects={projects}
                todos={todos}
                notes={notes}
                allTags={allTags}
                currentNoteId={note.id}
                onNoteClick={onNoteClick}
                onCreateNote={onCreateNote}
                titlePlaceholder={titlePlaceholder}
                contentPlaceholder={contentPlaceholder}
              />
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
