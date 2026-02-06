'use client';

import { ArrowLeft, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useSettingsStore, TimeFormat } from '@/state/stores/settingsStore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TimeFormatViewProps {
  onBack: () => void;
}

/**
 * 시간 표기법 설정 뷰
 *
 * 기존 /settings/time-format 페이지의 콘텐츠를 URL 변경 없이 렌더링합니다.
 */
export default function TimeFormatView({ onBack }: TimeFormatViewProps) {
  const { timeFormat, setTimeFormat } = useSettingsStore();
  const now = new Date();

  const timeFormatOptions = [
    {
      value: '12h' as TimeFormat,
      label: '12시간 표기법',
      description: 'AM/PM을 사용하는 표기법입니다',
      examples: [
        '오전 12:00 (자정)',
        '오전 9:30',
        '오후 2:15',
        '오후 11:59'
      ],
      currentTime: format(now, 'a h:mm', { locale: ko })
    },
    {
      value: '24h' as TimeFormat,
      label: '24시간 표기법',
      description: '0~23시를 사용하는 표기법입니다',
      examples: [
        '00:00 (자정)',
        '09:30',
        '14:15',
        '23:59'
      ],
      currentTime: format(now, 'HH:mm')
    }
  ];

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="btn btn-circle btn-ghost btn-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">시간 표기법</h1>
          <p className="text-muted-foreground">타임라인에서 사용할 시간 형식을 설정하세요</p>
        </div>
      </div>

      {/* 현재 시간 미리보기 카드 */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-semibold">현재 시간</h2>
            <p className="text-2xl font-bold mt-1">
              {timeFormat === '12h'
                ? format(now, 'a h:mm', { locale: ko })
                : format(now, 'HH:mm')
              }
            </p>
          </div>
        </div>
        <div className="text-sm opacity-90">
          선택한 형식으로 앱의 모든 시간이 표시됩니다
        </div>
      </div>

      {/* 시간 표기법 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>표기법 선택</CardTitle>
          <CardDescription>
            타임라인과 일정에서 사용할 시간 표시 방식을 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={timeFormat}
            onValueChange={(value: TimeFormat) => setTimeFormat(value)}
            className="space-y-4"
          >
            {timeFormatOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {option.currentTime}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      {option.description}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {option.examples.map((example, index) => (
                        <div key={index} className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1">
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 적용 범위 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>적용 범위</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">타임라인 시간 표시</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">할일 생성/수정 시간</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">알림 시간 표시</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">모든 시간 관련 UI</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              💡 <strong>팁:</strong> 시간 표기법은 즉시 적용되며, 모든 화면에서 일관된 형식으로 표시됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
