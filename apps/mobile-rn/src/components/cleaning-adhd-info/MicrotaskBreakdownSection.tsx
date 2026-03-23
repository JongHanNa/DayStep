/**
 * MicrotaskBreakdownSection — 마이크로태스크 분해 원리
 */
import React from 'react';
import {Text} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import {MICROTASK_BREAKDOWN_DATA} from '@/constants/cleaning-adhd-info-data';
import {sectionStyles} from '@/components/sleep-adhd-info/sectionStyles';

export function MicrotaskBreakdownSection() {
  const {primaryColor} = useTheme();

  return (
    <AnimatedCard enterDelay={200} style={sectionStyles.card}>
      <Text style={[sectionStyles.sectionTitle, {color: primaryColor}]}>
        {MICROTASK_BREAKDOWN_DATA.title}
      </Text>
      {MICROTASK_BREAKDOWN_DATA.paragraphs.map((p, i) => (
        <Text key={i} style={sectionStyles.paragraph}>
          {p}
        </Text>
      ))}
    </AnimatedCard>
  );
}
