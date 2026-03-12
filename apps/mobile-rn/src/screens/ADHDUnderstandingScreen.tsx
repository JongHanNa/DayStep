/**
 * ADHDUnderstandingScreen — ADHD 이해하기 메인 화면
 * Design C(비주얼 맵) 기본 + LiquidGlassMenu로 A/B/C 전환
 */
import React, {useState, useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ChevronLeft, Menu} from 'lucide-react-native';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {LiquidGlassMenu} from '@/components/native/LiquidGlassMenu';
import {useTheme} from '@/theme';
import {VisualMapView} from '@/components/adhd-understanding/VisualMapView';
import {AccordionGuideView} from '@/components/adhd-understanding/AccordionGuideView';
import {CardReaderView} from '@/components/adhd-understanding/CardReaderView';

type DesignType = 'visualMap' | 'accordion' | 'cards';

const MENU_ITEMS = [
  {title: 'C. 비주얼 맵', key: 'visualMap'},
  {title: 'A. 아코디언 가이드', key: 'accordion'},
  {title: 'B. 카드 리더', key: 'cards'},
];

export default function ADHDUnderstandingScreen() {
  const navigation = useNavigation();
  const {primaryColor} = useTheme();
  const [activeDesign, setActiveDesign] = useState<DesignType>('visualMap');

  const handleMenuSelect = useCallback((key: string) => {
    setActiveDesign(key as DesignType);
  }, []);

  return (
    <ScreenContainer>
      {/* 상단 네비게이션 바 */}
      <View style={styles.navBar}>
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          hapticType="light"
          scaleValue={0.9}
          style={styles.backBtn}>
          <ChevronLeft size={24} color="#1A1A2E" />
        </AnimatedPressable>

        <LiquidGlassMenu
          systemIconName="line.3.horizontal"
          iconColor={primaryColor}
          size={40}
          menuItems={MENU_ITEMS}
          onSelect={handleMenuSelect}
          fallbackIcon={<Menu size={20} color={primaryColor} />}
        />
      </View>

      {/* 디자인 뷰 전환 */}
      {activeDesign === 'visualMap' && <VisualMapView />}
      {activeDesign === 'accordion' && <AccordionGuideView />}
      {activeDesign === 'cards' && <CardReaderView />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
