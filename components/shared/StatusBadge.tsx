'use client';

import { cn } from '@/lib/utils';
import type { DateStatus } from '@/lib/date-utils';
import { getDateStatusInfo } from '@/lib/date-utils';

interface StatusBadgeProps {
  status: DateStatus;
  className?: string;
}

const colorClasses: Record<string, string> = {
  neutral: 'bg-base-content/10 text-base-content/60',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  warning: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  error: 'bg-error/10 text-error',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, color } = getDateStatusInfo(status);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        colorClasses[color],
        className
      )}
    >
      {label}
    </span>
  );
}
