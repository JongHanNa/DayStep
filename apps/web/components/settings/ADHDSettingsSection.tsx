'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Shield } from 'lucide-react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useAuth } from '@/app/context/AuthContext';
import AwakeningSentenceSetup from '@/components/adhd/AwakeningSentenceSetup';
import { FocusEnvironmentSetup } from '@/components/adhd/settings/FocusEnvironmentSetup';

/**
 * ADHD 모드 설정 섹션
 *
 * 설정 페이지에서 ADHD 모드를 관리합니다:
 * - 각성 문장 설정
 * - 집중 환경 설정
 */
export default function ADHDSettingsSection() {
  const { awakeningSentence, focusEnvironmentPrefs } = useADHDStore();
  const { user } = useAuth();
  const [showSentenceModal, setShowSentenceModal] = useState(false);
  const [showEnvSetupModal, setShowEnvSetupModal] = useState(false);

  const envItemCount = focusEnvironmentPrefs.selectedCheckItems.length;

  return (
    <>
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">집중 모드</h3>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {/* 각성 문장 설정 */}
          <button
            onClick={() => setShowSentenceModal(true)}
            className="w-full flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-sm font-semibold text-foreground">각성 문장</h4>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {awakeningSentence || '정리에 빠졌을 때 나를 깨워줄 문장'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* 집중 환경 설정 */}
          <button
            onClick={() => setShowEnvSetupModal(true)}
            className="w-full flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-sm font-semibold text-foreground">집중 환경 설정</h4>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {envItemCount > 0 ? `${envItemCount}개 체크리스트 설정됨` : '방해 요소 체크리스트 설정'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* ADHD 모드 설명 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-xs text-muted-foreground px-1"
        >
          정리 모드에서는 5분 타이머가 작동하여 과몰입을 방지합니다.
        </motion.p>
      </div>

      {/* 각성 문장 설정 모달 */}
      <AnimatePresence>
        {showSentenceModal && (
          <>
            {/* 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSentenceModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            />

            {/* 모달 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-base-100 rounded-2xl shadow-2xl z-[110] p-6"
            >
              <AwakeningSentenceSetup
                mode="edit"
                onClose={() => setShowSentenceModal(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 집중 환경 설정 모달 */}
      <AnimatePresence>
        {showEnvSetupModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEnvSetupModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-base-100 rounded-2xl shadow-2xl z-[110] p-6"
            >
              <FocusEnvironmentSetup
                userId={user?.id}
                onClose={() => setShowEnvSetupModal(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
