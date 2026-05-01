/**
 * MotivationCard — 원동력 인라인 카드
 * BannerPage.tsx amber 카드를 독립 컴포넌트로 추출
 *
 * iOS 26+: 네이티브 Liquid Glass morph (컴팩트 ↔ 확장 패널 인라인 전환)
 * iOS 25-: 기존 LinearGradient amber 카드 (passive, 탭 없음)
 */
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {ChevronDown, ChevronUp} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import type {Note} from '@/stores/motivationStore';
import {NativeMotivationCardNative, isIOS26Plus} from '@/components/native';
import {springs} from '@/theme/animations';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';

interface MotivationCardProps {
  note: Note | null;
  enterDelay?: number;
}

export function MotivationCard({note, enterDelay = 0}: MotivationCardProps) {
  const {primaryColor} = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);
  const animatedHeight = useSharedValue(200);

  const heightStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: 'hidden' as const,
    borderRadius: 20,
  }));

  // iOS 26+: 네이티브 Liquid Glass morph 카드
  if (isIOS26Plus) {
    return (
      <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
        <Animated.View style={heightStyle}>
          <NativeMotivationCardNative
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

  // iOS 25 이하 + Android: primaryColor 기반 카드 + 탭으로 펼침/접힘
  return (
    <MotivationCardFallback
      note={note}
      primaryColor={primaryColor}
      enterDelay={enterDelay}
    />
  );
}

interface FallbackProps {
  note: Note | null;
  primaryColor: string;
  enterDelay: number;
}

function MotivationCardFallback({note, primaryColor, enterDelay}: FallbackProps) {
  const [expanded, setExpanded] = useState(false);

  // 회전(노트 prop 변경) 시 접힘으로 자동 리셋
  useEffect(() => {
    setExpanded(false);
  }, [note?.id]);

  const togglable = !!note?.content;

  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
      <Animated.View
        style={styles.card}
        layout={LinearTransition.springify().damping(25).stiffness(247).mass(1)}>
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
        <Pressable
          onPress={() => {
            if (togglable) setExpanded(prev => !prev);
          }}
          style={styles.cardContent}>
          <View className="flex-row items-center mb-3">
            <Text
              className="text-lg font-semibold"
              style={{color: primaryColor}}>
              나의 원동력
            </Text>
          </View>
          {note ? (
            <Animated.View
              key={note.id}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(140)}>
              {note.title && (
                <Text
                  className="text-base font-medium mb-1"
                  style={{color: primaryColor}}>
                  {note.title}
                </Text>
              )}
              <Text
                className="text-sm leading-5"
                style={{color: hexWithOpacity(primaryColor, 0.8)}}
                numberOfLines={expanded ? undefined : 3}>
                {note.content}
              </Text>
              {togglable && (
                <View style={styles.toggleRow}>
                  {expanded ? (
                    <ChevronUp
                      size={14}
                      color={hexWithOpacity(primaryColor, 0.6)}
                      strokeWidth={2}
                    />
                  ) : (
                    <ChevronDown
                      size={14}
                      color={hexWithOpacity(primaryColor, 0.6)}
                      strokeWidth={2}
                    />
                  )}
                </View>
              )}
            </Animated.View>
          ) : (
            <Text
              className="text-sm"
              style={{color: hexWithOpacity(primaryColor, 0.6)}}>
              아직 원동력이 없어요.{'\n'}
              Notes에서 원동력을 기록해보세요.
            </Text>
          )}
        </Pressable>
      </Animated.View>
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
});
