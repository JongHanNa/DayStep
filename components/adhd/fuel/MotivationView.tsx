'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  PenLine,
  ListTodo,
  MoreVertical,
  Pencil,
  CheckCircle2,
  Pin,
  Trash2,
  X,
  Play,
  Save,
  CalendarClock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNoteStore, type Note } from '@/state/stores/noteStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageWarningBanner } from '@/components/subscription/UsageWarningBanner';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import ContentEditorModal from '@/components/second-brain/ContentEditorModal';
import MarkdownViewer from '@/components/notes/MarkdownViewer';
import { FUEL_FIELD_LABELS, FUEL_MESSAGES } from '@/types/fuel';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';

interface MotivationViewProps {
  userId: string;
}

/**
 * 원동력 새기기 뷰
 * FuelMode.tsx에서 추출된 motivation 탭 뷰
 */
export function MotivationView({ userId }: MotivationViewProps) {
  const { goFuel } = useADHDNavigation();

  // Fuel 노트 관리 (noteStore 사용)
  const {
    notes,
    createFuelNote,
    updateNote,
    deleteNote,
    setBannerPinned,
  } = useNoteStore();

  // 할일 스토어
  const { createTodo, updateTodo, deleteTodo } = useTodoStore();

  // ADHD 모드 스토어
  const {
    fuelMode,
    setFuelDraft,
    resetFuelDraft,
    enterExecuteMode,
  } = useADHDModeStore();

  const { draftTitle, draftContent } = fuelMode;

  // 용량 체크
  const { checkAndProceed, limitResult, isModalOpen: isLimitModalOpen, closeModal: closeLimitModal, onCreateSuccess } = useUsageLimitCheck();

  // Fuel 노트만 필터링
  const fuelNotes = useMemo(() =>
    notes.filter(note => note.note_category === 'fuel'),
    [notes]
  );

  // 실행 원동력 안내 메시지 (랜덤 선택)
  const fuelMessage = useMemo(() =>
    FUEL_MESSAGES[Math.floor(Math.random() * FUEL_MESSAGES.length)],
    []
  );

  // 원동력 목록: 미처리 우선 정렬
  const sortedFuelNotes = useMemo(() => {
    const isProcessed = (note: Note) => (note.todos?.length ?? 0) > 0;
    return [...fuelNotes].sort((a, b) => {
      const aProcessed = isProcessed(a);
      const bProcessed = isProcessed(b);
      if (aProcessed !== bProcessed) {
        return aProcessed ? 1 : -1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [fuelNotes]);

  // 로컬 상태
  const [isSaving, setIsSaving] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // 원동력 입력 모달 상태
  const [showFuelInputModal, setShowFuelInputModal] = useState(false);
  const [isContentEditorOpen, setIsContentEditorOpen] = useState(false);

  // 원동력 상세 모달 상태
  const [selectedFuelNote, setSelectedFuelNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditContentEditorOpen, setIsEditContentEditorOpen] = useState(false);

  // 할일 편집/삭제 모달 상태
  const [editingTodo, setEditingTodo] = useState<{ id: string; title: string; noteId: string } | null>(null);
  const [editTodoTitle, setEditTodoTitle] = useState('');
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  const [deletingTodoNoteId, setDeletingTodoNoteId] = useState<string | null>(null);

  // ============================================
  // 핸들러들
  // ============================================

  // 드롭다운 토글
  const handleToggleDropdown = (noteId: string) => {
    setOpenDropdownId(openDropdownId === noteId ? null : noteId);
  };

  // 배너 고정 토글
  const handleToggleBannerPin = async (note: Note) => {
    try {
      await setBannerPinned(note.id, !note.is_banner_pinned);
      setOpenDropdownId(null);
    } catch (error) {
      console.error('배너 고정 실패:', error);
    }
  };

  // 삭제 모달 열기
  const handleOpenDeleteModal = (noteId: string) => {
    setDeletingNoteId(noteId);
    setOpenDropdownId(null);
  };

  // 삭제 모달 닫기
  const handleCloseDeleteModal = () => {
    setDeletingNoteId(null);
  };

  // 삭제 확인
  const handleConfirmDelete = async () => {
    if (!deletingNoteId) return;
    try {
      await deleteNote(deletingNoteId);
      handleCloseDeleteModal();
    } catch (error) {
      console.error('원동력 삭제 실패:', error);
    }
  };

  // "원동력 부터 적고 실행" 버튼 클릭
  const handleStartCollectToExecute = useCallback(() => {
    resetFuelDraft();
    setShowFuelInputModal(true);
  }, [resetFuelDraft]);

  // 원동력 항목 클릭 (상세 모달 열기)
  const handleFuelItemClick = useCallback((note: Note) => {
    setSelectedFuelNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content);
  }, []);

  // 원동력 상세 모달 닫기
  const handleCloseFuelDetailModal = useCallback(() => {
    setSelectedFuelNote(null);
    setEditTitle('');
    setEditContent('');
  }, []);

  // 원동력 상세 모달에서 저장
  const handleSaveFuelDetail = useCallback(async () => {
    if (!selectedFuelNote) return;
    try {
      await updateNote({
        id: selectedFuelNote.id,
        title: editTitle.trim() || undefined,
        content: editContent.trim(),
      });
      handleCloseFuelDetailModal();
    } catch (error) {
      console.error('원동력 수정 실패:', error);
    }
  }, [selectedFuelNote, editTitle, editContent, updateNote, handleCloseFuelDetailModal]);

  // 할일 만들기 (간단 버전 - 바로 생성)
  const handleCreateTodoFromEntry = useCallback(async (note: Note) => {
    const title = note.title || note.content.substring(0, 30);

    await checkAndProceed('todo', async () => {
      try {
        // 한국 시간 자정을 UTC로 변환
        const today = new Date();
        const startTime = new Date(`${today.toISOString().split('T')[0]}T00:00:00+09:00`).toISOString();

        const newTodo = await createTodo({
          user_id: userId,
          title,
          start_time: startTime,
          schedule_type: 'anytime' as const,
        });

        if (newTodo) {
          onCreateSuccess?.('todo');
        }
      } catch (error) {
        console.error('할일 생성 실패:', error);
      }
    });
  }, [userId, checkAndProceed, createTodo, onCreateSuccess]);

  // 할일 편집 모달 열기
  const handleOpenTodoEditModal = (todoId: string, todoTitle: string, noteId: string) => {
    setEditingTodo({ id: todoId, title: todoTitle, noteId });
    setEditTodoTitle(todoTitle);
  };

  // 할일 편집 모달 닫기
  const handleCloseTodoEditModal = () => {
    setEditingTodo(null);
    setEditTodoTitle('');
  };

  // 할일 수정 저장
  const handleSaveTodoEdit = async () => {
    if (!editingTodo || !editTodoTitle.trim()) return;
    try {
      await updateTodo(editingTodo.id, { title: editTodoTitle.trim() });
      handleCloseTodoEditModal();
    } catch (error) {
      console.error('할일 수정 실패:', error);
    }
  };

  // 할일 삭제 모달 열기
  const handleOpenTodoDeleteModal = (todoId: string, noteId: string) => {
    setDeletingTodoId(todoId);
    setDeletingTodoNoteId(noteId);
  };

  // 할일 삭제 모달 닫기
  const handleCloseTodoDeleteModal = () => {
    setDeletingTodoId(null);
    setDeletingTodoNoteId(null);
  };

  // 할일 삭제 확인
  const handleConfirmTodoDelete = async () => {
    if (!deletingTodoId) return;
    try {
      await deleteTodo(deletingTodoId);
      handleCloseTodoDeleteModal();
    } catch (error) {
      console.error('할일 삭제 실패:', error);
    }
  };

  // 원동력 저장 후 실행으로 이동
  const handleInspirationQuickTodo = async () => {
    if (!draftContent.trim()) return;
    setIsSaving(true);

    try {
      const note = await createFuelNote({
        title: draftTitle.trim() || undefined,
        content: draftContent.trim(),
      });

      if (note) {
        resetFuelDraft();
        // 실행 모드로 이동
        enterExecuteMode(userId);
        goFuel('execute');
      }
    } catch (error) {
      console.error('원동력 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 원동력 저장 후 일정 잡기
  const handleInspirationScheduledTodo = async () => {
    if (!draftContent.trim()) return;
    setIsSaving(true);

    try {
      const note = await createFuelNote({
        title: draftTitle.trim() || undefined,
        content: draftContent.trim(),
      });

      if (note) {
        resetFuelDraft();
        // TODO: 일정 잡기 화면으로 이동
      }
    } catch (error) {
      console.error('원동력 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 원동력만 저장
  const handleInspirationSaveOnly = async () => {
    if (!draftContent.trim()) return;
    setIsSaving(true);

    try {
      await createFuelNote({
        title: draftTitle.trim() || undefined,
        content: draftContent.trim(),
      });
      resetFuelDraft();
    } catch (error) {
      console.error('원동력 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 드롭다운 외부 클릭 처리
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-dropdown-menu]') && !target.closest('button')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pb-4 mobile-container">
        {/* 용량 경고 배너 */}
        <UsageWarningBanner entities={['todo']} className="mb-4" />

        {/* 메인 액션 버튼 */}
        <div className="flex flex-col gap-3 mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartCollectToExecute}
            className="btn btn-lg w-full rounded-2xl h-16 flex items-center justify-center gap-3 shadow-lg bg-orange-500 text-white border-none hover:bg-orange-600"
          >
            <PenLine className="w-6 h-6" />
            <span className="text-lg font-semibold">원동력 부터 적고 실행</span>
          </motion.button>
        </div>

        {/* 원동력 목록 */}
        {sortedFuelNotes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-base-content/70">원동력</span>
              <span className="text-xs text-base-content/50">({sortedFuelNotes.length}개)</span>
            </div>
            <div className="flex flex-col gap-2">
              {sortedFuelNotes.map(entry => {
                const isProcessed = (entry.todos?.length ?? 0) > 0;

                return (
                  <div
                    key={entry.id}
                    onClick={() => handleFuelItemClick(entry)}
                    className="flex items-start gap-3 p-3 bg-base-200 rounded-xl cursor-pointer hover:bg-base-300 transition-colors"
                  >
                    {/* 처리됨 표시 */}
                    {isProcessed && (
                      <div className="flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {entry.title && (
                        <p className="text-sm font-semibold truncate mb-0.5">{entry.title}</p>
                      )}
                      <p className={`text-sm truncate ${isProcessed ? 'text-base-content/70' : 'text-base-content/80'}`}>
                        {entry.content}
                      </p>

                      {/* 연결된 할일 표시 */}
                      {isProcessed && entry.todos && entry.todos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.todos.map((todo) => (
                            <div key={todo.id} className="group flex items-center">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-l-full">
                                {todo.title}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenTodoEditModal(todo.id, todo.title, entry.id); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-primary/10 text-primary px-1.5 py-0.5 hover:bg-primary/20"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenTodoDeleteModal(todo.id, entry.id); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-r-full hover:bg-error/20 hover:text-error"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className={`text-xs mt-1 ${isProcessed ? 'text-base-content/40' : 'text-base-content/50'}`}>
                        {format(new Date(entry.created_at), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                      </p>
                    </div>

                    {/* 할일 만들기 버튼 (미처리인 경우만) */}
                    {!isProcessed && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCreateTodoFromEntry(entry); }}
                        className="btn btn-sm btn-ghost text-primary flex-shrink-0"
                      >
                        <ListTodo className="w-4 h-4" />
                        <span className="hidden sm:inline">할일 만들기</span>
                      </button>
                    )}

                    {/* 드롭다운 메뉴 */}
                    <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleDropdown(entry.id)}
                        className="btn btn-sm btn-ghost btn-circle"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openDropdownId === entry.id && (
                        <div data-dropdown-menu className="absolute right-0 top-full mt-1 w-36 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50">
                          <button
                            onClick={() => handleToggleBannerPin(entry)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 rounded-t-lg"
                          >
                            <Pin className={`w-4 h-4 ${entry.is_banner_pinned ? 'text-primary fill-primary' : ''}`} />
                            {entry.is_banner_pinned ? '배너 고정 해제' : '배너에 고정'}
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(entry.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-base-200 rounded-b-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 용량 제한 모달 */}
      {limitResult && (
        <UsageLimitModal
          isOpen={isLimitModalOpen}
          onClose={closeLimitModal}
          result={limitResult}
        />
      )}

      {/* 원동력 삭제 확인 모달 */}
      {deletingNoteId && (
        <dialog open className="modal z-[110]">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">원동력 삭제</h3>
            <p className="text-base-content/70">이 원동력을 삭제하시겠습니까?</p>
            <div className="modal-action">
              <button onClick={handleCloseDeleteModal} className="btn btn-ghost rounded-full">
                취소
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-error rounded-full">
                삭제
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseDeleteModal}>close</button>
          </form>
        </dialog>
      )}

      {/* 할일 편집 모달 */}
      {editingTodo && (
        <dialog open className="modal z-[110]">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">할일 수정</h3>
            <input
              type="text"
              value={editTodoTitle}
              onChange={(e) => setEditTodoTitle(e.target.value)}
              className="input input-bordered w-full"
              placeholder="할일 제목"
            />
            <div className="modal-action">
              <button onClick={handleCloseTodoEditModal} className="btn btn-ghost rounded-full">
                취소
              </button>
              <button onClick={handleSaveTodoEdit} className="btn btn-primary rounded-full">
                저장
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseTodoEditModal}>close</button>
          </form>
        </dialog>
      )}

      {/* 할일 삭제 확인 모달 */}
      {deletingTodoId && (
        <dialog open className="modal z-[110]">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">할일 삭제</h3>
            <p className="text-base-content/70">이 할일을 삭제하시겠습니까?</p>
            <div className="modal-action">
              <button onClick={handleCloseTodoDeleteModal} className="btn btn-ghost rounded-full">
                취소
              </button>
              <button onClick={handleConfirmTodoDelete} className="btn btn-error rounded-full">
                삭제
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseTodoDeleteModal}>close</button>
          </form>
        </dialog>
      )}

      {/* 원동력 입력 모달 */}
      {showFuelInputModal && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="sticky top-0 z-10 bg-base-100 flex items-center justify-between pb-4 border-b border-base-300 -mx-6 px-6 pt-2 -mt-2">
              <button
                onClick={() => setShowFuelInputModal(false)}
                className="btn btn-ghost btn-sm rounded-full"
              >
                취소
              </button>
              <h3 className="font-bold text-lg">원동력 채우기</h3>
              <div className="w-14"></div>
            </div>

            {/* 안내 문구 */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 my-4">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {fuelMessage}
              </p>
            </div>

            {/* 제목 입력 */}
            <div className="mb-4">
              <label className="text-sm font-medium text-base-content/70 mb-1 block">
                제목 (선택)
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setFuelDraft({ title: e.target.value })}
                placeholder="제목을 입력하세요"
                className="input input-bordered w-full bg-base-200"
              />
            </div>

            {/* 내용 입력 */}
            <div className="mb-4">
              <label className="text-sm font-medium text-base-content/70 mb-1 block">
                {FUEL_FIELD_LABELS.content.label} <span className="text-amber-500">*</span>
              </label>
              <div
                className="p-3 rounded-lg bg-base-200 cursor-pointer hover:bg-base-300 transition-colors min-h-[100px]"
                onClick={() => setIsContentEditorOpen(true)}
              >
                {draftContent ? (
                  <MarkdownViewer content={draftContent} className="prose prose-sm max-w-none" />
                ) : (
                  <p className="text-base-content/50">{FUEL_FIELD_LABELS.content.placeholder}</p>
                )}
              </div>

              <ContentEditorModal
                open={isContentEditorOpen}
                content={draftContent}
                onClose={() => setIsContentEditorOpen(false)}
                onChange={(content) => setFuelDraft({ content })}
                placeholder={FUEL_FIELD_LABELS.content.placeholder}
                enableAutoSave={false}
              />
            </div>

            {/* 액션 버튼들 */}
            <div className="flex flex-col gap-3 mt-6">
              <p className="text-base font-semibold text-base-content/80">
                이 원동력으로
              </p>

              <button
                onClick={() => {
                  setShowFuelInputModal(false);
                  handleInspirationQuickTodo();
                }}
                disabled={!draftContent.trim()}
                className="btn btn-primary btn-lg w-full h-14 flex items-center justify-center gap-3"
              >
                <Play className="w-5 h-5" />
                <span className="text-base font-semibold">지금 시작하기</span>
              </button>

              <button
                onClick={() => {
                  setShowFuelInputModal(false);
                  handleInspirationScheduledTodo();
                }}
                disabled={!draftContent.trim()}
                className="btn btn-ghost btn-lg w-full h-12 flex items-center justify-center gap-3 border-2 border-base-300 bg-base-200"
              >
                <CalendarClock className="w-5 h-5" />
                <span className="text-base font-semibold">일정 잡기</span>
              </button>

              <button
                onClick={async () => {
                  await handleInspirationSaveOnly();
                  setShowFuelInputModal(false);
                }}
                disabled={!draftContent.trim() || isSaving}
                className="btn btn-ghost btn-md w-full flex items-center justify-center gap-2 text-base-content/60"
              >
                {isSaving ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <span>{isSaving ? '저장 중...' : '저장하기'}</span>
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowFuelInputModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* 원동력 상세 모달 */}
      {selectedFuelNote && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="sticky top-0 z-10 bg-base-100 flex items-center justify-between pb-4 border-b border-base-300 -mx-6 px-6 pt-2 -mt-2">
              <button
                onClick={handleCloseFuelDetailModal}
                className="btn btn-ghost btn-sm rounded-full"
              >
                취소
              </button>
              <h3 className="font-bold text-lg">원동력 상세</h3>
              <button
                onClick={handleSaveFuelDetail}
                disabled={!editContent.trim()}
                className="btn btn-primary btn-sm rounded-full"
              >
                저장
              </button>
            </div>

            {/* 제목 편집 */}
            <div className="my-4">
              <label className="text-sm font-medium text-base-content/70 mb-1 block">
                제목
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="제목 (선택사항)"
                className="input input-bordered w-full bg-base-200"
              />
            </div>

            {/* 내용 편집 */}
            <div className="mb-4">
              <label className="text-sm font-medium text-base-content/70 mb-1 block">
                내용
              </label>
              <div
                className="p-3 rounded-lg bg-base-200 cursor-pointer hover:bg-base-300 transition-colors min-h-[100px]"
                onClick={() => setIsEditContentEditorOpen(true)}
              >
                {editContent ? (
                  <MarkdownViewer content={editContent} className="prose prose-sm max-w-none" />
                ) : (
                  <p className="text-base-content/50">원동력 내용을 입력하세요</p>
                )}
              </div>

              <ContentEditorModal
                open={isEditContentEditorOpen}
                content={editContent}
                onClose={() => setIsEditContentEditorOpen(false)}
                onChange={(content) => setEditContent(content)}
                placeholder="원동력 내용을 입력하세요"
                enableAutoSave={false}
              />
            </div>

            {/* 연결된 할일 목록 */}
            {selectedFuelNote.todos && selectedFuelNote.todos.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium text-base-content/70 mb-2 block flex items-center gap-2">
                  <ListTodo className="w-4 h-4" />
                  연결된 할일
                </label>
                <div className="space-y-2">
                  {selectedFuelNote.todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center justify-between p-2 bg-base-200 rounded-lg"
                    >
                      <span className="text-sm">{todo.title}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenTodoEditModal(todo.id, todo.title, selectedFuelNote.id)}
                          className="btn btn-ghost btn-xs"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleOpenTodoDeleteModal(todo.id, selectedFuelNote.id)}
                          className="btn btn-ghost btn-xs text-error"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 할일 만들기 버튼 */}
            {(!selectedFuelNote.todos || selectedFuelNote.todos.length === 0) && (
              <button
                onClick={() => {
                  handleCloseFuelDetailModal();
                  handleCreateTodoFromEntry(selectedFuelNote);
                }}
                className="btn btn-primary w-full mt-4"
              >
                <ListTodo className="w-4 h-4" />
                할일 만들기
              </button>
            )}
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseFuelDetailModal}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}
