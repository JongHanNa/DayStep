/**
 * SleepGoalBottomSheet — 수면 목표 시간 설정 바텀시트
 * forwardRef + useImperativeHandle (SleepInputBottomSheet 패턴)
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {View, Text, StyleSheet, Switch} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetScrollView} from '@gorhom/bottom-sheet';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {Moon, Sun, Shield} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {useSleepStore} from '@/stores/sleepStore';

export interface SleepGoalBottomSheetRef {
  open: () => void;
  close: () => void;
}

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

export const SleepGoalBottomSheet = forwardRef<SleepGoalBottomSheetRef>(
  (_, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['60%'], []);
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

    useImperativeHandle(ref, () => ({
      open: () => {
        setLocalSleepTime(timeStringToDate(sleepGoalTime));
        setLocalWakeTime(timeStringToDate(wakeGoalTime));
        sheetRef.current?.expand();
      },
      close: () => {
        sheetRef.current?.close();
      },
    }));

    const goalText = calcGoalText(
      dateToTimeString(localSleepTime),
      dateToTimeString(localWakeTime),
    );

    const handleSave = useCallback(() => {
      haptic.medium();
      setSleepGoalTime(dateToTimeString(localSleepTime));
      setWakeGoalTime(dateToTimeString(localWakeTime));
      sheetRef.current?.close();
    }, [localSleepTime, localWakeTime, setSleepGoalTime, setWakeGoalTime, haptic]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />
      ),
      [],
    );

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{backgroundColor: '#D1D5DB'}}>
        <BottomSheetScrollView style={styles.container}>
          {/* 헤더 */}
          <View style={styles.titleRow}>
            <Moon size={18} color="#1F2937" />
            <Text style={styles.title}>수면 목표 설정</Text>
          </View>

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
              <Shield size={16} color="#9CA3AF" />
              <Text style={styles.screenTimeLabel}>스크린타임 연동</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>준비 중</Text>
              </View>
            </View>
            <Switch
              value={screenTimeLinkEnabled}
              onValueChange={setScreenTimeLinkEnabled}
              disabled
              trackColor={{false: '#E5E7EB', true: primaryColor}}
            />
          </View>

          {/* 저장 버튼 */}
          <AnimatedPressable
            onPress={handleSave}
            haptic={false}
            scaleValue={0.95}
            style={[styles.saveBtn, {backgroundColor: primaryColor}]}>
            <Text style={styles.saveBtnText}>저장하기</Text>
          </AnimatedPressable>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
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
    height: 120,
    marginTop: -8,
  },
  goalBadge: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 20,
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
    marginBottom: 20,
  },
  screenTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTimeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  comingSoonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
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
