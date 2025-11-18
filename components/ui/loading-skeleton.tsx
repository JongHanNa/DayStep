import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'default' | 'rounded' | 'circular';
  animate?: boolean;
}

/**
 * 기본 스켈레톤 컴포넌트
 * 콘텐츠가 로딩 중일 때 자연스러운 placeholder 제공
 */
export function LoadingSkeleton({ 
  className, 
  variant = 'default',
  animate = true 
}: LoadingSkeletonProps) {
  const baseClasses = 'bg-muted';
  const animateClasses = animate ? 'animate-pulse' : '';
  
  const variantClasses = {
    default: 'rounded',
    rounded: 'rounded-lg',
    circular: 'rounded-full'
  };

  return (
    <div
      className={cn(
        baseClasses,
        animateClasses,
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="콘텐츠 로딩 중"
    >
      <span className="sr-only">LoadingSkeleton 로딩 중...</span>
    </div>
  );
}

/**
 * 텍스트 라인 스켈레톤
 */
export function TextSkeleton({ 
  lines = 3, 
  className 
}: { 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <LoadingSkeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

/**
 * 카드 스켈레톤
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 border rounded-lg space-y-4', className)}>
      <div className="flex items-center space-x-3">
        <LoadingSkeleton className="h-10 w-10" variant="circular" />
        <div className="space-y-2 flex-1">
          <LoadingSkeleton className="h-4 w-1/2" />
          <LoadingSkeleton className="h-3 w-1/3" />
        </div>
      </div>
      <TextSkeleton lines={2} />
    </div>
  );
}

/**
 * 할일 항목 스켈레톤
 */
export function TodoItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center space-x-3 p-3 border rounded-lg', className)}>
      <LoadingSkeleton className="h-5 w-5" variant="rounded" />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton className="h-4 w-3/4" />
        <LoadingSkeleton className="h-3 w-1/2" />
      </div>
      <LoadingSkeleton className="h-6 w-16" variant="rounded" />
    </div>
  );
}

/**
 * 페이지 로딩 스켈레톤
 */
export function PageLoadingSkeleton({
  title = true,
  items = 5,
  variant = 'card',
  className
}: {
  title?: boolean;
  items?: number;
  variant?: 'card' | 'todo';
  className?: string;
}) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'todo':
        return <TodoItemSkeleton />;
      default:
        return <CardSkeleton />;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div className="space-y-2">
          <LoadingSkeleton className="h-8 w-1/3" />
          <LoadingSkeleton className="h-4 w-1/2" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: items }, (_, i) => (
          <div key={i}>
            {renderSkeleton()}
          </div>
        ))}
      </div>
    </div>
  );
}