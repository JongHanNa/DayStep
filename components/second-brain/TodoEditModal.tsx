'use client';

import { useEffect } from 'react';
import TodoFormFields, { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { useModalStore } from '@/state/stores/modalStore';
import type { Project, Note } from '@/types/second-brain';

interface TodoEditModalProps {
  open: boolean;
  todo: TodoFormData | null;
  onClose: () => void;
  onSave: (todo: TodoFormData) => void;
  onChange: (todo: TodoFormData) => void;
  // 선택적 props (수집 페이지 등에서 사용)
  projects?: Project[];
  notes?: Note[];
  onCreateProject?: (title: string) => Promise<Project>;
  onUpdateProject?: (id: string, title: string) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
  onCreateNote?: (title: string) => Promise<Note>;
  onUpdateNote?: (id: string, title: string) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  titlePlaceholder?: string;
  clarificationPlaceholder?: string;
  // 추가 콘텐츠 (명료화 페이지의 "프로젝트로 변환" 버튼 등)
  additionalContent?: React.ReactNode;
  // 섹션 표시 여부 제어
  showClarification?: boolean;
  showNextActionStatus?: boolean;
  showScheduledDate?: boolean;
  showHighlight?: boolean;
  showCompleted?: boolean;
  showProjects?: boolean;
}

export default function TodoEditModal({
  open,
  todo,
  onClose,
  onSave,
  onChange,
  projects,
  notes,
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
}: TodoEditModalProps) {
  const { openModal, closeModal } = useModalStore();

  // 모달 열림/닫힘 상태 관리
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  if (!open || !todo) return null;

  return (
    <dialog open className="modal modal-open">
      <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
        {/* 헤더 (취소-제목-저장) */}
        <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
          <button onClick={onClose} className="btn btn-primary btn-sm rounded-full">
            취소
          </button>
          <h3 className="font-bold text-lg">할일 편집</h3>
          <button onClick={() => onSave(todo)} className="btn btn-primary btn-sm rounded-full">
            저장
          </button>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto">
          <TodoFormFields
            todo={todo}
            onChange={onChange}
            titlePlaceholder={titlePlaceholder}
            clarificationPlaceholder={clarificationPlaceholder}
            projects={projects}
            notes={notes}
            onCreateProject={onCreateProject}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            onCreateNote={onCreateNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            showClarification={showClarification}
            showNextActionStatus={showNextActionStatus}
            showScheduledDate={showScheduledDate}
            showHighlight={showHighlight}
            showCompleted={showCompleted}
            showProjects={showProjects}
          />

          {/* 추가 콘텐츠 영역 (명료화 페이지의 "프로젝트로 변환" 버튼 등) */}
          {additionalContent && (
            <div className="mt-6 px-4 pb-4">
              {additionalContent}
            </div>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
