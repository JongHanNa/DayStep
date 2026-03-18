/**
 * ContactNudge — 연락 추천 리스트
 * 전체 추천 목록을 세로 리스트로 표시 (웹 ContactRecommendationScroll 참고)
 */
import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {HeartHandshake, Phone} from 'lucide-react-native';
import {fixedColors} from '@/theme/colors';
import {NativeContactNudgeNative, isIOS26Plus} from '@/components/native';
import {springs} from '@/theme/animations';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';

interface ContactRecommendation {
  person: {
    name: string;
    nickname?: string;
    relationships: string[];
  };
  daysSinceContact: number;
  priority: 'high' | 'medium' | 'normal';
}

interface ContactNudgeProps {
  recommendations: ContactRecommendation[];
  enterDelay?: number;
  onContactPress?: (personName: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: fixedColors.contactUrgencyHigh,
  medium: fixedColors.contactUrgencyMedium,
  normal: '#22C55E',
};

export function ContactNudge({
  recommendations,
  enterDelay = 0,
  onContactPress,
}: ContactNudgeProps) {
  const {primaryColor} = useTheme();
  const animatedHeight = useSharedValue(200);

  const heightStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: 'hidden' as const,
  }));

  // 네이티브용 JSON
  const contactsDataJson = useMemo(() => {
    return JSON.stringify(
      recommendations.map(rec => ({
        person: {
          name: rec.person.name,
          nickname: rec.person.nickname ?? null,
          relationships: rec.person.relationships ?? [],
        },
        daysSinceContact: rec.daysSinceContact,
        priority: rec.priority,
      })),
    );
  }, [recommendations]);

  // iOS 26+: 네이티브 glass 연락 추천 리스트
  if (isIOS26Plus) {
    return (
      <Animated.View
        entering={FadeInDown.delay(enterDelay).duration(400)}
        className="mx-4">
        <Animated.View style={heightStyle}>
          <NativeContactNudgeNative
            primaryColor={primaryColor}
            contactsData={contactsDataJson}
            onContactPress={e => onContactPress?.(e.nativeEvent.personName)}
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
      {/* 헤더 */}
      <View className="flex-row items-center mb-3">
        <HeartHandshake size={22} color={primaryColor} />
        <Text className="text-lg font-semibold text-gray-800 ml-2">
          연락할 사람
        </Text>
        {recommendations.length > 0 && (
          <View
            style={{
              backgroundColor: hexWithOpacity(primaryColor, 0.1),
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginLeft: 8,
            }}>
            <Text className="text-xs font-medium" style={{color: primaryColor}}>
              {recommendations.length}
            </Text>
          </View>
        )}
      </View>

      {/* 추천 리스트 */}
      {recommendations.length > 0 ? (
        <View style={{gap: 10}}>
          {recommendations.map((rec, index) => (
            <Animated.View
              key={`${rec.person.name}-${index}`}
              entering={FadeInDown.delay(
                enterDelay + 80 + index * 60,
              ).duration(350)}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 14,
                  shadowColor: '#000',
                  shadowOffset: {width: 0, height: 1},
                  shadowOpacity: 0.06,
                  shadowRadius: 3,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: '#F3F4F6',
                }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    {/* 이름 + 우선순위 dot */}
                    <View className="flex-row items-center mb-1">
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor:
                            PRIORITY_COLORS[rec.priority] || '#22C55E',
                          marginRight: 8,
                        }}
                      />
                      <Text className="text-sm font-semibold text-gray-800">
                        {rec.person.name}
                        {rec.person.nickname
                          ? ` (${rec.person.nickname})`
                          : ''}
                      </Text>
                    </View>
                    {/* 연락 상태 */}
                    <Text className="text-xs text-gray-400 ml-4">
                      {rec.daysSinceContact >= 999
                        ? '아직 연락한 기록이 없어요'
                        : `${rec.daysSinceContact}일 전 마지막 연락`}
                    </Text>
                    {/* 관계 태그 */}
                    {(rec.person.relationships?.length ?? 0) > 0 && (
                      <View className="flex-row flex-wrap ml-4 mt-1" style={{gap: 4}}>
                        {rec.person.relationships.map((rel, i) => (
                          <View
                            key={i}
                            style={{
                              backgroundColor: hexWithOpacity(primaryColor, 0.08),
                              borderRadius: 8,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                            }}>
                            <Text className="text-xs" style={{color: hexWithOpacity(primaryColor, 0.7)}}>
                              {rel}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  {/* 안부 전하기 버튼 */}
                  <AnimatedPressable
                    onPress={() => onContactPress?.(rec.person.name)}
                    hapticType="light"
                    scaleValue={0.95}
                    style={{
                      backgroundColor: hexWithOpacity(primaryColor, 0.1),
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                    <Phone size={14} color={primaryColor} />
                    <Text
                      className="text-xs font-medium ml-1"
                      style={{color: primaryColor}}>
                      소식기록
                    </Text>
                  </AnimatedPressable>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      ) : (
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#F3F4F6',
          }}>
          <HeartHandshake size={32} color={hexWithOpacity(primaryColor, 0.3)} />
          <Text className="text-sm text-gray-400 mt-2 text-center">
            소중한 사람을 등록하면{'\n'}연락 리마인더를 받을 수 있어요
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
