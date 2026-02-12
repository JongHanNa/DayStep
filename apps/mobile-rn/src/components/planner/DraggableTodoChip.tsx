/**
 * DraggableTodoChip
 * 롱프레스 → 드래그 가능한 할일 카드
 * Pan 제스처는 DndProvider(글로벌)에서 처리 → 페이지 전환에도 드래그 유지
 * 여기서는 LongPress만 처리하고 원본 카드는 제자리에서 흐려짐
 *
 * 핵심 방어: LongPress가 캐러셀 Pan과 충돌하여 onFinalize(success=false)가 올 수 있음.
 * isDraggingShared.value가 true인 동안은 Global Pan이 드래그 라이프사이클의 주인이므로,
 * LongPress.onFinalize에서 드래그를 취소하면 안 됨.
 */
import React, {useCallback, useRef} from 'react';
import {View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {useHaptic} from '@/hooks/useHaptic';
import {useDnd} from './DndContext';
import type {Todo} from '@daystep/shared-core';

interface DraggableTodoChipProps {
  todo: Todo;
  onDrop: (todo: Todo, zoneType: string, zoneData?: Record<string, any>) => void;
  children: React.ReactNode;
}

export function DraggableTodoChip({
  todo,
  onDrop,
  children,
}: DraggableTodoChipProps) {
  const {
    startDragWithLayout,
    endDrag,
    cancelDrag,
    globalPanRef,
    isDraggingShared,
    setDragEndCallback,
    setOnDropCallback,
  } = useDnd();
  const haptic = useHaptic();
  const viewRef = useRef<View>(null);

  const ghostOpacity = useSharedValue(1);

  const handleDragStart = useCallback(
    (absX: number, absY: number) => {
      haptic.medium();

      // 콜백 등록: Global Pan이 드래그를 끝낼 때 실행
      setDragEndCallback(() => {
        ghostOpacity.value = withTiming(1, {duration: 200});
      });
      setOnDropCallback((zone) => {
        if (zone) {
          haptic.success();
          onDrop(todo, zone.type, zone.data);
        } else {
          haptic.light();
        }
      });

      // measureInWindow로 카드 크기 측정 → startDragWithLayout
      viewRef.current?.measureInWindow((x, y, width, height) => {
        startDragWithLayout(todo, absX, absY, width, height);
      });
    },
    [todo, startDragWithLayout, haptic, onDrop, setDragEndCallback, setOnDropCallback, ghostOpacity],
  );

  const handleDragEnd = useCallback(() => {
    const zone = endDrag();
    if (zone) {
      haptic.success();
      onDrop(todo, zone.type, zone.data);
    } else {
      haptic.light();
    }
  }, [endDrag, todo, onDrop, haptic]);

  const handleDragCancel = useCallback(() => {
    cancelDrag();
  }, [cancelDrag]);

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .shouldCancelWhenOutside(false)
    .simultaneousWithExternalGesture(globalPanRef)
    .onStart(e => {
      isDraggingShared.value = true;
      ghostOpacity.value = withTiming(0.3, {duration: 150});
      runOnJS(handleDragStart)(e.absoluteX, e.absoluteY);
    })
    .onEnd(() => {
      // Global Pan이 이미 처리했으면 스킵
      if (isDraggingShared.value) {
        ghostOpacity.value = withTiming(1, {duration: 200});
        runOnJS(handleDragEnd)();
      }
    })
    .onFinalize((_e, success) => {
      // 핵심 가드: isDraggingShared가 true면 Global Pan이 아직 살아있음 → 취소하면 안 됨
      if (!success && !isDraggingShared.value) {
        ghostOpacity.value = withTiming(1, {duration: 200});
        runOnJS(handleDragCancel)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: ghostOpacity.value,
    transform: [
      {scale: ghostOpacity.value < 1 ? withSpring(0.95, {damping: 15}) : withSpring(1, {damping: 15})},
    ],
  }));

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View ref={viewRef} style={animatedStyle}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
