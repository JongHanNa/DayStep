'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import TodoFormContent from '@/components/todos/TodoFormContent';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import NoteEditModal from '@/components/second-brain/NoteEditModal';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import { useModalStore } from '@/state/stores/modalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
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
  headerTitle?: string; // 모달 헤더 제목 (기본값: "할일 편집")
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
  headerTitle = '할일 편집',
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
  const router = useRouter();

  // 현재 시간에 해당하는 할일인지 판별
  const isCurrentTimeTodo = useMemo(() => {
    if (!todo) return false;
    if (todo.scheduleType !== 'timed') return false;
    if (!todo.startTime || !todo.endTime) return false;

    const now = new Date();
    const start = new Date(todo.startTime);
    const end = new Date(todo.endTime);
    return now >= start && now <= end;
  }, [todo]);

  // 포모도로 페이지로 이동
  const handlePomodoroClick = () => {
    if (todo && todoId) {
      onClose(); // 모달 닫기
      router.push(`/second-brain/pomodoro?todoId=${todoId}&todoTitle=${encodeURIComponent(todo.title || '')}`);
    }
  };

  // 삭제 확인 다이얼로그 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 노트 편집 모달 상태
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState<NoteFormData | null>(null);

  // 프로젝트 편집 모달 상태
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showProjectEditModal, setShowProjectEditModal] = useState(false);

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
    // area_resource_id → linkedAreaOrResource 변환
    let linkedAreaOrResource = '';
    if (note.area_resource_id) {
      // Store에서 최신 데이터 직접 조회
      const latestAreas = useAreaStore.getState().areas;
      const latestResources = useResourceStore.getState().resources;

      // area인지 resource인지 구분
      const isArea = latestAreas.some(a => a.id === note.area_resource_id);
      const isResource = latestResources.some(r => r.id === note.area_resource_id);

      if (isArea) {
        linkedAreaOrResource = `area-${note.area_resource_id}`;
      } else if (isResource) {
        linkedAreaOrResource = `resource-${note.area_resource_id}`;
      }
    }

    setEditingNote(note);
    setNoteForm({
      id: note.id,
      title: note.title,
      content: note.content,
      note_category: note.note_category,
      linkedAreaOrResource,
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

  // 프로젝트 클릭 핸들러
  const handleProjectClick = (project: Project) => {
    // 날짜 형식 변환: ISO datetime을 YYYY-MM-DD로 변환
    const formatDateForInput = (dateString?: string) => {
      if (!dateString) return '';
      return dateString.split('T')[0];
    };

    // area_resource_id → paraSelection 변환
    let paraSelection = '';
    if (project.area_resource_id) {
      // Store에서 최신 데이터 직접 조회
      const latestAreas = useAreaStore.getState().areas;
      const latestResources = useResourceStore.getState().resources;

      // area인지 resource인지 구분
      const isArea = latestAreas.some(a => a.id === project.area_resource_id);
      const isResource = latestResources.some(r => r.id === project.area_resource_id);

      if (isArea) {
        paraSelection = `area-${project.area_resource_id}`;
      } else if (isResource) {
        paraSelection = `resource-${project.area_resource_id}`;
      }
    }

    const editData = {
      ...project,
      paraSelection,
      isNew: false,
      start_date: formatDateForInput(project.start_date),
      end_date: formatDateForInput(project.end_date)
    };

    setEditingProject(editData);
    setShowProjectEditModal(true);
  };

  if (!open || !todo) return null;

  // Z-[110] ensures modal appears above AppHeader (z-40) in Capacitor
  return (
    <dialog open className="modal modal-open z-[110]">
      <div className={`modal-box bg-base-200 w-full max-w-7xl h-screen flex flex-col overflow-hidden p-[10px] ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
        {/* 헤더 (취소-제목-삭제-저장) */}
        <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 sticky top-0 bg-base-200 z-10`}>
          <button onClick={onClose} className="btn btn-primary btn-sm rounded-full">
            취소
          </button>
          <h3 className="text-lg font-semibold">{headerTitle}</h3>
          <div className="flex gap-2">
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-ghost btn-sm text-error rounded-full"
              >
                삭제
              </button>
            )}
            {/* 포모도로 재생 버튼 - 현재 시간 할일일 때만 */}
            {isCurrentTimeTodo && (
              <button
                onClick={handlePomodoroClick}
                className="btn btn-ghost btn-sm rounded-full"
              >
                <Play className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => onSave(todo)} className="btn btn-primary btn-sm rounded-full">
              저장
            </button>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto px-2">
          <TodoFormContent
            formData={todo}
            onChange={onChange}
            titlePlaceholder={titlePlaceholder}
            clarificationPlaceholder={clarificationPlaceholder}
            projects={projects}
            notes={notes}
            onNoteClick={handleNoteClick}
            onProjectClick={handleProjectClick}
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

      {/* 프로젝트 편집 모달 */}
      {editingProject && (
        <ProjectEditDialog
          open={showProjectEditModal}
          editingProject={editingProject}
          onSave={async (projectData, area_id, resource_id) => {
            if (!editingProject || !onUpdateProject) return;
            await onUpdateProject(editingProject.id, projectData.title || editingProject.title);
            setShowProjectEditModal(false);
            setEditingProject(null);
          }}
          onCancel={() => {
            setShowProjectEditModal(false);
            setEditingProject(null);
          }}
          onDelete={async (project) => {
            if (!onDeleteProject) return;
            await onDeleteProject(project.id);
            setShowProjectEditModal(false);
            setEditingProject(null);
          }}
          onProjectChange={setEditingProject}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <dialog open className="modal modal-open z-[120]">
          <div className="modal-box bg-base-100 max-w-sm">
            <h3 className="font-bold text-lg mb-4">할일 삭제</h3>
            <p className="text-base-content/70 mb-2">정말로 이 할일을 삭제하시겠습니까?</p>
            <p className="text-sm font-medium mb-6 break-words">&ldquo;{todo?.title}&rdquo;</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost btn-sm rounded-full"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onClose();
                  onDelete?.();
                }}
                className="btn btn-error btn-sm rounded-full"
              >
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
        </dialog>
      )}
    </dialog>
  );
}
