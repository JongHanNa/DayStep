'use client';

import React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

interface ViewTransitionProps {
  children: React.ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
}

/** 기본 전환 애니메이션 variants */
export const defaultTransitionVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/** 페이드 전환 variants */
export const fadeTransitionVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** 스케일 전환 variants */
export const scaleTransitionVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

/**
 * 뷰 전환 래퍼 컴포넌트
 *
 * AnimatePresence와 함께 사용하여 뷰 전환 애니메이션을 제공합니다.
 */
export function ViewTransition({ children, mode = 'wait' }: ViewTransitionProps) {
  return (
    <AnimatePresence mode={mode}>
      {children}
    </AnimatePresence>
  );
}

interface AnimatedViewProps {
  children: React.ReactNode;
  viewKey: string;
  variants?: Variants;
  className?: string;
}

/**
 * 애니메이션 뷰 컴포넌트
 *
 * 개별 뷰에 적용할 motion wrapper입니다.
 */
export function AnimatedView({
  children,
  viewKey,
  variants = defaultTransitionVariants,
  className = '',
}: AnimatedViewProps) {
  return (
    <motion.div
      key={viewKey}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default ViewTransition;
