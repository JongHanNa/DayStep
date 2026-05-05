'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ReflectionFieldKey =
  | 'current_period'
  | 'today_resolution'
  | 'today_prayer'
  | 'today_lesson';

interface ReflectionPanelsProps {
  currentPeriod: string;
  todayResolution: string;
  todayPrayer: string;
  todayLesson: string;
  isAdmin: boolean;
  onChange: (field: ReflectionFieldKey, value: string) => void;
}

interface FieldConfig {
  key: ReflectionFieldKey;
  label: string;
  placeholder: string;
  value: string;
}

export function ReflectionPanels({
  currentPeriod,
  todayResolution,
  todayPrayer,
  todayLesson,
  isAdmin,
  onChange,
}: ReflectionPanelsProps) {
  const fields: FieldConfig[] = [
    {
      key: 'current_period',
      label: '현재 무슨 기간인지 상기해보기',
      placeholder: '지금은 어떤 기간인가요? (예: 시험기간, 프로젝트 마감 등)',
      value: currentPeriod,
    },
    {
      key: 'today_resolution',
      label: '오늘의 다짐/결단',
      placeholder: '오늘의 다짐과 결단을 적어보세요',
      value: todayResolution,
    },
    ...(isAdmin
      ? [{
          key: 'today_prayer' as const,
          label: '오늘의 기도(하나님과 대화)',
          placeholder: '하나님과의 대화를 적어보세요',
          value: todayPrayer,
        }]
      : []),
    {
      key: 'today_lesson',
      label: '오늘의 점검/회고/교훈',
      placeholder: '오늘 하루에서 배운 교훈을 적어보세요',
      value: todayLesson,
    },
  ];

  return (
    <div className="space-y-3">
      {fields.map(field => (
        <ReflectionField
          key={field.key}
          field={field}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

interface ReflectionFieldProps {
  field: FieldConfig;
  onChange: (field: ReflectionFieldKey, value: string) => void;
}

function ReflectionField({ field, onChange }: ReflectionFieldProps) {
  const [local, setLocal] = useState(field.value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(field.value);
  }, [field.value]);

  const handleChange = useCallback((next: string) => {
    setLocal(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(field.key, next), 1000);
  }, [field.key, onChange]);

  return (
    <div>
      <div className="mb-2 text-base font-semibold text-base-content">
        {field.label}
      </div>
      <div className="rounded-2xl bg-base-200 p-4">
        <textarea
          value={local}
          onChange={e => handleChange(e.target.value)}
          placeholder={field.placeholder}
          className="textarea textarea-sm w-full bg-base-100 border-base-300 text-sm min-h-[60px] resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}
