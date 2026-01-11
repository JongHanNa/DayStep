'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useNoteStore, type Note } from '@/state/stores/noteStore';

interface FuelReminderBannerProps {
  userId: string;
  onFuelClick?: (noteId: string) => void;
}

/**
 * 원동력 상기 배너
 * ADHDEntryScreen에서 배너에 고정된 원동력이 있을 때 표시
 * 고정된 원동력 중 랜덤으로 하나를 표시
 */
export default function FuelReminderBanner({
  userId,
  onFuelClick,
}: FuelReminderBannerProps) {
  const { notes, getBannerPinnedFuelNotes, getFuelNotes } = useNoteStore();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (userId) {
      getFuelNotes(userId);
    }
  }, [userId, getFuelNotes]);

  // 배너 고정된 노트 중 랜덤 선택
  useEffect(() => {
    const pinnedNotes = getBannerPinnedFuelNotes();
    if (pinnedNotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * pinnedNotes.length);
      setSelectedNote(pinnedNotes[randomIndex]);
    } else {
      setSelectedNote(null);
    }
  }, [notes, getBannerPinnedFuelNotes]);

  // 배너 닫기
  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // 원동력으로 이동
  const handleFuelClick = () => {
    if (onFuelClick && selectedNote) {
      onFuelClick(selectedNote.id);
    }
  };

  // 표시 조건: 선택된 노트가 있고, 닫지 않았을 때
  if (!selectedNote || isDismissed) {
    return null;
  }

  // 컨텐츠 미리보기 (100자 제한)
  const isLongContent = selectedNote.content.length > 100;
  const contentPreview = isLongContent && !isExpanded
    ? selectedNote.content.substring(0, 100) + '...'
    : selectedNote.content;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full mb-6"
      >
        <div className="relative p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          {/* 닫기 버튼 */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-amber-100 transition-colors"
          >
            <X className="w-4 h-4 text-amber-400" />
          </button>

          {/* 아이콘 */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>

            <div className="flex-1 pr-4">
              {/* 라벨 */}
              <p className="text-xs text-amber-600 font-medium mb-1">
                오늘의 원동력
              </p>

              {/* 내용 미리보기 */}
              <p
                className={`text-sm text-gray-800 font-medium ${isLongContent ? 'cursor-pointer' : ''} ${!isExpanded ? 'line-clamp-2' : ''}`}
                onClick={isLongContent ? () => setIsExpanded(!isExpanded) : undefined}
              >
                {contentPreview}
              </p>

              {/* CTA 버튼 */}
              <button
                onClick={handleFuelClick}
                className="mt-3 btn btn-sm btn-ghost rounded-full text-amber-600 hover:bg-amber-100 border border-amber-200 gap-1"
              >
                이걸로 할일 만들기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
