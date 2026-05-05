/**
 * EnergyManagementSection — 에너지 기반 태스크 관리
 */
import React from 'react';
import {Text} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import {ENERGY_MANAGEMENT_DATA} from '@/constants/cleaning-adhd-info-data';
import {sectionStyles} from '@/components/sleep-adhd-info/sectionStyles';

export function EnergyManagementSection() {
  const {primaryColor} = useTheme();

  return (
    <AnimatedCard enterDelay={300} style={sectionStyles.card}>
      <Text style={[sectionStyles.sectionTitle, {color: primaryColor}]}>
        {ENERGY_MANAGEMENT_DATA.title}
      </Text>
      {ENERGY_MANAGEMENT_DATA.paragraphs.map((p, i) => (
        <Text key={i} style={sectionStyles.paragraph}>
          {p}
        </Text>
      ))}
    </AnimatedCard>
  );
}
