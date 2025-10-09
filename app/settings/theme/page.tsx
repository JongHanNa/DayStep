'use client';

import { ArrowLeft, Palette, Sun, Moon, Monitor } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { THEME_PALETTE_OPTIONS } from '@/types/settings';

export default function ThemePage() {
  const { theme, setTheme, themes } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { themePalette, setThemePalette } = useSettingsStore();

  // 하이드레이션 이슈 방지
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const themeOptions = [
    {
      value: 'light',
      label: '라이트 모드',
      description: '밝은 테마로 일반적인 환경에서 사용하기 좋습니다',
      icon: Sun,
      color: 'from-yellow-400 to-orange-500'
    },
    {
      value: 'dark',
      label: '다크 모드',
      description: '어두운 테마로 저조도 환경에서 눈의 피로를 줄여줍니다',
      icon: Moon,
      color: 'from-purple-600 to-blue-600'
    },
    {
      value: 'system',
      label: '시스템 설정',
      description: '기기의 시스템 설정에 따라 자동으로 전환됩니다',
      icon: Monitor,
      color: 'from-green-500 to-teal-600'
    }
  ];

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">테마 설정</h1>
          <p className="text-muted-foreground">앱의 테마를 설정하세요</p>
        </div>
      </div>

      {/* 테마 미리보기 카드 */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-semibold">현재 설정</h2>
            <p className="opacity-90">
              {THEME_PALETTE_OPTIONS.find(p => p.value === themePalette)?.label} • {' '}
              {theme === 'light' ? '라이트 모드' : theme === 'dark' ? '다크 모드' : '시스템 설정'}
            </p>
          </div>
        </div>
        <div className="text-sm opacity-90">
          색상 팔레트와 테마 모드가 앱 전체에 즉시 적용됩니다
        </div>
      </div>

      {/* 색상 팔레트 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>색상 팔레트</CardTitle>
          <CardDescription>
            앱의 전체 색상 테마를 선택하세요. 라이트/다크 모드 모두에 적용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={themePalette}
            onValueChange={setThemePalette}
            className="space-y-4"
          >
            {THEME_PALETTE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <RadioGroupItem value={option.value} id={`palette-${option.value}`} />
                <Label htmlFor={`palette-${option.value}`} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: option.previewColor }}
                    >
                      <Palette className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 테마 모드 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>테마 모드</CardTitle>
          <CardDescription>
            라이트/다크 모드를 선택하세요. 변경사항은 즉시 적용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="space-y-4"
          >
            {themeOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${option.color} flex items-center justify-center text-white`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 테마 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>테마 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">현재 테마:</span>
              <p className="mt-1">
                {theme === 'light' ? '🌞 라이트' : theme === 'dark' ? '🌙 다크' : '💻 시스템'}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">적용 시점:</span>
              <p className="mt-1">즉시 적용</p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              💡 <strong>팁:</strong> 시스템 설정을 선택하면 기기의 다크 모드 설정에 따라 자동으로 테마가 전환됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}