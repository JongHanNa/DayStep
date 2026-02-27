/**
 * FuelCard — 원동력 인라인 카드
 * BannerPage.tsx amber 카드를 독립 컴포넌트로 추출
 *
 * iOS 26+: 네이티브 Liquid Glass morph (컴팩트 ↔ 확장 패널 인라인 전환)
 * iOS 25-: 기존 LinearGradient amber 카드 (passive, 탭 없음)
 */
import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {Flame} from 'lucide-react-native';
import type {Note} from '@/stores/noteStore';
import {LiquidGlassFuelCardNative, isIOS26Plus} from '@/components/native';

interface FuelCardProps {
  note: Note | null;
  enterDelay?: number;
}

export function FuelCard({note, enterDelay = 0}: FuelCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [nativeCardHeight, setNativeCardHeight] = useState(200);

  // iOS 26+: 네이티브 Liquid Glass morph 카드
  if (isIOS26Plus) {
    return (
      <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
        <LiquidGlassFuelCardNative
          noteTitle={note?.title ?? ''}
          noteContent={note?.content ?? ''}
          hasNote={!!note}
          isExpanded={isExpanded}
          onExpand={() => setIsExpanded(true)}
          onCollapse={() => setIsExpanded(false)}
          onHeightChange={e => setNativeCardHeight(e.nativeEvent.height)}
          style={[styles.nativeCard, {height: nativeCardHeight}]}
        />
      </Animated.View>
    );
  }

  // iOS 25 이하: 기존 LinearGradient amber 카드 (passive)
  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
      <View style={styles.card}>
        <LinearGradient
          colors={['#FEF3C7', '#FDE68A', '#FBBF24']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.cardContent}>
          <View className="flex-row items-center mb-3">
            <Flame size={22} color="#92400E" />
            <Text className="text-lg font-semibold text-amber-900 ml-2">
              나의 원동력
            </Text>
          </View>
          {note ? (
            <>
              {note.title && (
                <Text className="text-base font-medium text-amber-900 mb-1">
                  {note.title}
                </Text>
              )}
              <Text className="text-sm text-amber-800/80 leading-5">
                {note.content}
              </Text>
            </>
          ) : (
            <Text className="text-sm text-amber-800/60">
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
  // iOS 26 네이티브 카드: 높이는 onHeightChange로 동적 설정
  nativeCard: {
    width: '100%',
  },
});
