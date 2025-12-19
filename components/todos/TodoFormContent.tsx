'use client';

import React from 'react';
import TodoFormFields, { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import type { Note } from '@/types/second-brain';

/**
 * 할일 폼 콘텐츠 공통 컴포넌트
 * - 명료화 페이지 TodoEditModal에서 사용
 * - 타임라인 페이지 TodoFormModal에서 사용
 *
 * 역할:
 * - TodoFormFields를 래핑하여 모달 래퍼와 독립적으로 동작
 * - props로 필요한 상태 및 핸들러를 전달
 */

export interface TodoFormContentProps {
  /** 폼 데이터 */
  formData: TodoFormData;
  /** 폼 변경 핸들러 */
  onChange: (updates: TodoFormData) => void;

  /** 선택적 데이터 */
  notes?: Note[];

  /** 생성/수정/삭제 핸들러 */
  onCreateNote?: (title: string) => Promise<Note>;
  onUpdateNote?: (id: string) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;

  /** 노트 클릭 핸들러 (편집 모달 열기) */
  onNoteClick?: (note: Note) => void;

  /** 플레이스홀더 */
  titlePlaceholder?: string;

  /** 섹션 표시 여부 제어 (기본값: true) */
  showScheduledDate?: boolean;
  showHighlight?: boolean;
  showCompleted?: boolean;

  /** 즉시 DB 저장을 위한 props */
  todoId?: string;
  userId?: string;
  onNoteImmediateSave?: (noteIds: string[]) => Promise<void>;
}

export default function TodoFormContent({
  formData,
  onChange,
  notes,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onNoteClick,
  titlePlaceholder,
  showScheduledDate = true,
  showHighlight = true,
  showCompleted = true,
  todoId,
  userId,
  onNoteImmediateSave,
}: TodoFormContentProps) {
  return (
    <TodoFormFields
      todo={formData}
      onChange={onChange}
      titlePlaceholder={titlePlaceholder}
      notes={notes}
      onNoteClick={onNoteClick}
      onCreateNote={onCreateNote}
      onUpdateNote={onUpdateNote}
      onDeleteNote={onDeleteNote}
      showScheduledDate={showScheduledDate}
      showHighlight={showHighlight}
      showCompleted={showCompleted}
      todoId={todoId}
      userId={userId}
      onNoteImmediateSave={onNoteImmediateSave}
    />
  );
}
