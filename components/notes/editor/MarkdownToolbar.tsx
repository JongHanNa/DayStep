import React from 'react';
import {
  Hash,
  Square,
  // TODO: 아래 기능들은 나중에 구현 예정
  // Bold,
  // Italic,
  // Strikethrough,
  // Code,
  // List,
  // ListOrdered,
  // Quote,
  // Minus,
  // CheckSquare,
  // Highlighter
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarkdownToolbarProps {
  onInsert: (text: string, cursorOffset?: number) => void;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
}

// 키보드 툴바 컴포넌트 (현재 #, 체크박스만 활성화)
const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onInsert, fontSize, onFontSizeChange }) => {
  const tools = [
    {
      icon: <Hash size={16} />,
      label: 'Header',
      action: () => onInsert('# ', 0),
    },
    {
      icon: <Square size={16} />,
      label: 'Checkbox',
      action: () => onInsert('- [ ] ', 0),
    },
    // TODO: 아래 기능들은 나중에 구현 예정
    // {
    //   icon: <Bold size={16} />,
    //   label: 'Bold',
    //   action: () => onInsert('****', -2),
    // },
    // {
    //   icon: <Italic size={16} />,
    //   label: 'Italic',
    //   action: () => onInsert('**', -1),
    // },
    // {
    //   icon: <Strikethrough size={16} />,
    //   label: 'Strikethrough',
    //   action: () => onInsert('~~~~', -2),
    // },
    // {
    //   icon: <Code size={16} />,
    //   label: 'Code',
    //   action: () => onInsert('``', -1),
    // },
    // {
    //   icon: <Highlighter size={16} />,
    //   label: 'Highlight',
    //   action: () => onInsert('====', -2),
    // },
    // {
    //   icon: <Quote size={16} />,
    //   label: 'Quote',
    //   action: () => onInsert('> ', 0),
    // },
    // {
    //   icon: <List size={16} />,
    //   label: 'List',
    //   action: () => onInsert('- ', 0),
    // },
    // {
    //   icon: <ListOrdered size={16} />,
    //   label: 'Ordered List',
    //   action: () => onInsert('1. ', 0),
    // },
    // {
    //   icon: <Minus size={16} />,
    //   label: 'Divider',
    //   action: () => onInsert('\n---\n', 0),
    // },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 py-2 bg-base-100 sticky top-0 z-10">
      {tools.map((tool) => (
        <Button
          key={tool.label}
          variant="ghost"
          size="sm"
          onClick={tool.action}
          className="h-8 w-8 p-0 hover:bg-accent"
          title={tool.label}
        >
          {tool.icon}
        </Button>
      ))}

      {/* 글자 크기 슬라이더 */}
      {fontSize !== undefined && onFontSizeChange && (
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-base-300">
          <span className="text-xs text-base-content/70 whitespace-nowrap">{fontSize}px</span>
          <input
            type="range"
            min="12"
            max="24"
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="range range-xs range-primary w-20"
          />
        </div>
      )}
    </div>
  );
};

export default MarkdownToolbar;