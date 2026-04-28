/**
 * CoachmarkOverlay — Modal로 dim + spotlight + 말풍선 + 외곽 컨트롤 렌더
 *
 * 레이아웃:
 *  - 상단 헤더: 좌측 [뒤로 <] (1단계는 hidden) | 우측 [건너뛰기]
 *  - 중간 본문: spotlight + 말풍선 (콘텐츠만)
 *  - 하단 CTA: 풀폭 [다음 / 시작하기] 버튼
 *
 * 동작:
 *  1) active한 step의 staticRect 또는 targetId로 좌표 획득
 *  2) target 사방에 dim 4-piece + spotlight border
 *  3) target 위/아래 빈 공간에 말풍선 배치 (auto 시 더 큰 공간 자동)
 *  4) target 없는 step (welcome) → 전체 dim + 중앙 말풍선
 */
import React, {useEffect, useState} from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {ChevronLeft} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useCoachmark} from './CoachmarkProvider';
import {CoachmarkBubble} from './CoachmarkBubble';
import {useTheme, radius, spacing, springs, timings, hitSlop} from '@/theme';
import type {TargetRect} from './types';

const SCREEN = Dimensions.get('window');
const DIM_COLOR = 'rgba(0, 0, 0, 0.65)';
const DEFAULT_SPOTLIGHT_PADDING = 8;
const DEFAULT_SPOTLIGHT_RADIUS = 12;
const BUBBLE_HORIZONTAL_MARGIN = spacing.lg;
const BUBBLE_VERTICAL_GAP = spacing.md;
const ESTIMATED_BUBBLE_HEIGHT = 220;
const HEADER_HEIGHT = 48;
const FOOTER_HEIGHT = 64;

