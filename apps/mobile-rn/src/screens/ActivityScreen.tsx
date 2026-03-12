/**
 * Activity Screen — 활동 살펴보기 [Pro]
 * 이번 주 완료 요약 + 요일별/시간대별 패턴
 */
import React, {useEffect, useState, useMemo} from 'react';
import {Text, View, ScrollView} from 'react-native';
import {ScreenContainer, AnimatedCard} from '@/components/core';
import {BarChart3, Clock, TrendingUp} from 'lucide-react-native';
import {useTodoStore} from '@/stores/todoStore';
import {useAuthStore} from '@/stores/authStore';
import {ProScreenGuard} from '@/components/subscription/ProScreenGuard';
import {format, startOfWeek, endOfWeek, getDay, getHours, isWithinInterval} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {Todo} from '@daystep/shared-core';
import {useTheme} from '@/theme';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function SimpleBarChart({data, maxValue}: {data: number[]; maxValue: number}) {
  const {primaryColor} = useTheme();
  return (
    <View className="flex-row items-end justify-between h-32 mt-2">
      {data.map((val, i) => {
        const height = maxValue > 0 ? (val / maxValue) * 100 : 0;
        return (
          <View key={i} className="items-center flex-1 mx-0.5">
            <Text className="text-xs text-gray-500 mb-1">{val}</Text>
            <View
              className="w-full rounded-t-md"
              style={{backgroundColor: primaryColor, height: `${Math.max(height, 4)}%`}}
            />
            <Text className="text-xs text-gray-400 mt-1">{DAY_LABELS[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

function HourlyChart({data}: {data: number[]}) {
  const {primaryColor} = useTheme();
  const max = Math.max(...data, 1);
  const peakHour = data.indexOf(max);

  // Convert hex to rgba helper
  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return (
    <View>
      <View className="flex-row flex-wrap">
        {data.map((val, hour) => {
          const opacity = max > 0 ? Math.max(0.1, val / max) : 0.1;
          const isPeak = hour === peakHour && val > 0;
          return (
            <View
              key={hour}
              className={`w-[12.5%] aspect-square p-0.5`}>
              <View
                className={`flex-1 rounded-sm items-center justify-center`}
                style={{
                  backgroundColor: hexToRgba(primaryColor, opacity),
                  borderWidth: isPeak ? 1 : 0,
                  borderColor: isPeak ? primaryColor : 'transparent',
                }}>
                <Text className="text-[8px] text-gray-600">{hour}</Text>
              </View>
            </View>
          );
        })}
      </View>
      {peakHour >= 0 && data[peakHour] > 0 && (
        <View className="flex-row items-center mt-3">
          <TrendingUp size={14} color={primaryColor} />
          <Text className="text-sm ml-1 font-medium" style={{color: primaryColor}}>
            가장 생산적인 시간: {peakHour}시 ({data[peakHour]}개 완료)
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ActivityScreen() {
  const user = useAuthStore(s => s.user);
  const {primaryColor} = useTheme();
  const {fetchAllTodos} = useTodoStore();
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      fetchAllTodos(user.id, 30).then(todos => {
        setAllTodos(todos);
        setLoading(false);
      });
    }
  }, [user?.id]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, {weekStartsOn: 0});
    const weekEnd = endOfWeek(now, {weekStartsOn: 0});

    const completedThisWeek = allTodos.filter(
      t =>
        t.completed &&
        t.updated_at &&
        isWithinInterval(new Date(t.updated_at), {start: weekStart, end: weekEnd}),
    );

    // 요일별 완료 수
    const dailyCounts = [0, 0, 0, 0, 0, 0, 0];
    completedThisWeek.forEach(t => {
      const day = getDay(new Date(t.updated_at!));
      dailyCounts[day]++;
    });

    // 시간대별 완료 수
    const hourlyCounts = new Array(24).fill(0);
    allTodos
      .filter(t => t.completed && t.updated_at)
      .forEach(t => {
        const hour = getHours(new Date(t.updated_at!));
        hourlyCounts[hour]++;
      });

    return {
      completedCount: completedThisWeek.length,
      dailyCounts,
      hourlyCounts,
      maxDaily: Math.max(...dailyCounts),
    };
  }, [allTodos]);

  return (
    <ProScreenGuard screenId="activity">
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        {/* 이번 주 완료 요약 */}
        <View className="px-4 mb-4">
          <AnimatedCard enterDelay={100}>
            <View className="flex-row items-center mb-2">
              <BarChart3 size={20} color={primaryColor} />
              <Text className="text-base font-semibold text-gray-800 ml-2">
                이번 주 완료
              </Text>
            </View>
            <Text className="text-4xl font-bold" style={{color: primaryColor}}>
              {weeklyData.completedCount}
              <Text className="text-base font-normal text-gray-500"> 개</Text>
            </Text>
            {loading && (
              <Text className="text-xs text-gray-400 mt-1">로딩 중...</Text>
            )}
          </AnimatedCard>
        </View>

        {/* 요일별 완료 수 */}
        <View className="px-4 mb-4">
          <AnimatedCard enterDelay={200}>
            <Text className="text-base font-semibold text-gray-800 mb-1">
              요일별 완료 수
            </Text>
            <Text className="text-xs text-gray-400 mb-2">이번 주</Text>
            <SimpleBarChart
              data={weeklyData.dailyCounts}
              maxValue={weeklyData.maxDaily}
            />
          </AnimatedCard>
        </View>

        {/* 시간대별 생산성 패턴 */}
        <View className="px-4 mb-4">
          <AnimatedCard enterDelay={300}>
            <View className="flex-row items-center mb-2">
              <Clock size={18} color={primaryColor} />
              <Text className="text-base font-semibold text-gray-800 ml-2">
                시간대별 패턴
              </Text>
            </View>
            <Text className="text-xs text-gray-400 mb-2">
              최근 30일간 완료 시간 분포
            </Text>
            <HourlyChart data={weeklyData.hourlyCounts} />
          </AnimatedCard>
        </View>
      </ScrollView>
    </ScreenContainer>
    </ProScreenGuard>
  );
}
