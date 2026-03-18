/**
 * Reflection Panels
 * 현재 기간 + 오늘의 다짐/결단 + 오늘의 기도(admin) + 오늘의 점검/회고/교훈
 */
import React, {useEffect, useRef, useState, useCallback} from 'react';
import {View, Text, TextInput, StyleSheet, ScrollView} from 'react-native';
import {useReflectionStore} from '@/stores/reflectionStore';
import {useAuthStore} from '@/stores/authStore';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {supabase} from '@/lib/supabase';

interface ReflectionPanelsProps {
  scrollViewRef?: React.RefObject<ScrollView>;
}

export function ReflectionPanels({scrollViewRef}: ReflectionPanelsProps) {
  const user = useAuthStore(s => s.user);
  const {selectedDate} = useTodoStore();
  const {getReflection, loadReflection, upsertReflection} =
    useReflectionStore();
  const {primaryColor} = useTheme();

  const reflection = getReflection(selectedDate);

  const [currentPeriod, setCurrentPeriod] = useState('');
  const [todayResolution, setTodayResolution] = useState('');
  const [todayPrayer, setTodayPrayer] = useState('');
  const [todayLesson, setTodayLesson] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const prevDateRef = useRef(selectedDate);

  // admin 확인
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({data}) => setIsAdmin(data?.role === 'admin'));
  }, [user?.id]);

  // 오늘 데이터 로드
  useEffect(() => {
    if (user?.id) {
      loadReflection(user.id, selectedDate);
    }
  }, [user?.id, selectedDate]);

  useEffect(() => {
    // 날짜 변경 시: 이전 날짜에 미저장 값 auto-save
    if (prevDateRef.current !== selectedDate && user?.id) {
      const prevDate = prevDateRef.current;
      const prevReflection = getReflection(prevDate);

      const periodChanged =
        currentPeriod !== (prevReflection?.current_period ?? '');
      const resolutionChanged =
        todayResolution !== (prevReflection?.today_resolution ?? '');
      const prayerChanged =
        todayPrayer !== (prevReflection?.today_prayer ?? '');
      const lessonChanged =
        todayLesson !== (prevReflection?.today_lesson ?? '');

      if (periodChanged || resolutionChanged || prayerChanged || lessonChanged) {
        const updates: Record<string, string> = {};
        if (periodChanged) updates.current_period = currentPeriod;
        if (resolutionChanged) updates.today_resolution = todayResolution;
        if (prayerChanged) updates.today_prayer = todayPrayer;
        if (lessonChanged) updates.today_lesson = todayLesson;
        upsertReflection(user.id, prevDate, updates);
      }

      prevDateRef.current = selectedDate;
    }

    // 현재 날짜 데이터로 리셋
    setCurrentPeriod(reflection?.current_period ?? '');
    setTodayResolution(reflection?.today_resolution ?? '');
    setTodayPrayer(reflection?.today_prayer ?? '');
    setTodayLesson(reflection?.today_lesson ?? '');
  }, [selectedDate, reflection?.id]);

  const handleSave = useCallback(
    (field: string, value: any) => {
      if (!user?.id) return;
      upsertReflection(user.id, selectedDate, {[field]: value});
    },
    [user?.id, selectedDate, upsertReflection],
  );

  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef?.current?.scrollToEnd({animated: true});
    }, 300);
  }, [scrollViewRef]);

  return (
    <View>
      {/* 현재 무슨 기간인지 상기해보기 */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Text className="text-base font-semibold text-gray-800">
            현재 무슨 기간인지 상기해보기
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.07)}} className="rounded-2xl p-4">
          <TextInput
            value={currentPeriod}
            onChangeText={setCurrentPeriod}
            onFocus={handleInputFocus}
            onBlur={() => handleSave('current_period', currentPeriod)}
            placeholder="지금은 어떤 기간인가요? (예: 시험기간, 프로젝트 마감 등)"
            placeholderTextColor={hexWithOpacity(primaryColor, 0.4)}
            className="text-sm text-gray-800"
            style={styles.input}
            multiline
          />
        </View>
      </View>

      {/* 오늘의 다짐/결단 (편집가능) */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Text className="text-base font-semibold text-gray-800">
            오늘의 다짐/결단
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.08)}} className="rounded-2xl p-4">
          <TextInput
            value={todayResolution}
            onChangeText={setTodayResolution}
            onFocus={handleInputFocus}
            onBlur={() => handleSave('today_resolution', todayResolution)}
            placeholder="오늘의 다짐과 결단을 적어보세요"
            placeholderTextColor={hexWithOpacity(primaryColor, 0.4)}
            className="text-sm text-gray-800"
            style={styles.input}
            multiline
          />
        </View>
      </View>

      {/* 오늘의 기도 (admin only) */}
      {isAdmin && (
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-base font-semibold text-gray-800">
              오늘의 기도(하나님과 대화)
            </Text>
          </View>
          <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.09)}} className="rounded-2xl p-4">
            <TextInput
              value={todayPrayer}
              onChangeText={setTodayPrayer}
              onFocus={handleInputFocus}
              onBlur={() => handleSave('today_prayer', todayPrayer)}
              placeholder="하나님과의 대화를 적어보세요"
              placeholderTextColor={hexWithOpacity(primaryColor, 0.4)}
              className="text-sm text-gray-800"
              style={styles.input}
              multiline
            />
          </View>
        </View>
      )}

      {/* 오늘의 점검/회고/교훈 (편집가능) */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Text className="text-base font-semibold text-gray-800">
            오늘의 점검/회고/교훈
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.06)}} className="rounded-2xl p-4">
          <TextInput
            value={todayLesson}
            onChangeText={setTodayLesson}
            onFocus={handleInputFocus}
            onBlur={() => handleSave('today_lesson', todayLesson)}
            placeholder="오늘 하루에서 배운 교훈을 적어보세요"
            placeholderTextColor={hexWithOpacity(primaryColor, 0.35)}
            className="text-sm text-gray-800"
            style={styles.input}
            multiline
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 40,
    textAlignVertical: 'top',
  },
});
