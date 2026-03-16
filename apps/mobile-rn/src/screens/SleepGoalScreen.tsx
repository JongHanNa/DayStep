/**
 * SleepGoalScreen — 수면 목표 시간 설정 전체 화면
 * Phase 3: 스크린타임 토글 활성화 + 권한 요청
 */
import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, Switch, Pressable, Alert} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import {useNavigation} from '@react-navigation/native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {ChevronLeft, ChevronRight, Moon, Sun, Shield} from 'lucide-react-native';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {useSleepStore} from '@/stores/sleepStore';
import {requestAuthorization, isScreenTimeAvailable} from '@/lib/screenTimeManager';

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
    screenTimeLinkEnabled,
    setSleepGoalTime,
    setWakeGoalTime,
    setScreenTimeLinkEnabled,
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

  const handleScreenTimeToggle = useCallback(async (value: boolean) => {
    if (value) {
      // 토글 ON → 권한 요청
      const result = await requestAuthorization();
      if (result === 'approved') {
        setScreenTimeLinkEnabled(true);
        haptic.success();
        // 허용 앱 선택 화면으로 이동
        navigation.navigate('ScreenTimeApps');
      } else {
        // 거부 → 토글 OFF 유지
        Alert.alert(
          '권한 필요',
          '스크린타임 연동을 사용하려면 스크린타임 권한을 허용해주세요.\n설정 > 스크린타임에서 변경할 수 있습니다.',
        );
      }
    } else {
      // 토글 OFF
      setScreenTimeLinkEnabled(false);
      haptic.light();
    }
  }, [setScreenTimeLinkEnabled, navigation, haptic]);

  const screenTimeAvailable = isScreenTimeAvailable();

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

        {/* 스크린타임 연동 토글 */}
        <View style={styles.screenTimeRow}>
          <View style={styles.screenTimeLeft}>
            <Shield size={16} color={screenTimeLinkEnabled ? primaryColor : '#9CA3AF'} />
            <Text style={styles.screenTimeLabel}>스크린타임 연동</Text>
            {!screenTimeAvailable && (
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableBadgeText}>미지원</Text>
              </View>
            )}
          </View>
          <Switch
            value={screenTimeLinkEnabled}
            onValueChange={handleScreenTimeToggle}
            disabled={!screenTimeAvailable}
            trackColor={{false: '#E5E7EB', true: primaryColor}}
          />
        </View>

        {/* 허용 앱 설정 링크 (스크린타임 활성 시만) */}
        {screenTimeLinkEnabled && (
          <Pressable
            onPress={() => navigation.navigate('ScreenTimeApps')}
            style={styles.screenTimeLink}>
            <Text style={[styles.screenTimeLinkText, {color: primaryColor}]}>
              허용 앱 설정
            </Text>
            <ChevronRight size={16} color={primaryColor} />
          </Pressable>
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
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '700',
  },
  screenTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  screenTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTimeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  unavailableBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unavailableBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  screenTimeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  screenTimeLinkText: {
    fontSize: 15,
    fontWeight: '600',
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
