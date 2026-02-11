/**
 * Custom Bottom Tab Bar
 * 5탭: 홈 / 플래너 / 실행(중앙) / 노트 / 설정
 * 글래스모피즘 배경 + 스프링 인디케이터 + 중앙 글로우 버튼
 */
import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {AnimatedPressable} from '@/components/core';
import {GlassBackground} from '@/components/core';
import {springs} from '@/theme/animations';
import {useTheme} from '@/theme';

const TAB_ICONS: Record<string, {icon: string; label: string}> = {
  Home: {icon: '🏠', label: '홈'},
  Planner: {icon: '📅', label: '플래너'},
  Execute: {icon: '⚡', label: '실행'},
  Notes: {icon: '📝', label: '노트'},
  Settings: {icon: '⚙️', label: '설정'},
};

export function CustomTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const {primaryColor} = useTheme();

  return (
    <GlassBackground
      blurType="chromeMaterialLight"
      blurAmount={25}
      overlayColor="rgba(255, 255, 255, 0.85)"
      style={[styles.container, {paddingBottom: Math.max(insets.bottom, 8)}]}>
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter = route.name === 'Execute';
          const tabInfo = TAB_ICONS[route.name] ?? {icon: '?', label: route.name};

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <CenterButton
                key={route.key}
                isFocused={isFocused}
                primaryColor={primaryColor}
                onPress={onPress}
              />
            );
          }

          return (
            <TabButton
              key={route.key}
              icon={tabInfo.icon}
              label={tabInfo.label}
              isFocused={isFocused}
              primaryColor={primaryColor}
              onPress={onPress}
            />
          );
        })}
      </View>
    </GlassBackground>
  );
}

function TabButton({
  icon,
  label,
  isFocused,
  primaryColor,
  onPress,
}: {
  icon: string;
  label: string;
  isFocused: boolean;
  primaryColor: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      hapticType="selection"
      scaleValue={0.9}
      style={styles.tabButton}>
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <Text style={styles.tabIcon}>{icon}</Text>
        <Text
          style={[
            styles.tabLabel,
            {color: isFocused ? primaryColor : '#9CA3AF'},
            isFocused && styles.tabLabelActive,
          ]}>
          {label}
        </Text>
        {isFocused && (
          <Animated.View
            style={[styles.activeIndicator, {backgroundColor: primaryColor}]}
          />
        )}
      </Animated.View>
    </AnimatedPressable>
  );
}

function CenterButton({
  isFocused,
  primaryColor,
  onPress,
}: {
  isFocused: boolean;
  primaryColor: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      hapticType="medium"
      scaleValue={0.92}
      style={styles.centerButtonWrapper}>
      <View
        style={[
          styles.centerButton,
          {
            backgroundColor: primaryColor,
            shadowColor: primaryColor,
            shadowOpacity: isFocused ? 0.4 : 0.2,
            shadowRadius: isFocused ? 16 : 8,
          },
        ]}>
        <Text style={styles.centerIcon}>⚡</Text>
      </View>
      <Text
        style={[
          styles.centerLabel,
          {color: isFocused ? primaryColor : '#9CA3AF'},
        ]}>
        실행
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    marginTop: -16,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {width: 0, height: 4},
    elevation: 8,
  },
  centerIcon: {
    fontSize: 24,
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
});
