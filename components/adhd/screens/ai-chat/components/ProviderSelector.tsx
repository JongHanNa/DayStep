'use client';

import { motion } from 'framer-motion';
import { Check, Crown, X } from 'lucide-react';
import type { AIProvider } from '@/state/stores/aiPlanningStore';

interface ProviderSelectorProps {
  currentProvider: AIProvider;
  onSelect: (provider: AIProvider) => void;
  isPro: boolean;
  onClose: () => void;
}

/**
 * AI 프로바이더 선택 드롭다운
 */
export default function ProviderSelector({
  currentProvider,
  onSelect,
  isPro,
  onClose,
}: ProviderSelectorProps) {
  const providers: Array<{
    id: AIProvider;
    name: string;
    description: string;
    requiresPro: boolean;
  }> = [
    // {
    //   id: 'claude',
    //   name: 'Claude',
    //   description: 'Anthropic - 최고 품질',
    //   requiresPro: true,
    // },
    // {
    //   id: 'openai',
    //   name: 'GPT-4o',
    //   description: 'OpenAI - 균형잡힌 성능',
    //   requiresPro: false,
    // },
    {
      id: 'groq',
      name: 'Llama 3.3',
      description: 'Groq - 빠른 응답',
      requiresPro: false,
    },
    // {
    //   id: 'gemini',
    //   name: 'Gemini',
    //   description: 'Google - 테스트용',
    //   requiresPro: false,
    // },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute right-4 top-14 z-50 w-64 bg-base-100 rounded-xl shadow-lg border border-base-300 overflow-hidden"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 bg-base-200 border-b border-base-300">
        <span className="text-sm font-medium">AI 모델 선택</span>
        <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 프로바이더 목록 */}
      <div className="p-2 space-y-1">
        {providers.map((provider) => {
          const isSelected = currentProvider === provider.id;
          const isDisabled = provider.requiresPro && !isPro;

          return (
            <button
              key={provider.id}
              onClick={() => !isDisabled && onSelect(provider.id)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                isSelected
                  ? 'bg-primary/10 border border-primary/30'
                  : isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-base-200'
              }`}
            >
              {/* 선택 인디케이터 */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-base-300'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-primary-content" />}
              </div>

              {/* 프로바이더 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm">{provider.name}</span>
                  {provider.requiresPro && (
                    <Crown className="w-3 h-3 text-primary" />
                  )}
                </div>
                <p className="text-xs text-base-content/50 truncate">
                  {provider.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pro 안내 - Claude 선택지 숨김으로 임시 비활성화 */}
      {/* {!isPro && (
        <div className="px-3 py-2 bg-primary/5 border-t border-primary/10">
          <p className="text-xs text-primary">
            <Crown className="w-3 h-3 inline mr-1" />
            Pro로 업그레이드하면 Claude를 사용할 수 있어요
          </p>
        </div>
      )} */}
    </motion.div>
  );
}
