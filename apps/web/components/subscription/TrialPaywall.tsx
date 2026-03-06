'use client';

import { useState } from 'react';
import { X, Crown, Check, Sparkles } from 'lucide-react';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { PAYWALL_COMPARISON_FEATURES } from '@daystep/shared-core/constants';

interface TrialPaywallProps {
  onClose: () => void;
  onStartTrial: (plan: 'monthly' | 'yearly') => void;
}

/**
 * 트라이얼 Paywall (기능 비교 + 플랜 선택)
 * "더보기" 클릭 시 표시
 */
export function TrialPaywall({ onClose, onStartTrial }: TrialPaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl shadow-2xl scrollbar-hide">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>

        {/* 헤더 */}
        <div className="px-6 pt-10 pb-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/30">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">DayStep Pro</h2>
          <p className="text-sm text-slate-400">
            {FEATURE_FLAGS.TRIAL_DAYS}일 무료 체험으로 모든 기능을 경험하세요
          </p>
        </div>

        {/* 기능 비교 테이블 */}
        <div className="px-6 pb-6">
          <div className="bg-white/5 rounded-xl overflow-hidden">
            {/* 기능 행들 */}
            {PAYWALL_COMPARISON_FEATURES.map((feat, i) => (
              <div
                key={feat.name}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i % 2 === 0 ? 'bg-white/[0.02]' : ''
                }`}
              >
                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs text-slate-200 font-medium">{feat.proLabel}</span>
                  <p className="text-[10px] text-slate-500">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 플랜 선택 */}
        <div className="px-6 pb-4 space-y-3">
          {/* 월간 */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
              selectedPlan === 'monthly'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedPlan === 'monthly' ? 'border-amber-500' : 'border-slate-600'
            }`}>
              {selectedPlan === 'monthly' && (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">월간</span>
                <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  {FEATURE_FLAGS.TRIAL_DAYS}일 무료
                </span>
              </div>
              <span className="text-slate-400 text-xs">{FEATURE_FLAGS.PRO_MONTHLY_PRICE}/월</span>
            </div>
          </button>

          {/* 연간 */}
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
              selectedPlan === 'yearly'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedPlan === 'yearly' ? 'border-amber-500' : 'border-slate-600'
            }`}>
              {selectedPlan === 'yearly' && (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">연간</span>
                <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  {FEATURE_FLAGS.TRIAL_DAYS}일 무료
                </span>
                <span className="text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                  인기
                </span>
              </div>
              <span className="text-slate-400 text-xs">
                {FEATURE_FLAGS.PRO_YEARLY_PRICE}/년 · 월 ₩3,667 · {FEATURE_FLAGS.PRO_YEARLY_DISCOUNT_PERCENTAGE}% 할인
              </span>
            </div>
          </button>
        </div>

        {/* CTA 버튼 */}
        <div className="px-6 pb-4">
          <button
            onClick={() => onStartTrial(selectedPlan)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold text-base transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            {FEATURE_FLAGS.TRIAL_DAYS}일 무료 체험 시작
          </button>
        </div>

        {/* 면책 조항 */}
        <div className="px-6 pb-6">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            {FEATURE_FLAGS.TRIAL_DAYS}일 무료 체험 후 선택한 플랜의 요금이 자동으로 청구됩니다.
            체험 기간 중 언제든지 설정에서 취소할 수 있으며,
            취소 시 요금이 청구되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
