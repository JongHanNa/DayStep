import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'secondary' | 'muted';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
};

const colorClasses = {
  primary: 'border-primary',
  secondary: 'border-secondary',
  muted: 'border-muted-foreground'
};

/**
 * 로딩 스피너 컴포넌트
 * 다양한 크기와 색상을 지원하는 회전 애니메이션 로딩 표시
 */
export function LoadingSpinner({ 
  size = 'md', 
  className, 
  color = 'primary' 
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-transparent border-t-current',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      role="status"
      aria-label="로딩 중"
    >
      <span className="sr-only">LoadingSpinner 로딩 중...</span>
    </div>
  );
}

/**
 * 중앙 정렬된 로딩 스피너
 * 전체 화면 또는 컨테이너 중앙에 표시
 */
export function CenteredLoadingSpinner({ 
  size = 'lg', 
  className,
  message = '로딩 중...'
}: LoadingSpinnerProps & { message?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <LoadingSpinner size={size} />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * 인라인 로딩 스피너
 * 버튼이나 텍스트 옆에 표시하기 적합
 */
export function InlineLoadingSpinner({ 
  size = 'sm', 
  className 
}: LoadingSpinnerProps) {
  return (
    <LoadingSpinner 
      size={size} 
      className={cn('inline-block', className)} 
    />
  );
}