export function CoachmarkOverlay() {
  const {active, currentStep, currentIndex, totalSteps, next, previous, skip, getTargetMeasure} =
    useCoachmark();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  const {primaryColor} = useTheme();
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isMeasured, setIsMeasured] = useState(false);
  const fadeOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0.95);

  // step 변경 시 target 재측정
  useEffect(() => {
    let cancelled = false;
    if (!active || !currentStep) {
      setTargetRect(null);
      setIsMeasured(false);
      return;
    }
    if (currentStep.staticRect) {
      setTargetRect(currentStep.staticRect());
      setIsMeasured(true);
      return;
    }
    if (!currentStep.targetId) {
      setTargetRect(null);
      setIsMeasured(true);
      return;
    }
    const measure = getTargetMeasure(currentStep.targetId);
    if (!measure) {
      const timer = setTimeout(() => {
        const retry = getTargetMeasure(currentStep.targetId!);
        if (retry && !cancelled) {
          retry().then(rect => {
            if (cancelled) return;
            setTargetRect(rect);
            setIsMeasured(true);
          });
        } else if (!cancelled) {
          setTargetRect(null);
          setIsMeasured(true);
        }
      }, 100);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
    measure().then(rect => {
      if (cancelled) return;
      setTargetRect(rect);
      setIsMeasured(true);
    });
    return () => {
      cancelled = true;
    };
  }, [active, currentStep, currentIndex, getTargetMeasure]);

  useEffect(() => {
    if (active) {
      fadeOpacity.value = withTiming(1, timings.fadeIn);
      bubbleScale.value = withSpring(1, springs.smooth);
    } else {
      fadeOpacity.value = withTiming(0, timings.fadeOut);
      bubbleScale.value = 0.95;
    }
  }, [active, fadeOpacity, bubbleScale]);

  useEffect(() => {
    if (active && isMeasured) {
      bubbleScale.value = 0.96;
      bubbleScale.value = withSpring(1, springs.snappy);
    }
  }, [currentIndex, active, isMeasured, bubbleScale]);

  const fadeStyle = useAnimatedStyle(() => ({opacity: fadeOpacity.value}));
  const bubbleAnimStyle = useAnimatedStyle(() => ({
    transform: [{scale: bubbleScale.value}],
    opacity: fadeOpacity.value,
  }));

  if (!active || !currentStep) return null;

  const padding = currentStep.spotlightPadding ?? DEFAULT_SPOTLIGHT_PADDING;
  const spotRadius = currentStep.spotlightRadius ?? DEFAULT_SPOTLIGHT_RADIUS;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;

  const handleLearnMore = () => {
    skip();
    setTimeout(() => navigation.navigate('OnboardingReferences'), 50);
  };

  // ---------- 외곽 컨트롤 (헤더 + 푸터) ----------
  const Header = (
    <View
      pointerEvents="box-none"
      style={[
        styles.header,
        {
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
        },
      ]}>
      {!isFirst ? (
        <Pressable
          onPress={previous}
          hitSlop={hitSlop.lg}
          style={({pressed}) => [
            styles.headerBtn,
            {opacity: pressed ? 0.5 : 1},
          ]}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </Pressable>
      ) : (
        <View style={styles.headerBtn} />
      )}
      <Pressable
        onPress={skip}
        hitSlop={hitSlop.lg}
        style={({pressed}) => [styles.skipBtn, {opacity: pressed ? 0.6 : 1}]}>
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </Pressable>
    </View>
  );

  const ctaWidth = SCREEN.width - spacing.lg * 2;
  const Footer = (
    <View
      style={[
        styles.footer,
        {paddingBottom: insets.bottom + spacing.md, paddingHorizontal: spacing.lg},
      ]}>
      <Pressable
        onPress={next}
        hitSlop={hitSlop.md}
        style={({pressed}) => [
          styles.cta,
          {
            width: ctaWidth,
            backgroundColor: primaryColor,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Text style={styles.ctaText}>
          {isLast ? t('onboarding.done') : t('onboarding.next')}
        </Text>
      </Pressable>
      {isLast && (
        <Pressable
          onPress={handleLearnMore}
          hitSlop={hitSlop.md}
          style={({pressed}) => [styles.learnMoreBtn, {opacity: pressed ? 0.6 : 1}]}>
          <Text style={styles.learnMoreText}>{t('onboarding.learnMore')}</Text>
        </Pressable>
      )}
    </View>
  );

  // ---------- welcome step (target 없음) ----------
  if (!targetRect) {
    return (
      <Modal
        visible={active}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={skip}>
        <Animated.View style={[StyleSheet.absoluteFill, fadeStyle, styles.fullDim]} />
        <View style={styles.fullCenter} pointerEvents="box-none">
          <Animated.View
            style={[styles.bubbleWrapper, styles.bubbleCenter, bubbleAnimStyle]}>
            <CoachmarkBubble
              i18nKey={currentStep.i18nKey}
              currentIndex={currentIndex}
              totalSteps={totalSteps}
            />
          </Animated.View>
        </View>
        {Header}
        {Footer}
      </Modal>
    );
  }

  // ---------- targeted step ----------
  const spotX = Math.max(0, targetRect.x - padding);
  const spotY = Math.max(0, targetRect.y - padding);
  const spotW = targetRect.width + padding * 2;
  const spotH = targetRect.height + padding * 2;
  const spotRight = spotX + spotW;
  const spotBottom = spotY + spotH;

  // 말풍선 위치 결정 (헤더/푸터 영역 회피)
  const headerBottom = insets.top + HEADER_HEIGHT;
  const footerTop = SCREEN.height - insets.bottom - FOOTER_HEIGHT - spacing.md;
  const spaceAbove = spotY - headerBottom;
  const spaceBelow = footerTop - spotBottom;
  const placeBelow =
    currentStep.preferredPlacement === 'bottom'
      ? true
      : currentStep.preferredPlacement === 'top'
      ? false
      : spaceBelow >= spaceAbove;

  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const bubbleTop = placeBelow
    ? spotBottom + BUBBLE_VERTICAL_GAP
    : Math.max(
        headerBottom + spacing.md,
        statusBarHeight + spacing.md,
        spotY - ESTIMATED_BUBBLE_HEIGHT - BUBBLE_VERTICAL_GAP,
      );

  return (
    <Modal
      visible={active}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={skip}>
      {/* 4-piece dim mask */}
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        <View style={[styles.dim, {top: 0, left: 0, right: 0, height: spotY}]} />
        <View
          style={[
            styles.dim,
            {top: spotY, left: 0, width: spotX, height: spotH},
          ]}
        />
        <View
          style={[
            styles.dim,
            {top: spotY, left: spotRight, right: 0, height: spotH},
          ]}
        />
        <View
          style={[
            styles.dim,
            {top: spotBottom, left: 0, right: 0, bottom: 0},
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.spotlightBorder,
            {
              left: spotX,
              top: spotY,
              width: spotW,
              height: spotH,
              borderRadius: spotRadius,
            },
          ]}
        />
      </Animated.View>

      {/* 말풍선 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.bubbleWrapper,
            {
              top: bubbleTop,
              left: BUBBLE_HORIZONTAL_MARGIN,
              right: BUBBLE_HORIZONTAL_MARGIN,
            },
            bubbleAnimStyle,
          ]}>
          <CoachmarkBubble
            i18nKey={currentStep.i18nKey}
            currentIndex={currentIndex}
            totalSteps={totalSteps}
          />
        </Animated.View>
      </View>

      {Header}
      {Footer}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullDim: {backgroundColor: DIM_COLOR},
  dim: {position: 'absolute', backgroundColor: DIM_COLOR},
  spotlightBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  fullCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BUBBLE_HORIZONTAL_MARGIN,
  },
  bubbleWrapper: {position: 'absolute'},
  bubbleCenter: {position: 'relative', width: '100%', maxWidth: 400},

  // ---------- 헤더 ----------
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  skipBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },

  // ---------- 푸터 ----------
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  cta: {
    alignSelf: 'stretch',
    paddingVertical: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  learnMoreBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  learnMoreText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
