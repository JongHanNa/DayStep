'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PopoverSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function PopoverSearchInput({
  value,
  onChange,
  placeholder = '검색...',
  className,
  autoFocus = true,
}: PopoverSearchInputProps) {
  return (
    <div className={cn('relative px-3 py-2', className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-9 pl-8 pr-8 rounded-lg bg-base-200 border-0 text-sm placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-base-300"
          >
            <X className="w-3.5 h-3.5 text-base-content/40" />
          </button>
        )}
      </div>
    </div>
  );
}
