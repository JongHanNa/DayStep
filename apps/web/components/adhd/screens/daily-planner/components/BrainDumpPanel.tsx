'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface BrainDumpPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export function BrainDumpPanel({ value, onChange }: BrainDumpPanelProps) {
  const [local, setLocal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = useCallback((next: string) => {
    setLocal(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 1000);
  }, [onChange]);

  return (
    <div>
      <div className="mb-2 text-base font-semibold text-base-content">
        브레인 덤프
      </div>
      <div className="rounded-2xl bg-base-200 p-4">
        <textarea
          value={local}
          onChange={e => handleChange(e.target.value)}
          placeholder="머릿속을 비워보세요. 떠오르는 무엇이든 적어보세요"
          className="textarea textarea-sm w-full bg-base-100 border-base-300 text-sm min-h-[80px] resize-none"
          rows={3}
        />
      </div>
    </div>
  );
}
