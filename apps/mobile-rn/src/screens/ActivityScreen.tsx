/**
 * Activity Screen — 활동 살펴보기 [Pro]
 * 이번 주 완료 요약 + 요일별/시간대별 패턴
 */
import React, {useEffect, useState, useMemo} from 'react';
import {Text, View, ScrollView, TouchableOpacity} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import {ScreenContainer, AnimatedCard} from '@/components/core';
import {ChevronLeft, BarChart3, Clock, TrendingUp, Lock} from 'lucide-react-native';
import {useTodoStore} from '@/stores/todoStore';
import {useAuthStore} from '@/stores/authStore';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import {format, startOfWeek, endOfWeek, getDay, getHours, isWithinInterval} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {Todo} from '@daystep/shared-core';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function SimpleBarChart({data, maxValue}: {data: number[]; maxValue: number}) {
  return (
    <View className="flex-row items-end justify-between h-32 mt-2">
      {data.map((val, i) => {
        const height = maxValue > 0 ? (val / maxValue) * 100 : 0;
        return (
          <View key={i} className="items-center flex-1 mx-0.5">
            <Text className="text-xs text-gray-500 mb-1">{val}</Text>
            <View
              className="w-full rounded-t-md bg-blue-400"
              style={{height: `${Math.max(height, 4)}%`}}
            />
            <Text className="text-xs text-gray-400 mt-1">{DAY_LABELS[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

function HourlyChart({data}: {data: number[]}) {
  const max = Math.max(...data, 1);
  const peakHour = data.indexOf(max);

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
                className={`flex-1 rounded-sm items-center justify-center ${isPeak ? 'border border-blue-500' : ''}`}
                style={{backgroundColor: `rgba(59, 130, 246, ${opacity})`}}>
                <Text className="text-[8px] text-gray-600">{hour}</Text>
              </View>
            </View>
          );
        })}
      </View>
      {peakHour >= 0 && data[peakHour] > 0 && (
        <View className="flex-row items-center mt-3">
          <TrendingUp size={14} color="#3B82F6" />
          <Text className="text-sm text-blue-600 ml-1 font-medium">
            가장 생산적인 시간: {peakHour}시 ({data[peakHour]}개 완료)
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ActivityScreen() {
  const navigation = useNavigation();
  const user = useAuthStore(s => s.user);
  const {fetchAllTodos} = useTodoStore();
  const {hasActiveSubscription} = useSubscriptionStore();
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

  // Pro 가드
  if (!hasActiveSubscription) {
    return (
      <ScreenContainer gradient="warmBackground">
        <View className="px-4 pt-2 pb-4 flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center"
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <ChevronLeft size={24} color="#374151" />
            <Text className="text-lg font-bold text-gray-800 ml-1">
              활동 살펴보기
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Lock size={48} color="#9CA3AF" />
          <Text className="text-lg font-bold text-gray-700 mt-4">
            Pro 기능입니다
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-2 leading-5">
            활동 패턴과 생산성 분석은{'\n'}Pro 구독에서 이용할 수 있어요.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as never)}
            className="bg-blue-500 rounded-xl py-3 px-6 mt-6">
            <Text className="text-white font-semibold">구독 알아보기</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        {/* 뒤로가기 헤더 */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="px-4 pt-2 pb-4 flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center"
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <ChevronLeft size={24} color="#374151" />
            <Text className="text-lg font-bold text-gray-800 ml-1">
              활동 살펴보기
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* 이번 주 완료 요약 */}
        <View className="px-4 mb-4">
          <AnimatedCard enterDelay={100}>
            <View className="flex-row items-center mb-2">
              <BarChart3 size={20} color="#3B82F6" />
              <Text className="text-base font-semibold text-gray-800 ml-2">
                이번 주 완료
              </Text>
            </View>
            <Text className="text-4xl font-bold text-blue-600">
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
              <Clock size={18} color="#8B5CF6" />
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
  );
}
