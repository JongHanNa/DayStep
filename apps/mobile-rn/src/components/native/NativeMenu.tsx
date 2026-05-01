/**
 * LiquidGlassMenu — 리퀴드 글라스 모핑 메뉴 TypeScript 래퍼
 * iOS 26+: 네이티브 SwiftUI glassEffectID 모핑 (원형 버튼 ↔ 사각형 메뉴)
 * iOS 25-: AnimatedPressable + ActionSheetIOS 폴백
 * Android: AnimatedPressable + Modal 드롭다운 메뉴
 *
 * requireNativeComponent은 모듈 레벨에서 1회만 호출 (조건부 호출 금지)
 */
import React, {useCallback, useRef, useState} from 'react';
import {
  requireNativeComponent,
  ActionSheetIOS,
  View,
  StyleSheet,
  Platform,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  findNodeHandle,
  UIManager,
} from 'react-native';
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

// iOS에서만 모듈 레벨에서 1회 등록 (Android에는 네이티브 뷰 없음)
const NativeLiquidGlassMenu = Platform.OS === 'ios'
  ? requireNativeComponent<NativeLiquidGlassMenuProps>('LiquidGlassMenu')
  : null;

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
  // Android 드롭다운 상태
  const [menuVisible, setMenuVisible] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({x: 0, y: 0, width: 0, height: 0});
  const buttonRef = useRef<View>(null);

  const measureAndShowMenu = useCallback(() => {
    if (buttonRef.current) {
      buttonRef.current.measureInWindow((x, y, width, height) => {
        setButtonLayout({x, y, width, height});
        setMenuVisible(true);
      });
    }
  }, []);

  // iOS 26+: 네이티브 SwiftUI
  if (isIOS26Plus && NativeLiquidGlassMenu) {
    return (
      <NativeLiquidGlassMenu
        systemIconName={systemIconName}
        iconColor={iconColor}
        size={size}
        menuItems={menuItems}
        onMenuItemSelect={(event) => {
          onSelect(event.nativeEvent.key);
        }}
        testID={testID}
        accessibilityIdentifier={testID}
        style={{width: size, height: size}}
      />
    );
  }

  // Android: 커스텀 드롭다운 메뉴
  if (Platform.OS === 'android') {
    return (
      <>
        <AnimatedPressable
          ref={buttonRef}
          testID={testID}
          accessibilityIdentifier={testID}
          accessible={true}
          accessibilityRole="button"
          onPress={measureAndShowMenu}
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

        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.dropdownMenu,
                  {
                    top: buttonLayout.y + buttonLayout.height + 4,
                    left: Math.max(16, buttonLayout.x + buttonLayout.width / 2 - 80),
                  },
                ]}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.dropdownItem,
                      index < menuItems.length - 1 && styles.dropdownItemBorder,
                    ]}
                    onPress={() => {
                      setMenuVisible(false);
                      onSelect(item.key);
                    }}
                    activeOpacity={0.6}>
                    <Text style={styles.dropdownItemText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </>
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
  // Android 드롭다운 메뉴 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  dropdownMenu: {
    position: 'absolute',
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
});
