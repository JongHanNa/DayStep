'use client';

import { X, Crown, Sparkles } from 'lucide-react';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

interface TrialOfferModalProps {
  onClose: () => void;
  onStartTrial: () => void;
  onShowDetails: () => void;
}

/**
 * 7일 무료 체험 제안 모달 (첫 화면)
 * TickTick 스타일 — 다크 배경 + 그라디언트 CTA
 */
export function TrialOfferModal({ onClose, onStartTrial, onShowDetails }: TrialOfferModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl overflow-hidden shadow-2xl">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>

        {/* 상단 그라디언트 영역 */}
        <div className="relative px-6 pt-12 pb-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />
          <div className="relative">
            {/* 왕관 아이콘 */}
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
              <Crown className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              DayStep Pro
            </h2>
            <p className="text-lg text-amber-400 font-semibold mb-1">
              {FEATURE_FLAGS.TRIAL_DAYS}일 무료 체험
            </p>
            <p className="text-sm text-slate-400">
              모든 Pro 기능을 무료로 체험해보세요
            </p>
          </div>
        </div>

        {/* 가격 정보 */}
        <div className="px-6 pb-4">
          <div className="bg-white/5 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">월간 플랜</span>
              <span className="text-white font-medium">{FEATURE_FLAGS.PRO_MONTHLY_PRICE}/월</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">연간 플랜</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{FEATURE_FLAGS.PRO_YEARLY_PRICE}/년</span>
                <span className="text-xs text-amber-400 font-medium bg-amber-400/10 px-1.5 py-0.5 rounded">
                  {FEATURE_FLAGS.PRO_YEARLY_DISCOUNT_PERCENTAGE}% 할인
                </span>
              </div>
            </div>
          </div>

          {/* 더보기 링크 */}
          <button
            onClick={onShowDetails}
            className="w-full text-center mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            기능 비교 및 플랜 선택 &gt;
          </button>
        </div>

        {/* CTA 버튼 */}
        <div className="px-6 pb-4">
          <button
            onClick={onStartTrial}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold text-base transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            무료로 시도해보세요
          </button>
        </div>

        {/* 면책 조항 */}
        <div className="px-6 pb-6">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            {FEATURE_FLAGS.TRIAL_DAYS}일 무료 체험 후 자동으로 구독이 시작됩니다.
            체험 기간 중 언제든지 설정에서 취소할 수 있으며,
            취소 시 요금이 청구되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
