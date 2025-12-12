'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import type { ContactRecommendation, PriorityReminder } from '@/types/cherished-people';

interface PriorityReminderBannerProps {
  userId: string;
  onContactClick?: () => void;
}

/**
 * 우선순위 상기 배너
 * ADHDEntryScreen에서 7일 이상 연락 안 한 사람이 있을 때 표시
 */
export default function PriorityReminderBanner({
  userId,
  onContactClick,
}: PriorityReminderBannerProps) {
  const { recommendations, loadRecommendations } = useCherishedPeopleStore();

  const [topRecommendation, setTopRecommendation] = useState<ContactRecommendation | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string>('');
  const [isDismissed, setIsDismissed] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (userId) {
      loadRecommendations(userId, 7);
      loadReminderMessage();
    }
  }, [userId, loadRecommendations]);

  // 추천 데이터 처리
  useEffect(() => {
    if (recommendations.length > 0) {
      // 가장 오래 연락 안 한 사람 또는 우선순위가 높은 사람 선택
      const top = recommendations[0];
      setTopRecommendation(top);
    } else {
      setTopRecommendation(null);
    }
  }, [recommendations]);

  // 성찰 메시지 로드
  const loadReminderMessage = async () => {
    const reminder = await CherishedPeopleService.getRandomPriorityReminder();
    if (reminder) {
      setReminderMessage(reminder.message_text);
    }
  };

  // 배너 닫기
  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // 연락하기 클릭
  const handleContactClick = () => {
    if (onContactClick) {
      onContactClick();
    }
  };

  // 표시 조건: 추천이 있고, 닫지 않았을 때
  if (!topRecommendation || isDismissed) {
    return null;
  }

  const daysSince = topRecommendation.daysSinceLastContact;
  const personName = topRecommendation.person.name;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full mb-6"
      >
        <div className="relative p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200">
          {/* 닫기 버튼 */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-pink-100 transition-colors"
          >
            <X className="w-4 h-4 text-pink-400" />
          </button>

          {/* 아이콘 */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-pink-500" />
            </div>

            <div className="flex-1 pr-4">
              {/* 메인 메시지 */}
              <p className="text-sm text-gray-800 font-medium">
                {daysSince === -1 ? (
                  <>
                    <span className="text-pink-600 font-semibold">{personName}</span>
                    <span className="text-gray-800">님께 아직 연락한 적이 없어요</span>
                  </>
                ) : (
                  <>
                    <span className="text-pink-600 font-semibold">{personName}</span>
                    <span className="text-gray-800">님께 마지막 연락한 지{' '}</span>
                    <span className="text-pink-600 font-semibold">{daysSince}일</span>
                    <span className="text-gray-800">이 지났어요</span>
                  </>
                )}
              </p>

              {/* 성찰 메시지 */}
              {reminderMessage && (
                <p className="text-xs text-gray-600 mt-1 italic">
                  &ldquo;{reminderMessage}&rdquo;
                </p>
              )}

              {/* CTA 버튼 */}
              <button
                onClick={handleContactClick}
                className="mt-3 btn btn-sm btn-ghost rounded-full text-pink-600 hover:bg-pink-100 border border-pink-200"
              >
                오늘 안부 전해볼까요?
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
