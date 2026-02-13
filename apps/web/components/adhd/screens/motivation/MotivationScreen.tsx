'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useNoteStore, type Note } from '@/state/stores/noteStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageWarningBanner } from '@/components/subscription/UsageWarningBanner';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';

import { type EmotionTag, type StatusFilter, calculateStreak, calculateXP, getFilterCounts, isNoteProcessed } from './utils';
import { MotivationHeader } from './components/MotivationHeader';
import { MotivationInlineInput } from './components/MotivationInlineInput';
import { MotivationFilterBar } from './components/MotivationFilterBar';
import { MotivationFuelCard } from './components/MotivationFuelCard';
import { MotivationEmptyState } from './components/MotivationEmptyState';
import {
  FuelInputModal,
  FuelDetailModal,
  DeleteConfirmModal,
  TodoEditModal,
  UsageLimitModal,
} from './components/MotivationModals';

interface MotivationScreenProps {
  userId: string;
}

/**
 * 원동력 새기기 화면 (하이브리드 리디자인)
 * C의 인라인 입력 + A의 감정 태그 + B의 연속 기록/XP
 */
export function MotivationScreen({ userId }: MotivationScreenProps) {
  const { goFuel } = useADHDNavigation();

  // ============================================
  // 스토어 연결
  // ============================================
  const { notes, createFuelNote, updateNote, deleteNote, setBannerPinned } = useNoteStore();
  const { createTodo, updateTodo, deleteTodo } = useTodoStore();
  const { fuelMode, setFuelDraft, resetFuelDraft, enterExecuteMode } = useADHDStore();
  const { draftTitle, draftContent } = fuelMode;
  const { checkAndProceed, limitResult, isModalOpen: isLimitModalOpen, closeModal: closeLimitModal, onCreateSuccess } = useUsageLimitCheck();

  // ============================================
  // 필터 상태
  // ============================================
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [emotionFilter, setEmotionFilter] = useState<EmotionTag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ============================================
  // 모달 상태
  // ============================================
  const [isSaving, setIsSaving] = useState(false);
  const [showFuelInputModal, setShowFuelInputModal] = useState(false);
  const [modalEmotion, setModalEmotion] = useState<EmotionTag | null>(null);
  const [selectedFuelNote, setSelectedFuelNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<{ id: string; title: string; noteId: string } | null>(null);
  const [editTodoTitle, setEditTodoTitle] = useState('');
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);

  // ============================================
  // 파생 데이터
  // ============================================
  const fuelNotes = useMemo(() =>
    notes.filter(note => note.note_category === 'fuel'),
    [notes]
  );

  const counts = useMemo(() => getFilterCounts(fuelNotes), [fuelNotes]);
  const streak = useMemo(() => calculateStreak(fuelNotes), [fuelNotes]);
  const xp = useMemo(() => calculateXP(fuelNotes), [fuelNotes]);

  const convertedCount = useMemo(() =>
    fuelNotes.filter(n => (n.todos?.length ?? 0) > 0).length,
    [fuelNotes]
  );

  // 필터링 + 정렬
  const filteredNotes = useMemo(() => {
    let result = [...fuelNotes];

    // 상태 필터
    if (statusFilter === 'pending') {
      result = result.filter(n => !isNoteProcessed(n));
    } else if (statusFilter === 'processed') {
      result = result.filter(n => isNoteProcessed(n));
    }

    // 감정 태그 필터
    if (emotionFilter) {
      result = result.filter(n => n.emotion_tag === emotionFilter);
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.content.toLowerCase().includes(q) ||
        (n.title && n.title.toLowerCase().includes(q))
      );
    }

    // 미처리 우선 + 최신 순
    result.sort((a, b) => {
      const aProcessed = isNoteProcessed(a);
      const bProcessed = isNoteProcessed(b);
      if (aProcessed !== bProcessed) return aProcessed ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [fuelNotes, statusFilter, emotionFilter, searchQuery]);

  // ============================================
  // 핸들러
  // ============================================

  // 인라인 빠른 생성
  const handleQuickCreate = useCallback(async (content: string, emotionTag?: EmotionTag) => {
    try {
      await createFuelNote({
        content,
        emotion_tag: emotionTag,
      });
    } catch (error) {
      console.error('원동력 저장 실패:', error);
    }
  }, [createFuelNote]);

  // 배너 고정 토글
  const handleToggleBannerPin = useCallback(async (note: Note) => {
    try {
      await setBannerPinned(note.id, !note.is_banner_pinned);
    } catch (error) {
      console.error('배너 고정 실패:', error);
    }
  }, [setBannerPinned]);

  // 할일 만들기
  const handleCreateTodoFromEntry = useCallback(async (note: Note) => {
    const title = note.title || note.content.substring(0, 30);
    await checkAndProceed('todo', async () => {
      try {
        const today = new Date();
        const startTime = new Date(`${today.toISOString().split('T')[0]}T00:00:00+09:00`).toISOString();
        const newTodo = await createTodo({
          user_id: userId,
          title,
          start_time: startTime,
          schedule_type: 'anytime' as const,
        });
        if (newTodo) onCreateSuccess?.('todo');
      } catch (error) {
        console.error('할일 생성 실패:', error);
      }
    });
  }, [userId, checkAndProceed, createTodo, onCreateSuccess]);

  // 원동력 항목 클릭 (상세 모달)
  const handleFuelItemClick = useCallback((note: Note) => {
    setSelectedFuelNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content);
  }, []);

  const handleCloseFuelDetailModal = useCallback(() => {
    setSelectedFuelNote(null);
    setEditTitle('');
    setEditContent('');
  }, []);

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

  // 삭제
  const handleConfirmDelete = useCallback(async () => {
    if (!deletingNoteId) return;
    try {
      await deleteNote(deletingNoteId);
      setDeletingNoteId(null);
    } catch (error) {
      console.error('원동력 삭제 실패:', error);
    }
  }, [deletingNoteId, deleteNote]);

  // 할일 편집/삭제
  const handleOpenTodoEditModal = (todoId: string, todoTitle: string, noteId: string) => {
    setEditingTodo({ id: todoId, title: todoTitle, noteId });
    setEditTodoTitle(todoTitle);
  };

  const handleSaveTodoEdit = async () => {
    if (!editingTodo || !editTodoTitle.trim()) return;
    try {
      await updateTodo(editingTodo.id, { title: editTodoTitle.trim() });
      setEditingTodo(null);
      setEditTodoTitle('');
    } catch (error) {
      console.error('할일 수정 실패:', error);
    }
  };

  const handleConfirmTodoDelete = async () => {
    if (!deletingTodoId) return;
    try {
      await deleteTodo(deletingTodoId);
      setDeletingTodoId(null);
    } catch (error) {
      console.error('할일 삭제 실패:', error);
    }
  };

  // 상세 작성 모달 핸들러
  const handleOpenDetailModal = useCallback(() => {
    resetFuelDraft();
    setModalEmotion(null);
    setShowFuelInputModal(true);
  }, [resetFuelDraft]);

  const handleInspirationQuickTodo = async () => {
    if (!draftContent.trim()) return;
    setIsSaving(true);
    try {
      const note = await createFuelNote({
        title: draftTitle.trim() || undefined,
        content: draftContent.trim(),
        emotion_tag: modalEmotion ?? undefined,
      });
      if (note) {
        resetFuelDraft();
        setModalEmotion(null);
        enterExecuteMode(userId);
        goFuel('execute');
      }
    } catch (error) {
      console.error('원동력 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInspirationScheduledTodo = async () => {
    if (!draftContent.trim()) return;
    setIsSaving(true);
    try {
      const note = await createFuelNote({
        title: draftTitle.trim() || undefined,
        content: draftContent.trim(),
        emotion_tag: modalEmotion ?? undefined,
      });
      if (note) {
        resetFuelDraft();
        setModalEmotion(null);
      }
    } catch (error) {
      console.error('원동력 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInspirationSaveOnly = async () => {
    if (!draftContent.trim()) return;
    setIsSaving(true);
    try {
      await createFuelNote({
        title: draftTitle.trim() || undefined,
        content: draftContent.trim(),
        emotion_tag: modalEmotion ?? undefined,
      });
      resetFuelDraft();
      setModalEmotion(null);
    } catch (error) {
      console.error('원동력 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // 렌더링
  // ============================================
  return (
    <>
      <div className="flex-1 overflow-y-auto pb-4 mobile-container">
        {/* 용량 경고 배너 */}
        <UsageWarningBanner entities={['todo']} className="mb-4 mx-4" />

        {/* 헤더: Streak/XP 통계 */}
        <MotivationHeader
          totalCount={counts.all}
          convertedCount={convertedCount}
          streak={streak}
          xp={xp}
        />

        {/* 인라인 입력 바 */}
        <MotivationInlineInput
          onSubmit={handleQuickCreate}
          onOpenDetailModal={handleOpenDetailModal}
        />

        {/* 필터 바 */}
        {fuelNotes.length > 0 && (
          <MotivationFilterBar
            statusFilter={statusFilter}
            emotionFilter={emotionFilter}
            counts={counts}
            searchQuery={searchQuery}
            onStatusFilterChange={setStatusFilter}
            onEmotionFilterChange={setEmotionFilter}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* 원동력 목록 또는 빈 상태 */}
        {filteredNotes.length === 0 ? (
          <MotivationEmptyState xpReward={50} />
        ) : (
          <div className="space-y-1.5 px-4 pb-8">
            {filteredNotes.map(note => (
              <MotivationFuelCard
                key={note.id}
                note={note}
                onPin={handleToggleBannerPin}
                onCreateTodo={handleCreateTodoFromEntry}
                onDelete={(id) => setDeletingNoteId(id)}
                onClick={handleFuelItemClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* 모달들 */}
      {/* ============================================ */}

      {/* 용량 제한 모달 */}
      {limitResult && (
        <UsageLimitModal
          isOpen={isLimitModalOpen}
          onClose={closeLimitModal}
          result={limitResult}
        />
      )}

      {/* 원동력 삭제 확인 */}
      <DeleteConfirmModal
        open={!!deletingNoteId}
        title="원동력 삭제"
        message="이 원동력을 삭제하시겠습니까?"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingNoteId(null)}
      />

      {/* 할일 편집 */}
      <TodoEditModal
        open={!!editingTodo}
        todoTitle={editTodoTitle}
        onTitleChange={setEditTodoTitle}
        onSave={handleSaveTodoEdit}
        onClose={() => { setEditingTodo(null); setEditTodoTitle(''); }}
      />

      {/* 할일 삭제 확인 */}
      <DeleteConfirmModal
        open={!!deletingTodoId}
        title="할일 삭제"
        message="이 할일을 삭제하시겠습니까?"
        onConfirm={handleConfirmTodoDelete}
        onClose={() => setDeletingTodoId(null)}
      />

      {/* 상세 작성 모달 */}
      <FuelInputModal
        open={showFuelInputModal}
        draftTitle={draftTitle}
        draftContent={draftContent}
        isSaving={isSaving}
        onTitleChange={(title) => setFuelDraft({ title })}
        onContentChange={(content) => setFuelDraft({ content })}
        onQuickTodo={handleInspirationQuickTodo}
        onScheduledTodo={handleInspirationScheduledTodo}
        onSaveOnly={handleInspirationSaveOnly}
        onClose={() => setShowFuelInputModal(false)}
        selectedEmotion={modalEmotion}
        onEmotionChange={setModalEmotion}
      />

      {/* 원동력 상세 모달 */}
      <FuelDetailModal
        note={selectedFuelNote}
        editTitle={editTitle}
        editContent={editContent}
        onTitleChange={setEditTitle}
        onContentChange={setEditContent}
        onSave={handleSaveFuelDetail}
        onClose={handleCloseFuelDetailModal}
        onCreateTodo={handleCreateTodoFromEntry}
        onOpenTodoEdit={handleOpenTodoEditModal}
        onOpenTodoDelete={(todoId) => setDeletingTodoId(todoId)}
      />
    </>
  );
}
