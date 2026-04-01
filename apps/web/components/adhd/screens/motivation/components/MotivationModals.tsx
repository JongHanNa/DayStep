'use client';

import React, { useState, useMemo } from 'react';
import {
  ListTodo,
  Pencil,
  X,
  Play,
  Save,
  CalendarClock,
} from 'lucide-react';
import type { Note } from '@/state/stores/motivationStore';
import ContentEditorModal from '@/components/motivations/ContentEditorModal';
import MarkdownViewer from '@/components/motivations/MarkdownViewer';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import { MOTIVATION_FIELD_LABELS, MOTIVATION_MESSAGES } from '@/types/motivation';
import { type EmotionTag, EMOTION_CONFIG, EMOTION_TAGS } from '../utils';

// ============================================
// Motivation Input Modal (상세 작성)
// ============================================

interface MotivationInputModalProps {
  open: boolean;
  draftTitle: string;
  draftContent: string;
  isSaving: boolean;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onQuickTodo: () => void;
  onScheduledTodo: () => void;
  onSaveOnly: () => void;
  onClose: () => void;
  selectedEmotion: EmotionTag | null;
  onEmotionChange: (tag: EmotionTag | null) => void;
}

export function MotivationInputModal({
  open,
  draftTitle,
  draftContent,
  isSaving,
  onTitleChange,
  onContentChange,
  onQuickTodo,
  onScheduledTodo,
  onSaveOnly,
  onClose,
  selectedEmotion,
  onEmotionChange,
}: MotivationInputModalProps) {
  const [isContentEditorOpen, setIsContentEditorOpen] = useState(false);

  const motivationMessage = useMemo(() =>
    MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)],
    []
  );

  if (!open) return null;

  return (
    <dialog open className="modal z-[110]">
      <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 flex items-center justify-between pb-4 border-b border-base-300 -mx-6 px-6 pt-2 -mt-2">
          <button onClick={onClose} className="btn btn-ghost btn-sm rounded-full">
            취소
          </button>
          <h3 className="font-bold text-lg">원동력 채우기</h3>
          <div className="w-14"></div>
        </div>

        {/* 안내 문구 */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 my-4">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {motivationMessage}
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
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="제목을 입력하세요"
            className="input input-bordered w-full bg-base-200"
          />
        </div>

        {/* 내용 입력 */}
        <div className="mb-4">
          <label className="text-sm font-medium text-base-content/70 mb-1 block">
            {MOTIVATION_FIELD_LABELS.content.label} <span className="text-amber-500">*</span>
          </label>
          <div
            className="p-3 rounded-lg bg-base-200 cursor-pointer hover:bg-base-300 transition-colors min-h-[100px]"
            onClick={() => setIsContentEditorOpen(true)}
          >
            {draftContent ? (
              <MarkdownViewer content={draftContent} className="prose prose-sm max-w-none" />
            ) : (
              <p className="text-base-content/50">{MOTIVATION_FIELD_LABELS.content.placeholder}</p>
            )}
          </div>

          <ContentEditorModal
            open={isContentEditorOpen}
            content={draftContent}
            onClose={() => setIsContentEditorOpen(false)}
            onChange={onContentChange}
            placeholder={MOTIVATION_FIELD_LABELS.content.placeholder}
            enableAutoSave={false}
          />
        </div>

        {/* 감정 태그 선택 */}
        <div className="mb-4">
          <label className="text-sm font-medium text-base-content/70 mb-2 block">
            감정 태그 (선택)
          </label>
          <div className="flex flex-wrap gap-2">
            {EMOTION_TAGS.map((tag) => {
              const config = EMOTION_CONFIG[tag];
              const isSelected = selectedEmotion === tag;
              return (
                <button
                  key={tag}
                  onClick={() => onEmotionChange(isSelected ? null : tag)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                    isSelected
                      ? `${config.bgColor} ${config.borderColor} ${config.color} font-medium`
                      : 'border-base-300 text-base-content/60 hover:border-base-content/30'
                  }`}
                >
                  {config.emoji} {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex flex-col gap-3 mt-6">
          <p className="text-base font-semibold text-base-content/80">
            이 원동력으로
          </p>

          <button
            onClick={() => { onClose(); onQuickTodo(); }}
            disabled={!draftContent.trim()}
            className="btn btn-primary btn-lg w-full h-14 flex items-center justify-center gap-3"
          >
            <Play className="w-5 h-5" />
            <span className="text-base font-semibold">지금 시작하기</span>
          </button>

          <button
            onClick={() => { onClose(); onScheduledTodo(); }}
            disabled={!draftContent.trim()}
            className="btn btn-ghost btn-lg w-full h-12 flex items-center justify-center gap-3 border-2 border-base-300 bg-base-200"
          >
            <CalendarClock className="w-5 h-5" />
            <span className="text-base font-semibold">일정 잡기</span>
          </button>

          <button
            onClick={async () => { await onSaveOnly(); onClose(); }}
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
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

// ============================================
// Motivation Detail Modal (상세 보기/편집)
// ============================================

interface MotivationDetailModalProps {
  note: Note | null;
  editTitle: string;
  editContent: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onClose: () => void;
  onCreateTodo: (note: Note) => void;
  onOpenTodoEdit: (todoId: string, todoTitle: string, noteId: string) => void;
  onOpenTodoDelete: (todoId: string, noteId: string) => void;
}

export function MotivationDetailModal({
  note,
  editTitle,
  editContent,
  onTitleChange,
  onContentChange,
  onSave,
  onClose,
  onCreateTodo,
  onOpenTodoEdit,
  onOpenTodoDelete,
}: MotivationDetailModalProps) {
  const [isEditContentEditorOpen, setIsEditContentEditorOpen] = useState(false);

  if (!note) return null;

  const emotionTag = note.emotion_tag as EmotionTag | null | undefined;
  const emotionConfig = emotionTag ? EMOTION_CONFIG[emotionTag] : null;

  return (
    <dialog open className="modal z-[110]">
      <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 flex items-center justify-between pb-4 border-b border-base-300 -mx-6 px-6 pt-2 -mt-2">
          <button onClick={onClose} className="btn btn-ghost btn-sm rounded-full">
            취소
          </button>
          <h3 className="font-bold text-lg">원동력 상세</h3>
          <button
            onClick={onSave}
            disabled={!editContent.trim()}
            className="btn btn-primary btn-sm rounded-full"
          >
            저장
          </button>
        </div>

        {/* 감정 태그 표시 */}
        {emotionConfig && (
          <div className="mt-4">
            <span className={`text-sm px-3 py-1 rounded-full border ${emotionConfig.bgColor} ${emotionConfig.borderColor} ${emotionConfig.color}`}>
              {emotionConfig.emoji} {emotionConfig.label}
            </span>
          </div>
        )}

        {/* 제목 편집 */}
        <div className="my-4">
          <label className="text-sm font-medium text-base-content/70 mb-1 block">
            제목
          </label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onTitleChange(e.target.value)}
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
            onChange={onContentChange}
            placeholder="원동력 내용을 입력하세요"
            enableAutoSave={false}
          />
        </div>

        {/* 연결된 할일 목록 */}
        {note.todos && note.todos.length > 0 && (
          <div className="mb-4">
            <label className="text-sm font-medium text-base-content/70 mb-2 block flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              연결된 할일
            </label>
            <div className="space-y-2">
              {note.todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center justify-between p-2 bg-base-200 rounded-lg"
                >
                  <span className="text-sm">{todo.title}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onOpenTodoEdit(todo.id, todo.title, note.id)}
                      className="btn btn-ghost btn-xs"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onOpenTodoDelete(todo.id, note.id)}
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
        {(!note.todos || note.todos.length === 0) && (
          <button
            onClick={() => { onClose(); onCreateTodo(note); }}
            className="btn btn-primary w-full mt-4"
          >
            <ListTodo className="w-4 h-4" />
            할일 만들기
          </button>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

// ============================================
// Delete Confirmation Modal
// ============================================

interface DeleteModalProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({ open, title, message, onConfirm, onClose }: DeleteModalProps) {
  if (!open) return null;

  return (
    <dialog open className="modal z-[110]">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <p className="text-base-content/70">{message}</p>
        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost rounded-full">
            취소
          </button>
          <button onClick={onConfirm} className="btn btn-error rounded-full">
            삭제
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

// ============================================
// Todo Edit Modal
// ============================================

interface TodoEditModalProps {
  open: boolean;
  todoTitle: string;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function TodoEditModal({ open, todoTitle, onTitleChange, onSave, onClose }: TodoEditModalProps) {
  if (!open) return null;

  return (
    <dialog open className="modal z-[110]">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">할일 수정</h3>
        <input
          type="text"
          value={todoTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="input input-bordered w-full"
          placeholder="할일 제목"
        />
        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost rounded-full">
            취소
          </button>
          <button onClick={onSave} className="btn btn-primary rounded-full">
            저장
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

// ============================================
// Usage Limit Modal Re-export
// ============================================

export { UsageLimitModal };
