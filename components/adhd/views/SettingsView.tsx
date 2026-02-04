'use client';

import { useADHDStore, SettingsSubView } from '@/state/stores/adhdStore';
import SettingsMainView from '../settings/SettingsMainView';
import SubscriptionView from '../settings/SubscriptionView';
import AccountView from '../settings/AccountView';
import FontView from '../settings/FontView';
import TodosView from '../settings/TodosView';
import ThemeView from '../settings/ThemeView';
import NotificationsView from '../settings/NotificationsView';
import TimeFormatView from '../settings/TimeFormatView';
import WidgetsView from '../settings/WidgetsView';

interface SettingsViewProps {
  onExit: () => void;
}

/**
 * 설정 뷰
 *
 * URL 변경 없이 subView 상태에 따라 적절한 설정 화면을 렌더링합니다.
 * - main: 설정 메인 화면
 * - subscription: 구독 관리
 * - account: 계정 관리
 * - font: 글꼴 설정
 * - todos: 할일 완료 설정
 * - theme: 테마 설정
 * - notifications: 알림 설정
 * - time-format: 시간 표기법 설정
 * - widgets: 위젯 설정
 */
export default function SettingsView({ onExit }: SettingsViewProps) {
  const { settingsMode, setSettingsSubView, exitSettingsMode } = useADHDStore();
  const { subView } = settingsMode;

  // 설정 메인으로 돌아가기
  const handleBack = () => {
    if (subView === 'main') {
      exitSettingsMode();
    } else {
      setSettingsSubView('main');
    }
  };

  // 서브뷰로 이동
  const handleNavigate = (newSubView: SettingsSubView) => {
    setSettingsSubView(newSubView);
  };

  // 서브뷰에 따른 콘텐츠 렌더링
  const renderContent = () => {
    switch (subView) {
      case 'subscription':
        return <SubscriptionView onBack={handleBack} />;
      case 'account':
        return <AccountView onBack={handleBack} />;
      case 'font':
        return <FontView onBack={handleBack} />;
      case 'todos':
        return <TodosView onBack={handleBack} />;
      case 'theme':
        return <ThemeView onBack={handleBack} />;
      case 'notifications':
        return <NotificationsView onBack={handleBack} />;
      case 'time-format':
        return <TimeFormatView onBack={handleBack} />;
      case 'widgets':
        return <WidgetsView onBack={handleBack} />;
      case 'main':
      default:
        return (
          <SettingsMainView
            onNavigate={handleNavigate}
            onExit={exitSettingsMode}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      {renderContent()}
    </div>
  );
}
