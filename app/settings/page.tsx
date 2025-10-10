'use client';

import { useAuth } from '@/app/context/AuthContext';
import {
  User,
  Bell,
  Clock,
  Type,
  Users,
  Moon,
  Calendar,
  CheckCircle,
  Layers,
  Settings,
  Target,
  BookOpen,
  FolderOpen
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { SyncStatusIndicator } from '@/components/ui/pull-to-refresh';
import { useContacts } from '@/lib/contacts/useContacts';

function SettingsPageContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const { timeFormat } = useSettingsStore();
  const { showDayStartGap, showPastGaps } = useTimelineViewStore();
  const { contacts, isAvailable } = useContacts();
  const router = useRouter();

  // 클라이언트 사이드에서 인증 확인 (AuthGuard 대신)
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('🔒 Settings - 미인증 상태, 로그인 페이지로 이동');
      router.push('/login?redirect=%2Fsettings');
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


  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-8">
      {/* 페이지 헤더 */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">설정</h1>
            <p className="text-sm text-muted-foreground">
              앱 설정과 계정 정보를 관리하세요
            </p>
          </div>
          {/* 동기화 상태 표시 */}
          <SyncStatusIndicator />
        </div>
      </header>

      {/* 계정 정보 카드 - 미니멀 디자인 */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">계정 정보</h2>
            <p className="text-sm text-muted-foreground">로그인된 계정 정보</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">이름</span>
            <span className="text-sm font-medium text-foreground">
              {user?.user_metadata?.name || '사용자'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">이메일</span>
            <span className="text-sm font-medium text-foreground">
              {user?.email}
            </span>
          </div>
        </div>
      </div>

      {/* 설정 메뉴 - 미니멀 리스트 */}
      <div className="space-y-8">
        {/* Second Brain 설정 */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Second Brain 설정</h3>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {/* Areas (책임 영역) */}
            <Link href="/settings/second-brain/areas" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 first:rounded-t-xl last:rounded-b-xl"
                role="button"
                aria-label="책임 영역 (Areas) - 지속적 책임 영역 관리"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">책임 영역 (Areas)</h4>
                  <p className="text-xs text-muted-foreground">지속적 책임 영역 관리</p>
                </div>
              </div>
            </Link>

            {/* Resources (관심 자원) */}
            <Link href="/settings/second-brain/resources" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="관심 자원 (Resources) - 관심 주제 및 자료 관리"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">관심 자원 (Resources)</h4>
                  <p className="text-xs text-muted-foreground">관심 주제 및 자료 관리</p>
                </div>
              </div>
            </Link>

            {/* Goals (목표) */}
            <Link href="/settings/second-brain/goals" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="목표 (Goals) - 장기 목표 설정 및 관리"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">목표 (Goals)</h4>
                  <p className="text-xs text-muted-foreground">장기 목표 설정 및 관리</p>
                </div>
              </div>
            </Link>

            {/* Projects (프로젝트) */}
            <Link href="/settings/second-brain/projects" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="프로젝트 (Projects) - 진행 중인 프로젝트 관리"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">프로젝트 (Projects)</h4>
                  <p className="text-xs text-muted-foreground">진행 중인 프로젝트 관리</p>
                </div>
              </div>
            </Link>

            {/* Todos (할일) */}
            <Link href="/settings/second-brain/todos" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 last:rounded-b-xl"
                role="button"
                aria-label="할일 (Todos) - 실행할 작업 관리"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">할일 (Todos)</h4>
                  <p className="text-xs text-muted-foreground">실행할 작업 관리</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">앱 설정</h3>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {/* 테마 설정 */}
            <Link href="/settings/theme" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 first:rounded-t-xl last:rounded-b-xl"
                role="button"
                aria-label="테마 설정 - 라이트/다크 모드 변경"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Moon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">테마</h4>
                  <p className="text-xs text-muted-foreground">라이트/다크 모드</p>
                </div>
              </div>
            </Link>

            {/* 글꼴 설정 */}
            <Link href="/settings/font" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="글꼴 설정 - 읽기 편한 글꼴 선택"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Type className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">글꼴</h4>
                  <p className="text-xs text-muted-foreground">읽기 편한 글꼴 선택</p>
                </div>
              </div>
            </Link>

            {/* 시간 표기법 설정 */}
            <Link href="/settings/time-format" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="시간 표기법 설정 - 12시간 또는 24시간 형식"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">시간 표기</h4>
                  <p className="text-xs text-muted-foreground">
                    {timeFormat === '12h' ? '12시간 형식' : '24시간 형식'}
                  </p>
                </div>
              </div>
            </Link>

            {/* 타임라인 표시 설정 */}
            <Link href="/settings/timeline" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="타임라인 표시 설정 - 타임라인 보기 옵션"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">타임라인</h4>
                  <p className="text-xs text-muted-foreground">
                    {(showDayStartGap && showPastGaps) ? '전체 표시 모드' : '압축 표시 모드'}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">알림 및 기능</h3>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {/* 할일 완료 설정 */}
            <Link href="/settings/todos" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="할일 완료 설정 - 축하 효과 및 알림"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">할일 완료</h4>
                  <p className="text-xs text-muted-foreground">축하 효과 및 알림</p>
                </div>
              </div>
            </Link>

            {/* 알림 설정 */}
            <Link href="/settings/notifications" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="알림 설정 - 푸시 알림 관리"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">알림</h4>
                  <p className="text-xs text-muted-foreground">푸시 알림 관리</p>
                </div>
              </div>
            </Link>

            {/* 위젯 설정 */}
            <Link href="/settings/widgets" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="위젯 설정 - 홈 화면 위젯"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Layers className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">위젯</h4>
                  <p className="text-xs text-muted-foreground">홈 화면 위젯</p>
                </div>
              </div>
            </Link>

            {/* 구글 캘린더 연동 설정 */}
            <Link href="/settings/google-calendar" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="구글 캘린더 연동 설정"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">구글 캘린더</h4>
                  <p className="text-xs text-muted-foreground">캘린더 이벤트 가져오기</p>
                </div>
              </div>
            </Link>

            {/* 연락처 연동 설정 */}
            <Link href="/settings/contacts" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="button"
                aria-label="연락처 연동 설정"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">연락처 연동</h4>
                  <p className="text-xs text-muted-foreground">
                    {isAvailable ? `${contacts.length}명 동기화됨` : '웹에서 사용 불가'}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">계정</h3>
          <div className="bg-card border border-border rounded-xl">
            {/* 계정 관리 */}
            <Link href="/settings/account" className="group">
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl"
                role="button"
                aria-label="계정 관리 - 프로필 및 보안"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">계정 관리</h4>
                  <p className="text-xs text-muted-foreground">프로필 및 보안 설정</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}