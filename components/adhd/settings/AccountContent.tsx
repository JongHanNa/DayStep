'use client';

import { ArrowLeft, User, LogOut, Shield, Calendar, Database, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/context/AuthContext';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AccountContentProps {
  onBack: () => void;
}

/**
 * 계정 관리 콘텐츠
 *
 * 기존 /settings/account 페이지의 콘텐츠를 URL 변경 없이 렌더링합니다.
 */
export default function AccountContent({ onBack }: AccountContentProps) {
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
    } catch (error) {
      console.error('로그아웃 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const accountInfo = [
    {
      label: '이름',
      value: user?.user_metadata?.name || '사용자',
      icon: User
    },
    {
      label: '이메일',
      value: user?.email || '',
      icon: Shield
    },
    {
      label: '계정 생성일',
      value: user?.created_at ? format(new Date(user.created_at), 'yyyy년 MM월 dd일', { locale: ko }) : '알 수 없음',
      icon: Calendar
    },
    {
      label: '최근 로그인',
      value: user?.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko }) : '알 수 없음',
      icon: Database
    }
  ];

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="btn btn-circle btn-ghost btn-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">계정 관리</h1>
          <p className="text-muted-foreground">계정 정보와 관리 옵션을 확인하세요</p>
        </div>
      </div>

      {/* 계정 정보 요약 카드 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{user?.user_metadata?.name || '사용자'}</h2>
            <p className="opacity-90">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                {user?.app_metadata?.provider ? user.app_metadata.provider.toUpperCase() : 'EMAIL'}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                활성 계정
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 상세 계정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>계정 정보</CardTitle>
          <CardDescription>
            현재 계정의 상세 정보입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accountInfo.map((info, index) => {
              const IconComponent = info.icon;
              return (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-muted-foreground">{info.label}</div>
                    <div className="text-sm">{info.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 계정 통계 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {user?.user_metadata?.provider_count || '1'}
            </div>
            <div className="text-sm text-muted-foreground">연결된 계정</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {user?.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
            </div>
            <div className="text-sm text-muted-foreground">사용한 일수</div>
          </CardContent>
        </Card>
      </div>

      {/* 계정 보안 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            보안 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">이메일 인증</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              완료
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">보안 로그인</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              활성
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 위험한 작업 */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            계정 관리
          </CardTitle>
          <CardDescription>
            계정과 관련된 중요한 작업을 수행할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            disabled={isLoading}
            className="w-full flex items-center gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {isLoading ? '로그아웃 중...' : '로그아웃'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            로그아웃하면 모든 기기에서 계정 접근이 해제됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
