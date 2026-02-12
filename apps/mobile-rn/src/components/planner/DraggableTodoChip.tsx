/**
 * DraggableTodoChip
 * 롱프레스 → 드래그 가능한 할일 칩
 * PanGestureHandler + Reanimated
 */
import React, {useCallback} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
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
  const {startDrag, updateDrag, endDrag, cancelDrag} = useDnd();
  const haptic = useHaptic();

  const isDragging = useSharedValue(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const ghostOpacity = useSharedValue(1);

  const handleDragStart = useCallback(
    (absX: number, absY: number) => {
      haptic.medium();
      startDrag(todo, absX, absY);
    },
    [todo, startDrag, haptic],
  );

  const handleDragUpdate = useCallback(
    (absX: number, absY: number) => {
      updateDrag(absX, absY);
    },
    [updateDrag],
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
    .onStart(e => {
      isDragging.value = true;
      startX.value = e.absoluteX;
      startY.value = e.absoluteY;
      translateX.value = 0;
      translateY.value = 0;
      ghostOpacity.value = withTiming(0.4, {duration: 150});
      runOnJS(handleDragStart)(e.absoluteX, e.absoluteY);
    });

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((e, state) => {
      if (isDragging.value) {
        state.activate();
      }
    })
    .onUpdate(e => {
      if (!isDragging.value) return;
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      runOnJS(handleDragUpdate)(e.absoluteX, e.absoluteY);
    })
    .onEnd(() => {
      if (!isDragging.value) return;
      isDragging.value = false;
      translateX.value = withSpring(0, {damping: 20});
      translateY.value = withSpring(0, {damping: 20});
      ghostOpacity.value = withTiming(1, {duration: 200});
      runOnJS(handleDragEnd)();
    })
    .onFinalize(() => {
      if (isDragging.value) {
        isDragging.value = false;
        translateX.value = withSpring(0, {damping: 20});
        translateY.value = withSpring(0, {damping: 20});
        ghostOpacity.value = withTiming(1, {duration: 200});
        runOnJS(handleDragCancel)();
      }
    });

  const composed = Gesture.Simultaneous(longPressGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: translateX.value},
      {translateY: translateY.value},
      {scale: isDragging.value ? withSpring(1.05, {damping: 15}) : withSpring(1, {damping: 15})},
    ],
    opacity: ghostOpacity.value,
    zIndex: isDragging.value ? 999 : 0,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
