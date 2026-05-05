/**
 * DopamineDebtSection — 도파민 빚 메커니즘
 */
import React from 'react';
import {Text, StyleSheet} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import {DOPAMINE_DEBT_DATA} from '@/constants/sleep-adhd-info-data';
import {sectionStyles} from './sectionStyles';

export function DopamineDebtSection() {
  const {primaryColor} = useTheme();

  return (
    <AnimatedCard enterDelay={100} style={sectionStyles.card}>
      <Text style={[sectionStyles.sectionTitle, {color: primaryColor}]}>
        {DOPAMINE_DEBT_DATA.title}
      </Text>
      {DOPAMINE_DEBT_DATA.paragraphs.map((p, i) => (
        <Text key={i} style={sectionStyles.paragraph}>
          {p}
        </Text>
      ))}
    </AnimatedCard>
  );
}
