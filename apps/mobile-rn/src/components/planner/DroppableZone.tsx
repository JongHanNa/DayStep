/**
 * DroppableZone
 * 드롭 대상 영역 — onLayout으로 좌표 등록 + 활성 시 하이라이트
 * remeasureTrigger 구독: 페이지 전환 후 드롭존 좌표 재측정
 */
import React, {useCallback, useEffect, useRef} from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import {useDnd} from './DndContext';

interface DroppableZoneProps {
  id: string;
  type: 'matrix' | 'reluctant' | 'time-slot';
  data?: Record<string, any>;
  highlightColor?: string;
  children: React.ReactNode;
  style?: any;
}

export function DroppableZone({
  id,
  type,
  data,
  highlightColor = 'rgba(59, 130, 246, 0.08)',
  children,
  style,
}: DroppableZoneProps) {
  const {registerZone, unregisterZone, activeZoneId, dragState, remeasureTrigger} =
    useDnd();
  const viewRef = useRef<View>(null);
  const isActive = activeZoneId === id && dragState.isDragging;

  const borderOpacity = useSharedValue(0);
  const bgScale = useSharedValue(1);

  useEffect(() => {
    borderOpacity.value = withSpring(isActive ? 1 : 0, {damping: 20});
    bgScale.value = withSpring(isActive ? 1.02 : 1, {damping: 20});
  }, [isActive, borderOpacity, bgScale]);

  const measure = useCallback(() => {
    viewRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        registerZone({id, type, x, y, width, height, data});
      }
    });
  }, [id, type, data, registerZone]);

  const handleLayout = useCallback(() => {
    measure();
  }, [measure]);

  // 페이지 전환 후 드롭존 좌표 재측정
  useEffect(() => {
    if (remeasureTrigger > 0) {
      measure();
    }
  }, [remeasureTrigger, measure]);

  useEffect(() => {
    return () => unregisterZone(id);
  }, [id, unregisterZone]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderWidth: 2,
    borderColor: `rgba(59, 130, 246, ${borderOpacity.value * 0.5})`,
    borderStyle: 'dashed',
    transform: [{scale: bgScale.value}],
    backgroundColor: isActive ? highlightColor : 'transparent',
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <View ref={viewRef} onLayout={handleLayout} style={styles.inner}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
  },
});
