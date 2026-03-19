/**
 * ViciousCycleSection — 악순환 구조
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {VICIOUS_CYCLE_DATA} from '@/constants/sleep-adhd-info-data';
import {sectionStyles} from './sectionStyles';

export function ViciousCycleSection() {
  const {primaryColor} = useTheme();

  return (
    <AnimatedCard enterDelay={400} style={sectionStyles.card}>
      <Text style={[sectionStyles.sectionTitle, {color: primaryColor}]}>
        {VICIOUS_CYCLE_DATA.title}
      </Text>

      {/* 순환 다이어그램 */}
      <View
        style={[
          styles.cycleContainer,
          {backgroundColor: hexWithOpacity(primaryColor, 0.04)},
        ]}>
        {VICIOUS_CYCLE_DATA.steps.map((step, i) => (
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
            {i < VICIOUS_CYCLE_DATA.steps.length - 1 && (
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
        {VICIOUS_CYCLE_DATA.keyMessage}
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
