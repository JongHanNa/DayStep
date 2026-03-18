/**
 * Reflection Panels
 * 보상 + 어제의 점검/회고/교훈(읽기전용) + 오늘의 점검/회고/교훈(편집가능)
 */
import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, TextInput, StyleSheet, ScrollView} from 'react-native';
import {subDays, format, parseISO} from 'date-fns';
import {useReflectionStore} from '@/stores/reflectionStore';
import {useAuthStore} from '@/stores/authStore';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';

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

  // 어제 날짜 계산
  const yesterdayDate = format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
  const yesterdayReflection = getReflection(yesterdayDate);

  const [reward, setReward] = useState('');
  const [todayLesson, setTodayLesson] = useState('');

  // 오늘 + 어제 데이터 로드
  useEffect(() => {
    if (user?.id) {
      loadReflection(user.id, selectedDate);
      loadReflection(user.id, yesterdayDate);
    }
  }, [user?.id, selectedDate, yesterdayDate]);

  useEffect(() => {
    if (reflection) {
      setReward(reflection.reward ?? '');
      setTodayLesson(reflection.today_lesson ?? '');
    }
  }, [reflection?.id]);

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
      {/* 보상 */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Text className="text-base font-semibold text-gray-800">
            오늘의 보상
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.08)}} className="rounded-2xl p-4">
          <TextInput
            value={reward}
            onChangeText={setReward}
            onFocus={handleInputFocus}
            onBlur={() => handleSave('reward', reward)}
            placeholder="오늘 하루 수고한 나에게 줄 보상은?"
            placeholderTextColor={hexWithOpacity(primaryColor, 0.4)}
            className="text-sm text-gray-800"
            style={styles.input}
            multiline
          />
        </View>
      </View>

      {/* 어제의 점검/회고/교훈 (읽기전용) */}
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Text className="text-base font-semibold text-gray-800">
            어제의 점검/회고/교훈
          </Text>
        </View>
        <View style={{backgroundColor: hexWithOpacity(primaryColor, 0.05)}} className="rounded-2xl p-4">
          <Text className="text-sm text-gray-600" style={styles.readonlyText}>
            {yesterdayReflection?.today_lesson
              ? yesterdayReflection.today_lesson
              : '아직 작성된 교훈이 없습니다'}
          </Text>
        </View>
      </View>

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
  readonlyText: {
    minHeight: 20,
    lineHeight: 20,
  },
});
