'use client';

import { useEffect, useState } from 'react';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import ContentEditorModal from './ContentEditorModal';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
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
  onProjectClick?: (project: Project) => void; // 프로젝트 클릭 시 콜백
  onCreateNote?: (title: string) => Promise<Note>; // 새 노트 생성
  onCreateTodo?: (title: string) => Promise<Todo>; // 새 할일 생성
  onCreateProject?: (title: string) => Promise<Project>; // 새 프로젝트 생성
  onUpdateTodo?: (id: string) => Promise<void>; // 할일 업데이트
  onUpdateProject?: (id: string, title: string) => Promise<void>; // 프로젝트 업데이트
  onDeleteTodo?: (id: string) => Promise<void>; // 할일 삭제
  onDeleteProject?: (id: string) => Promise<void>; // 프로젝트 삭제
  onNoteNoteImmediateSave?: (noteIds: string[]) => Promise<void>; // 노트-노트 즉시 저장
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
  onProjectClick,
  onCreateNote,
  onCreateTodo,
  onCreateProject,
  onUpdateTodo,
  onUpdateProject,
  onDeleteTodo,
  onDeleteProject,
  onNoteNoteImmediateSave,
  titlePlaceholder = '',
  contentPlaceholder = '',
}: NoteEditModalProps) {
  const { openModal, closeModal } = useModalStore();
  const { updateNote } = useNoteStore();
  const { user } = useAuth();
  const [isContentEditorOpen, setIsContentEditorOpen] = useState(false);

  // 할일 편집 모달 상태
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [todoForm, setTodoForm] = useState<TodoFormData | null>(null);

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

  // 할일 클릭 핸들러
  const handleTodoClick = (todo: Todo) => {
    setEditingTodo(todo);
    setTodoForm({
      title: todo.title,
      clarification: todo.clarification,
      completed: todo.completed || false,
      isHighlight: false,
      scheduledDate: todo.start_time ? new Date(todo.start_time) : undefined,
      scheduleType: todo.schedule_type || 'anytime',
      projectIds: [],
      noteIds: [],
    });
  };

  // 할일 저장 핸들러
  const handleTodoSave = async () => {
    if (!editingTodo || !todoForm || !onUpdateTodo) return;
    try {
      await onUpdateTodo(editingTodo.id);
      setEditingTodo(null);
      setTodoForm(null);
    } catch (error) {
      console.error('할일 저장 실패:', error);
    }
  };

  // 자동저장 핸들러
  const handleAutoSave = async (content: string) => {
    if (!note?.id || !user?.id) {
      throw new Error('노트 ID 또는 사용자 정보가 없습니다.');
    }

    // ✅ DB만 업데이트, 실시간 입력은 에디터가 관리
    await updateNote(note.id, user.id, { content });

    // ❌ onChange 호출 제거 - 자동 저장 후 오래된 content로 상태 재설정 방지
    // onChange({ ...note, content });
  };

  if (!open || !note) return null;

  // Z-[110] ensures modal appears above AppHeader (z-40) in Capacitor
  return (
    <dialog open className="modal modal-open z-[110]">
      <div className={`modal-box bg-base-100 w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
        <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 sticky top-0 bg-base-100 z-10`}>
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

        <div className="flex-1 overflow-y-auto px-2">
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
                onTodoClick={handleTodoClick}
                onProjectClick={onProjectClick}
                onCreateNote={onCreateNote}
                onCreateTodo={onCreateTodo}
                onCreateProject={onCreateProject}
                titlePlaceholder={titlePlaceholder}
                contentPlaceholder={contentPlaceholder}
                onContentClick={handleContentClick}
                noteId={note.id}
                userId={user?.id}
                onNoteImmediateSave={onNoteNoteImmediateSave}
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
        title={note?.title}
      />

      {/* 할일 편집 모달 */}
      <TodoEditModal
        open={editingTodo !== null && todoForm !== null}
        todo={todoForm}
        onClose={() => {
          setEditingTodo(null);
          setTodoForm(null);
        }}
        onSave={handleTodoSave}
        onChange={setTodoForm}
        onDelete={async () => {
          if (!editingTodo || !onDeleteTodo) return;
          await onDeleteTodo(editingTodo.id);
          setEditingTodo(null);
          setTodoForm(null);
        }}
        projects={projects}
        notes={notes}
        areas={areas}
        resources={resources}
        todos={todos}
      />
    </dialog>
  );
}
