'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, Wallet, PenLine } from 'lucide-react';

interface DayReflectionBarProps {
  reflection: string;
  spendingNote: string;
  thoughtArchive: string;
  onReflectionChange: (value: string) => void;
  onSpendingNoteChange: (value: string) => void;
  onThoughtArchiveChange: (value: string) => void;
}

type ActiveField = 'reflection' | 'spending' | 'thought' | null;

export function DayReflectionBar({
  reflection,
  spendingNote,
  thoughtArchive,
  onReflectionChange,
  onSpendingNoteChange,
  onThoughtArchiveChange,
}: DayReflectionBarProps) {
  const [activeField, setActiveField] = useState<ActiveField>('reflection');

  // Local states
  const [localReflection, setLocalReflection] = useState(reflection);
  const [localSpending, setLocalSpending] = useState(spendingNote);
  const [localThought, setLocalThought] = useState(thoughtArchive);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalReflection(reflection); }, [reflection]);
  useEffect(() => { setLocalSpending(spendingNote); }, [spendingNote]);
  useEffect(() => { setLocalThought(thoughtArchive); }, [thoughtArchive]);

  const handleChange = useCallback((field: ActiveField, value: string) => {
    if (field === 'reflection') setLocalReflection(value);
    else if (field === 'spending') setLocalSpending(value);
    else if (field === 'thought') setLocalThought(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (field === 'reflection') onReflectionChange(value);
      else if (field === 'spending') onSpendingNoteChange(value);
      else if (field === 'thought') onThoughtArchiveChange(value);
    }, 1000);
  }, [onReflectionChange, onSpendingNoteChange, onThoughtArchiveChange]);

  const fields = [
    { key: 'reflection' as const, label: '소감', icon: MessageCircle, value: localReflection, placeholder: '하루의 소감...' },
    { key: 'spending' as const, label: '지출', icon: Wallet, value: localSpending, placeholder: '오늘 지출...' },
    { key: 'thought' as const, label: '생각', icon: PenLine, value: localThought, placeholder: '생각 보관...' },
  ];

  return (
    <div className="rounded-lg border border-base-300 bg-base-200">
      {/* 탭 */}
      <div className="flex border-b border-base-300">
        {fields.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveField(activeField === f.key ? null : f.key)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              activeField === f.key
                ? 'bg-primary/10 text-primary'
                : 'text-base-content/50 hover:text-base-content/80'
            } ${f.value ? 'text-base-content/80' : ''}`}
          >
            <f.icon className="w-3.5 h-3.5" />
            {f.label}
            {f.value && <span className="ml-1 text-primary">•</span>}
          </button>
        ))}
      </div>

      {/* 확장된 입력 */}
      {activeField && (
        <div className="p-2">
          <textarea
            value={fields.find(f => f.key === activeField)?.value || ''}
            onChange={e => handleChange(activeField, e.target.value)}
            placeholder={fields.find(f => f.key === activeField)?.placeholder}
            className="textarea textarea-sm w-full bg-base-100 border-base-300 text-sm min-h-[60px] resize-none"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
