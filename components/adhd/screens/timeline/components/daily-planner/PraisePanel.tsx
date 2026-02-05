'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Award } from 'lucide-react';

interface PraisePanelProps {
  values: string[];
  onChange: (values: string[]) => void;
}

export function PraisePanel({ values, onChange }: PraisePanelProps) {
  const [localValues, setLocalValues] = useState<string[]>(() => {
    const arr = [...(values || [])];
    while (arr.length < 3) arr.push('');
    return arr;
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const arr = [...(values || [])];
    while (arr.length < 3) arr.push('');
    setLocalValues(arr);
  }, [values]);

  const handleChange = useCallback((index: number, value: string) => {
    setLocalValues(prev => {
      const next = [...prev];
      next[index] = value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(next.filter(v => v.trim() !== ''));
      }, 1000);
      return next;
    });
  }, [onChange]);

  return (
    <div className="rounded-lg border border-base-300 bg-base-200 p-3">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Award className="w-4 h-4" />
        오늘의 칭찬
      </h3>
      <div className="space-y-1.5">
        {localValues.slice(0, 3).map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-base-content/40 w-4">{i + 1}.</span>
            <input
              type="text"
              value={val}
              onChange={e => handleChange(i, e.target.value)}
              placeholder={`칭찬 ${i + 1}`}
              className="input input-sm flex-1 bg-base-100 border-base-300 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
