'use client';

import { useAuth } from '@/app/context/AuthContext';
import { ArrowLeft, Users, Smartphone, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useContacts } from '@/lib/contacts/useContacts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function ContactsSettingsContent() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const {
    contacts,
    permission,
    syncState,
    isAvailable,
    hasPermission,
    isLoading,
    syncContacts,
    requestPermission,
    getContactsByRelationship
  } = useContacts();

  // 클라이언트 사이드에서 인증 확인
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=%2Fsettings%2Fcontacts');
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

  // 권한 요청 핸들러
  const handleRequestPermission = async () => {
    try {
      setIsSyncing(true);
      const result = await requestPermission();
      
      if (result.granted) {
        // 권한이 허용되면 바로 동기화 시도
        await syncContacts(true);
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // 동기화 핸들러
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncContacts(true);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const relationshipGroups = getContactsByRelationship();

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">연락처 연동</h1>
          <p className="text-muted-foreground">
            할일에 연결할 연락처를 관리하세요
          </p>
        </div>
      </div>

      {/* 연동 상태 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>연동 상태</CardTitle>
              <CardDescription>현재 연락처 동기화 상태입니다</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 플랫폼 지원 상태 */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">네이티브 지원</span>
            </div>
            <Badge variant={isAvailable ? "default" : "secondary"}>
              {isAvailable ? "사용 가능" : "웹 환경"}
            </Badge>
          </div>

          {/* 권한 상태 */}
          {isAvailable && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {hasPermission ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="font-medium">연락처 권한</span>
              </div>
              <Badge variant={hasPermission ? "default" : "outline"}>
                {hasPermission ? "허용됨" : "필요함"}
              </Badge>
            </div>
          )}

          {/* 동기화 상태 */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {isLoading || isSyncing ? (
                <Loader className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              <div>
                <div className="font-medium">연락처 수</div>
                {syncState.lastSyncDate && (
                  <div className="text-sm text-muted-foreground">
                    마지막 동기화: {new Date(syncState.lastSyncDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            <Badge variant="outline">
              {contacts.length}명
            </Badge>
          </div>

          {/* 오류 메시지 */}
          {syncState.errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">오류</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{syncState.errorMessage}</p>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="flex gap-2 pt-2">
            {!isAvailable ? (
              <div className="text-sm text-muted-foreground">
                연락처 연동은 모바일 앱에서만 사용할 수 있습니다.
              </div>
            ) : !hasPermission ? (
              <Button 
                onClick={handleRequestPermission}
                disabled={isSyncing}
                className="flex-1"
              >
                {isSyncing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    권한 요청 중...
                  </>
                ) : (
                  "연락처 권한 허용"
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleSync}
                disabled={isLoading || isSyncing}
                variant="outline"
                className="flex-1"
              >
                {isLoading || isSyncing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  "연락처 동기화"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 연락처 그룹별 요약 */}
      {contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>연락처 분류</CardTitle>
            <CardDescription>관계별로 분류된 연락처 현황입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(relationshipGroups).map(([relationship, contactList]) => (
                <div
                  key={relationship}
                  className="p-3 bg-muted rounded-lg text-center"
                >
                  <div className="text-2xl font-bold text-primary">
                    {contactList.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {relationship === 'family' && '가족'}
                    {relationship === 'friend' && '친구'}
                    {relationship === 'colleague' && '동료'}
                    {relationship === 'business' && '비즈니스'}
                    {relationship === 'other' && '기타'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 도움말 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>연락처 연동 가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>모바일 앱</strong>에서 아이폰/안드로이드 연락처를 자동으로 가져올 수 있습니다.</p>
            <p>• 연락처는 <strong>할일 작성 시</strong> 관련 인물을 쉽게 연결할 수 있도록 도움을 줍니다.</p>
            <p>• <strong>개인정보 보호</strong>: 이름, 회사 정보만 사용하며 전화번호/이메일은 수집하지 않습니다.</p>
            <p>• 연락처 데이터는 <strong>기기에만 저장</strong>되며 외부로 전송되지 않습니다.</p>
            <p>• 웹 브라우저에서는 테스트용 더미 연락처가 표시됩니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ContactsSettingsPage() {
  return <ContactsSettingsContent />;
}