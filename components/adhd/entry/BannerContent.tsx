'use client';

import { motion } from 'framer-motion';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import PriorityReminderBanner from '@/components/cherished/PriorityReminderBanner';
import FuelReminderBanner from '@/components/adhd/FuelReminderBanner';

interface BannerContentProps {
  userId: string;
  onRelationshipInsights: () => void;
  onFuel: (noteId?: string) => void;
}

/**
 * 대시보드 배너 콘텐츠
 * - FuelReminderBanner: 원동력 상기 배너
 * - PriorityReminderBanner: 우선순위 상기 배너
 * - 각성 문장 (설정된 경우)
 */
export function BannerContent({ userId, onRelationshipInsights, onFuel }: BannerContentProps) {
  const { awakeningSentence } = useADHDModeStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm mx-auto text-center mt-8"
    >
      {/* 원동력 상기 배너 */}
      <FuelReminderBanner
        userId={userId}
        onFuelClick={(noteId) => onFuel(noteId)}
      />

      {/* 우선순위 상기 배너 */}
      <PriorityReminderBanner
        userId={userId}
        onContactClick={onRelationshipInsights}
      />

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

      {!awakeningSentence && <div className="mb-8" />}
    </motion.div>
  );
}
