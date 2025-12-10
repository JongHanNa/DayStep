'use client';

import React from 'react';
import { Heart, HeartOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RelationshipDetectorService } from '@/services/relationship-detector.service';

interface RelationshipTagToggleProps {
  isRelationshipTask: boolean;
  onChange: (value: boolean) => void;
  title?: string; // 제목 기반 자동 감지용
  showAutoDetectHint?: boolean;
  className?: string;
}

/**
 * 관계 태그 토글 컴포넌트
 * 할일 생성/편집 시 관계 할일 여부를 토글
 */
export default function RelationshipTagToggle({
  isRelationshipTask,
  onChange,
  title,
  showAutoDetectHint = true,
  className = '',
}: RelationshipTagToggleProps) {
  // 제목에서 관계 키워드 감지
  const detectedKeywords = title
    ? RelationshipDetectorService.findRelationshipKeywords(title)
    : [];
  const hasDetectedKeywords = detectedKeywords.length > 0;

  // 자동 감지된 키워드가 있고, 아직 토글되지 않은 경우 힌트 표시
  const shouldShowHint = showAutoDetectHint && hasDetectedKeywords && !isRelationshipTask;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(!isRelationshipTask)}
        className={`
          flex items-center gap-3 p-3 rounded-lg transition-all
          ${isRelationshipTask
            ? 'bg-pink-100 border-2 border-pink-300'
            : 'bg-base-200 border-2 border-transparent hover:border-base-300'
          }
        `}
      >
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center transition-colors
          ${isRelationshipTask ? 'bg-pink-500' : 'bg-base-300'}
        `}>
          {isRelationshipTask ? (
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          ) : (
            <HeartOff className="w-5 h-5 text-base-content/50" />
          )}
        </div>

        <div className="flex-1 text-left">
          <div className={`font-medium ${isRelationshipTask ? 'text-pink-700' : 'text-base-content'}`}>
            관계 할일
          </div>
          <div className="text-sm text-base-content/60">
            {isRelationshipTask
              ? '소중한 사람과 관련된 할일이에요'
              : '관계에 시간을 쓰는 할일로 표시하기'
            }
          </div>
        </div>

        <div className={`
          w-12 h-6 rounded-full p-1 transition-colors
          ${isRelationshipTask ? 'bg-pink-500' : 'bg-base-300'}
        `}>
          <motion.div
            className="w-4 h-4 rounded-full bg-white shadow"
            animate={{ x: isRelationshipTask ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
      </button>

      {/* 자동 감지 힌트 */}
      <AnimatePresence>
        {shouldShowHint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 rounded-lg bg-pink-50 border border-pink-200"
          >
            <p className="text-sm text-pink-700">
              💡 &quot;{detectedKeywords[0]}&quot; 키워드가 감지되었어요.
              <button
                type="button"
                onClick={() => onChange(true)}
                className="ml-1 underline font-medium hover:text-pink-900"
              >
                관계 할일로 설정할까요?
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
