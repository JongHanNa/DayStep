'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useNoteStore } from '@/state/stores/noteStore';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import PriorityReminderBanner from '@/components/cherished/PriorityReminderBanner';
import MotivationReminderBanner from '@/components/adhd/MotivationReminderBanner';

interface BannerViewProps {
  userId: string;
  onRelationshipInsights: () => void;
  onFuel: (noteId?: string) => void;
}

/**
 * 대시보드 배너 뷰
 * - MotivationReminderBanner: 원동력 상기 배너
 * - PriorityReminderBanner: 우선순위 상기 배너
 * - 각성 문장 (설정된 경우)
 * - 빈 상태: 원동력/소중한 사람 모두 없을 때 안내 카드
 */
export function BannerView({ userId, onRelationshipInsights, onFuel }: BannerViewProps) {
  const { awakeningSentence } = useADHDStore();
  const { notes, getBannerPinnedFuelNotes } = useNoteStore();
  const { recommendations } = useCherishedPeopleStore();

  const { hasPinnedFuel, hasRecommendations } = useMemo(() => {
    const pinnedNotes = getBannerPinnedFuelNotes();
    return {
      hasPinnedFuel: pinnedNotes.length > 0,
      hasRecommendations: recommendations.length > 0,
    };
  }, [notes, getBannerPinnedFuelNotes, recommendations]);

  const showGuide = !awakeningSentence && (!hasPinnedFuel || !hasRecommendations);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm mx-auto text-center mt-8"
    >
      {/* 원동력 상기 배너 */}
      <MotivationReminderBanner
        userId={userId}
        onFuelClick={(noteId) => onFuel(noteId)}
      />

      {/* 우선순위 상기 배너 */}
      <PriorityReminderBanner
        userId={userId}
        onContactClick={onRelationshipInsights}
      />

      {/* 빈 상태: 부족한 조건만 구체적으로 안내 */}
      {showGuide && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-base-content/50 mb-8 italic"
        >
          {!hasPinnedFuel && (
            <>원동력 새기기에서 원동력을 작성하고 고정하면 매일 하나씩 보여드려요</>
          )}
          {!hasPinnedFuel && !hasRecommendations && <br />}
          {!hasRecommendations && (
            <>관계 기록하기에서 소중한 사람을 등록하면 연락 안부를 챙겨드려요</>
          )}
        </motion.p>
      )}

      {/* 각성 문장 (설정된 경우) */}
      {awakeningSentence && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-base-content/60 mb-8 italic"
        >
          &ldquo;{awakeningSentence}&rdquo;
        </motion.p>
      )}

      {!awakeningSentence && !showGuide && <div className="mb-8" />}
    </motion.div>
  );
}
