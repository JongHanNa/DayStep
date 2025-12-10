'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface RelationshipTagBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * 관계 할일 배지 컴포넌트
 * 할일 목록에서 관계 할일임을 표시
 */
export default function RelationshipTagBadge({
  size = 'sm',
  showLabel = false,
  className = '',
}: RelationshipTagBadgeProps) {
  const sizeConfig = {
    sm: { icon: 12, container: 'w-5 h-5', text: 'text-xs' },
    md: { icon: 14, container: 'w-6 h-6', text: 'text-sm' },
    lg: { icon: 16, container: 'w-7 h-7', text: 'text-base' },
  };

  const { icon, container, text } = sizeConfig[size];

  if (showLabel) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`
          flex items-center gap-1 px-2 py-0.5 rounded-full
          bg-pink-100 text-pink-600
          ${className}
        `}
      >
        <Heart size={icon} fill="currentColor" />
        <span className={`${text} font-medium`}>관계</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`
        ${container} rounded-full flex items-center justify-center
        bg-pink-500 text-white
        ${className}
      `}
      title="관계 할일"
    >
      <Heart size={icon} fill="currentColor" />
    </motion.div>
  );
}
