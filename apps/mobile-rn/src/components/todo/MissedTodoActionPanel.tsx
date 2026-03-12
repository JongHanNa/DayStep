/**
 * MissedTodoActionPanel
 * 종료 시간이 지난 할일에 대한 4가지 액션 버튼 패널
 * - 완료했음 / 미뤘음 / 필요없었음 / 놓침
 */
import React from 'react';
import {Text, StyleSheet} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';

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
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.container}>
      {/* 종료 시간 X분 지남 뱃지 */}
      <Animated.View style={styles.overdueBadge}>
        <Text style={styles.overdueText}>{overdueText}</Text>
      </Animated.View>

      {/* 어떻게 기록할까요? */}
      <Text style={styles.promptText}>어떻게 기록할까요?</Text>

      {/* 4개 액션 버튼 */}
      <Animated.View style={styles.buttonRow}>
        <AnimatedPressable
          onPress={onComplete}
          hapticType="light"
          scaleValue={0.92}
          style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>완료했음</Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onPostpone}
          hapticType="light"
          scaleValue={0.92}
          style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>미뤘음</Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onSkipNotNeeded}
          hapticType="light"
          scaleValue={0.92}
          style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>필요없었음</Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onSkipMissed}
          hapticType="light"
          scaleValue={0.92}
          style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>놓침</Text>
        </AnimatedPressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
});
