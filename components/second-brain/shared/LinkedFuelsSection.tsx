'use client';

import { useState } from 'react';
import { X, Plus, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Note } from '@/types/second-brain';
import FuelSelector from '@/components/adhd/FuelSelector';

interface LinkedFuelsSectionProps {
  todoId: string;
  linkedNotes: Note[];
  allNotes: Note[]; // inbox 카테고리 노트만
  onUnlink: (noteId: string) => void;
  onLink: (noteId: string) => void;
  onCreateAndLink: (content: string) => Promise<void>;
  isLoading?: boolean;
  todoColor?: string;
}

/**
 * 연결된 실행 원동력 섹션
 * - 연결된 노트 목록 표시
 * - 연결 해제 (X 버튼)
 * - 새 원동력 추가 (기존 노트 선택 또는 새로 생성)
 */
export default function LinkedFuelsSection({
  todoId,
  linkedNotes,
  allNotes,
  onUnlink,
  onLink,
  onCreateAndLink,
  isLoading = false,
  todoColor = '#6b7280',
}: LinkedFuelsSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'select' | 'create'>('select');
  const [newContent, setNewContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 이미 연결된 노트는 선택 목록에서 제외
  const linkedNoteIds = new Set(linkedNotes.map(n => n.id));
  const availableNotes = allNotes.filter(n => !linkedNoteIds.has(n.id));

  // 새 원동력 생성 및 연결
  const handleCreateAndLink = async () => {
    if (!newContent.trim()) return;

    setIsSaving(true);
    try {
      await onCreateAndLink(newContent.trim());
      setNewContent('');
      setShowAddModal(false);
    } catch (error) {
      console.error('원동력 생성 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 기존 노트 선택
  const handleSelectNote = (noteId: string | null) => {
    if (noteId) {
      onLink(noteId);
      setShowAddModal(false);
    }
  };

  return (
    <div className="my-4">
      {/* 섹션 헤더 */}
      <label className="text-sm font-medium block mb-2">연결된 실행 원동력</label>

      {/* 연결된 노트 목록 */}
      <div className="p-3 rounded-lg bg-base-100 border border-base-300">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <span className="loading loading-spinner loading-sm" />
          </div>
        ) : linkedNotes.length > 0 ? (
          <div className="space-y-2">
            <AnimatePresence>
              {linkedNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-info flex-shrink-0" />
                    <span className="text-sm truncate">
                      {note.content || note.title}
                    </span>
                  </div>
                  <button
                    onClick={() => onUnlink(note.id)}
                    className="btn btn-ghost btn-xs btn-circle text-error flex-shrink-0"
                    title="연결 해제"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-center text-base-content/50 py-4 text-sm">
            연결된 실행 원동력가 없습니다
          </p>
        )}

        {/* 추가 버튼 */}
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-ghost btn-sm w-full mt-2"
        >
          <Plus className="h-4 w-4" />
          실행 원동력 추가
        </button>
      </div>

      {/* 추가 모달 */}
      {showAddModal && (
        <dialog open className="modal modal-open z-[130]">
          <div className="modal-box max-w-md">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-ghost btn-sm rounded-full"
              >
                취소
              </button>
              <h3 className="font-bold text-lg">실행 원동력 추가</h3>
              <div className="w-[52px]" /> {/* 균형을 위한 빈 공간 */}
            </div>

            <FuelSelector
              notes={availableNotes}
              mode={addMode}
              onModeChange={setAddMode}
              selectedNoteId={null}
              onSelectNote={handleSelectNote}
              newContent={newContent}
              onNewContentChange={setNewContent}
              emptyMessage="아직 기록된 실행 원동력이 없어요"
              showNoteIcon={true}
              immediateSelect={true}
            />

            {/* 생성 모드일 때만 버튼 표시 */}
            {addMode === 'create' && (
              <button
                onClick={handleCreateAndLink}
                disabled={!newContent.trim() || isSaving}
                className="btn btn-primary w-full rounded-full mt-4"
              >
                {isSaving ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  '연결할게'
                )}
              </button>
            )}
          </div>
          <div
            className="modal-backdrop bg-black/50"
            onClick={() => setShowAddModal(false)}
          />
        </dialog>
      )}
    </div>
  );
}
