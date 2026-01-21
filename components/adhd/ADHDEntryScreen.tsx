'use client';

import { motion } from 'framer-motion';
import { Sun, Moon, Settings, Crown } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useSubscription } from '@/hooks/useSubscription';
import PriorityReminderBanner from '@/components/cherished/PriorityReminderBanner';
import FuelReminderBanner from '@/components/adhd/FuelReminderBanner';

interface ADHDEntryScreenProps {
  userId?: string;
  onRelationshipInsights: () => void;
  onFuel: (noteId?: string) => void;
}

/**
 * ADHD 모드 진입 화면
 *
 * 배너만 표시 (네비게이션은 사이드바/하단탭으로 분리됨)
 * - FuelReminderBanner: 원동력 상기
 * - PriorityReminderBanner: 우선순위 상기
 * - 각성 문장 (설정된 경우)
 */
export default function ADHDEntryScreen({ userId, onRelationshipInsights, onFuel }: ADHDEntryScreenProps) {
  const { awakeningSentence, enterSettingsMode } = useADHDModeStore();
  const { resolvedTheme, setTheme } = useTheme();
  const { hasActiveSubscription } = useSubscription();

  return (
    <div className="min-h-screen flex flex-col items-center bg-base-100 px-6 relative">
      {/* 구독 상태 배지, 테마 토글 및 설정 버튼 (우측 상단) - 모바일에서만 표시 */}
      <div className="absolute top-0 pt-4 right-4 flex items-center gap-2 safe-area-top md:hidden">
        {/* 구독 상태 배지 */}
        <button
          onClick={() => enterSettingsMode('subscription')}
          className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
            hasActiveSubscription
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
              : 'bg-base-200 text-base-content/60'
          }`}
          aria-label="구독 관리"
        >
          {hasActiveSubscription ? (
            <>
              <Crown className="w-3 h-3" />
              Pro
            </>
          ) : (
            'Free'
          )}
        </button>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="btn btn-circle btn-sm btn-ghost"
          aria-label="테마 전환"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => enterSettingsMode('main')}
          className="btn btn-circle btn-sm btn-ghost"
          aria-label="설정"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center mt-16 safe-area-top"
      >
        {/* 원동력 상기 배너 (고정된 원동력이 있을 때) */}
        {userId && (
          <FuelReminderBanner
            userId={userId}
            onFuelClick={(noteId) => onFuel(noteId)}
          />
        )}

        {/* 우선순위 상기 배너 */}
        {userId && (
          <PriorityReminderBanner
            userId={userId}
            onContactClick={onRelationshipInsights}
          />
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

        {!awakeningSentence && <div className="mb-8" />}

        {/* 안내 메시지 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-base-content/50 mt-8"
        >
          <p className="text-sm">
            {/* 웹: 좌측 사이드바, 모바일: 하단 탭 안내 */}
            <span className="hidden md:inline">왼쪽 메뉴에서 시작하세요</span>
            <span className="md:hidden">아래 탭에서 시작하세요</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
