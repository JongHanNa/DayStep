/**
 * FuelCard — 원동력 인라인 카드
 * BannerPage.tsx amber 카드를 독립 컴포넌트로 추출
 *
 * iOS 26+: 네이티브 Liquid Glass morph (컴팩트 ↔ 확장 패널 인라인 전환)
 * iOS 25-: 기존 LinearGradient amber 카드 (passive, 탭 없음)
 */
import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import type {Note} from '@/stores/noteStore';
import {LiquidGlassFuelCardNative, isIOS26Plus} from '@/components/native';
import {springs} from '@/theme/animations';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';

interface FuelCardProps {
  note: Note | null;
  enterDelay?: number;
}

export function FuelCard({note, enterDelay = 0}: FuelCardProps) {
  const {primaryColor} = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);
  const animatedHeight = useSharedValue(200);

  const heightStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: 'hidden' as const,
  }));

  // iOS 26+: 네이티브 Liquid Glass morph 카드
  if (isIOS26Plus) {
    return (
      <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
        <Animated.View style={heightStyle}>
          <LiquidGlassFuelCardNative
            primaryColor={primaryColor}
            noteTitle={note?.title ?? ''}
            noteContent={note?.content ?? ''}
            hasNote={!!note}
            isExpanded={isExpanded}
            onExpand={() => setIsExpanded(true)}
            onCollapse={() => setIsExpanded(false)}
            onHeightChange={e => {
              animatedHeight.value = withSpring(
                e.nativeEvent.height,
                springs.nativeGlass,
              );
            }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>
    );
  }

  // iOS 25 이하: primaryColor 기반 카드 (passive)
  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
      <View style={styles.card}>
        <LinearGradient
          colors={[
            hexWithOpacity(primaryColor, 0.08),
            hexWithOpacity(primaryColor, 0.15),
            hexWithOpacity(primaryColor, 0.25),
          ]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.cardContent}>
          <View className="flex-row items-center mb-3">
            <Text
              className="text-lg font-semibold"
              style={{color: primaryColor}}>
              나의 원동력
            </Text>
          </View>
          {note ? (
            <>
              {note.title && (
                <Text
                  className="text-base font-medium mb-1"
                  style={{color: primaryColor}}>
                  {note.title}
                </Text>
              )}
              <Text
                className="text-sm leading-5"
                style={{color: hexWithOpacity(primaryColor, 0.8)}}>
                {note.content}
              </Text>
            </>
          ) : (
            <Text
              className="text-sm"
              style={{color: hexWithOpacity(primaryColor, 0.6)}}>
              아직 원동력이 없어요.{'\n'}
              Notes에서 원동력을 기록해보세요.
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
});
