'use client';

import { useEffect, useState } from 'react';
import TodoFormContent from '@/components/todos/TodoFormContent';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import NoteEditModal from '@/components/second-brain/NoteEditModal';
import { useModalStore } from '@/state/stores/modalStore';
import type { Project, Note, AreaResource as Area, AreaResource as Resource } from '@/types/second-brain';
import type { Todo } from '@/types';

interface TodoEditModalProps {
  open: boolean;
  todo: TodoFormData | null;
  onClose: () => void;
  onSave: (todo: TodoFormData) => void;
  onChange: (todo: TodoFormData) => void;
  onDelete?: () => void; // 삭제 핸들러 추가
  // 선택적 props (수집 페이지 등에서 사용)
  projects?: Project[];
  notes?: Note[];
  areas?: Area[]; // NoteEditModal을 위해 추가
  resources?: Resource[]; // NoteEditModal을 위해 추가
  todos?: Todo[]; // NoteEditModal을 위해 추가
  onCreateProject?: (title: string) => Promise<Project>;
  onUpdateProject?: (id: string, title: string) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
  onCreateNote?: (title: string) => Promise<Note>;
  onUpdateNote?: (id: string) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  titlePlaceholder?: string;
  clarificationPlaceholder?: string;
  additionalContent?: React.ReactNode;
  // 섹션 표시 여부 제어
  showClarification?: boolean;
  showNextActionStatus?: boolean;
  showScheduledDate?: boolean;
  showHighlight?: boolean;
  showCompleted?: boolean;
  showProjects?: boolean;
  // 즉시 DB 저장을 위한 props
  todoId?: string;
  userId?: string;
  onProjectImmediateSave?: (projectIds: string[]) => Promise<void>;
  onNoteImmediateSave?: (noteIds: string[]) => Promise<void>;
}

export default function TodoEditModal({
  open,
  todo,
  onClose,
  onSave,
  onChange,
  onDelete,
  projects,
  notes,
  areas = [],
  resources = [],
  todos = [],
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  titlePlaceholder,
  clarificationPlaceholder,
  additionalContent,
  showClarification,
  showNextActionStatus,
  showScheduledDate,
  showHighlight,
  showCompleted,
  showProjects,
  todoId,
  userId,
  onProjectImmediateSave,
  onNoteImmediateSave,
}: TodoEditModalProps) {
  const { openModal, closeModal } = useModalStore();

  // 노트 편집 모달 상태
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState<NoteFormData | null>(null);

  // 모달 열림/닫힘 상태 관리
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  // 노트 클릭 핸들러
  const handleNoteClick = (note: Note) => {
    setEditingNote(note);
    setNoteForm({
      id: note.id,
      title: note.title,
      content: note.content,
      note_category: note.note_category,
      linkedAreaOrResource: note.area_resource_id ? (areas.some(a => a.id === note.area_resource_id) ? `area-${note.area_resource_id}` : `resource-${note.area_resource_id}`) : '',
      isPinned: note.is_pinned,
      projectIds: [], // N:N 관계로 변경됨
      todoIds: [], // N:N 관계로 변경됨
      noteIds: [], // 연결된 노트
    });
  };

  // 노트 저장 핸들러
  const handleNoteSave = async () => {
    if (!editingNote || !noteForm || !onUpdateNote) return;
    try {
      await onUpdateNote(editingNote.id);
      setEditingNote(null);
      setNoteForm(null);
    } catch (error) {
      console.error('노트 저장 실패:', error);
    }
  };

  if (!open || !todo) return null;

  return (
    <dialog open className="modal modal-open">
      <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
        {/* 헤더 (취소-제목-삭제-저장) */}
        <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
          <button onClick={onClose} className="btn btn-primary btn-sm rounded-full">
            취소
          </button>
          <h3 className="text-lg font-semibold">할일 편집</h3>
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
            <button onClick={() => onSave(todo)} className="btn btn-primary btn-sm rounded-full">
              저장
            </button>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto">
          <TodoFormContent
            formData={todo}
            onChange={onChange}
            titlePlaceholder={titlePlaceholder}
            clarificationPlaceholder={clarificationPlaceholder}
            projects={projects}
            notes={notes}
            onNoteClick={handleNoteClick}
            onCreateProject={onCreateProject}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            onCreateNote={onCreateNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            showClarification={showClarification}
            showNextActionStatus={showNextActionStatus}
            todoId={todoId}
            userId={userId}
            onProjectImmediateSave={onProjectImmediateSave}
            onNoteImmediateSave={onNoteImmediateSave}
            showScheduledDate={showScheduledDate}
            showHighlight={showHighlight}
            showCompleted={showCompleted}
            showProjects={showProjects}
          />

          {/* 추가 콘텐츠 영역 */}
          {additionalContent && (
            <div className="mt-6 px-4 pb-4">
              {additionalContent}
            </div>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />

      {/* 노트 편집 모달 */}
      <NoteEditModal
        open={editingNote !== null && noteForm !== null}
        note={noteForm}
        onClose={() => {
          setEditingNote(null);
          setNoteForm(null);
        }}
        onSave={handleNoteSave}
        onChange={setNoteForm}
        areas={areas}
        resources={resources}
        projects={projects}
        todos={todos}
      />
    </dialog>
  );
}
