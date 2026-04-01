'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import TodoFormContent from '@/components/todos/TodoFormContent';
import { type TodoFormData } from '@/components/todos/shared/TodoFormFields';
import { type NoteFormData } from '@/components/notes/shared/NoteFormFields';
import NoteEditModal from '@/components/notes/NoteEditModal';
import RecurringDeleteDialog from '@/components/todos/RecurringDeleteDialog';
import RecurringTimeChangeDialog from '@/components/todos/RecurringTimeChangeDialog';
import LinkedMotivationsSection from '@/components/todos/shared/LinkedMotivationsSection';
import SubtaskSection from '@/components/todos/SubtaskSection';
import { useModalStore } from '@/state/stores/modalStore';
import { getTodoNotes, addTodoNote, removeTodoNote } from '@/lib/supabase/todo-notes';
import { useNoteStore } from '@/state/stores/noteStore';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import type { Note } from '@/types/domain';
import type { Todo, Project } from '@/types';

interface TodoEditModalProps {
  open: boolean;
  todo: TodoFormData | null;
  onClose: () => void;
  onSave: (todo: TodoFormData) => void;
  onChange: (todo: TodoFormData) => void;
  onDelete?: () => void; // 일반 삭제 핸들러
  onRecurringDelete?: (deleteType: 'this' | 'future' | 'all') => void; // 반복 삭제 핸들러
  onRecurringSave?: (todo: TodoFormData, updateType: 'this' | 'future' | 'all') => void; // 반복 변경 핸들러
  originalTitle?: string; // 원본 제목 (제목 변경 감지용)
  originalStartTime?: string; // 원본 시작 시간 (시간 변경 감지용)
  originalEndTime?: string; // 원본 종료 시간 (시간 변경 감지용)
  originalRecurrencePattern?: string; // 원본 반복 패턴 (일반→반복 변환 감지용)
  occurrenceDate?: string; // 반복 인스턴스의 날짜 (YYYY-MM-DD)
  // 선택적 props (수집 페이지 등에서 사용)
  notes?: Note[];
  todos?: Todo[]; // NoteEditModal을 위해 추가
  projects?: Project[]; // 프로젝트 목록
  onCreateNote?: (title: string) => Promise<Note>;
  onUpdateNote?: (id: string) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  onCreateProject?: (title: string) => Promise<Project>; // 새 프로젝트 생성
  onProjectClick?: (project: Project) => void; // 프로젝트 클릭 핸들러
  onProjectImmediateSave?: (projectId: string | null) => Promise<void>; // 프로젝트 즉시 저장
  titlePlaceholder?: string;
  additionalContent?: React.ReactNode;
  headerTitle?: string; // 모달 헤더 제목 (기본값: "할일 편집")
  // 섹션 표시 여부 제어
  showScheduledDate?: boolean;
  showHighlight?: boolean;
  showCompleted?: boolean;
  showProject?: boolean; // 프로젝트 섹션 표시 여부
  // 즉시 DB 저장을 위한 props
  todoId?: string;
  userId?: string;
  onNoteImmediateSave?: (noteIds: string[]) => Promise<void>;
  // 연결된 실행 원동력 섹션용 props
  motivationNotes?: Note[]; // motivation 카테고리 노트 (실행 원동력)
  showLinkedMotivations?: boolean; // 연결된 원동력 섹션 표시 여부 (기본값: true)
  // 서브태스크 섹션용 props
  showSubtasks?: boolean; // 세부 단계 섹션 표시 여부 (기본값: true)
}

