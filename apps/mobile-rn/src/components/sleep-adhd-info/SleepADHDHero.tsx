/**
 * SleepADHDHero — 히어로 섹션 (배지 + 타이틀 + 인트로)
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {HERO_DATA} from '@/constants/sleep-adhd-info-data';

export function SleepADHDHero() {
  const {primaryColor} = useTheme();

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
      <View
        style={[
          styles.badge,
          {backgroundColor: hexWithOpacity(primaryColor, 0.1)},
        ]}>
        <Text style={[styles.badgeText, {color: primaryColor}]}>
          {HERO_DATA.badge}
        </Text>
      </View>
      <Text style={styles.title}>{HERO_DATA.title}</Text>
      <Text style={styles.intro}>{HERO_DATA.intro}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 36,
  },
  intro: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 24,
  },
});
