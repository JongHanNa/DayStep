/**
 * VisualMapView — Design C: 비주얼 맵 (기본 뷰)
 * 고정 레이아웃 (ScrollView 없음, 바텀시트가 스크롤 처리)
 */
import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {BrainMap} from './BrainMap';
import {TopicBottomSheet} from './TopicBottomSheet';

export function VisualMapView() {
  const [selectedTopicId, setSelectedTopicId] = useState<number>(1);

  return (
    <View style={styles.container}>
      {/* 타이틀 */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={styles.titleArea}>
        <Text style={styles.title}>ADHD 이해하기</Text>
        <Text style={styles.subtitle}>토픽을 눌러 자유롭게 탐색하세요</Text>
      </Animated.View>

      {/* 브레인 맵 */}
      <BrainMap
        selectedTopicId={selectedTopicId}
        onSelectTopic={setSelectedTopicId}
      />

      {/* 바텀시트 */}
      <TopicBottomSheet selectedTopicId={selectedTopicId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleArea: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