export default function TodoEditModal({
  open,
  todo,
  onClose,
  onSave,
  onChange,
  onDelete,
  onRecurringDelete,
  onRecurringSave,
  originalTitle,
  originalStartTime,
  originalEndTime,
  originalRecurrencePattern,
  occurrenceDate,
  notes,
  todos = [],
  projects = [],
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onCreateProject,
  onProjectClick,
  onProjectImmediateSave,
  titlePlaceholder,
  additionalContent,
  headerTitle = '할일 편집',
  showScheduledDate,
  showHighlight,
  showCompleted,
  showProject = true,
  todoId,
  userId,
  onNoteImmediateSave,
  motivationNotes = [],
  showLinkedMotivations = true,
  showSubtasks = true,
}: TodoEditModalProps) {
  const { openModal, closeModal } = useModalStore();
  const { createMotivationNote } = useNoteStore();
  const { checkAndProceed, limitResult, isModalOpen: isLimitModalOpen, closeModal: closeLimitModal, onCreateSuccess } = useUsageLimitCheck();

  // 삭제 확인 다이얼로그 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // 반복 삭제 다이얼로그 상태
  const [showRecurringDeleteDialog, setShowRecurringDeleteDialog] = useState(false);
  // 반복 변경 다이얼로그 상태
  const [showTimeChangeDialog, setShowTimeChangeDialog] = useState(false);
  // 변경된 필드 정보
  const [changedFields, setChangedFields] = useState<{ title?: boolean; time?: boolean }>({});
  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false);

  // 제목 변경 여부 확인
  const hasTitleChanged = useCallback(() => {
    if (!originalTitle || !todo?.title) return false;
    return originalTitle !== todo.title;
  }, [originalTitle, todo?.title]);

  // 시간 변경 여부 확인
  const hasTimeChanged = useCallback(() => {
    if (!originalStartTime || !todo?.startTime) return false;

    // 시간만 추출 (HH:mm) - ISO와 HH:mm 형식 모두 처리
    const getTimeOnly = (value: string): string => {
      if (value.includes('T')) {
        // ISO 형식: "2025-01-17T10:00:00.000Z" → "10:00"
        return value.split('T')[1]?.slice(0, 5) || '';
      }
      // HH:mm 형식: "10:00" → "10:00"
      return value.slice(0, 5);
    };

    return getTimeOnly(originalStartTime) !== getTimeOnly(todo.startTime);
  }, [originalStartTime, todo?.startTime]);

  // 저장 버튼 클릭 핸들러
  const handleSaveClick = useCallback(async () => {
    if (!todo) return;

    // 원본이 반복 할일이었는지 확인 (폼 값이 아닌 원본 값 사용)
    const wasRecurring = originalRecurrencePattern && originalRecurrencePattern !== 'none';
    // 현재 폼 상태가 반복인지 확인
    const isNowRecurring = todo?.recurrencePattern && todo.recurrencePattern !== 'none';
    // 반복 → 반복 안함 변환 감지
    const isConvertingToNonRecurring = wasRecurring && !isNowRecurring;

    const titleChanged = hasTitleChanged();
    const timeChanged = hasTimeChanged();

    // 신규 생성 시 (todoId 없음) 한도 체크
    if (!todoId) {
      const entityType = isNowRecurring ? 'habit' : 'todo';
      await checkAndProceed(entityType, async () => {
        if (wasRecurring && !isConvertingToNonRecurring && (titleChanged || timeChanged) && onRecurringSave) {
          setChangedFields({ title: titleChanged, time: timeChanged });
          setShowTimeChangeDialog(true);
        } else {
          onSave(todo);
          onCreateSuccess(entityType);
        }
      });
      return;
    }

    // 편집 시 (todoId 있음): 한도 체크 없이 저장
    // 원본이 반복 할일이고 제목 또는 시간이 변경된 경우에만 다이얼로그 표시
    // 단, 반복 → 반복 안함 변환 시에는 모달 없이 저장 (선택지 불필요)
    if (wasRecurring && !isConvertingToNonRecurring && (titleChanged || timeChanged) && onRecurringSave) {
      setChangedFields({ title: titleChanged, time: timeChanged });
      setShowTimeChangeDialog(true);
    } else {
      // 일반 저장 (일반 → 반복 변환 포함, 반복 → 반복 안함 변환 포함)
      onSave(todo);
    }
  }, [todo, todoId, originalRecurrencePattern, hasTitleChanged, hasTimeChanged, onRecurringSave, onSave, checkAndProceed, onCreateSuccess]);

  // 반복 시간 변경 확인 핸들러
  const handleTimeChangeConfirm = useCallback(async (updateType: 'this' | 'future' | 'all') => {
    if (!todo || !onRecurringSave) return;

    setIsSaving(true);
    try {
      await onRecurringSave(todo, updateType);
      setShowTimeChangeDialog(false);
      onClose();
    } catch (error) {
      console.error('반복 시간 변경 실패:', error);
    } finally {
      setIsSaving(false);
    }
  }, [todo, onRecurringSave, onClose]);

  // 노트 편집 모달 상태
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState<NoteFormData | null>(null);

  // 연결된 실행 원동력 상태
  const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);
  const [isLoadingLinkedNotes, setIsLoadingLinkedNotes] = useState(false);

  // 연결된 노트 조회
  const loadLinkedNotes = useCallback(async () => {
    if (!todoId || !open) return;

    setIsLoadingLinkedNotes(true);
    try {
      const noteIds = await getTodoNotes(todoId);
      if (noteIds.length > 0) {
        // motivationNotes에서 연결된 노트 찾기
        const linked = motivationNotes.filter(n => noteIds.includes(n.id));
        setLinkedNotes(linked);
      } else {
        setLinkedNotes([]);
      }
    } catch (error) {
      console.error('연결된 노트 조회 실패:', error);
      setLinkedNotes([]);
    } finally {
      setIsLoadingLinkedNotes(false);
    }
  }, [todoId, open, motivationNotes]);

  // 모달 열릴 때 연결된 노트 조회
  useEffect(() => {
    if (open && todoId && showLinkedMotivations) {
      loadLinkedNotes();
    }
  }, [open, todoId, showLinkedMotivations, loadLinkedNotes]);

  // 노트 연결 해제
  const handleUnlinkNote = async (noteId: string) => {
    if (!todoId) return;

    try {
      await removeTodoNote(todoId, noteId);
      setLinkedNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('노트 연결 해제 실패:', error);
    }
  };

  // 기존 노트 연결
  const handleLinkNote = async (noteId: string) => {
    if (!todoId || !userId) return;

    try {
      await addTodoNote(todoId, noteId, userId);
      const note = motivationNotes.find(n => n.id === noteId);
      if (note) {
        setLinkedNotes(prev => [...prev, note]);
      }
    } catch (error) {
      console.error('노트 연결 실패:', error);
    }
  };

  // 새 노트 생성 및 연결
  const handleCreateAndLinkNote = async (content: string) => {
    if (!todoId || !userId) return;

    try {
      const newNote = await createMotivationNote({
        content: content.trim(),
        linked_date: null,
        is_pinned: false,
      });

      if (newNote) {
        await addTodoNote(todoId, newNote.id, userId);
        // 타입 호환성을 위해 새 노트 형식으로 변환하여 추가
        const noteForList: Note = {
          id: newNote.id,
          user_id: userId,
          title: newNote.title || content.trim().slice(0, 50),
          content: newNote.content || content.trim(),
          note_category: 'motivation',
          is_pinned: false,
          created_at: newNote.created_at || new Date().toISOString(),
          updated_at: newNote.updated_at || new Date().toISOString(),
        };
        setLinkedNotes(prev => [...prev, noteForList]);
      }
    } catch (error) {
      console.error('노트 생성 및 연결 실패:', error);
      throw error;
    }
  };

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
      linkedAreaOrResource: '', // Area/Resource 시스템 제거됨
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

  // Portal을 사용하여 document.body에 렌더링
  // 부모 컨테이너의 overflow 영향을 받지 않도록 함
  const modalContent = (
    <dialog open className="modal modal-open z-[110]">
      <div className="modal-box max-w-md">
        {/* 헤더 (취소-제목-삭제-저장) - 관계 기록 모달 스타일과 통일 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="btn btn-ghost btn-sm rounded-full">
            취소
          </button>
          <h3 className="text-lg font-bold">{headerTitle}</h3>
          <div className="flex items-center gap-2">
            {(onDelete || onRecurringDelete) && (
              <button
                onClick={() => {
                  // 반복 할일인지 확인
                  const isRecurring = todo?.recurrencePattern && todo.recurrencePattern !== 'none';
                  if (isRecurring && onRecurringDelete) {
                    setShowRecurringDeleteDialog(true);
                  } else {
                    setShowDeleteConfirm(true);
                  }
                }}
                className="btn btn-ghost btn-sm btn-circle text-error"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button onClick={handleSaveClick} className="btn btn-primary btn-sm rounded-full">
              저장
            </button>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <TodoFormContent
            formData={todo}
            onChange={onChange}
            titlePlaceholder={titlePlaceholder}
            notes={notes}
            projects={projects}
            onNoteClick={handleNoteClick}
            onCreateNote={onCreateNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            onProjectClick={onProjectClick}
            onCreateProject={onCreateProject}
            onProjectImmediateSave={onProjectImmediateSave}
            todoId={todoId}
            userId={userId}
            onNoteImmediateSave={onNoteImmediateSave}
            showScheduledDate={showScheduledDate}
            showHighlight={showHighlight}
            showCompleted={showCompleted}
            showProject={showProject}
            occurrenceDate={occurrenceDate}
          />

          {/* 세부 단계 (서브태스크) 섹션 */}
          {showSubtasks && todoId && userId && (
            <SubtaskSection
              todoId={todoId}
              userId={userId}
              todoColor={todo?.color}
            />
          )}

          {/* 연결된 실행 원동력 섹션 */}
          {showLinkedMotivations && todoId && userId && (
            <LinkedMotivationsSection
              todoId={todoId}
              linkedNotes={linkedNotes}
              allNotes={motivationNotes}
              onUnlink={handleUnlinkNote}
              onLink={handleLinkNote}
              onCreateAndLink={handleCreateAndLinkNote}
              isLoading={isLoadingLinkedNotes}
              todoColor={todo?.color}
            />
          )}

          {/* 추가 콘텐츠 영역 */}
          {additionalContent && (
            <div className="mt-6">
              {additionalContent}
            </div>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>

      {/* 용량 제한 모달 */}
      {limitResult && (
        <UsageLimitModal
          isOpen={isLimitModalOpen}
          onClose={closeLimitModal}
          result={limitResult}
        />
      )}

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
        todos={todos}
      />

      {/* 삭제 확인 다이얼로그 (일반 할일) */}
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

      {/* 반복 할일 삭제 다이얼로그 */}
      {showRecurringDeleteDialog && todo && (
        <RecurringDeleteDialog
          isOpen={showRecurringDeleteDialog}
          onClose={() => setShowRecurringDeleteDialog(false)}
          onConfirm={async (deleteType) => {
            setShowRecurringDeleteDialog(false);
            onClose();
            onRecurringDelete?.(deleteType);
          }}
          todo={{
            id: todoId || '',
            title: todo.title,
            recurrence_pattern: todo.recurrencePattern,
          } as any}
          isDeleting={false}
        />
      )}

      {/* 반복 할일 변경 다이얼로그 */}
      {showTimeChangeDialog && todo && (
        <RecurringTimeChangeDialog
          isOpen={showTimeChangeDialog}
          onClose={() => setShowTimeChangeDialog(false)}
          onConfirm={handleTimeChangeConfirm}
          todo={{
            id: todoId || '',
            title: originalTitle || todo.title,
            recurrence_pattern: todo.recurrencePattern,
          } as any}
          changedFields={changedFields}
          originalTitle={originalTitle}
          newTitle={todo.title}
          originalTime={originalStartTime ? {
            start: originalStartTime,
            end: originalEndTime || originalStartTime,
          } : undefined}
          newTime={{
            start: todo.startTime || '',
            end: todo.endTime || '',
          }}
          isUpdating={isSaving}
        />
      )}
    </dialog>
  );

  // SSR 환경에서는 document가 없으므로 체크 필요
  if (typeof document === 'undefined') return null;

  return createPortal(modalContent, document.body);
}
