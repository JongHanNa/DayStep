/**
 * GroupSection — 3그룹 공용 섹션 컴포넌트
 * 컬러 도트 + 제목 + 2열 기능 그리드 (웹 스타일: 흰 배경 + Lucide 아이콘 + 제목 + 설명)
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {Crown} from 'lucide-react-native';

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

export function GroupSection({
  dotColor,
  title,
  items,
  numColumns = 2,
  enterDelay = 0,
}: GroupSectionProps) {
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
            style={{width: '48%'}}>
            <AnimatedPressable
              onPress={item.onPress}
              hapticType="light"
              scaleValue={0.97}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                padding: 14,
                minHeight: 100,
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.06,
                shadowRadius: 3,
                elevation: 2,
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
                  <Crown size={10} color="#D97706" />
                  <Text
                    style={{
                      fontSize: 9,
                      color: '#D97706',
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
