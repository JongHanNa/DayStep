/**
 * MissedTodoActionPanel
 * 종료 시간이 지난 할일에 대한 4가지 액션 버튼 패널
 * - 완료했음 (초록)
 * - 미뤘음 (주황)
 * - 필요없었음 (회색)
 * - 놓침 (빨강)
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {
  CheckCircle2,
  Pause,
  MinusCircle,
  XCircle,
  Clock,
} from 'lucide-react-native';

interface MissedTodoActionPanelProps {
  overdueText: string;
  onComplete: () => void;
  onPostpone: () => void;
  onSkipNotNeeded: () => void;
  onSkipMissed: () => void;
}

export function MissedTodoActionPanel({
  overdueText,
  onComplete,
  onPostpone,
  onSkipNotNeeded,
  onSkipMissed,
}: MissedTodoActionPanelProps) {
  return (
    <View style={styles.container}>
      {/* 종료 시간 X분 지남 뱃지 */}
      <View style={styles.overdueBadge}>
        <Clock size={12} color="#DC2626" />
        <Text style={styles.overdueText}>{overdueText}</Text>
      </View>

      {/* 어떻게 기록할까요? */}
      <Text style={styles.promptText}>어떻게 기록할까요?</Text>

      {/* 4개 액션 버튼 */}
      <View style={styles.buttonRow}>
        <AnimatedPressable
          onPress={onComplete}
          hapticType="light"
          scaleValue={0.92}
          style={[styles.actionBtn, styles.completeBtnBg]}>
          <CheckCircle2 size={14} color="#16A34A" />
          <Text style={[styles.actionBtnText, {color: '#16A34A'}]}>
            완료했음
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onPostpone}
          hapticType="light"
          scaleValue={0.92}
          style={[styles.actionBtn, styles.postponeBtnBg]}>
          <Pause size={14} color="#D97706" />
          <Text style={[styles.actionBtnText, {color: '#D97706'}]}>
            미뤘음
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onSkipNotNeeded}
          hapticType="light"
          scaleValue={0.92}
          style={[styles.actionBtn, styles.skipBtnBg]}>
          <MinusCircle size={14} color="#6B7280" />
          <Text style={[styles.actionBtnText, {color: '#6B7280'}]}>
            필요없었음
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onSkipMissed}
          hapticType="light"
          scaleValue={0.92}
          style={[styles.actionBtn, styles.missedBtnBg]}>
          <XCircle size={14} color="#DC2626" />
          <Text style={[styles.actionBtnText, {color: '#DC2626'}]}>놓침</Text>
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
    borderTopColor: '#FEE2E2',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  overdueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  promptText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  postponeBtnBg: {
    backgroundColor: '#FFFBEB',
  },
  skipBtnBg: {
    backgroundColor: '#F9FAFB',
  },
  missedBtnBg: {
    backgroundColor: '#FEF2F2',
  },
});
