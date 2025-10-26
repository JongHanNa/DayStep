'use client';

import React, { memo, useCallback } from 'react';
import { Tag, Palette } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UnifiedIconKey, getUnifiedIcon } from '@/lib/icon-collection';
import { getColorById } from '@/lib/color-palette';
import { useTypingEffect } from '@/hooks/useTypingEffect';
import { isCapacitorEnvironment } from '@/lib/utils';

export interface TodoMetadataProps {
  selectedIcon: UnifiedIconKey;
  content: string;
  onIconSelectClick: () => void;
  onContentChange: (value: string) => void;
  selectedColor?: string;
}

const TodoMetadata: React.FC<TodoMetadataProps> = ({
  selectedIcon,
  content,
  onIconSelectClick,
  onContentChange,
  selectedColor,
}) => {

  const handleIconSelectClick = useCallback(() => {
    onIconSelectClick();
  }, [onIconSelectClick]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onContentChange(e.target.value);
  }, [onContentChange]);

  // 선택된 색상 정보 가져오기
  const colorData = selectedColor ? getColorById(selectedColor) : null;

  // 타이핑 효과를 위한 플레이스홀더 텍스트들
  const placeholderTexts = [
    "무엇을 해야 하나요?",
    "오늘의 할일을 추가해보세요",
    "새로운 목표를 세워보세요",
    "완료하고 싶은 일을 적어보세요"
  ];

  const typingPlaceholder = useTypingEffect({
    texts: placeholderTexts,
    speed: 80,
    deleteSpeed: 40,
    delayBetweenTexts: 2000,
    loop: true
  });

  return (
    <>
      {/* 아이콘 선택 및 할일 내용 */}
      <div className="mx-4 my-2">
        {/* 제목은 배경 밖에 */}
        <Label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#808080' }}>
          <Tag
            className="h-5 w-5"
            style={{ color: colorData?.hex || '#DBAC6C' }}
          />
          할일 아이콘 및 내용
        </Label>

        {/* 실제 컨트롤들만 배경 안에 - 흰색 배경으로 변경, 패딩 축소 */}
        <div className="p-2 rounded-lg bg-white">
          <div className="flex items-center gap-3 pr-16">
            {/* 클릭 가능한 아이콘 표시 - 테두리 제거, 회색 배경, 할일 색상 아이콘 */}
            <div className="relative">
              <button
                type="button"
                onClick={handleIconSelectClick}
                className="flex items-center justify-center w-12 h-12 rounded-lg hover:opacity-80 transition-opacity cursor-pointer group"
                style={{ backgroundColor: '#f3f4f6' }}
                title="아이콘 변경하기"
              >
                {(() => {
                  const IconComponent = getUnifiedIcon(selectedIcon);
                  return <IconComponent
                    className="group-hover:scale-110 transition-transform"
                    style={{ color: colorData?.hex || '#DBAC6C' }}
                    size={24}
                  />;
                })()}
              </button>

              {/* 왼쪽 하단에 작은 팔레트 아이콘 */}
              <div
                className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                style={{
                  backgroundColor: colorData?.hex || '#DBAC6C',
                  border: '2px solid white'
                }}
              >
                <Palette
                  className="w-3 h-3 text-white"
                  strokeWidth={2.5}
                />
              </div>
            </div>

            {/* 할일 내용 입력 - iOS WebView scale 문제 해결을 위해 wrapper 사용 */}
            <div className="flex-1">
              <div
                className="input-scale-wrapper"
                style={{
                  // wrapper에 scale 적용 (iOS WebView 포커스 문제 해결)
                  transform: 'scale(1.6)',
                  transformOrigin: 'left bottom',
                  WebkitTransform: 'scale(1.6)',
                  WebkitTransformOrigin: 'left bottom',
                  width: '80%',
                  height: '44px',
                  position: 'relative'
                }}
              >
                <input
                  type="text"
                  value={content}
                  onChange={handleContentChange}
                  placeholder={typingPlaceholder}
                  className="bg-white border-0 border-b-2 rounded-none focus:outline-none transition-none"
                  style={{
                    width: '100%',
                    fontSize: '20px',
                    color: '#333333',
                    borderBottomColor: '#D1D5DB',
                    outline: 'none',
                    boxShadow: 'none',
                    fontWeight: '600',
                    height: '44px',
                    paddingTop: '16px',
                    paddingBottom: '0px',
                    margin: '0px',
                    lineHeight: '0.9',
                    textAlign: 'left',
                    // input 자체에는 transform 제거
                    transform: 'none',
                    // Capacitor 안정성 스타일
                    ...(isCapacitorEnvironment()
                      ? {
                          WebkitUserSelect: 'text',
                          userSelect: 'text',
                          WebkitTouchCallout: 'none',
                          WebkitTapHighlightColor: 'transparent',
                          transition: 'none'
                        }
                      : {}
                    )
                  } as React.CSSProperties}
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(TodoMetadata);