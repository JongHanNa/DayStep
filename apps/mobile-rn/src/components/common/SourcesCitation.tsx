/**
 * SourcesCitation — 출처 인용 + 면책 조항 공용 컴포넌트
 * Apple Guideline 1.4.1 준수를 위한 건강/의료 정보 출처 표시
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface Props {
  sources: readonly string[];
  disclaimer: string;
}

export function SourcesCitation({sources, disclaimer}: Props) {
  return (
    <View style={styles.container}>
      {/* 면책 조항 */}
      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerText}>{disclaimer}</Text>
      </View>

      {/* 출처 목록 */}
      <Text style={styles.sourcesTitle}>참고 문헌</Text>
      {sources.map((source, index) => (
        <Text key={index} style={styles.sourceItem}>
          [{index + 1}] {source}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  disclaimerBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#92400E',
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  sourceItem: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9CA3AF',
    marginBottom: 6,
  },
});
