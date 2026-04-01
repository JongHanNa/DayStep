'use client';

import React from 'react';
import { Pin, ListTodo, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Note } from '@/state/stores/motivationStore';
import { type EmotionTag, EMOTION_CONFIG, isNoteProcessed } from '../utils';

interface MotivationCardProps {
  note: Note;
  onPin: (note: Note) => void;
  onCreateTodo: (note: Note) => void;
  onDelete: (noteId: string) => void;
  onClick: (note: Note) => void;
}

export function MotivationCard({ note, onPin, onCreateTodo, onDelete, onClick }: MotivationCardProps) {
  const processed = isNoteProcessed(note);
  const emotionTag = note.emotion_tag as EmotionTag | null | undefined;
  const emotionConfig = emotionTag ? EMOTION_CONFIG[emotionTag] : null;
  const todoCount = note.todos?.length ?? 0;

  return (
    <div
      onClick={() => onClick(note)}
      className="group flex items-start gap-3 p-3 bg-base-200 rounded-xl cursor-pointer hover:bg-base-300 transition-colors relative"
    >
      {/* 상태 도트 */}
      <div className="flex-shrink-0 mt-1.5">
        <div className={`w-2.5 h-2.5 rounded-full ${processed ? 'bg-success' : 'bg-base-content/20'}`} />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {/* 감정 태그 뱃지 */}
          {emotionConfig && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${emotionConfig.bgColor} ${emotionConfig.borderColor} ${emotionConfig.color}`}>
              {emotionConfig.emoji}{emotionConfig.label}
            </span>
          )}
          {/* 배너 고정 표시 */}
          {note.is_banner_pinned && (
            <Pin className="w-3 h-3 text-primary fill-primary" />
          )}
        </div>

        {note.title && note.title !== note.content.substring(0, 50) && (
          <p className="text-sm font-semibold truncate">{note.title}</p>
        )}
        <p className={`text-sm truncate ${processed ? 'text-base-content/60' : 'text-base-content/80'}`}>
          {note.content}
        </p>

        {/* 메타 정보 */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[11px] text-base-content/40">
            {format(new Date(note.created_at), 'M월 d일', { locale: ko })}
          </span>
          {todoCount > 0 && (
            <>
              <span className="text-[11px] text-base-content/30">·</span>
              <span className="text-[11px] text-base-content/40">할일 {todoCount}개</span>
            </>
          )}
        </div>

        {/* 연결된 할일 뱃지 */}
        {processed && note.todos && note.todos.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {note.todos.map((todo) => (
              <span
                key={todo.id}
                className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full"
              >
                {todo.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 호버 퀵 액션 */}
      <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onPin(note); }}
          className={`btn btn-ghost btn-xs btn-square ${note.is_banner_pinned ? 'text-primary' : ''}`}
          title={note.is_banner_pinned ? '배너 고정 해제' : '배너에 고정'}
        >
          <Pin className={`w-3.5 h-3.5 ${note.is_banner_pinned ? 'fill-primary' : ''}`} />
        </button>
        {!processed && (
          <button
            onClick={(e) => { e.stopPropagation(); onCreateTodo(note); }}
            className="btn btn-ghost btn-xs btn-square text-primary"
            title="할일 만들기"
          >
            <ListTodo className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          className="btn btn-ghost btn-xs btn-square text-error"
          title="삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
