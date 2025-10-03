'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Smartphone, Home, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetSettings } from '@/components/widgets/WidgetSettings';
import { useAuth } from '@/app/context/AuthContext';

function WidgetSettingsPageContent() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // 클라이언트 사이드에서 인증 확인
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('🔒 WidgetSettings - 미인증 상태, 로그인 페이지로 이동');
      router.push('/login?redirect=%2Fsettings%2Fwidgets');
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
          <Smartphone className="h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">위젯 설정</h1>
            <p className="text-muted-foreground text-sm">
              홈 화면 위젯의 모양과 동작을 설정하세요
            </p>
          </div>
        </div>
      </div>

      {/* 위젯 설정 섹션 */}
      <div className="space-y-6">
        {/* 위젯 미리보기 및 설명 */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Home className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">홈 화면 위젯</h2>
          </div>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
            DayStep 위젯을 홈 화면에 추가하면 앱을 열지 않고도 할일과 다짐을 빠르게 확인할 수 있습니다.
          </p>
          <div className="bg-white/50 dark:bg-black/20 p-3 rounded border-2 border-dashed border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              📱 <strong>위젯 추가 방법:</strong> 홈 화면에서 빈 공간을 길게 누른 후 위젯 추가를 선택하고 DayStep을 찾아서 추가하세요.
            </p>
          </div>
        </div>

        {/* 위젯 설정 컴포넌트 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold">위젯 옵션</h2>
          </div>
          <WidgetSettings />
        </div>

        {/* 위젯 사용 팁 */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 위젯 사용 팁</h3>
          <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
            <li>• 위젯을 탭하면 해당 화면으로 바로 이동할 수 있습니다</li>
            <li>• 위젯 크기에 따라 표시되는 정보가 달라집니다</li>
            <li>• 설정을 변경하면 위젯이 자동으로 업데이트됩니다</li>
            <li>• 여러 개의 위젯을 다른 설정으로 추가할 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function WidgetSettingsPage() {
  return <WidgetSettingsPageContent />;
}