/**
 * PrefrontalImpactSection — 전두엽 이중 타격
 */
import React from 'react';
import {Text, StyleSheet} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import {PREFRONTAL_IMPACT_DATA} from '@/constants/sleep-adhd-info-data';
import {sectionStyles} from './sectionStyles';

export function PrefrontalImpactSection() {
  const {primaryColor} = useTheme();

  return (
    <AnimatedCard enterDelay={200} style={sectionStyles.card}>
      <Text style={[sectionStyles.sectionTitle, {color: primaryColor}]}>
        {PREFRONTAL_IMPACT_DATA.title}
      </Text>
      {PREFRONTAL_IMPACT_DATA.paragraphs.map((p, i) => (
        <Text key={i} style={sectionStyles.paragraph}>
          {p}
        </Text>
      ))}
    </AnimatedCard>
  );
}
