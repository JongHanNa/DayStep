'use client';

import { motion, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useState, useRef, MouseEvent, TouchEvent, PointerEvent } from 'react';

interface SwipeableCardProps {
  // 필수
  itemId: string;
  onDelete: (itemId: string) => void;
  children: React.ReactNode;

  // 스와이프 제어
  disabled?: boolean; // 기본: false (편집 모드 시 true)
  swipedItemId?: string | null; // 부모 상태 연동 (옵션)
  onSwipe?: (itemId: string | null) => void; // 부모 상태 setter

  // 커스터마이징
  deleteButtonContent?: React.ReactNode; // 기본: <Trash2 />
  onClick?: (itemId: string) => void; // 카드 클릭 핸들러

  // 고급 설정 (기본값 제공)
  threshold?: number; // 기본: -1px (초민감)
  velocityThreshold?: number; // 기본: -50
  backgroundWidth?: number; // 기본: 85px
}

export default function SwipeableCard({
  itemId,
  onDelete,
  children,
  disabled = false,
  swipedItemId: externalSwipedItemId,
  onSwipe: externalOnSwipe,
  deleteButtonContent,
  onClick,
  threshold = -1,
  velocityThreshold = -50,
  backgroundWidth = 85,
}: SwipeableCardProps) {
  // 내부 상태 OR 외부 상태 자동 선택
  const [internalSwipedItemId, setInternalSwipedItemId] = useState<
    string | null
  >(null);

  const isControlled =
    externalSwipedItemId !== undefined && externalOnSwipe !== undefined;
  const swipedItemId = isControlled
    ? externalSwipedItemId
    : internalSwipedItemId;
  const setSwipedItemId = isControlled
    ? externalOnSwipe
    : setInternalSwipedItemId;

  const dragStartX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // 드래그 시작 핸들러
  const handleDragStart = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    dragStartX.current = info.point.x;
    isDragging.current = true;
  };

  // 스와이프 핸들러 (카드 열기/닫기)
  const handleSwipe = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const dragDistance = Math.abs(info.point.x - dragStartX.current);

    if (dragDistance > 1) {
      // 1px 이상 드래그 → 실제 스와이프로 판단 (초민감)
      const distanceThreshold = threshold; // 방향 기준: 1px만 왼쪽으로 드래그
      const vThreshold = velocityThreshold; // 속도 기준: 매우 낮은 속도

      // 조금이라도 왼쪽으로 움직이면 자동으로 완전히 열림
      const shouldOpen =
        info.offset.x < distanceThreshold || info.velocity.x < vThreshold;

      if (shouldOpen) {
        // 카드 열기 (휴지통 버튼 노출)
        setSwipedItemId(itemId);
      } else {
        // 카드 닫기
        setSwipedItemId(null);
      }
    } else {
      // 1px 미만 드래그 → 클릭으로 간주
      isDragging.current = false;
    }
  };

  // 삭제 버튼 클릭 핸들러
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(itemId);
    setSwipedItemId(null);
  };

  // 카드 클릭 핸들러
  const handleCardClick = () => {
    // 드래그 직후에는 클릭 무시
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }

    if (onClick) {
      onClick(itemId);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* 배경 레이어: 삭제 버튼 */}
      {!disabled && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end bg-error"
          style={{ width: `${backgroundWidth}px` }}
        >
          <button
            onClick={handleDeleteClick}
            className="btn btn-circle btn-ghost mr-2"
          >
            {deleteButtonContent || (
              <Trash2 className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      )}

      {/* 카드 레이어 */}
      <motion.div
        className="relative bg-base-100 hover:bg-base-300 transition-colors cursor-pointer w-full"
        style={{
          borderTopLeftRadius: '0.5rem',
          borderBottomLeftRadius: '0.5rem',
        }}
        // 일반 모드에서만 드래그 활성화
        drag={!disabled ? 'x' : false}
        dragConstraints={{ left: -backgroundWidth, right: 0 }}
        dragElastic={0.2}
        dragMomentum={false}
        onDragStart={!disabled ? (handleDragStart as any) : undefined}
        onDragEnd={!disabled ? (handleSwipe as any) : undefined}
        animate={{
          x: swipedItemId === itemId ? -backgroundWidth : 0,
          borderTopRightRadius: swipedItemId === itemId ? 0 : '0.5rem',
          borderBottomRightRadius: swipedItemId === itemId ? 0 : '0.5rem',
        }}
        transition={{
          type: 'spring',
          stiffness: 500, // 더욱 빠른 반응
          damping: 40, // 더 안정적
          mass: 0.6, // 더 가볍게
        }}
        onClick={handleCardClick}
      >
        {children}
      </motion.div>
    </div>
  );
}
