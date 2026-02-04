'use client';

import { ArrowLeft, Check, Type } from 'lucide-react';
import { useSettingsStore, FontFamily } from '@/state/stores/settingsStore';

interface FontViewProps {
  onBack: () => void;
}

const FONT_OPTIONS = [
  {
    id: 'system' as FontFamily,
    name: '시스템 글꼴',
    description: '운영체제 기본 글꼴',
    family: 'Arial, Helvetica, sans-serif',
    preview: 'The quick brown fox jumps'
  },
  {
    id: 'opendyslexic' as FontFamily,
    name: 'OpenDyslexic',
    description: '읽기 어려움 개선 글꼴',
    family: '"OpenDyslexic", Arial, sans-serif',
    preview: 'The quick brown fox jumps'
  }
];

/**
 * 글꼴 설정 뷰
 *
 * 기존 /settings/font 페이지의 콘텐츠를 URL 변경 없이 렌더링합니다.
 */
export default function FontView({ onBack }: FontViewProps) {
  const { fontFamily, wordSpacing, letterSpacing, fontSize, setFontFamily, setWordSpacing, setLetterSpacing, setFontSize } = useSettingsStore();

  // 안전한 spacing 및 fontSize 값 처리
  const safeWordSpacing = typeof wordSpacing === 'number' && !isNaN(wordSpacing) ? wordSpacing : 0.0;
  const safeLetterSpacing = typeof letterSpacing === 'number' && !isNaN(letterSpacing) ? letterSpacing : 0.0;
  const safeFontSize = typeof fontSize === 'number' && !isNaN(fontSize) ? fontSize : 16;

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* 페이지 헤더 */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">글꼴 설정</h1>
            <p className="text-muted-foreground">
              읽기 편한 글꼴을 선택하세요
            </p>
          </div>
        </div>
      </div>

      {/* 글꼴 선택 옵션들 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">글꼴 선택</h2>
        </div>

        {FONT_OPTIONS.map((font) => (
          <div
            key={font.id}
            className={`
              p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer font-preview-${font.id}
              ${fontFamily === font.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
            onClick={() => setFontFamily(font.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{font.name}</h3>
                  {fontFamily === font.id && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {font.description}
                </p>
                {/* 글꼴 미리보기 */}
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="text-lg mb-2">한글 미리보기</div>
                  <div className="text-sm text-muted-foreground">
                    빠른 갈색 여우가 게으른 개를 뛰어넘습니다
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {font.preview}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 단어 간격 설정 */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-purple-500 rounded-sm flex items-center justify-center">
            <span className="text-white text-xs">ab</span>
          </div>
          <h2 className="text-lg font-semibold">단어 간격</h2>
        </div>

        <div className="space-y-4">
          {/* 슬라이더 컨트롤 */}
          <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">간격 조절</span>
              <span className="text-sm text-purple-600 font-mono">
                {safeWordSpacing === 0 ? 'normal' : `${safeWordSpacing.toFixed(1)}em`}
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.1"
                value={safeWordSpacing}
                onChange={(e) => setWordSpacing(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>매우 좁음 (-0.5em)</span>
                <span>기본 (0.0em)</span>
                <span>넓음 (0.5em)</span>
              </div>
            </div>
          </div>

          {/* 글자 간격 슬라이더 */}
          <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">글자 간격</span>
              <span className="text-sm text-purple-600 font-mono">
                {safeLetterSpacing === 0 ? 'normal' : `${safeLetterSpacing.toFixed(1)}em`}
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="-0.2"
                max="0.3"
                step="0.1"
                value={safeLetterSpacing}
                onChange={(e) => setLetterSpacing(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>좁음 (-0.2em)</span>
                <span>기본 (0.0em)</span>
                <span>넓음 (0.3em)</span>
              </div>
            </div>
          </div>

          {/* 글자 크기 슬라이더 */}
          <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">글자 크기</span>
              <span className="text-sm text-purple-600 font-mono">
                {safeFontSize}px
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="12"
                max="24"
                step="2"
                value={safeFontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>작음 (12px)</span>
                <span>기본 (16px)</span>
                <span>큼 (24px)</span>
              </div>
            </div>
          </div>

          {/* 실시간 미리보기 */}
          <div className="p-4 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20">
            <h3 className="text-sm font-medium mb-3 text-purple-800 dark:text-purple-200">
              실시간 미리보기
            </h3>
            <div
              className={`space-y-2 ${fontFamily === 'opendyslexic' ? 'font-preview-opendyslexic' : 'font-preview-system'}`}
              style={{
                wordSpacing: safeWordSpacing === 0 ? 'normal' : `${safeWordSpacing}em`,
                letterSpacing: safeLetterSpacing === 0 ? 'normal' : `${safeLetterSpacing}em`,
                fontSize: `${safeFontSize}px`
              }}
            >
              <div className="text-lg">한글 미리보기</div>
              <div className="text-sm text-muted-foreground">
                빠른 갈색 여우가 게으른 개를 뛰어넘습니다
              </div>
              <div className="text-sm text-muted-foreground">
                The quick brown fox jumps over lazy dog
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 접근성 정보 */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          💡 OpenDyslexic 글꼴 & 간격 설정에 대해
        </h3>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
          <p>
            OpenDyslexic은 읽기 어려움(난독증)이 있는 사용자를 위해 설계된 오픈소스 글꼴입니다.
            각 글자의 하단이 두꺼워서 글자가 뒤집히는 현상을 줄여줍니다.
          </p>
          <p>
            <strong>단어 간격 조절</strong>: 단어 사이의 공백을 적절히 조절하면 읽기 속도와 이해도가 향상됩니다.
            WCAG 접근성 가이드라인에서는 최소 0.16em 이상의 단어 간격을 권장합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
