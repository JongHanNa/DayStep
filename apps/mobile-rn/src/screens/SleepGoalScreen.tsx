/**
 * SleepGoalScreen — 수면 목표 시간 설정 전체 화면
 * Phase 3: 스크린타임 토글 활성화 + 권한 요청
 */
import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import {useNavigation} from '@react-navigation/native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {ChevronLeft, Moon, Sun} from 'lucide-react-native';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {useSleepStore} from '@/stores/sleepStore';


function timeStringToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeString(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function calcGoalText(sleepTime: string, wakeTime: string): string {
  const [sh, sm] = sleepTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let sleepMins = sh * 60 + sm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= sleepMins) wakeMins += 24 * 60;
  const total = wakeMins - sleepMins;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
}

export default function SleepGoalScreen() {
  const navigation = useNavigation<any>();
  const {primaryColor} = useTheme();
  const haptic = useHaptic();

  const {
    sleepGoalTime,
    wakeGoalTime,
    setSleepGoalTime,
    setWakeGoalTime,
  } = useSleepStore();

  const [localSleepTime, setLocalSleepTime] = useState(timeStringToDate(sleepGoalTime));
  const [localWakeTime, setLocalWakeTime] = useState(timeStringToDate(wakeGoalTime));

  const goalText = calcGoalText(
    dateToTimeString(localSleepTime),
    dateToTimeString(localWakeTime),
  );

  const handleSave = useCallback(() => {
    haptic.medium();
    setSleepGoalTime(dateToTimeString(localSleepTime));
    setWakeGoalTime(dateToTimeString(localWakeTime));
    navigation.goBack();
  }, [localSleepTime, localWakeTime, setSleepGoalTime, setWakeGoalTime, haptic, navigation]);

  return (
    <ScreenContainer>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>수면 목표 설정</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* 취침 시간 */}
        <View style={styles.timeSection}>
          <View style={styles.timeLabelRow}>
            <Moon size={16} color="#6366F1" />
            <Text style={styles.timeLabel}>목표 취침 시간</Text>
          </View>
          <DateTimePicker
            value={localSleepTime}
            mode="time"
            display="spinner"
            onChange={(_: DateTimePickerEvent, date?: Date) => date && setLocalSleepTime(date)}
            style={styles.timePicker}
            locale="ko"
          />
        </View>

        {/* 기상 시간 */}
        <View style={styles.timeSection}>
          <View style={styles.timeLabelRow}>
            <Sun size={16} color="#F59E0B" />
            <Text style={styles.timeLabel}>목표 기상 시간</Text>
          </View>
          <DateTimePicker
            value={localWakeTime}
            mode="time"
            display="spinner"
            onChange={(_: DateTimePickerEvent, date?: Date) => date && setLocalWakeTime(date)}
            style={styles.timePicker}
            locale="ko"
          />
        </View>

        {/* 목표 수면 시간 뱃지 */}
        <View style={styles.goalBadge}>
          <Text style={[styles.goalText, {color: primaryColor}]}>
            목표 수면: {goalText}
          </Text>
        </View>

        {/* 저장 버튼 */}
        <AnimatedPressable
          onPress={handleSave}
          haptic={false}
          scaleValue={0.95}
          style={[styles.saveBtn, {backgroundColor: primaryColor}]}>
          <Text style={styles.saveBtnText}>저장하기</Text>
        </AnimatedPressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  timeSection: {
    marginBottom: 8,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  timePicker: {
    height: 150,
    marginTop: -8,
  },
  goalBadge: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 40,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
