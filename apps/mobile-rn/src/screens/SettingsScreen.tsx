/**
 * SettingsScreen — 전체 설정 화면
 * 서브뷰 관리: main / theme / subscription / account / devNotifications(DEV)
 */
import React, {useState, useCallback} from 'react';
import {Modal} from 'react-native';
import {ScreenContainer} from '@/components/core';
import {SettingsMainView} from '@/components/settings/SettingsMainView';
import {ThemeSettingsView} from '@/components/settings/ThemeSettingsView';
import {SubscriptionView} from '@/components/settings/SubscriptionView';
import {AccountView} from '@/components/settings/AccountView';
import {DevNotificationsView} from '@/components/settings/DevNotificationsView';
import {LanguageSettingsView} from '@/components/settings/LanguageSettingsView';
import {AdminPlanLimitsScreen} from '@/screens/admin/AdminPlanLimitsScreen';
import {QAChecklistScreen} from '@/screens/admin/QAChecklistScreen';
import {MarketingToolkitScreen} from '@/screens/admin/MarketingToolkitScreen';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Animated, {FadeIn} from 'react-native-reanimated';
import {FEATURE_FLAGS} from '@/lib/featureFlags';

type SettingsView =
  | 'main'
  | 'theme'
  | 'subscription'
  | 'account'
  | 'language'
  | 'devNotifications'
  | 'adminPlanLimits'
  | 'qaChecklist'
  | 'marketingToolkit';

export default function SettingsScreen() {
  const [view, setView] = useState<SettingsView>('main');

  const goBack = useCallback(() => setView('main'), []);

  const handleNavigate = useCallback((target: string) => {
    setView(target as SettingsView);
  }, []);

  return (
    <>
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

        {view === 'main' && <SettingsMainView onNavigate={handleNavigate} />}
        {view === 'theme' && <ThemeSettingsView onBack={goBack} />}
        {view === 'account' && <AccountView onBack={goBack} />}
        {view === 'language' && <LanguageSettingsView onBack={goBack} />}
        {view === 'adminPlanLimits' && <AdminPlanLimitsScreen onBack={goBack} />}
        {view === 'qaChecklist' && <QAChecklistScreen onBack={goBack} />}
        {view === 'marketingToolkit' && <MarketingToolkitScreen onBack={goBack} />}
        {__DEV__ && view === 'devNotifications' && (
          <DevNotificationsView onBack={goBack} />
        )}
      </ScreenContainer>

      {/* 구독 관리 — Modal fullScreen (결제 비활성 시 마운트 안 함) */}
      {FEATURE_FLAGS.PAYMENTS_ENABLED && (
        <Modal
          visible={view === 'subscription'}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={goBack}>
          <SafeAreaProvider>
            <SubscriptionView onBack={goBack} />
          </SafeAreaProvider>
        </Modal>
      )}

    </>
  );
}
