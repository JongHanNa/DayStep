/**
 * RoutineAutomationSection — 의사결정 피로와 루틴 자동화 (순환 다이어그램)
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {ROUTINE_AUTOMATION_DATA} from '@/constants/cleaning-adhd-info-data';
import {sectionStyles} from '@/components/sleep-adhd-info/sectionStyles';

export function RoutineAutomationSection() {
  const {primaryColor} = useTheme();

  return (
    <AnimatedCard enterDelay={400} style={sectionStyles.card}>
      <Text style={[sectionStyles.sectionTitle, {color: primaryColor}]}>
        {ROUTINE_AUTOMATION_DATA.title}
      </Text>

      {/* 순환 다이어그램 */}
      <View
        style={[
          styles.cycleContainer,
          {backgroundColor: hexWithOpacity(primaryColor, 0.04)},
        ]}>
        {ROUTINE_AUTOMATION_DATA.steps.map((step, i) => (
          <View key={i} style={styles.stepWrapper}>
            <View
              style={[
                styles.stepBadge,
                {backgroundColor: hexWithOpacity(primaryColor, 0.12)},
              ]}>
              <Text style={[styles.stepText, {color: primaryColor}]}>
                {step}
              </Text>
            </View>
            {i < ROUTINE_AUTOMATION_DATA.steps.length - 1 && (
              <Text style={[styles.arrow, {color: hexWithOpacity(primaryColor, 0.4)}]}>
                ↓
              </Text>
            )}
          </View>
        ))}
        {/* 순환 화살표 */}
        <Text style={[styles.cycleArrow, {color: hexWithOpacity(primaryColor, 0.4)}]}>
          ↻ 반복
        </Text>
      </View>

      <Text style={sectionStyles.paragraph}>
        {ROUTINE_AUTOMATION_DATA.keyMessage}
      </Text>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  cycleContainer: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  stepWrapper: {
    alignItems: 'center',
  },
  stepBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 18,
    marginVertical: 4,
  },
  cycleArrow: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
