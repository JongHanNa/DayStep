'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, Fuel, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import type { Note } from '@/state/stores/motivationStore';
import MotivationSelector from '@/components/adhd/MotivationSelector';

interface CompletedTodoForBalance {
  id: string;
  title: string;
  isRelationshipTask?: boolean | null;
}

interface CompletedAllViewProps {
  completedCount: number;
  onExit: () => void;
  completedTodos: CompletedTodoForBalance[];
  notes: Note[];
  onConnectNote: (todoId: string, noteId: string | null, newContent?: string) => Promise<void>;
  lastCompletedTodoId?: string;
}

/**
 * 모든 할일 완료 축하 화면
 *
 * 세션 중 완료한 할일 수를 표시하고,
 * 마지막 완료 할일에 원동력을 연결할 수 있습니다.
 */
export function CompletedAllView({
  completedCount,
  onExit,
  completedTodos,
  notes,
  onConnectNote,
  lastCompletedTodoId,
}: CompletedAllViewProps) {
  // 원동력 기록 섹션 상태
  const [showMotivationSection, setShowMotivationSection] = useState(false);
  const [motivationMode, setMotivationMode] = useState<'select' | 'create'>('select');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // 연결 버튼 활성화 조건
  const canConnect = motivationMode === 'select' ? !!selectedNoteId : newNoteContent.trim().length > 0;

  // 원동력 연결 처리
  const handleConnectMotivation = async () => {
    if (!lastCompletedTodoId || !canConnect) return;

    setIsConnecting(true);
    try {
      if (motivationMode === 'select' && selectedNoteId) {
        await onConnectNote(lastCompletedTodoId, selectedNoteId);
      } else if (motivationMode === 'create' && newNoteContent.trim()) {
        await onConnectNote(lastCompletedTodoId, null, newNoteContent.trim());
      }
      // 연결 후 섹션 닫기
      setShowMotivationSection(false);
      setSelectedNoteId(null);
      setNewNoteContent('');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm text-center"
    >
      <motion.div
        animate={{
          rotate: [0, -10, 10, -10, 10, 0],
        }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <PartyPopper className="w-20 h-20 mx-auto text-primary mb-6" />
      </motion.div>

      <h2 className="text-2xl font-bold text-base-content mb-2">
        대단해요!
      </h2>

      <p className="text-base-content/60 mb-6">
        {completedCount > 0
          ? `오늘 ${completedCount}개를 실행했어요.`
          : '오늘 할 일을 모두 처리했어요!'}
      </p>

      {/* 실행 원동력 기록 섹션 (접이식) */}
      {lastCompletedTodoId && (
        <div className="mb-6">
          <button
            onClick={() => setShowMotivationSection(!showMotivationSection)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <Fuel className="w-5 h-5" />
            <span className="text-sm font-medium">이 실행의 원동력 연결하기</span>
            <span className="text-xs text-amber-500 dark:text-amber-400">(선택)</span>
            {showMotivationSection ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>

          <AnimatePresence>
            {showMotivationSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 bg-base-200 rounded-xl text-left">
                  <MotivationSelector
                    notes={notes}
                    mode={motivationMode}
                    onModeChange={setMotivationMode}
                    selectedNoteId={selectedNoteId}
                    onSelectNote={setSelectedNoteId}
                    newContent={newNoteContent}
                    onNewContentChange={setNewNoteContent}
                    emptyMessage="아직 기존 원동력이 없어요"
                    showEmptyCreateButton={true}
                    maxHeight="max-h-40"
                  />

                  {/* 액션 버튼 */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleConnectMotivation}
                      disabled={!canConnect || isConnecting}
                      className="flex-1 btn btn-primary btn-sm rounded-full"
                    >
                      {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : '연결할게'}
                    </button>
                    <button
                      onClick={() => setShowMotivationSection(false)}
                      className="btn btn-ghost btn-sm rounded-full text-base-content/50"
                    >
                      건너뛰기
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <button
        onClick={onExit}
        className="btn btn-primary btn-lg rounded-full px-8"
      >
        나가기
      </button>
    </motion.div>
  );
}

export default CompletedAllView;
