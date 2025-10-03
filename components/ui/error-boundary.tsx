'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * React 에러 바운더리 컴포넌트
 * 자식 컴포넌트에서 발생하는 JavaScript 에러를 캐치하고 fallback UI를 표시
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 다음 렌더링에서 fallback UI를 표시하도록 상태를 업데이트
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 정보를 상태에 저장
    this.setState({
      error,
      errorInfo,
    });

    // 외부 에러 로깅 서비스로 에러 전송
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 개발 환경에서 콘솔에 에러 로그
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    // 에러 상태를 리셋하여 컴포넌트 재렌더링
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  handleGoHome = () => {
    // 홈페이지로 이동
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback UI가 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                문제가 발생했습니다
              </h2>
              <p className="text-muted-foreground">
                예상치 못한 오류로 인해 이 부분을 표시할 수 없습니다.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={this.handleRetry}
                variant="default"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                홈으로 이동
              </Button>
            </div>

            {/* 개발 환경에서만 에러 상세 정보 표시 */}
            {this.props.showDetails && process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  에러 상세 정보 (개발용)
                </summary>
                <div className="mt-3 p-4 bg-muted rounded-lg text-xs">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 함수형 컴포넌트에서 사용할 수 있는 HOC
 */
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * 특정 섹션용 에러 바운더리
 */
export function SectionErrorBoundary({ 
  children, 
  title = "이 섹션을 로드할 수 없습니다",
  onRetry
}: {
  children: ReactNode;
  title?: string;
  onRetry?: () => void;
}) {
  const fallback = (
    <div className="p-6 border border-dashed border-red-200 rounded-lg text-center">
      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
      <h3 className="font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        일시적인 문제가 발생했습니다.
      </p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      )}
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}