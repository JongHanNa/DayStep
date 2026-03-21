/**
 * Popover
 * 범용 팝오버 — 앵커 기준 플로팅 카드, Modal transparent 사용
 * BottomSheetModal 위에 렌더되어 SchedulePanel 내에서 사용 가능
 */
import React from 'react';
import {
  Modal,
  Pressable,
  View,
  StyleSheet,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {shadows, radius} from '@/theme/tokens';

const CARD_MARGIN = 8;

interface PopoverProps {
  visible: boolean;
  onClose: () => void;
  anchorPosition: {x: number; y: number; width: number; height: number};
  children: React.ReactNode;
  width?: number;
  /** 'left': 앵커 왼쪽 정렬 (칩처럼 좌측 앵커에 적합) | 'right': 앵커 오른쪽 정렬 (기본) */
  horizontalAlign?: 'left' | 'right';
}

export function Popover({
  visible,
  onClose,
  anchorPosition,
  children,
  width = 200,
  horizontalAlign = 'right',
}: PopoverProps) {
  const {width: screenW, height: screenH} = useWindowDimensions();

  if (!visible) return null;

  // 항상 앵커 위에 표시
  const showAbove = true;

  const cardStyle: ViewStyle = {
    position: 'absolute',
    width,
    ...(horizontalAlign === 'left'
      ? {left: Math.min(anchorPosition.x, screenW - width - 8)}
      : {right: screenW - (anchorPosition.x + anchorPosition.width)}),
    ...(showAbove
      ? {bottom: screenH - anchorPosition.y + CARD_MARGIN}
      : {top: anchorPosition.y + anchorPosition.height + CARD_MARGIN}),
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      {/* 백드롭 — 반투명 오버레이 + 탭 시 닫기 */}
      <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.15)'}]} onPress={onClose} />
      {/* 카드 */}
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(100)}
        style={[popStyles.card, cardStyle]}>
        {children}
      </Animated.View>
    </Modal>
  );
}

const popStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.lg,
    overflow: 'hidden',
  },
});
