/**
 * SleepGoalScreen — 수면 목표 시간 설정 전체 화면
 * Phase 3: 스크린타임 토글 활성화 + 권한 요청
 */
import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, Pressable, Switch, Alert} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import {useNavigation} from '@react-navigation/native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {ChevronLeft, Moon, Sun, Bell, AlarmClock, Shield, XCircle} from 'lucide-react-native';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {useSleepStore} from '@/stores/sleepStore';
import {requestNotificationPermission} from '@/lib/notifications';
import {requestAuthorization} from '@/lib/screenTimeManager';
import {storage} from '@/lib/mmkv';
import {format} from 'date-fns';


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
    autoSleepEnabled,
    autoBlockAtBedtime,
    autoWakeEnabled,
    setSleepGoalTime,
    setWakeGoalTime,
    setAutoSleepEnabled,
    setAutoBlockAtBedtime,
    setAutoWakeEnabled,
  } = useSleepStore();

  const MMKV_SKIP_KEY = 'bedtime-skip-date';
  const today = format(new Date(), 'yyyy-MM-dd');
  const [isSkippedTonight, setIsSkippedTonight] = useState(
    () => storage.getString(MMKV_SKIP_KEY) === today,
  );

  const handleCancelSkip = useCallback(() => {
    haptic.light();
    storage.remove(MMKV_SKIP_KEY);
    setIsSkippedTonight(false);
  }, [haptic]);

  const [localSleepTime, setLocalSleepTime] = useState(timeStringToDate(sleepGoalTime));
  const [localWakeTime, setLocalWakeTime] = useState(timeStringToDate(wakeGoalTime));

  const goalText = calcGoalText(
    dateToTimeString(localSleepTime),
    dateToTimeString(localWakeTime),
  );

  const handleAutoSleepToggle = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('알림 권한 필요', '자동 취침 알림을 사용하려면 설정에서 알림 권한을 허용해주세요.');
        return;
      }
    }
    haptic.light();
    setAutoSleepEnabled(value);
  }, [haptic, setAutoSleepEnabled]);

  const handleAutoWakeToggle = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('알림 권한 필요', '자동 기상 알림을 사용하려면 설정에서 알림 권한을 허용해주세요.');
        return;
      }
    }
    haptic.light();
    setAutoWakeEnabled(value);
  }, [haptic, setAutoWakeEnabled]);

  const handleAutoBlockToggle = useCallback(async (value: boolean) => {
    if (value) {
      try {
        await requestAuthorization();
      } catch {
        // 시뮬레이터 등 ScreenTime 미지원 환경에서는 권한 요청 실패 무시
      }
    }
    haptic.light();
    setAutoBlockAtBedtime(value);
  }, [haptic, setAutoBlockAtBedtime]);

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

        {/* 자동 취침 알림 토글 */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Bell size={16} color="#6366F1" />
            <View>
              <Text style={styles.toggleLabel}>자동 취침 알림</Text>
              <Text style={styles.toggleDesc}>취침 시간에 알림을 보내드려요</Text>
            </View>
          </View>
          <Switch
            value={autoSleepEnabled}
            onValueChange={handleAutoSleepToggle}
            trackColor={{false: '#D1D5DB', true: '#A78BFA'}}
            thumbColor={autoSleepEnabled ? '#7C3AED' : '#F3F4F6'}
          />
        </View>

        {/* 자동 기상 알림 토글 */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <AlarmClock size={16} color="#F59E0B" />
            <View>
              <Text style={styles.toggleLabel}>자동 기상 알림</Text>
              <Text style={styles.toggleDesc}>기상 시간에 알림을 보내드려요</Text>
            </View>
          </View>
          <Switch
            value={autoWakeEnabled}
            onValueChange={handleAutoWakeToggle}
            trackColor={{false: '#D1D5DB', true: '#A78BFA'}}
            thumbColor={autoWakeEnabled ? '#7C3AED' : '#F3F4F6'}
          />
        </View>

        {/* 자동 잠들기 시작 (앱 차단) 토글 */}
        <View style={[styles.toggleRow, !autoSleepEnabled && styles.toggleRowDisabled]}>
          <View style={styles.toggleLeft}>
            <Shield size={16} color={autoSleepEnabled ? '#6366F1' : '#D1D5DB'} />
            <View>
              <Text style={[styles.toggleLabel, !autoSleepEnabled && styles.toggleLabelDisabled]}>
                자동 잠들기 시작
              </Text>
              <Text style={styles.toggleDesc}>취침 시간에 자동으로 다른 앱을 차단해요</Text>
            </View>
          </View>
          <Switch
            value={autoBlockAtBedtime}
            onValueChange={handleAutoBlockToggle}
            disabled={!autoSleepEnabled}
            trackColor={{false: '#D1D5DB', true: '#A78BFA'}}
            thumbColor={autoBlockAtBedtime ? '#7C3AED' : '#F3F4F6'}
          />
        </View>

        {/* 오늘 건너뛰기 상태 */}
        {autoSleepEnabled && isSkippedTonight && (
          <View style={styles.skipBanner}>
            <View style={styles.skipTextWrap}>
              <XCircle size={16} color="#F59E0B" />
              <Text style={styles.skipText}>오늘 취침 알림이 건너뛰기 되었습니다</Text>
            </View>
            <AnimatedPressable
              onPress={handleCancelSkip}
              haptic={false}
              scaleValue={0.95}
              style={styles.skipCancelBtn}>
              <Text style={styles.skipCancelText}>취소</Text>
            </AnimatedPressable>
          </View>
        )}

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
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  toggleRowDisabled: {
    opacity: 0.5,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  toggleLabelDisabled: {
    color: '#9CA3AF',
  },
  toggleDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  skipBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  skipTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#92400E',
    flex: 1,
  },
  skipCancelBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginLeft: 8,
  },
  skipCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
