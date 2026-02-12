'use client';

import React from 'react';

interface WidgetSettingsProps {
  className?: string;
}

/**
 * WidgetSettings (Web Stub)
 *
 * 홈 화면 위젯은 React Native iOS 앱에서만 사용 가능합니다.
 * 웹/Electron 환경에서는 안내 메시지만 표시합니다.
 */
export const WidgetSettings: React.FC<WidgetSettingsProps> = ({ className = '' }) => {
  return (
    <div className={className}>
      <div className="text-center py-8 text-base-content/50">
        <p>홈 화면 위젯은 iOS 앱에서만 사용할 수 있습니다.</p>
      </div>
    </div>
  );
};
