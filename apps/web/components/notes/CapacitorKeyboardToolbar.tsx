'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Link, 
  List, 
  ListOrdered,
  Quote,
  Minus,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CapacitorKeyboardToolbarProps {
  onInsert: (text: string, cursorOffset?: number) => void;
  isVisible?: boolean;
}

const CapacitorKeyboardToolbar: React.FC<CapacitorKeyboardToolbarProps> = ({
  onInsert,
  isVisible = true,
}) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const tools = [
    {
      icon: <Hash size={18} />,
      label: 'Header',
      action: () => onInsert('# ', 0),
      shortcut: '⌘+1',
    },
    {
      icon: <Bold size={18} />,
      label: 'Bold',
      action: () => onInsert('****', -2),
      shortcut: '⌘+B',
    },
    {
      icon: <Italic size={18} />,
      label: 'Italic', 
      action: () => onInsert('**', -1),
      shortcut: '⌘+I',
    },
    {
      icon: <Strikethrough size={18} />,
      label: 'Strikethrough',
      action: () => onInsert('~~~~', -2),
      shortcut: '',
    },
    {
      icon: <Code size={18} />,
      label: 'Code',
      action: () => onInsert('``', -1),
      shortcut: '⌘+`',
    },
    {
      icon: <Link size={18} />,
      label: 'Link',
      action: () => onInsert('[]()', -3),
      shortcut: '⌘+K',
    },
    {
      icon: <Quote size={18} />,
      label: 'Quote',
      action: () => onInsert('> ', 0),
      shortcut: '',
    },
    {
      icon: <List size={18} />,
      label: 'List',
      action: () => onInsert('- ', 0),
      shortcut: '',
    },
    {
      icon: <ListOrdered size={18} />,
      label: 'Ordered',
      action: () => onInsert('1. ', 0),
      shortcut: '',
    },
    {
      icon: <Minus size={18} />,
      label: 'Divider',
      action: () => onInsert('\n---\n', 0),
      shortcut: '',
    },
  ];

  // 디버깅을 위해 컴포넌트 마운트 시 초기 상태 강제 설정
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('CapacitorKeyboardToolbar mounted, isVisible:', isVisible);
      // 웹 방식 툴바를 항상 보이게 설정 (네이티브 inputAccessoryView 불가능하므로)
      setToolbarVisible(isVisible);
    }
  }, [isVisible]);

  useEffect(() => {
    // 단순하고 안정적인 방식: isVisible prop에 직접 연동
    setToolbarVisible(isVisible);
    console.log('CapacitorKeyboardToolbar visibility changed:', isVisible);
  }, [isVisible]);

  // 툴바가 보이지 않으면 렌더링하지 않음
  if (!toolbarVisible) {
    return null;
  }

  // Capacitor에서 에디터 바로 위에 고정 (네이티브 키보드 위가 아닌 웹 방식)
  const toolbarStyle = Capacitor.isNativePlatform()
    ? {
        position: 'relative' as const,
        backgroundColor: 'hsl(var(--background))',
        borderTop: '1px solid hsl(var(--border))',
        borderBottom: '1px solid hsl(var(--border))',
        zIndex: 1000,
      }
    : {};

  return (
    <>
      <div
        ref={toolbarRef}
        className={`
          capacitor-keyboard-toolbar bg-background border-t border-border
          ${Capacitor.isNativePlatform() && isKeyboardVisible ? 'fixed' : 'relative'}
        `}
        style={toolbarStyle}
      >
        <div className="flex overflow-x-auto gap-2 p-3 pb-safe">
          {tools.map((tool, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={tool.action}
              className="h-10 min-w-[44px] flex flex-col items-center justify-center p-1 text-xs whitespace-nowrap border-border"
              title={tool.label + (tool.shortcut ? ` (${tool.shortcut})` : '')}
            >
              <div className="mb-0.5">{tool.icon}</div>
              <div className="text-[10px] leading-none">{tool.label}</div>
            </Button>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .capacitor-keyboard-toolbar {
          /* Safe area padding for notched devices */
          padding-bottom: constant(safe-area-inset-bottom);
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        /* iOS safe area 지원 */
        .pb-safe {
          padding-bottom: constant(safe-area-inset-bottom);
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        /* 모바일에서 스크롤바 숨기기 */
        .capacitor-keyboard-toolbar .flex.overflow-x-auto {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .capacitor-keyboard-toolbar .flex.overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
        
        /* Capacitor 환경에서 고정 위치 스타일 */
        .capacitor-keyboard-toolbar.fixed {
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          background-color: rgba(255, 255, 255, 0.95);
        }
        
        [data-theme="dark"] .capacitor-keyboard-toolbar.fixed {
          background-color: rgba(0, 0, 0, 0.95);
        }
        
        /* 버튼 터치 최적화 */
        .capacitor-keyboard-toolbar button {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        /* 애니메이션 최적화 */
        .capacitor-keyboard-toolbar {
          will-change: bottom;
        }
      `}</style>
    </>
  );
};

export default CapacitorKeyboardToolbar;