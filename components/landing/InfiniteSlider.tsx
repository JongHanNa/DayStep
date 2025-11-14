'use client';

import { motion } from 'framer-motion';
import React, { ReactNode, useRef, useState } from 'react';

interface InfiniteSliderProps {
  /**
   * 슬라이더에 표시할 항목들
   */
  children: ReactNode;

  /**
   * 스크롤 속도 (초/사이클)
   * @default 20
   */
  duration?: number;

  /**
   * 스크롤 방향
   * @default 'left'
   */
  direction?: 'left' | 'right';

  /**
   * hover 시 일시정지 여부
   * @default true
   */
  pauseOnHover?: boolean;

  /**
   * 항목 사이 간격 (Tailwind 클래스)
   * @default 'gap-8'
   */
  gap?: string;

  /**
   * 복제 횟수 (매끄러운 무한 스크롤을 위해 항목을 몇 번 복제할지)
   * @default 6
   */
  duplicateCount?: number;
}

/**
 * 무한 가로 스크롤 컴포넌트
 * Structured.app 스타일의 매끄러운 무한 슬라이더
 *
 * @example
 * ```tsx
 * <InfiniteSlider duration={30} direction="left">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </InfiniteSlider>
 * ```
 */
export default function InfiniteSlider({
  children,
  duration = 20,
  direction = 'left',
  pauseOnHover = true,
  gap = 'gap-8',
  duplicateCount = 6,
}: InfiniteSliderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 무한 스크롤을 위해 개별 항목 복제
  const childrenArray = React.Children.toArray(children);
  const items = Array(duplicateCount).fill(childrenArray).flat();

  // 슬라이더 너비 계산 (복제된 항목들의 절반)
  const baseX = direction === 'left' ? 0 : 0;
  const targetX = direction === 'left' ? '-50%' : '50%';

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      onMouseEnter={() => pauseOnHover && setIsHovered(true)}
      onMouseLeave={() => pauseOnHover && setIsHovered(false)}
    >
      <motion.div
        className={`flex ${gap}`}
        initial={{ x: baseX }}
        animate={
          isHovered
            ? { x: undefined } // 호버 시 현재 위치에서 일시정지
            : {
                x: targetX, // 무한 루프: 계속 왼쪽으로 이동
                transition: {
                  repeat: Infinity,
                  repeatType: 'loop' as const,
                  duration,
                  ease: 'linear' as const,
                },
              }
        }
        style={{
          width: 'max-content',
        }}
      >
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {item}
          </React.Fragment>
        ))}
      </motion.div>

      {/* 페이드 그라디언트 (양쪽 끝) */}
      <div className="absolute top-0 left-0 bottom-0 w-20 bg-gradient-to-r from-base-200 to-transparent pointer-events-none z-10" />
      <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-l from-base-200 to-transparent pointer-events-none z-10" />
    </div>
  );
}
