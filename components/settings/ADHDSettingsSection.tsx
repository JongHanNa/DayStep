'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, ChevronRight } from 'lucide-react';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { useADHDStore } from '@/state/stores/adhdStore';
import AwakeningSentenceSetup from '@/components/adhd/AwakeningSentenceSetup';

/**
 * ADHD 모드 설정 섹션
 *
 * 설정 페이지에서 ADHD 모드를 관리합니다:
 * - ADHD 모드 활성화/비활성화 토글
 * - 각성 문장 설정
 */
export default function ADHDSettingsSection() {
  const { adhdModeEnabled, setAdhdModeEnabled } = useSettingsStore();
  const { awakeningSentence } = useADHDStore();
  const [showSentenceModal, setShowSentenceModal] = useState(false);

  return (
    <>
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">집중 모드</h3>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {/* ADHD 모드 토글 */}
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground">ADHD 모드</h4>
              <p className="text-xs text-muted-foreground">
                정리보다 실행에 집중하도록 도와줍니다
              </p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={adhdModeEnabled}
              onChange={(e) => setAdhdModeEnabled(e.target.checked)}
            />
          </div>

          {/* 각성 문장 설정 (ADHD 모드 활성화 시만 표시) */}
          <AnimatePresence>
            {adhdModeEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ADHD 모드 설명 */}
        {adhdModeEnabled && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-xs text-muted-foreground px-1"
          >
            앱 진입 시 &ldquo;실행하기&rdquo;와 &ldquo;정리하기&rdquo; 중 선택합니다.
            정리 모드에서는 5분 타이머가 작동하여 과몰입을 방지합니다.
          </motion.p>
        )}
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
    </>
  );
}
