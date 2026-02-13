'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useNoteStore, type Note } from '@/state/stores/noteStore';

interface FuelQuoteCardProps {
  userId: string;
  onFuelClick: (noteId: string) => void;
}

const CYCLE_INTERVAL = 5000;

/**
 * 풀폭 원동력 인용문 카드
 * 배너에 고정된 원동력 노트를 crossfade 순환으로 표시
 */
export default function FuelQuoteCard({ userId, onFuelClick }: FuelQuoteCardProps) {
  const { notes, getBannerPinnedFuelNotes, getFuelNotes } = useNoteStore();
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 데이터 로드
  useEffect(() => {
    if (userId) {
      getFuelNotes(userId);
    }
  }, [userId, getFuelNotes]);

  // 고정된 노트 목록 동기화
  useEffect(() => {
    const pinned = getBannerPinnedFuelNotes();
    setPinnedNotes(pinned);
    setCurrentIndex(0);
  }, [notes, getBannerPinnedFuelNotes]);

  // 자동 순환 타이머
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pinnedNotes.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % pinnedNotes.length);
      }, CYCLE_INTERVAL);
    }
  }, [pinnedNotes.length]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  // 카드 클릭 → 다음 문구로 수동 전환 + 타이머 리셋
  const handleCardClick = () => {
    if (pinnedNotes.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % pinnedNotes.length);
      resetTimer();
    }
  };

  // 인용문 클릭 → onFuelClick
  const handleQuoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const note = pinnedNotes[currentIndex];
    if (note) onFuelClick(note.id);
  };

  // 빈 상태: 고정 원동력 없으면 안내 텍스트
  if (pinnedNotes.length === 0) {
    return (
      <div className="mb-4 p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">오늘의 원동력</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          고정된 원동력이 없습니다.{' '}
          <button
            onClick={() => onFuelClick('')}
            className="text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700"
          >
            설정하기
          </button>
        </p>
      </div>
    );
  }

  const currentNote = pinnedNotes[currentIndex];

  return (
    <div
      className="mb-4 p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* 헤더: 아이콘 + 라벨 */}
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">오늘의 원동력</span>
      </div>

      {/* 인용문 crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentNote?.id ?? currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleQuoteClick}
          className="cursor-pointer h-10 flex items-center justify-center"
        >
          <p className="text-base font-medium text-amber-800 dark:text-amber-300 italic leading-relaxed text-center">
            &ldquo;{currentNote?.content}&rdquo;
          </p>
        </motion.div>
      </AnimatePresence>

      {/* 도트 인디케이터 */}
      {pinnedNotes.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {pinnedNotes.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentIndex ? 'bg-amber-500' : 'bg-amber-300/50 dark:bg-amber-600/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
