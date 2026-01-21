'use client';

import { useADHDModeStore, SettingsSubView } from '@/state/stores/adhdModeStore';
import SettingsMainContent from './settings/SettingsMainContent';
import SubscriptionContent from './settings/SubscriptionContent';
import AccountContent from './settings/AccountContent';
import FontContent from './settings/FontContent';
import TodosContent from './settings/TodosContent';

interface SettingsModeProps {
  onExit: () => void;
}

/**
 * 설정 모드 메인 컴포넌트
 *
 * URL 변경 없이 subView 상태에 따라 적절한 설정 화면을 렌더링합니다.
 * - main: 설정 메인 화면
 * - subscription: 구독 관리
 * - account: 계정 관리
 * - font: 글꼴 설정
 * - todos: 할일 완료 설정
 * - (기타 서브뷰들은 추후 구현)
 */
export default function SettingsMode({ onExit }: SettingsModeProps) {
  const { settingsMode, setSettingsSubView, exitSettingsMode } = useADHDModeStore();
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
        return <SubscriptionContent onBack={handleBack} />;
      case 'account':
        return <AccountContent onBack={handleBack} />;
      case 'font':
        return <FontContent onBack={handleBack} />;
      case 'todos':
        return <TodosContent onBack={handleBack} />;
      case 'main':
      default:
        return (
          <SettingsMainContent
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
