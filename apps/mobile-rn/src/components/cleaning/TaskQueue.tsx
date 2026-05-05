/**
 * TaskQueue — 다음 태스크 큐 (dimmed), 섹션 분리
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Check, Zap} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {FREQUENCY_LABELS} from '@/constants/cleaning-data';
import type {CleaningTask} from '@/constants/cleaning-data';

export interface TaskQueueSection {
  title: string;
  tasks: CleaningTask[];
}

interface TaskQueueProps {
  sections: TaskQueueSection[];
  onSelectTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export function TaskQueue({sections, onSelectTask, onCompleteTask}: TaskQueueProps) {
  const nonEmpty = sections.filter(s => s.tasks.length > 0);
  if (nonEmpty.length === 0) return null;

  let globalIndex = 0;

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{opacity: 0.5}}>
      {nonEmpty.map(section => (
        <View key={section.title}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#9CA3AF',
              marginTop: 8,
              marginBottom: 4,
              paddingHorizontal: 4,
            }}>
            {section.title}
          </Text>
          {section.tasks.map(task => {
            globalIndex++;
            const idx = globalIndex;
            return (
              <View key={task.id} style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 8}}>
                <AnimatedPressable
                  hapticType="light"
                  onPress={() => onCompleteTask(task.id)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: '#D1D5DB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Check size={10} color="#D1D5DB" strokeWidth={3} />
                </AnimatedPressable>
                <AnimatedPressable
                  hapticType="selection"
                  onPress={() => onSelectTask(task.id)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                  <Text style={{fontSize: 12, color: '#9CA3AF', width: 20, textAlign: 'right'}}>
                    {idx}.
                  </Text>
                  <Text style={{fontSize: 10, color: '#9CA3AF'}}>
                    {task.category}
                  </Text>
                  <Text style={{fontSize: 13, color: '#6B7280', flex: 1}} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text style={{fontSize: 11, color: '#9CA3AF'}}>
                    {FREQUENCY_LABELS[task.frequency]}
                  </Text>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
                    <Zap size={11} color="#9CA3AF" />
                    <Text style={{fontSize: 11, color: '#9CA3AF'}}>{task.energyCost}</Text>
                  </View>
                  <Text style={{fontSize: 11, color: '#9CA3AF'}}>
                    {task.estimatedMinutes}분
                  </Text>
                </AnimatedPressable>
              </View>
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
}
