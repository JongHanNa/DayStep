'use client';

import { useState, useEffect, useRef } from 'react';
import { PopoverContainer } from './PopoverContainer';

interface TitleEditPopoverProps {
  position: { x: number; y: number };
  initialTitle: string;
  onSave: (title: string) => Promise<void>;
  onClose: () => void;
}

export function TitleEditPopover({
  position,
  initialTitle,
  onSave,
  onClose,
}: TitleEditPopoverProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 자동 포커스
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    if (title.trim() === initialTitle) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(title.trim());
      onClose();
    } catch (error) {
      console.error('제목 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <PopoverContainer
      position={position}
      onClose={onClose}
      title="제목 편집"
      width={300}
    >
      <div className="p-3 space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="노트 제목"
          className="w-full h-10 px-3 rounded-lg bg-base-200 border-0 text-base placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm rounded-full"
            disabled={isSaving}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary btn-sm rounded-full"
            disabled={isSaving}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </PopoverContainer>
  );
}
