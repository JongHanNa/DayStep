/**
 * SettingsScreen — 전체 설정 화면
 * 서브뷰 관리: main / font / theme / subscription / account
 */
import React, {useState, useCallback} from 'react';
import {Text} from 'react-native';
import {ScreenContainer} from '@/components/core';
import {SettingsMainView} from '@/components/settings/SettingsMainView';
import {FontSettingsView} from '@/components/settings/FontSettingsView';
import {ThemeSettingsView} from '@/components/settings/ThemeSettingsView';
import {SubscriptionView} from '@/components/settings/SubscriptionView';
import {AccountView} from '@/components/settings/AccountView';
import Animated, {FadeIn} from 'react-native-reanimated';

type SettingsView = 'main' | 'font' | 'theme' | 'subscription' | 'account';

export default function SettingsScreen() {
  const [view, setView] = useState<SettingsView>('main');

  const goBack = useCallback(() => setView('main'), []);

  return (
    <ScreenContainer>
      {/* 메인 제목 (main 뷰에서만) */}
      {view === 'main' && (
        <Animated.Text
          entering={FadeIn.duration(400)}
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: '#1F2937',
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 4,
          }}>
          ⚙️ 설정
        </Animated.Text>
      )}

      {view === 'main' && <SettingsMainView onNavigate={setView} />}
      {view === 'font' && <FontSettingsView onBack={goBack} />}
      {view === 'theme' && <ThemeSettingsView onBack={goBack} />}
      {view === 'subscription' && <SubscriptionView onBack={goBack} />}
      {view === 'account' && <AccountView onBack={goBack} />}
    </ScreenContainer>
  );
}
