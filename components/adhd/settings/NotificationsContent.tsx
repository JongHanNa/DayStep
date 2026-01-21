'use client';

import { ArrowLeft, Bell, Settings } from 'lucide-react';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { NotificationManagerComponent } from '@/components/notifications/NotificationManager';

interface NotificationsContentProps {
  onBack: () => void;
}

/**
 * 알림 설정 콘텐츠
 *
 * 기존 /settings/notifications 페이지의 콘텐츠를 URL 변경 없이 렌더링합니다.
 */
export default function NotificationsContent({ onBack }: NotificationsContentProps) {
  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="btn btn-circle btn-ghost btn-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">알림 설정</h1>
            <p className="text-muted-foreground text-sm">
              앱 푸시 알림과 예약된 알림을 관리하세요
            </p>
          </div>
        </div>
      </div>

      {/* 네이티브 알림 설정 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold">푸시 알림</h2>
        </div>
        <NotificationSettings />
      </div>

      {/* 알림 관리 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold">알림 관리</h2>
        </div>
        <NotificationManagerComponent />
      </div>
    </div>
  );
}
