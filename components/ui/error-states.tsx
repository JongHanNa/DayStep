'use client';

import React from 'react';
import { 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Home, 
  Search,
  Server,
  Shield,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

/**
 * 네트워크 연결 오류
 */
export function NetworkError({ onRetry, className }: ErrorStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <WifiOff className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">네트워크 연결 오류</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        인터넷 연결을 확인하고 다시 시도해주세요.
      </p>
      <div className="space-x-3">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 서버 오류 (500)
 */
export function ServerError({ onRetry, onGoHome, className }: ErrorStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <Server className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">서버 오류</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>
      <div className="space-x-3">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        )}
        {onGoHome && (
          <Button onClick={onGoHome} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            홈으로 이동
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 페이지를 찾을 수 없음 (404)
 */
export function NotFoundError({ onGoHome, className }: ErrorStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">페이지를 찾을 수 없습니다</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <div className="space-x-3">
        {onGoHome && (
          <Button onClick={onGoHome}>
            <Home className="h-4 w-4 mr-2" />
            홈으로 이동
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 권한 없음 (403)
 */
export function UnauthorizedError({ onGoHome, className }: ErrorStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">접근 권한이 없습니다</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        이 페이지에 접근할 권한이 없습니다. 로그인이 필요할 수 있습니다.
      </p>
      <div className="space-x-3">
        <Button onClick={() => window.location.href = '/login'}>
          로그인
        </Button>
        {onGoHome && (
          <Button onClick={onGoHome} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            홈으로 이동
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 요청 시간 초과
 */
export function TimeoutError({ onRetry, className }: ErrorStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">요청 시간 초과</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        서버 응답이 지연되고 있습니다. 다시 시도해주세요.
      </p>
      <div className="space-x-3">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 일반적인 에러 상태
 */
export function GenericError({ onRetry, onGoHome, className }: ErrorStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">문제가 발생했습니다</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>
      <div className="space-x-3">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        )}
        {onGoHome && (
          <Button onClick={onGoHome} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            홈으로 이동
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 빈 상태 표시
 */
export function EmptyState({ 
  title = "아직 항목이 없습니다",
  description = "첫 번째 항목을 추가해보세요.",
  actionLabel,
  onAction,
  icon: Icon = Search,
  className 
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <Icon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * HTTP 상태 코드에 따른 에러 컴포넌트 선택
 */
export function ErrorByStatus({ 
  status, 
  onRetry, 
  onGoHome, 
  className 
}: {
  status: number;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}) {
  switch (status) {
    case 404:
      return <NotFoundError onGoHome={onGoHome} className={className} />;
    case 403:
    case 401:
      return <UnauthorizedError onGoHome={onGoHome} className={className} />;
    case 500:
    case 502:
    case 503:
      return <ServerError onRetry={onRetry} onGoHome={onGoHome} className={className} />;
    case 408:
      return <TimeoutError onRetry={onRetry} className={className} />;
    default:
      return <GenericError onRetry={onRetry} onGoHome={onGoHome} className={className} />;
  }
}