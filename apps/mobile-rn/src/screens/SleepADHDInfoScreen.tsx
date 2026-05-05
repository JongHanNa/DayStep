/**
 * SleepADHDInfoScreen — 수면과 ADHD 교육 정보 화면
 */
import React, {useCallback} from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ChevronLeft} from 'lucide-react-native';
import {ScreenContainer, AnimatedPressable, GlassBackground} from '@/components/core';
import {SleepADHDHero} from '@/components/sleep-adhd-info/SleepADHDHero';
import {DopamineDebtSection} from '@/components/sleep-adhd-info/DopamineDebtSection';
import {PrefrontalImpactSection} from '@/components/sleep-adhd-info/PrefrontalImpactSection';
import {ComparisonTableSection} from '@/components/sleep-adhd-info/ComparisonTableSection';
import {ViciousCycleSection} from '@/components/sleep-adhd-info/ViciousCycleSection';
import {ExecutionParalysisSection} from '@/components/sleep-adhd-info/ExecutionParalysisSection';
import {SourcesCitation} from '@/components/common/SourcesCitation';
import {SLEEP_ADHD_SOURCES, SLEEP_ADHD_DISCLAIMER} from '@/constants/sleep-adhd-info-data';

export default function SleepADHDInfoScreen() {
  const navigation = useNavigation<any>();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <ScreenContainer>
      {/* 상단 nav: 뒤로가기 글라스 버튼 */}
      <View style={styles.navBar}>
        <AnimatedPressable
          onPress={handleGoBack}
          hapticType="light"
          scaleValue={0.9}
          style={styles.backBtn}>
          <GlassBackground
            blurAmount={16}
            overlayColor="rgba(255,255,255,0.55)"
            style={styles.backBtnInner}>
            <View style={styles.backBtnContent}>
              <ChevronLeft size={20} color="#9CA3AF" />
            </View>
          </GlassBackground>
        </AnimatedPressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <SleepADHDHero />
        <DopamineDebtSection />
        <PrefrontalImpactSection />
        <ComparisonTableSection />
        <ViciousCycleSection />
        <ExecutionParalysisSection />
        <SourcesCitation sources={SLEEP_ADHD_SOURCES} disclaimer={SLEEP_ADHD_DISCLAIMER} />
        <View style={{height: 60}} />
      </ScrollView>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backBtnInner: {
    flex: 1,
    borderRadius: 20,
  },
  backBtnContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
});
