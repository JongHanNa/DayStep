'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Crown } from 'lucide-react';
import { motion, type PanInfo } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import {
  getUIGroupsForTableOfContents,
  type ADHDSubViewId,
} from '@/lib/constants/adhd-screens';
import { BannerView } from './screens/banner/components/BannerView';

const PEEK_AMOUNT = 40;
const GAP = 12;

/**
 * 홈 목차 화면
 *
 * UI_GROUPS 설정을 기반으로 목차 형태로 표시
 * 화면 이동 시 UI_GROUPS만 수정하면 목차가 자동으로 업데이트됨
 *
 * 모바일(md 미만): 2페이지 양방향 Peek 캐러셀
 *   - 페이지 0: 일상 관리 목차
 *   - 페이지 1: 마음 깨우기 (BannerView)
 *
 * 데스크탑(md 이상): 기존 목차만 표시
 */
export default function HomeTableOfContents() {
  const { user } = useAuth();
  const { goScreen, goRelationshipInsights, goFuel } = useADHDNavigation();

  // UI_GROUPS와 SCREEN_REGISTRY에서 목차 데이터 생성
  const groups = getUIGroupsForTableOfContents();

  // Mobile swipe state
  const [mobilePage, setMobilePage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const page1Width = containerWidth > 0 ? containerWidth - PEEK_AMOUNT : 0;
  const slideOffset = PEEK_AMOUNT - page1Width - GAP;

  const handleDragEndSwipe = useCallback((_: unknown, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && mobilePage === 0) {
      setMobilePage(1);
    } else if (info.offset.x > threshold && mobilePage === 1) {
      setMobilePage(0);
    }
  }, [mobilePage]);

  // 목차 콘텐츠
  const tocContent = (
    <div className="min-h-screen bg-base-100 px-4 py-6 sm:px-6 sm:py-8">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-base-content">
            일상 관리 목차
          </h1>
          <p className="text-sm text-base-content/60 mt-2">
            목차를 클릭하면 해당 페이지로 이동합니다
          </p>
        </header>

        {/* 목차 그룹 */}
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.id} className="space-y-2">
              {/* 그룹 제목 (클릭 불가) */}
              <div className="w-full text-left">
                <h2 className="text-lg font-semibold text-base-content">
                  [{group.title}]
                </h2>
                <div className="h-px bg-base-300 mt-1" />
              </div>

              {/* 서브아이템 목록 */}
              <ul className="pl-4 space-y-1">
                {group.subItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => goScreen(item.id as ADHDSubViewId)}
                      className="flex items-center gap-2 text-base-content/80 hover:text-primary transition-colors py-1"
                    >
                      <span className="text-base">{item.label}</span>
                      {item.isPro && (
                        <Crown className="w-4 h-4 text-warning" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );

  // 마음 깨우기 콘텐츠
  const bannerContent = user?.id ? (
    <div className="min-h-screen bg-base-100 px-4 py-6">
      <BannerView
        userId={user.id}
        onRelationshipInsights={() => goRelationshipInsights()}
        onFuel={() => goFuel('execute')}
      />
    </div>
  ) : null;

  return (
    <>
      {/* 모바일: 스와이프 캐러셀 */}
      <div className="md:hidden">
        {/* Dot indicator */}
        <div className="flex justify-center gap-2 pt-2 pb-1">
          {[0, 1].map(i => (
            <button
              key={i}
              onClick={() => setMobilePage(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                mobilePage === i ? 'bg-primary' : 'bg-base-content/20'
              }`}
            />
          ))}
        </div>

        <div className="overflow-hidden relative" ref={scrollContainerRef}>
          <motion.div
            drag="x"
            dragConstraints={{ left: slideOffset, right: 0 }}
            dragElastic={0.2}
            dragMomentum={false}
            onDragEnd={handleDragEndSwipe}
            animate={{ x: mobilePage === 0 ? 0 : slideOffset }}
            transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }}
            className="flex"
            style={{ gap: `${GAP}px` }}
          >
            <div className="flex-shrink-0" style={{ width: page1Width || '100%' }}>
              {tocContent}
            </div>
            <div className="flex-shrink-0" style={{ width: page1Width || '100%' }}>
              {bannerContent}
            </div>
          </motion.div>
        </div>
      </div>

      {/* 데스크탑: 목차 + 마음 깨우기 나란히 */}
      <div className="hidden md:flex gap-6 px-6 py-8">
        <div className="flex-1 max-w-lg">{tocContent}</div>
        <div className="flex-1 max-w-lg">{bannerContent}</div>
      </div>
    </>
  );
}
