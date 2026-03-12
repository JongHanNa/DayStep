/**
 * Priority Matrix Panel
 * 아이젠하워 매트릭스: importance × urgency 2×2 그리드
 * todoStore에서 importance/urgency 필터링
 * "+" 추가 + 탭 해제 기능
 */
import React, {useMemo, useCallback} from 'react';
import {View, Text, StyleSheet, Alert} from 'react-native';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {Target, AlertTriangle, Clock, Coffee, Plus} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {DroppableZone} from './DroppableZone';
import {hexWithOpacity} from '@/lib/todoUtils';
import type {Todo} from '@daystep/shared-core';

interface QuadrantConfig {
  title: string;
  Icon: React.FC<any>;
  importance: boolean;
  urgency: boolean;
  /** 메인컬러 대비 opacity (색상은 런타임에 primaryColor 기반 생성) */
  colorOpacity: number;
  bgOpacity: number;
  filter: (todo: Todo) => boolean;
}

const QUADRANTS: QuadrantConfig[] = [
  {
    title: '중요O 긴급O',
    Icon: AlertTriangle,
    colorOpacity: 1,
    bgOpacity: 0.1,
    importance: true,
    urgency: true,
    filter: (t: any) => t.importance === true && t.urgency === true,
  },
  {
    title: '중요O 긴급X',
    Icon: Target,
    colorOpacity: 0.7,
    bgOpacity: 0.08,
    importance: true,
    urgency: false,
    filter: (t: any) => t.importance === true && t.urgency === false,
  },
  {
    title: '중요X 긴급O',
    Icon: Clock,
    colorOpacity: 0.5,
    bgOpacity: 0.05,
    importance: false,
    urgency: true,
    filter: (t: any) => t.importance === false && t.urgency === true,
  },
  {
    title: '중요X 긴급X',
    Icon: Coffee,
    colorOpacity: 0,
    bgOpacity: 0,
    importance: false,
    urgency: false,
    filter: (t: any) => t.importance === false && t.urgency === false,
  },
];

interface PriorityMatrixPanelProps {
  onAddPress?: (importance: boolean, urgency: boolean) => void;
}

export function PriorityMatrixPanel({onAddPress}: PriorityMatrixPanelProps) {
  const {todos, updateTodo} = useTodoStore();
  const {primaryColor} = useTheme();

  const quadrantData = useMemo(() => {
    return QUADRANTS.map(q => ({
      ...q,
      items: todos.filter(t => !t.completed).filter(q.filter),
    }));
  }, [todos]);

  const handleRemoveFromMatrix = useCallback(
    (todo: Todo) => {
      Alert.alert(
        '매트릭스에서 해제',
        `"${todo.title}"을(를) 매트릭스에서 해제할까요?`,
        [
          {text: '취소', style: 'cancel'},
          {
            text: '해제',
            style: 'destructive',
            onPress: () =>
              updateTodo(todo.id, {importance: null, urgency: null} as any),
          },
        ],
      );
    },
    [updateTodo],
  );

  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-3">
        <Target size={18} color={primaryColor} />
        <Text className="text-base font-semibold text-gray-800 ml-2">
          우선순위 매트릭스
        </Text>
      </View>
      <View style={styles.grid}>
        {quadrantData.map((q, index) => {
          const QIcon = q.Icon;
          const isGray = q.colorOpacity === 0;
          const qColor = isGray ? '#9CA3AF' : hexWithOpacity(primaryColor, q.colorOpacity);
          const qBgColor = isGray ? '#F9FAFB' : hexWithOpacity(primaryColor, q.bgOpacity);
          return (
            <DroppableZone
              key={index}
              id={`matrix-${index}`}
              type="matrix"
              data={{importance: q.importance, urgency: q.urgency}}
              highlightColor={qBgColor}
              style={[styles.quadrant, {backgroundColor: qBgColor}]}>
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <QIcon size={14} color={qColor} />
                  <Text
                    className="text-xs font-semibold ml-1"
                    style={{color: qColor}}>
                    {q.title}
                  </Text>
                </View>
                {onAddPress && (
                  <AnimatedPressable
                    onPress={() => onAddPress(q.importance, q.urgency)}
                    hapticType="light"
                    scaleValue={0.85}>
                    <Plus size={16} color={qColor} />
                  </AnimatedPressable>
                )}
              </View>
              {q.items.length > 0 ? (
                q.items.slice(0, 3).map(todo => (
                  <AnimatedPressable
                    key={todo.id}
                    onPress={() => handleRemoveFromMatrix(todo)}
                    hapticType="light">
                    <Text
                      className="text-xs text-gray-600 mb-0.5"
                      numberOfLines={1}>
                      • {todo.title}
                    </Text>
                  </AnimatedPressable>
                ))
              ) : (
                <Text className="text-xs text-gray-400">없음</Text>
              )}
              {q.items.length > 3 && (
                <Text className="text-xs text-gray-400 mt-0.5">
                  +{q.items.length - 3}개 더
                </Text>
              )}
            </DroppableZone>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quadrant: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
  },
});
