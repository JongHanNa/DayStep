'use client';

import { useEffect } from 'react';
import { ArrowLeft, Calendar, CheckCircle, AlertCircle, RefreshCw, Link as LinkIcon, Unlink } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useGoogleCalendarStore } from '@/state/stores/googleCalendarStore';
import { GoogleCalendarAuth } from '@/components/calendar/GoogleCalendarAuth';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function GoogleCalendarSettingsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const {
    isAuthenticated: isGoogleConnected,
    isLoading: isSyncing,
    lastSyncTime,
    error,
    calendars,
    selectedCalendars,
    events,
    setTokens,
    setCalendars,
    syncEvents,
    disconnect,
    toggleCalendar,
    setError
  } = useGoogleCalendarStore();

  // 클라이언트 사이드에서 인증 확인
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('🔒 Google Calendar Settings - 미인증 상태, 로그인 페이지로 이동');
      router.push('/login?redirect=%2Fsettings%2Fgoogle-calendar');
    }
  }, [loading, isAuthenticated, router]);

  // 로딩 중이거나 미인증 상태일 때
  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }


  const handleDisconnect = () => {
    disconnect();
    console.log('구글 캘린더 연동 해제');
  };

  const handleSync = async () => {
    console.log('🔄 [Debug] 수동 캘린더 동기화 시작...');
    try {
      await syncEvents();
      console.log('✅ [Debug] 수동 캘린더 동기화 완료');
    } catch (error) {
      console.error('❌ [Debug] 수동 캘린더 동기화 실패:', error);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <header className="space-y-4">
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="설정으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">구글 캘린더 연동</h1>
            <p className="text-muted-foreground">캘린더 이벤트를 DayStep에서 확인하세요</p>
          </div>
        </div>
      </header>

      {/* 인증되지 않은 상태: GoogleCalendarAuth 컴포넌트 표시 */}
      {!isGoogleConnected ? (
        <GoogleCalendarAuth />
      ) : (
        /* 인증된 상태: 연결 상태 및 관리 카드 */
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">연동 완료</h2>
              <p className="text-sm text-muted-foreground">
                구글 캘린더가 성공적으로 연결되었습니다
              </p>
            </div>
          </div>

          {/* 동기화 및 연동 해제 버튼 */}
          <div className="space-y-3">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSyncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  동기화 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  지금 동기화
                </>
              )}
            </button>

            <button
              onClick={handleDisconnect}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Unlink className="w-4 h-4" />
              연동 해제
            </button>
          </div>

          {/* 마지막 동기화 시간 */}
          {lastSyncTime && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                마지막 동기화: {format(new Date(lastSyncTime), 'MM월 dd일 HH:mm', { locale: ko })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 설명 카드 */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">캘린더 연동 정보</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p>구글 캘린더의 이벤트를 DayStep 타임라인에서 확인할 수 있습니다</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p>종일 이벤트는 종일 섹션에, 시간 지정 이벤트는 해당 시간대에 표시됩니다</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p>읽기 전용으로 연동되며, DayStep에서 구글 캘린더 이벤트를 수정할 수 없습니다</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p>개인정보는 안전하게 보호되며, 필요한 권한만 요청합니다</p>
          </div>
        </div>
      </div>

      {/* 캘린더 선택 섹션 */}
      {isGoogleConnected && calendars.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">캘린더 선택</h3>
          <p className="text-sm text-muted-foreground mb-4">
            동기화할 캘린더를 선택하세요. 선택된 캘린더의 이벤트만 타임라인에 표시됩니다.
          </p>

          <div className="space-y-3">
            {calendars.map((calendar) => {
              const isSelected = selectedCalendars.includes(calendar.id);
              const eventCount = events.filter(event => event.calendarId === calendar.id).length;

              return (
                <div
                  key={calendar.id}
                  onClick={() => toggleCalendar(calendar.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: isSelected ? '#3b82f6' : '#d1d5db',
                          backgroundColor: isSelected ? '#3b82f6' : 'transparent'
                        }}
                      >
                        {isSelected && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: calendar.backgroundColor || '#3788d8' }}
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          {calendar.name}
                        </span>
                        {calendar.primary && (
                          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            기본
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {eventCount}개 이벤트
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedCalendars.length === 0 && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                최소 하나의 캘린더를 선택해야 합니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 이벤트 요약 */}
      {isGoogleConnected && events.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">동기화된 이벤트</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{events.filter(e => e.isAllDay).length}</div>
              <div className="text-xs text-muted-foreground">종일 이벤트</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{events.filter(e => !e.isAllDay).length}</div>
              <div className="text-xs text-muted-foreground">시간 지정 이벤트</div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            이벤트들이 타임라인에 자동으로 표시됩니다. 종일 이벤트는 상단의 종일 섹션에, 시간 지정 이벤트는 해당 시간대에 표시됩니다.
          </p>
        </div>
      )}
    </div>
  );
}