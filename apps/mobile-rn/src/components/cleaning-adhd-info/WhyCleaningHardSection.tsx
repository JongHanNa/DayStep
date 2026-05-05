/**
 * WhyCleaningHardSection — 왜 청소가 특히 어려운가
 */
import React from 'react';
import {Text} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import {WHY_CLEANING_HARD_DATA} from '@/constants/cleaning-adhd-info-data';
import {sectionStyles} from '@/components/sleep-adhd-info/sectionStyles';

export function WhyCleaningHardSection() {
  const {primaryColor} = useTheme();

  return (
    <AnimatedCard enterDelay={100} style={sectionStyles.card}>
      <Text style={[sectionStyles.sectionTitle, {color: primaryColor}]}>
        {WHY_CLEANING_HARD_DATA.title}
      </Text>
      {WHY_CLEANING_HARD_DATA.paragraphs.map((p, i) => (
        <Text key={i} style={sectionStyles.paragraph}>
          {p}
        </Text>
      ))}
    </AnimatedCard>
  );
}
