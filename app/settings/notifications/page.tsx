'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { NotificationManagerComponent } from '@/components/notifications/NotificationManager';
import { useAuth } from '@/app/context/AuthContext';

function NotificationSettingsPageContent() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // 클라이언트 사이드에서 인증 확인
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('🔒 NotificationSettings - 미인증 상태, 로그인 페이지로 이동');
      router.push('/login?redirect=%2Fsettings%2Fnotifications');
    }
  }, [loading, isAuthenticated, router]);

  // 로딩 중이거나 미인증 상태일 때
  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
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

export default function NotificationSettingsPage() {
  return <NotificationSettingsPageContent />;
}
