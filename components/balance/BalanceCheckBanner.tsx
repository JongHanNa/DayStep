'use client';

import React, { useEffect, useState } from 'react';
import { Heart, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RelationshipDetectorService } from '@/services/relationship-detector.service';

interface CompletedTodo {
  title: string;
  isRelationshipTask?: boolean | null;
}

interface BalanceCheckBannerProps {
  completedTodos: CompletedTodo[];
  onDismiss?: () => void;
  className?: string;
}

/**
 * 균형 체크 배너 컴포넌트
 * 완료된 할일 중 관계 할일 비율을 체크하고 메시지 표시
 */
export default function BalanceCheckBanner({
  completedTodos,
  onDismiss,
  className = '',
}: BalanceCheckBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  // 균형 체크
  const balance = RelationshipDetectorService.checkBalance(completedTodos);
  const message = RelationshipDetectorService.getBalanceMessage(balance.ratio);

  // 완료된 할일이 3개 이상일 때만 표시
  const shouldShow = balance.totalCount >= 3 && !hasBeenDismissed;

  useEffect(() => {
    if (shouldShow) {
      // 약간의 딜레이 후 표시 (완료 애니메이션 후)
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
    setIsVisible(false);
    return;
  }, [shouldShow]);

  const handleDismiss = () => {
    setIsVisible(false);
    setHasBeenDismissed(true);
    onDismiss?.();
  };

  // 칭찬 메시지는 자동으로 사라짐
  useEffect(() => {
    if (isVisible && message.type === 'praise') {
      const timer = setTimeout(handleDismiss, 5000);
      return () => clearTimeout(timer);
    }
    return;
  }, [isVisible, message.type]);

  const getBannerStyle = () => {
    switch (message.type) {
      case 'praise':
        return 'bg-gradient-to-r from-pink-100 to-purple-100 border-pink-300';
      case 'gentle-reminder':
        return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
      default:
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200';
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'praise':
        return <Sparkles className="w-5 h-5 text-pink-500" />;
      case 'gentle-reminder':
        return <Heart className="w-5 h-5 text-amber-500" />;
      default:
        return <Heart className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`
            relative p-4 rounded-xl border
            ${getBannerStyle()}
            ${className}
          `}
        >
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5"
          >
            <X className="w-4 h-4 text-base-content/40" />
          </button>

          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {getIcon()}
            </div>
            <div className="flex-1">
              <p className="text-sm text-base-content/80">
                {message.message}
              </p>
              {balance.totalCount > 0 && (
                <p className="text-xs text-base-content/50 mt-1">
                  오늘 완료한 {balance.totalCount}개 중 {balance.relationshipCount}개가 관계 할일
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
