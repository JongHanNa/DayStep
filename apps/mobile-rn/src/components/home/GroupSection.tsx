/**
 * GroupSection — 3그룹 공용 섹션 컴포넌트
 * 컬러 도트 + 제목 + 2열 기능 그리드 (웹 스타일: 흰 배경 + Lucide 아이콘 + 제목 + 설명)
 */
import React, {useMemo, useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {Crown} from 'lucide-react-native';
import {useTheme} from '@/theme';
import {NativeGroupSectionNative, isIOS26Plus} from '@/components/native';
import {springs} from '@/theme/animations';
import {useResponsiveLayout} from '@/hooks/useResponsiveLayout';

export interface FeatureItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  iconBgColor: string;
  iconColor: string;
  onPress: () => void;
  isPro?: boolean;
}

interface GroupSectionProps {
  dotColor: string;
  title: string;
  items: FeatureItem[];
  numColumns?: 2 | 3;
  enterDelay?: number;
}

// SF Symbol 매핑 (네이티브 측과 동일)
const SF_SYMBOL_MAP: Record<string, string> = {
  'daily-planner': 'calendar',
  'monthly-planner': 'calendar.badge.clock',
  'ai-plan': 'folder',
  'ai-chat': 'sparkles',
  guide: 'link',
  'data-cleanup': 'trash',
  motivation: 'lightbulb',
  record: 'pencil.line',
  sleep: 'moon.fill',
  activity: 'chart.bar',
  'adhd-understanding': 'brain.head.profile',
};

export function GroupSection({
  dotColor,
  title,
  items,
  numColumns = 2,
  enterDelay = 0,
}: GroupSectionProps) {
  const {primaryColor} = useTheme();
  const {columns: responsiveColumns} = useResponsiveLayout();
  const effectiveColumns = numColumns === 2 ? responsiveColumns : numColumns;
  const animatedHeight = useSharedValue(300);

  const heightStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: 'hidden' as const,
  }));

  // 네이티브용: FeatureItem[] → JSON (onPress 제외, sfSymbol 추가)
  const sectionDataJson = useMemo(() => {
    return JSON.stringify(
      items.map(item => ({
        id: item.id,
        label: item.label,
        description: item.description,
        sfSymbol: SF_SYMBOL_MAP[item.id] || 'circle',
        isPro: item.isPro ?? false,
      })),
    );
  }, [items]);

  // 네이티브 onItemPress → id로 매칭하여 item.onPress() 호출
  const handleItemPress = useCallback(
    (e: {nativeEvent: {itemId: string}}) => {
      const item = items.find(i => i.id === e.nativeEvent.itemId);
      item?.onPress();
    },
    [items],
  );

  // iOS 26+: 네이티브 glass 그리드
  if (isIOS26Plus) {
    return (
      <Animated.View
        entering={FadeInDown.delay(enterDelay).duration(400)}
        className="mx-4">
        <Animated.View style={heightStyle}>
          <NativeGroupSectionNative
            sectionData={sectionDataJson}
            title={title}
            dotColor={dotColor}
            primaryColor={primaryColor}
            onItemPress={handleItemPress}
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

  // iOS 25-: 기존 JS 폴백
  return (
    <Animated.View
      entering={FadeInDown.delay(enterDelay).duration(400)}
      className="mx-4">
      {/* 헤더: 도트 + 제목 */}
      <View className="flex-row items-center mb-2">
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: dotColor,
            marginRight: 8,
          }}
        />
        <Text className="text-base font-semibold text-gray-800">{title}</Text>
      </View>

      {/* 구분선 */}
      <View
        style={{
          height: 1,
          backgroundColor: dotColor + '33',
          marginBottom: 12,
        }}
      />

      {/* 2열 기능 그리드 */}
      <View className="flex-row flex-wrap" style={{gap: 10}}>
        {items.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(
              enterDelay + 50 + index * 60,
            ).duration(350)}
            style={{width: `${Math.floor(100 / effectiveColumns) - 2}%` as any}}>
            <AnimatedPressable
              onPress={item.onPress}
              hapticType="light"
              scaleValue={0.97}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                padding: 14,
                minHeight: 100,

                borderWidth: 1,
                borderColor: '#F3F4F6',
              }}>
              {/* PRO 배지 */}
              {item.isPro && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FEF3C7',
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}>
                  <Crown size={10} color={primaryColor} />
                  <Text
                    style={{
                      fontSize: 9,
                      color: primaryColor,
                      fontWeight: '600',
                      marginLeft: 2,
                    }}>
                    PRO
                  </Text>
                </View>
              )}
              {/* 아이콘 박스 */}
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: item.iconBgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}>
                {item.icon}
              </View>
              {/* 라벨 */}
              <Text
                className="text-sm font-semibold text-gray-800"
                numberOfLines={1}>
                {item.label}
              </Text>
              {/* 설명 */}
              <Text
                className="text-xs text-gray-400 mt-0.5"
                numberOfLines={2}>
                {item.description}
              </Text>
            </AnimatedPressable>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}
