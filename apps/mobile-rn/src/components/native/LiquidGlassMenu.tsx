/**
 * LiquidGlassMenu — 리퀴드 글라스 모핑 메뉴 TypeScript 래퍼
 * iOS 26+: 네이티브 SwiftUI glassEffectID 모핑 (원형 버튼 ↔ 사각형 메뉴)
 * iOS 25-: AnimatedPressable + ActionSheetIOS 폴백
 *
 * requireNativeComponent은 모듈 레벨에서 1회만 호출 (조건부 호출 금지)
 */
import React from 'react';
import {requireNativeComponent, ActionSheetIOS, View, StyleSheet} from 'react-native';
import {AnimatedPressable, GlassBackground} from '@/components/core';
import {isIOS26Plus} from './utils';

interface MenuItem {
  title: string;
  key: string;
}

interface NativeLiquidGlassMenuProps {
  systemIconName: string;
  iconColor?: string;
  size?: number;
  menuItems: MenuItem[];
  onMenuItemSelect?: (event: {nativeEvent: {key: string}}) => void;
  style?: any;
}

// 모듈 레벨에서 1회 등록
const NativeLiquidGlassMenu =
  requireNativeComponent<NativeLiquidGlassMenuProps>('LiquidGlassMenu');

interface LiquidGlassMenuProps {
  systemIconName: string;
  iconColor?: string;
  size?: number;
  menuItems: MenuItem[];
  onSelect: (key: string) => void;
  /** iOS 25- 폴백 시 렌더링할 아이콘 */
  fallbackIcon?: React.ReactNode;
  /** XCUITest용 식별자 */
  testID?: string;
}

export function LiquidGlassMenu({
  systemIconName,
  iconColor = '#6B7280',
  size = 40,
  menuItems,
  onSelect,
  fallbackIcon,
  testID,
}: LiquidGlassMenuProps): React.ReactElement {
  if (isIOS26Plus) {
    return (
      <NativeLiquidGlassMenu
        systemIconName={systemIconName}
        iconColor={iconColor}
        size={size}
        menuItems={menuItems}
        onMenuItemSelect={(event) => {
          onSelect(event.nativeEvent.key);
        }}
        style={{width: size, height: size}}
      />
    );
  }

  // iOS 25- 폴백: ActionSheetIOS
  return (
    <AnimatedPressable
      testID={testID}
      accessibilityIdentifier={testID}
      accessible={true}
      accessibilityRole="button"
      onPress={() => {
        const options = [...menuItems.map(item => item.title), '취소'];
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: menuItems.length,
          },
          buttonIndex => {
            if (buttonIndex < menuItems.length) {
              onSelect(menuItems[buttonIndex].key);
            }
          },
        );
      }}
      hapticType="light"
      scaleValue={0.9}
      style={[styles.btn, {width: size, height: size}]}>
      <GlassBackground
        blurAmount={16}
        overlayColor="rgba(255,255,255,0.55)"
        style={styles.btnInner}>
        <View style={styles.btnContent}>
          {fallbackIcon}
        </View>
      </GlassBackground>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  btnInner: {
    flex: 1,
    borderRadius: 20,
  },
  btnContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
