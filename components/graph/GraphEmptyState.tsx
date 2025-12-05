/**
 * GraphEmptyState - 그래프뷰 빈 상태 컴포넌트
 *
 * 앱의 계층 구조를 시각적으로 설명하고 추천 항목을 통해 빠른 시작 유도
 * 4가지 뷰 형태: 캐러셀, 아코디언, 그래프 프리뷰, 칩
 */

'use client';

import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { GraphFAB } from './GraphFAB';
import { GraphCreateModal } from './GraphCreateModal';
import {
  CarouselView,
  AccordionView,
  GraphPreviewView,
  ChipListView,
  ViewSwitcher,
  SelectedItemsBar,
  useViewSwipe,
  useBatchCreate,
  VIEW_TYPES,
  type EmptyStateViewType,
} from './empty-state';
import {
  APPLE_SPRING,
  VIEW_TRANSITION_3D,
} from '@/lib/animations/appleMotion';

export function GraphEmptyState() {
  // 뷰 스와이프 훅
  const {
    currentView,
    currentIndex,
    direction,
    goToView,
    handleDragEnd,
  } = useViewSwipe({
    views: VIEW_TYPES.map((v) => v.type),
    initialIndex: 0,
  });

  // 일괄 생성 훅
  const {
    selectedIds,
    toggleSelection,
    clearSelection,
    selectedCount,
    createSelected,
    isLoading,
    error,
    isSelected,
  } = useBatchCreate();

  // 현재 뷰에 따른 컴포넌트 렌더링
  const renderCurrentView = () => {
    const commonProps = {
      selectedIds,
      onToggleSelection: toggleSelection,
      isSelected,
    };

    switch (currentView) {
      case 'carousel':
        return <CarouselView {...commonProps} />;
      case 'accordion':
        return <AccordionView {...commonProps} />;
      case 'graph':
        return <GraphPreviewView {...commonProps} />;
      case 'chips':
        return <ChipListView {...commonProps} />;
      default:
        return <CarouselView {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-200 relative">
      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col items-center pt-8 px-4 pb-24 overflow-y-auto">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={APPLE_SPRING.smooth}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">시작하기</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">나의 그래프를 시작하세요</h1>
          <p className="text-base-content/60 text-sm max-w-xs mx-auto">
            추천 항목을 선택하여 나만의 생산성 시스템을 만들어보세요
          </p>
        </motion.div>

        {/* 뷰 스위처 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...APPLE_SPRING.smooth, delay: 0.2 }}
          className="mb-6"
        >
          <ViewSwitcher
            currentView={currentView}
            onViewChange={(view) => {
              const index = VIEW_TYPES.findIndex((v) => v.type === view);
              goToView(index);
            }}
          />
        </motion.div>

        {/* 뷰 컨테이너 (스와이프 가능) */}
        <motion.div
          className="w-full max-w-md mx-auto flex-1"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentView}
              custom={direction}
              variants={VIEW_TRANSITION_3D}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
              style={{ perspective: 1000 }}
            >
              {renderCurrentView()}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* 하단 안내 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-sm text-base-content/40 mt-6"
        >
          또는 오른쪽 하단의 + 버튼으로 직접 만들기
        </motion.p>
      </div>

      {/* 선택 항목 하단 바 */}
      <SelectedItemsBar
        selectedCount={selectedCount}
        isLoading={isLoading}
        error={error}
        onClear={clearSelection}
        onCreate={createSelected}
      />

      {/* FAB 버튼 */}
      <GraphFAB />
      <GraphCreateModal />
    </div>
  );
}

export default GraphEmptyState;
