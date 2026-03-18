/**
 * ADHDUnderstandingScreen — ADHD 이해하기 메인 화면
 * Design C(비주얼 맵) 기본 + LiquidGlassMenu로 A/B/C 전환
 */
import React, {useState, useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {Menu} from 'lucide-react-native';
import {ScreenContainer} from '@/components/core';
import {LiquidGlassMenu} from '@/components/native/LiquidGlassMenu';
import {useTheme} from '@/theme';
import {VisualMapView} from '@/components/adhd-understanding/VisualMapView';
import {AccordionGuideView} from '@/components/adhd-understanding/AccordionGuideView';
import {CardReaderView} from '@/components/adhd-understanding/CardReaderView';

type DesignType = 'visualMap' | 'accordion' | 'cards';

const MENU_ITEMS = [
  {title: '비주얼 맵', key: 'visualMap'},
  {title: '아코디언 가이드', key: 'accordion'},
  {title: '카드 리더', key: 'cards'},
];

export default function ADHDUnderstandingScreen() {
  const {primaryColor} = useTheme();
  const [activeDesign, setActiveDesign] = useState<DesignType>('visualMap');

  const handleMenuSelect = useCallback((key: string) => {
    setActiveDesign(key as DesignType);
  }, []);

  return (
    <ScreenContainer>
      {/* 상단 네비게이션 바 */}
      <View style={styles.navBar}>
        <LiquidGlassMenu
          systemIconName="line.3.horizontal"
          iconColor="#9CA3AF"
          size={40}
          menuItems={MENU_ITEMS}
          onSelect={handleMenuSelect}
          fallbackIcon={<Menu size={20} color="#9CA3AF" />}
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
});
