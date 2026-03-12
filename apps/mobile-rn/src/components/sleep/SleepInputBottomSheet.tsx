/**
 * SleepInputBottomSheet — 수면 기록 입력 바텀시트
 * forwardRef + useImperativeHandle (FuelInputBottomSheet 패턴)
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {View, Text, StyleSheet, Keyboard, Platform} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetScrollView} from '@gorhom/bottom-sheet';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {Moon, Sun, Pill, Leaf} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import type {SleepMood, SleepRecordInput, SleepRecord} from '@/stores/sleepStore';
import {format, setHours, setMinutes, parse} from 'date-fns';

export interface SleepInputBottomSheetRef {
  openCreate: (date: string) => void;
  openEdit: (record: SleepRecord) => void;
  close: () => void;
}

interface Props {
  onSubmit: (input: SleepRecordInput) => void;
}

const MOOD_OPTIONS: {value: SleepMood; emoji: string; label: string; color: string; bg: string}[] = [
  {value: 'great', emoji: '😴', label: '아주 좋음', color: '#059669', bg: '#D1FAE5'},
  {value: 'good', emoji: '🙂', label: '좋음', color: '#2563EB', bg: '#DBEAFE'},
  {value: 'fair', emoji: '😐', label: '보통', color: '#D97706', bg: '#FEF3C7'},
  {value: 'poor', emoji: '😫', label: '나쁨', color: '#DC2626', bg: '#FEE2E2'},
];

export const SleepInputBottomSheet = forwardRef<SleepInputBottomSheetRef, Props>(
  ({onSubmit}, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['75%'], []);
    const {primaryColor} = useTheme();
    const haptic = useHaptic();

    const [targetDate, setTargetDate] = useState('');
    const [sleepTime, setSleepTime] = useState(new Date());
    const [wakeTime, setWakeTime] = useState(new Date());
    const [mood, setMood] = useState<SleepMood | null>(null);
    const [tookRx, setTookRx] = useState(false);
    const [tookSupplement, setTookSupplement] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const resetForm = useCallback((date: string) => {
      setTargetDate(date);
      // 기본: 전날 23시 취침, 당일 7시 기상
      const d = parse(date, 'yyyy-MM-dd', new Date());
      const defaultSleep = setMinutes(setHours(new Date(d.getTime() - 86400000), 23), 0);
      const defaultWake = setMinutes(setHours(d, 7), 0);
      setSleepTime(defaultSleep);
      setWakeTime(defaultWake);
      setMood(null);
      setTookRx(false);
      setTookSupplement(false);
      setIsEditing(false);
    }, []);

    useImperativeHandle(ref, () => ({
      openCreate: (date: string) => {
        resetForm(date);
        sheetRef.current?.expand();
      },
      openEdit: (record: SleepRecord) => {
        setTargetDate(record.date);
        setSleepTime(new Date(record.sleep_time));
        setWakeTime(new Date(record.wake_time));
        setMood(record.mood);
        setTookRx(record.took_rx);
        setTookSupplement(record.took_supplement);
        setIsEditing(true);
        sheetRef.current?.expand();
      },
      close: () => {
        Keyboard.dismiss();
        sheetRef.current?.close();
      },
    }));

    const handleSave = useCallback(() => {
      haptic.medium();
      onSubmit({
        date: targetDate,
        sleep_time: sleepTime.toISOString(),
        wake_time: wakeTime.toISOString(),
        mood,
        took_rx: tookRx,
        took_supplement: tookSupplement,
      });
      sheetRef.current?.close();
    }, [targetDate, sleepTime, wakeTime, mood, tookRx, tookSupplement, onSubmit, haptic]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />
      ),
      [],
    );

    const durationMinutes = useMemo(() => {
      const diff = wakeTime.getTime() - sleepTime.getTime();
      return Math.max(0, Math.round(diff / 60000));
    }, [sleepTime, wakeTime]);

    const durationText = `${Math.floor(durationMinutes / 60)}시간 ${durationMinutes % 60}분`;

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
            <Text style={styles.title}>
              {isEditing ? '수면 기록 수정' : '수면 기록하기'}
            </Text>
          </View>

          {/* 날짜 */}
          <Text style={styles.dateLabel}>{targetDate}</Text>

          {/* 취침 시간 */}
          <View style={styles.timeSection}>
            <View style={styles.timeLabelRow}>
              <Moon size={16} color="#6366F1" />
              <Text style={styles.timeLabel}>취침 시간</Text>
            </View>
            <DateTimePicker
              value={sleepTime}
              mode="time"
              display="spinner"
              onChange={(_: DateTimePickerEvent, date?: Date) => date && setSleepTime(date)}
              style={styles.timePicker}
              locale="ko"
            />
          </View>

          {/* 기상 시간 */}
          <View style={styles.timeSection}>
            <View style={styles.timeLabelRow}>
              <Sun size={16} color="#F59E0B" />
              <Text style={styles.timeLabel}>기상 시간</Text>
            </View>
            <DateTimePicker
              value={wakeTime}
              mode="time"
              display="spinner"
              onChange={(_: DateTimePickerEvent, date?: Date) => date && setWakeTime(date)}
              style={styles.timePicker}
              locale="ko"
            />
          </View>

          {/* 수면 시간 표시 */}
          <View style={styles.durationBadge}>
            <Text style={[styles.durationText, {color: primaryColor}]}>
              💤 {durationText}
            </Text>
          </View>

          {/* 기분 선택 */}
          <Text style={styles.sectionLabel}>기분</Text>
          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map(opt => {
              const isSelected = mood === opt.value;
              return (
                <AnimatedPressable
                  key={opt.value}
                  onPress={() => {
                    haptic.selection();
                    setMood(isSelected ? null : opt.value);
                  }}
                  scaleValue={0.9}
                  haptic={false}
                  style={[
                    styles.moodChip,
                    isSelected && {backgroundColor: opt.bg, borderColor: opt.color},
                  ]}>
                  <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.moodLabel, isSelected && {color: opt.color}]}>
                    {opt.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* 보조제 토글 */}
          <Text style={styles.sectionLabel}>보조제</Text>
          <View style={styles.toggleRow}>
            <AnimatedPressable
              onPress={() => {
                haptic.selection();
                setTookRx(!tookRx);
              }}
              scaleValue={0.95}
              haptic={false}
              style={[
                styles.toggleChip,
                tookRx && {backgroundColor: '#EDE9FE', borderColor: '#7C3AED'},
              ]}>
              <Pill size={16} color={tookRx ? '#7C3AED' : '#9CA3AF'} />
              <Text style={[styles.toggleLabel, tookRx && {color: '#7C3AED'}]}>수면제</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => {
                haptic.selection();
                setTookSupplement(!tookSupplement);
              }}
              scaleValue={0.95}
              haptic={false}
              style={[
                styles.toggleChip,
                tookSupplement && {backgroundColor: '#D1FAE5', borderColor: '#059669'},
              ]}>
              <Leaf size={16} color={tookSupplement ? '#059669' : '#9CA3AF'} />
              <Text style={[styles.toggleLabel, tookSupplement && {color: '#059669'}]}>영양제</Text>
            </AnimatedPressable>
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
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  dateLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
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
  durationBadge: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  moodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  moodEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  toggleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
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
