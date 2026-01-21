'use client';

import { useAuth } from '@/app/context/AuthContext';
import { SettingsSubView } from '@/state/stores/adhdModeStore';
import {
  User,
  Type,
  CheckCircle,
} from 'lucide-react';
import { SyncStatusIndicator } from '@/components/ui/pull-to-refresh';
import ADHDSettingsSection from '@/components/settings/ADHDSettingsSection';

interface SettingsMainContentProps {
  onNavigate: (subView: SettingsSubView) => void;
  onExit: () => void;
}

/**
 * 설정 메인 화면 콘텐츠
 *
 * 기존 /settings 페이지의 콘텐츠를 URL 변경 없이 렌더링합니다.
 */
export default function SettingsMainContent({ onNavigate, onExit }: SettingsMainContentProps) {
  const { user } = useAuth();

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
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">앱 설정</h3>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {/* 글꼴 설정 */}
            <button
              onClick={() => onNavigate('font')}
              className="group w-full text-left"
            >
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 first:rounded-t-xl last:rounded-b-xl"
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
            </button>
          </div>
        </div>

        {/* ADHD 모드 설정 섹션 */}
        <ADHDSettingsSection />

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">알림 및 기능</h3>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {/* 할일 완료 설정 */}
            <button
              onClick={() => onNavigate('todos')}
              className="group w-full text-left"
            >
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 first:rounded-t-xl last:rounded-b-xl"
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
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">계정</h3>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {/* 계정 관리 */}
            <button
              onClick={() => onNavigate('account')}
              className="group w-full text-left"
            >
              <div
                className="flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 first:rounded-t-xl last:rounded-b-xl"
                role="button"
                aria-label="계정 관리 - 프로필 및 보안"
                tabIndex={0}
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">계정 관리</h4>
                  <p className="text-xs text-muted-foreground">프로필 및 보안 설정</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
