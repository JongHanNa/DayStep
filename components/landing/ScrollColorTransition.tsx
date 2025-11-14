'use client';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * 스크롤 기반 배경색 전환 컴포넌트
 * Structured.app 스타일의 부드러운 색상 전환 효과
 *
 * 색상 구성:
 * - 섹션 1: 스카이블루 (#A7C5E4) - 밝음
 * - 섹션 2: 네이비 (#344F70) - 어두움 (조명 꺼짐)
 * - 섹션 3: 세이지 (#428366) - 중간
 * - 섹션 4: 아이보리 (#E8E4D9) - 밝음 (조명 켜짐)
 */
export default function ScrollColorTransition() {
  const [isMounted, setIsMounted] = useState(false);

  // 컴포넌트 마운트 확인 (hydration 이슈 방지)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 페이지 전체 스크롤 진행률 추적
  const { scrollYProgress } = useScroll();

  // 부드러운 스프링 애니메이션 적용
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // 4개 색상의 RGB 값 정의
  const colors = [
    { r: 167, g: 197, b: 228 }, // #A7C5E4 - 스카이블루
    { r: 52, g: 79, b: 112 },   // #344F70 - 네이비
    { r: 66, g: 131, b: 102 },  // #428366 - 세이지
    { r: 232, g: 228, b: 217 }  // #E8E4D9 - 아이보리
  ];

  // 스크롤 진행률에 따라 RGB 각 채널 보간
  const r = useTransform(
    smoothProgress,
    [0, 0.33, 0.66, 1],
    [colors[0].r, colors[1].r, colors[2].r, colors[3].r]
  );

  const g = useTransform(
    smoothProgress,
    [0, 0.33, 0.66, 1],
    [colors[0].g, colors[1].g, colors[2].g, colors[3].g]
  );

  const b = useTransform(
    smoothProgress,
    [0, 0.33, 0.66, 1],
    [colors[0].b, colors[1].b, colors[2].b, colors[3].b]
  );

  // RGB 값을 결합하여 최종 배경색 생성
  const backgroundColor = useTransform(
    [r, g, b],
    ([rValue, gValue, bValue]: number[]) => {
      return `rgb(${Math.round(rValue)}, ${Math.round(gValue)}, ${Math.round(bValue)})`;
    }
  );

  // prefers-reduced-motion 감지
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 마운트 전에는 렌더링하지 않음 (hydration 이슈 방지)
  if (!isMounted) {
    return null;
  }

  // reduced motion이 활성화된 경우 정적 배경색
  if (prefersReducedMotion) {
    return (
      <div
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: `rgb(${colors[0].r}, ${colors[0].g}, ${colors[0].b})` }}
      />
    );
  }

  return (
    <motion.div
      className="fixed inset-0 -z-10"
      style={{
        backgroundColor,
        willChange: 'background-color'
      }}
    />
  );
}
