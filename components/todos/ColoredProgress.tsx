'use client';

import React from 'react';
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ColoredProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  color?: 'green' | 'blue' | 'yellow' | 'orange' | 'red';
}

/**
 * 색상을 지정할 수 있는 Progress 컴포넌트
 */
export const ColoredProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ColoredProgressProps
>(({ className, value = 0, color = 'blue', ...props }, ref) => {
  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500', 
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      value={value}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all",
          colorClasses[color]
        )}
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});

ColoredProgress.displayName = 'ColoredProgress';