/**
 * MissionCard — 오늘의 미션
 * 가장 중요한 미완료 할일을 하이라이트 + CTA
 */
import React, {useMemo} from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {Target, ArrowRight, CalendarPlus} from 'lucide-react-native';
import type {Todo} from '@daystep/shared-core';

interface MissionCardProps {
  todos: Todo[];
  onNavigateToExecute: () => void;
  onNavigateToPlanner: () => void;
  enterDelay?: number;
}

function pickTopMission(todos: Todo[]): Todo | null {
  const incomplete = todos.filter(t => !t.completed);
  if (incomplete.length === 0) return null;
  return incomplete.reduce((best, cur) => {
    const score = (t: Todo) =>
      ((t as any).importance ? 2 : 0) + ((t as any).urgency ? 1 : 0);
    return score(cur) > score(best) ? cur : best;
  });
}

function formatTimeRange(todo: Todo): string | null {
  if (!todo.start_time || !todo.end_time) return null;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const period = h < 12 ? '오전' : '오후';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${period} ${hour12}:${m}`;
  };
  return `${fmt(todo.start_time)} – ${fmt(todo.end_time)}`;
}

export function MissionCard({
  todos,
  onNavigateToExecute,
  onNavigateToPlanner,
  enterDelay = 0,
}: MissionCardProps) {
  const mission = useMemo(() => pickTopMission(todos), [todos]);

  return (
    <Animated.View
      entering={FadeInDown.delay(enterDelay).duration(400)}
      className="mx-4">
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}>
        <View className="flex-row items-center mb-3">
          <Target size={20} color="#3B82F6" />
          <Text className="text-base font-semibold text-gray-800 ml-2">
            오늘의 미션
          </Text>
        </View>

        {mission ? (
          <>
            <Text className="text-lg font-bold text-gray-900 mb-1">
              {mission.title}
            </Text>
            {formatTimeRange(mission) && (
              <Text className="text-sm text-gray-500 mb-3">
                {formatTimeRange(mission)}
              </Text>
            )}
            <AnimatedPressable
              onPress={onNavigateToExecute}
              hapticType="light"
              style={{borderRadius: 12}}>
              <View
                style={{
                  backgroundColor: '#3B82F6',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text className="text-white font-semibold text-sm mr-1">
                  지금 시작하기
                </Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </View>
            </AnimatedPressable>
          </>
        ) : (
          <>
            <Text className="text-sm text-gray-500 mb-3">
              오늘 할 일을 계획해보세요
            </Text>
            <AnimatedPressable
              onPress={onNavigateToPlanner}
              hapticType="light"
              style={{borderRadius: 12, overflow: 'hidden'}}>
              <View
                className="flex-row items-center justify-center py-3 px-4 rounded-xl"
                style={{backgroundColor: '#F3F4F6'}}>
                <CalendarPlus size={16} color="#6B7280" />
                <Text className="text-gray-600 font-semibold text-sm ml-1">
                  오늘 계획 세우기
                </Text>
              </View>
            </AnimatedPressable>
          </>
        )}
      </View>
    </Animated.View>
  );
}
