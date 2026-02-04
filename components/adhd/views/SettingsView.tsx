'use client';

import SettingsContainer from '../settings/SettingsContainer';

interface SettingsViewProps {
  onExit: () => void;
}

/**
 * 설정 뷰
 *
 * ADHDContainer에서 사용되는 설정 모드 래퍼입니다.
 */
export default function SettingsView({ onExit }: SettingsViewProps) {
  return <SettingsContainer onExit={onExit} />;
}
