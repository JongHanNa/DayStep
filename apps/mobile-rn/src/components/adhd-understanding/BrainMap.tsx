/**
 * BrainMap — 중앙 뇌 + 5개 토픽 노드 + SVG 점선 + 펄스 링
 */
import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import Svg, {Line} from 'react-native-svg';
import {Cpu} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {shadows} from '@/theme/tokens';
import {hexWithOpacity} from '@/lib/todoUtils';
import {ADHD_TOPICS, type ADHDTopic} from '@/constants/adhd-understanding-data';

const MAP_SIZE = 320;
const CENTER = MAP_SIZE / 2;
const NODE_RADIUS = 120;
const CENTER_SIZE = 120;
const NODE_SIZE = 56;
const PULSE_SIZE = 140;

interface BrainMapProps {
  selectedTopicId: number | null;
  onSelectTopic: (id: number) => void;
}

// 각도를 12시 방향 기준으로 x,y 좌표 계산
function getPosition(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + NODE_RADIUS * Math.cos(rad) - NODE_SIZE / 2,
    y: CENTER + NODE_RADIUS * Math.sin(rad) - NODE_SIZE / 2,
  };
}

// 노드 중심 좌표 (SVG 라인용)
function getCenter(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + NODE_RADIUS * Math.cos(rad),
    y: CENTER + NODE_RADIUS * Math.sin(rad),
  };
}

function PulseRing({primaryColor}: {primaryColor: string}) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.4, {duration: 3000, easing: Easing.out(Easing.ease)}),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withTiming(0, {duration: 3000, easing: Easing.out(Easing.ease)}),
      -1,
      false,
    );
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          borderColor: hexWithOpacity(primaryColor, 0.2),
          backgroundColor: hexWithOpacity(primaryColor, 0.05),
        },
        animatedStyle,
      ]}
    />
  );
}

function TopicNode({
  topic,
  isSelected,
  onPress,
  primaryColor,
}: {
  topic: ADHDTopic;
  isSelected: boolean;
  onPress: () => void;
  primaryColor: string;
}) {
  const pos = getPosition(topic.angle);
  const Icon = topic.icon;

  return (
    <AnimatedPressable
      onPress={onPress}
      hapticType="light"
      scaleValue={0.92}
      style={[styles.node, {left: pos.x, top: pos.y}]}>
      <View
        style={[
          styles.nodeCircle,
          isSelected && {
            borderColor: primaryColor,
            borderWidth: 2,
            ...shadows.glow(primaryColor),
          },
        ]}>
        <Icon
          size={24}
          color={isSelected ? primaryColor : '#1A1A2E'}
        />
      </View>
      <Text
        style={[
          styles.nodeLabel,
          isSelected && {color: primaryColor},
        ]}
        numberOfLines={1}>
        {topic.shortLabel}
      </Text>
    </AnimatedPressable>
  );
}

export function BrainMap({selectedTopicId, onSelectTopic}: BrainMapProps) {
  const {primaryColor} = useTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      style={styles.container}>
      {/* SVG 점선 연결 */}
      <Svg
        width={MAP_SIZE}
        height={MAP_SIZE}
        style={StyleSheet.absoluteFill}>
        {ADHD_TOPICS.map(topic => {
          const nc = getCenter(topic.angle);
          return (
            <Line
              key={topic.id}
              x1={CENTER}
              y1={CENTER}
              x2={nc.x}
              y2={nc.y}
              stroke={hexWithOpacity(primaryColor, 0.15)}
              strokeWidth={1.5}
              strokeDasharray="4,4"
            />
          );
        })}
      </Svg>

      {/* 펄스 링 */}
      <View style={styles.pulseContainer}>
        <PulseRing primaryColor={primaryColor} />
      </View>

      {/* 중앙 뇌 원 */}
      <View
        style={[
          styles.brainCenter,
          {backgroundColor: hexWithOpacity(primaryColor, 0.15)},
        ]}>
        <Cpu size={48} color={hexWithOpacity(primaryColor, 0.7)} />
      </View>

      {/* 5개 노드 */}
      {ADHD_TOPICS.map(topic => (
        <TopicNode
          key={topic.id}
          topic={topic}
          isSelected={selectedTopicId === topic.id}
          onPress={() => onSelectTopic(topic.id)}
          primaryColor={primaryColor}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    alignSelf: 'center',
  },
  pulseContainer: {
    position: 'absolute',
    left: CENTER - PULSE_SIZE / 2,
    top: CENTER - PULSE_SIZE / 2,
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    borderWidth: 1.5,
  },
  brainCenter: {
    position: 'absolute',
    left: CENTER - CENTER_SIZE / 2,
    top: CENTER - CENTER_SIZE / 2,
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  node: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE + 18,
    alignItems: 'center',
    gap: 2,
  },
  nodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  nodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A1A2E',
    textAlign: 'center',
  },
});
