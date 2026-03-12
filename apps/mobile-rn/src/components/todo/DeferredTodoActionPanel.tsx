/**
 * DeferredTodoActionPanel
 * 미뤄진 반복 할일에 대한 안내 + 2가지 액션 버튼
 * - 미룸완료 (체크 완료)
 * - 원래대로 복원 (독립 할일 삭제 + exclusion 삭제)
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {CheckCircle2, RotateCcw, Clock} from 'lucide-react-native';

interface DeferredTodoActionPanelProps {
  originalTime: string; // HH:mm
  onComplete: () => void;
  onRestore: () => void;
}

export function DeferredTodoActionPanel({
  originalTime,
  onComplete,
  onRestore,
}: DeferredTodoActionPanelProps) {
  const {primaryColor} = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.infoBadge}>
        <Clock size={12} color="#D97706" />
        <Text style={styles.infoText}>
          미뤄둔 할일이에요 (원래 {originalTime})
        </Text>
      </View>

      <Text style={styles.promptText}>어떻게 할까요?</Text>

      <View style={styles.buttonRow}>
        <AnimatedPressable
          onPress={onComplete}
          hapticType="light"
          scaleValue={0.92}
          style={[styles.actionBtn, styles.completeBtnBg]}>
          <CheckCircle2 size={14} color="#16A34A" />
          <Text style={[styles.actionBtnText, {color: '#16A34A'}]}>
            미룸완료
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onRestore}
          hapticType="light"
          scaleValue={0.92}
          style={[styles.actionBtn, styles.restoreBtnBg]}>
          <RotateCcw size={14} color={primaryColor} />
          <Text style={[styles.actionBtnText, {color: primaryColor}]}>
            원래대로 복원
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  promptText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completeBtnBg: {
    backgroundColor: '#F0FDF4',
  },
  restoreBtnBg: {
    backgroundColor: '#EFF6FF',
  },
});
