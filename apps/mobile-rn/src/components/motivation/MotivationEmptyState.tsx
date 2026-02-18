/**
 * MotivationEmptyState — 빈 상태 안내
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Flame} from 'lucide-react-native';

export function MotivationEmptyState() {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.inner}>
        <Flame size={52} color="#F59E0B" strokeWidth={1.5} />
        <Text style={styles.title}>첫 원동력을 작성해보세요</Text>
        <Text style={styles.description}>
          나를 움직이게 하는 것들을 기록하면{'\n'}
          어려운 순간에 힘이 됩니다
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  inner: {
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
