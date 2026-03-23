/**
 * CleaningComparisonSection — 일반인 vs ADHD 비교표
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {CLEANING_COMPARISON_DATA} from '@/constants/cleaning-adhd-info-data';
import {sectionStyles} from '@/components/sleep-adhd-info/sectionStyles';

export function CleaningComparisonSection() {
  const {primaryColor} = useTheme();

  return (
    <AnimatedCard enterDelay={500} style={sectionStyles.card}>
      <Text style={[sectionStyles.sectionTitle, {color: primaryColor}]}>
        청소/정리 비교
      </Text>

      {/* 테이블 헤더 */}
      <View style={styles.headerRow}>
        <View style={styles.categoryCol} />
        <View style={styles.valueCol}>
          <Text style={styles.headerText}>일반인</Text>
        </View>
        <View style={styles.valueCol}>
          <Text style={[styles.headerText, {color: primaryColor}]}>ADHD</Text>
        </View>
      </View>

      {/* 테이블 행 */}
      {CLEANING_COMPARISON_DATA.map((row, i) => (
        <View
          key={i}
          style={[
            styles.dataRow,
            i % 2 === 0 && {backgroundColor: hexWithOpacity(primaryColor, 0.03)},
          ]}>
          <View style={styles.categoryCol}>
            <Text style={styles.categoryText}>{row.category}</Text>
          </View>
          <View style={styles.valueCol}>
            <Text style={styles.valueText}>{row.general}</Text>
          </View>
          <View style={styles.valueCol}>
            <Text style={[styles.valueText, styles.adhdValueText]}>
              {row.adhd}
            </Text>
          </View>
        </View>
      ))}
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 4,
  },
  categoryCol: {
    width: 72,
    justifyContent: 'center',
  },
  valueCol: {
    flex: 1,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  valueText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  adhdValueText: {
    color: '#374151',
    fontWeight: '500',
  },
});
