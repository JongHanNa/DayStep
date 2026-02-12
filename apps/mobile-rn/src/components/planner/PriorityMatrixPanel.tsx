/**
 * Priority Matrix Panel
 * 아이젠하워 매트릭스: importance × urgency 2×2 그리드
 * todoStore에서 importance/urgency 필터링
 */
import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {Target, AlertTriangle, Clock, Coffee} from 'lucide-react-native';
import type {Todo} from '@daystep/shared-core';

interface QuadrantConfig {
  title: string;
  Icon: React.FC<any>;
  color: string;
  bgColor: string;
  filter: (todo: Todo) => boolean;
}

const QUADRANTS: QuadrantConfig[] = [
  {
    title: '긴급 + 중요',
    Icon: AlertTriangle,
    color: '#DC2626',
    bgColor: '#FEF2F2',
    filter: (t: any) => t.importance === true && t.urgency === true,
  },
  {
    title: '중요 (비긴급)',
    Icon: Target,
    color: '#2563EB',
    bgColor: '#EFF6FF',
    filter: (t: any) => t.importance === true && !t.urgency,
  },
  {
    title: '긴급 (비중요)',
    Icon: Clock,
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    filter: (t: any) => !t.importance && t.urgency === true,
  },
  {
    title: '나중에',
    Icon: Coffee,
    color: '#6B7280',
    bgColor: '#F9FAFB',
    filter: (t: any) => !t.importance && !t.urgency,
  },
];

export function PriorityMatrixPanel() {
  const {todos} = useTodoStore();
  const {primaryColor} = useTheme();

  const quadrantData = useMemo(() => {
    return QUADRANTS.map(q => ({
      ...q,
      items: todos.filter(t => !t.completed).filter(q.filter),
    }));
  }, [todos]);

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
          return (
            <View
              key={index}
              style={[styles.quadrant, {backgroundColor: q.bgColor}]}>
              <View className="flex-row items-center mb-2">
                <QIcon size={14} color={q.color} />
                <Text
                  className="text-xs font-semibold ml-1"
                  style={{color: q.color}}>
                  {q.title}
                </Text>
              </View>
              {q.items.length > 0 ? (
                q.items.slice(0, 3).map(todo => (
                  <Text
                    key={todo.id}
                    className="text-xs text-gray-600 mb-0.5"
                    numberOfLines={1}>
                    • {todo.title}
                  </Text>
                ))
              ) : (
                <Text className="text-xs text-gray-400">없음</Text>
              )}
              {q.items.length > 3 && (
                <Text className="text-xs text-gray-400 mt-0.5">
                  +{q.items.length - 3}개 더
                </Text>
              )}
            </View>
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
