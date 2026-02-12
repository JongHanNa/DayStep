/**
 * Custom Bottom Tab Bar
 * 5탭: 홈 / 플래너 / 실행(중앙) / 노트 / 설정
 * Liquid Glass 플로팅 탭바 — 둥근 캡슐 + 따뜻한 글래스 효과
 */
import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {AnimatedPressable} from '@/components/core';
import {GlassBackground} from '@/components/core';
import {useTheme} from '@/theme';
import {Home, Calendar, Zap, FileText, Settings} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';

const TAB_CONFIG: Record<string, {Icon: LucideIcon; label: string}> = {
  Home: {Icon: Home, label: '홈'},
  Planner: {Icon: Calendar, label: '플래너'},
  Execute: {Icon: Zap, label: '실행'},
  Notes: {Icon: FileText, label: '노트'},
  Settings: {Icon: Settings, label: '설정'},
};

export function CustomTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const {primaryColor} = useTheme();

  return (
    <GlassBackground
      blurType="chromeMaterialLight"
      blurAmount={25}
      overlayColor="rgba(255, 248, 240, 0.82)"
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom, 8),
          borderRadius: 32,
        },
      ]}>
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter = route.name === 'Execute';
          const tabInfo = TAB_CONFIG[route.name] ?? {Icon: Home, label: route.name};

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
              Icon={tabInfo.Icon}
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
  Icon,
  label,
  isFocused,
  primaryColor,
  onPress,
}: {
  Icon: LucideIcon;
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
        <Icon
          size={22}
          color={isFocused ? primaryColor : '#9CA3AF'}
          strokeWidth={isFocused ? 2.2 : 1.8}
        />
        <Animated.Text
          style={[
            styles.tabLabel,
            {color: isFocused ? primaryColor : '#9CA3AF'},
            isFocused && styles.tabLabelActive,
          ]}>
          {label}
        </Animated.Text>
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
        <Zap size={24} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
      </View>
      <Animated.Text
        style={[
          styles.centerLabel,
          {color: isFocused ? primaryColor : '#9CA3AF'},
        ]}>
        실행
      </Animated.Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
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
  centerLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
});
