'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Gift } from 'lucide-react';

interface RewardPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export function RewardPanel({ value, onChange }: RewardPanelProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, 1000);
  }, [onChange]);

  return (
    <div className="rounded-lg border border-base-300 bg-base-200 p-3">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Gift className="w-4 h-4" />
        보상
      </h3>
      <input
        type="text"
        value={localValue}
        onChange={e => handleChange(e.target.value)}
        placeholder="오늘의 보상을 적어보세요..."
        className="input input-sm w-full bg-base-100 border-base-300 text-sm"
      />
    </div>
  );
}
