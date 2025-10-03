'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { createEditor, Descendant, Editor, Element as SlateElement, BaseEditor, Transforms, Point } from 'slate';
import { Slate, Editable, withReact, ReactEditor, useFocused, useSlate } from 'slate-react';
import { DOMPoint, DOMRange } from 'slate-dom';
import { cn } from '@/lib/utils';

// Slate 타입 정의
type CustomElement = { type: 'paragraph'; children: CustomText[] };
type CustomText = { text: string };
type CustomEditor = BaseEditor & ReactEditor;

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

interface SlateTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  onCursorMove?: (cursorPosition: { top: number; left: number }) => void;
}

// 내부 에디터 컴포넌트 (Slate 컨텍스트 내부에서 Hook 사용)
const EditableContent: React.FC<{
  placeholder: string;
  minHeight: number;
  onValueChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onCursorMove?: (cursorPosition: { top: number; left: number }) => void;
}> = ({ placeholder, minHeight, onValueChange, onFocus, onBlur, onCursorMove }) => {
  const editor = useSlate();
  const focused = useFocused();
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // 커서 위치 추적 함수
  const trackCursorPosition = useCallback(() => {
    if (!onCursorMove || !focused) return;
    
    try {
      const selection = editor.selection;
      if (!selection) return;

      const domSelection = ReactEditor.toDOMPoint(editor, selection.anchor);
      if (!domSelection) return;

      const range = document.createRange();
      range.setStart(domSelection[0], domSelection[1]);
      range.collapse(true);

      const rect = range.getBoundingClientRect();
      onCursorMove({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
      });
    } catch (error) {
      console.warn('커서 위치 추적 실패:', error);
    }
  }, [editor, focused, onCursorMove]);

  // 포커스 상태 변화 감지
  React.useEffect(() => {
    if (focused) {
      onFocus?.();
      trackCursorPosition();
    } else {
      onBlur?.();
    }
  }, [focused, onFocus, onBlur, trackCursorPosition]);

  // 선택 영역 변화 감지 (커서 이동)
  React.useEffect(() => {
    if (focused && editor.selection) {
      trackCursorPosition();
    }
  }, [editor.selection, focused, trackCursorPosition]);

  // 터치 시작 핸들러
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartTime(Date.now());
    setIsScrolling(false);
  }, []);

  // 터치 이동 핸들러 (스크롤 감지)
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY !== null) {
      const touch = e.touches[0];
      const deltaY = Math.abs(touch.clientY - touchStartY);
      
      // 10px 이상 이동하면 스크롤로 감지
      if (deltaY > 10) {
        setIsScrolling(true);
        // 터치 정보 초기화하여 클릭으로 처리되지 않도록
        setTouchStartY(null);
        setTouchStartTime(null);
      }
    }
  }, [touchStartY]);

  // 클릭한 위치를 키보드 위로 스크롤하는 함수
  const scrollToPosition = useCallback((clientY: number) => {
    const container = containerRef.current;
    if (!container) return;

    // 키보드 높이 추정 (일반적으로 350-400px)
    const keyboardHeight = 400;
    const viewportHeight = window.innerHeight;
    const availableHeight = viewportHeight - keyboardHeight;
    
    // 클릭 위치가 키보드에 가려질 영역인지 확인
    if (clientY > availableHeight) {
      // 키보드에 가려질 위치라면 스크롤 조정
      const scrollOffset = clientY - availableHeight + 100; // 100px 추가 여백
      
      setTimeout(() => {
        container.scrollBy({
          top: scrollOffset,
          behavior: 'smooth'
        });
      }, 300); // 키보드 애니메이션이 완료된 후 스크롤
    }
  }, []);

  // 터치 종료 핸들러 (클릭 감지)
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndTime = Date.now();
    const touchDuration = touchStartTime ? touchEndTime - touchStartTime : 0;
    
    // 스크롤 중이 아니고, 짧은 터치(300ms 이하)이면 클릭으로 처리
    if (!isScrolling && touchDuration < 300 && touchStartY !== null && touchStartTime !== null) {
      try {
        const touch = e.changedTouches[0];
        
        // 클릭 위치를 키보드 위로 스크롤
        scrollToPosition(touch.clientY);
        
        // 터치 위치에서 DOM 포인트 찾기 (포커스 전에 먼저)
        const domRange = document.caretRangeFromPoint 
          ? document.caretRangeFromPoint(touch.clientX, touch.clientY)
          : null;
        
        if (domRange) {
          // DOM Range를 Slate Point로 변환
          try {
            const slatePoint = ReactEditor.toSlatePoint(editor, [domRange.startContainer, domRange.startOffset], {
              exactMatch: false,
              suppressThrow: true,
            });
            
            if (slatePoint) {
              // 포커스와 커서 위치를 동시에 설정
              ReactEditor.focus(editor);
              
              // requestAnimationFrame으로 포커스 완료 후 커서 위치 설정
              requestAnimationFrame(() => {
                try {
                  Transforms.select(editor, {
                    anchor: slatePoint,
                    focus: slatePoint,
                  });
                } catch (selectError) {
                  console.warn('Selection failed:', selectError);
                }
              });
            } else {
              // slatePoint 변환 실패 시 기본 포커스
              ReactEditor.focus(editor);
            }
          } catch (pointError) {
            console.warn('Point conversion failed:', pointError);
            ReactEditor.focus(editor);
          }
        } else {
          // domRange 생성 실패 시 기본 포커스
          ReactEditor.focus(editor);
        }
      } catch (error) {
        console.warn('Touch positioning failed:', error);
        ReactEditor.focus(editor);
      }
    }
    
    // 상태 초기화
    setTouchStartY(null);
    setTouchStartTime(null);
    
    // 스크롤 상태는 약간 지연 후 리셋
    setTimeout(() => {
      setIsScrolling(false);
    }, 100);
  }, [focused, editor, isScrolling, touchStartTime, touchStartY, scrollToPosition]);

  // 요소 렌더링
  const renderElement = useCallback((props: any) => {
    return <p {...props.attributes}>{props.children}</p>;
  }, []);

  // 리프 렌더링  
  const renderLeaf = useCallback((props: any) => {
    return <span {...props.attributes}>{props.children}</span>;
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full rounded-md bg-background transition-all duration-150",
        focused 
          ? "cursor-text" 
          : "cursor-text"
      )}
      style={{ minHeight }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        if (!focused && !isScrolling) {
          ReactEditor.focus(editor);
        }
      }}
    >
      <Editable
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder={placeholder}
        className="w-full h-full overflow-auto"
        style={{
          padding: '12px',
          paddingBottom: '700px', // 키보드+키보드툴바 높이만큼 아래 여백 추가
          minHeight: `${minHeight - 2}px`,
          fontSize: '16px',
          outline: 'none',
          lineHeight: '1.5',
          wordBreak: 'break-word',
          resize: 'none',
          border: 'none',
          background: 'transparent',
          touchAction: 'pan-y', // 세로 스크롤만 허용하여 모달과 분리
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'text',
          scrollBehavior: 'smooth', // 에디터 내부 스크롤만 부드럽게
          overscrollBehavior: 'contain', // 스크롤이 부모로 전파되지 않도록
        }}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoFocus={false}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            ReactEditor.blur(editor);
          }
        }}
      />
    </div>
  );
};

