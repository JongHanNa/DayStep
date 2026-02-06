'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Fuel } from 'lucide-react';
import type { Note } from '@/state/stores/noteStore';
import MotivationNoteSelector from '@/components/adhd/MotivationNoteSelector';

interface AdhocNoteConnectionViewProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string | null) => void;
  newNoteContent: string;
  onNewNoteContentChange: (content: string) => void;
  mode: 'select' | 'create';
  onModeChange: (mode: 'select' | 'create') => void;
  onConnect: () => void;
  onSkip: () => void;
  isAnimating: boolean;
}

/**
 * 영감 노트 연결 화면
 *
 * 완료된 할일에 원동력(영감 노트)을 연결합니다.
 */
export function AdhocNoteConnectionView({
  notes,
  selectedNoteId,
  onSelectNote,
  newNoteContent,
  onNewNoteContentChange,
  mode,
  onModeChange,
  onConnect,
  onSkip,
  isAnimating,
}: AdhocNoteConnectionViewProps) {
  // 연결 버튼 활성화 조건
  const canConnect = mode === 'select' ? !!selectedNoteId : newNoteContent.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <Fuel className="w-16 h-16 mx-auto text-amber-400 mb-4" />

      <h2 className="text-xl font-bold text-base-content mb-2">
        이 실행을 도운 원동력이 있었나요?
      </h2>

      <p className="text-base-content/60 mb-6">
        실행을 도운 원동력을 기록해두면 나중에 힘이 돼요
      </p>

      <div className="mb-6 text-left">
        <MotivationNoteSelector
          notes={notes.slice(0, 10)}
          mode={mode}
          onModeChange={onModeChange}
          selectedNoteId={selectedNoteId}
          onSelectNote={onSelectNote}
          newContent={newNoteContent}
          onNewContentChange={onNewNoteContentChange}
          emptyMessage="아직 기존 원동력이 없어요"
          showEmptyCreateButton={true}
          maxHeight="max-h-48"
        />
      </div>

      <div className="flex flex-col gap-3">
        {/* 연결 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConnect}
          disabled={!canConnect || isAnimating}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          {mode === 'select' ? '연결하기' : '저장하고 연결하기'}
        </motion.button>

        {/* 스킵 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSkip}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-base-content/50"
        >
          넘어갈게
        </motion.button>
      </div>
    </motion.div>
  );
}

export default AdhocNoteConnectionView;
