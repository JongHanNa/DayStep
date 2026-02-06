'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface ToggleButtonGroupProps {
  options: ToggleOption[];
  value: string;
  onValueChange: (value: string) => void;
  accentColor?: string;
  className?: string;
}

export function ToggleButtonGroup({
  options,
  value,
  onValueChange,
  accentColor = '#DBAC6C',
  className
}: ToggleButtonGroupProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            onClick={() => onValueChange(option.value)}
            className={cn(
              "flex-1 h-8 px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
              "border-0 shadow-none",
              isSelected
                ? "text-white"
                : "bg-transparent hover:bg-gray-50"
            )}
            style={{
              ...(isSelected
                ? {
                    backgroundColor: accentColor,
                    color: 'white'
                  }
                : {})
            }}
          >
            {option.icon && <span className="mr-1.5">{option.icon}</span>}
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}