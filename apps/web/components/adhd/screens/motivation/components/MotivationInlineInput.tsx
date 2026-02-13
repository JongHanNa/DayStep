'use client';

import React, { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { type EmotionTag, EMOTION_CONFIG, EMOTION_TAGS } from '../utils';

interface MotivationInlineInputProps {
  onSubmit: (content: string, emotionTag?: EmotionTag) => void;
  onOpenDetailModal: () => void;
}

export function MotivationInlineInput({ onSubmit, onOpenDetailModal }: MotivationInlineInputProps) {
  const [content, setContent] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTag | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    onSubmit(trimmed, selectedEmotion ?? undefined);
    setContent('');
    setSelectedEmotion(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mx-4 mb-3">
      <div className="bg-base-200 rounded-xl p-3">
        {/* 입력 바 */}
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-base-content/40 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="새 원동력을 입력하세요..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/40"
          />
          {content.trim() && (
            <button
              onClick={handleSubmit}
              className="btn btn-primary btn-xs rounded-lg"
            >
              저장
            </button>
          )}
        </div>

        {/* 감정 태그 선택 */}
        <div className="flex items-center gap-1.5 mt-2">
          {EMOTION_TAGS.map((tag) => {
            const config = EMOTION_CONFIG[tag];
            const isSelected = selectedEmotion === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedEmotion(isSelected ? null : tag)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                  isSelected
                    ? `${config.bgColor} ${config.borderColor} ${config.color} font-medium`
                    : 'border-base-300 text-base-content/50 hover:border-base-content/30'
                }`}
              >
                {config.emoji}{config.label}
              </button>
            );
          })}
          <span className="text-base-content/30 mx-1">|</span>
          <button
            onClick={onOpenDetailModal}
            className="text-xs text-base-content/40 hover:text-base-content/60 transition-colors"
          >
            상세 작성
          </button>
        </div>
      </div>
    </div>
  );
}