const SlateTextEditor: React.FC<SlateTextEditorProps> = ({
  value,
  onChange,
  placeholder = '메모 내용을 입력하세요...',
  className,
  minHeight = 200,
  onFocus,
  onBlur,
  onCursorMove,
}) => {
  // Slate 에디터 인스턴스 생성
  const editor = useMemo(() => withReact(createEditor()) as CustomEditor, []);

  // 텍스트를 Slate 형식으로 변환
  const slateValue = useMemo((): Descendant[] => {
    if (!value || value.trim() === '') {
      return [{ type: 'paragraph', children: [{ text: '' }] }];
    }

    const lines = value.split('\n');
    return lines.map(line => ({
      type: 'paragraph',
      children: [{ text: line }],
    }));
  }, [value]);

  // Slate 값이 변경될 때 문자열로 변환
  const handleSlateChange = useCallback((slateValue: Descendant[]) => {
    const isAstChange = editor.operations.some(
      op => 'set_selection' !== op.type
    );
    
    if (isAstChange) {
      const content = slateValue
        .map(node => {
          if (SlateElement.isElement(node) && node.type === 'paragraph') {
            return node.children.map(child => ('text' in child ? child.text : '')).join('');
          }
          return '';
        })
        .join('\n')
        .replace(/\n+$/, ''); // 끝의 불필요한 줄바꿈 제거
      
      onChange(content);
    }
  }, [editor.operations, onChange]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Slate
        editor={editor}
        initialValue={slateValue}
        onValueChange={handleSlateChange}
      >
        <EditableContent
          placeholder={placeholder}
          minHeight={minHeight}
          onValueChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onCursorMove={onCursorMove}
        />
      </Slate>
    </div>
  );
};

export default SlateTextEditor;