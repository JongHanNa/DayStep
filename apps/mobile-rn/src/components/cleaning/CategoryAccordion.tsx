/**
 * CategoryAccordion — 카테고리별 접이식 태스크 목록
 * Phase 1: Reanimated 높이 애니메이션
 */
import React, {useState, useCallback} from 'react';
import {View, Text} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import {ChevronRight} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {TaskCheckItem} from './TaskCheckItem';
import {timings} from '@/theme/animations';
import type {CleaningTask} from '@/constants/cleaning-data';

interface CategoryAccordionProps {
  category: string;
  tasks: CleaningTask[];
  completedCount: number;
  totalCount: number;
  isTaskCompleted: (taskId: string) => boolean;
  onToggleTask: (taskId: string) => void;
  defaultOpen?: boolean;
  enterDelay?: number;
}

export function CategoryAccordion({
  category,
  tasks,
  completedCount,
  totalCount,
  isTaskCompleted,
  onToggleTask,
  defaultOpen = false,
  enterDelay = 0,
}: CategoryAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const rotation = useSharedValue(defaultOpen ? 90 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}],
  }));

  const handleToggle = useCallback(() => {
    const next = !isOpen;
    setIsOpen(next);
    rotation.value = withTiming(next ? 90 : 0, timings.fast);
  }, [isOpen, rotation]);

  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
      {/* 헤더 */}
      <AnimatedPressable
        hapticType="selection"
        onPress={handleToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 12,
          gap: 8,
        }}>
        <Animated.View style={chevronStyle}>
          <ChevronRight size={16} color="#6B7280" />
        </Animated.View>
        <Text style={{flex: 1, fontSize: 14, fontWeight: '600', color: '#374151'}}>
          {category}
        </Text>
        <Text style={{fontSize: 12, color: '#9CA3AF'}}>
          {completedCount}/{totalCount}
        </Text>
      </AnimatedPressable>

      {/* 태스크 목록 */}
      {isOpen && (
        <View style={{paddingLeft: 8}}>
          {tasks.map(task => (
            <TaskCheckItem
              key={task.id}
              task={task}
              isCompleted={isTaskCompleted(task.id)}
              onToggle={() => onToggleTask(task.id)}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}
