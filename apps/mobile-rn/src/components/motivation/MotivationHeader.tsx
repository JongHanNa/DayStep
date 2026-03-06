/**
 * MotivationHeader — 스트릭 일수, XP 바, 총 노트 수 표시
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Flame, Star, PenLine} from 'lucide-react-native';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';

interface MotivationHeaderProps {
  streak: number;
  xp: {total: number; level: number; progress: number};
  totalNotes: number;
}

export function MotivationHeader({streak, xp, totalNotes}: MotivationHeaderProps) {
  const {primaryColor} = useTheme();

  return (
    <AnimatedCard enterDelay={0} style={styles.card}>
      <View style={styles.row}>
        {/* 스트릭 */}
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{streak}</Text>
          <View style={styles.statLabelRow}>
            <Flame size={12} color="#6B7280" />
            <Text style={styles.statLabel}>연속 일</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 레벨 */}
        <View style={styles.stat}>
          <Text style={styles.statNumber}>Lv.{xp.level}</Text>
          <View style={styles.statLabelRow}>
            <Star size={12} color="#6B7280" />
            <Text style={styles.statLabel}>레벨</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 총 노트 */}
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{totalNotes}</Text>
          <View style={styles.statLabelRow}>
            <PenLine size={12} color="#6B7280" />
            <Text style={styles.statLabel}>원동력</Text>
          </View>
        </View>
      </View>

      {/* XP 바 */}
      <View style={styles.xpRow}>
        <Text style={styles.xpLabel}>{xp.total} XP</Text>
        <View style={styles.xpBarBg}>
          <View
            style={[
              styles.xpBarFill,
              {
                width: `${Math.min(xp.progress * 100, 100)}%`,
                backgroundColor: primaryColor,
              },
            ]}
          />
        </View>
        <Text style={styles.xpLabel}>다음 레벨</Text>
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  xpLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  xpBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
