'use client';

import React, { useCallback, useMemo, useState, useRef } from 'react';
import AdvancedMarkdownEditor from './AdvancedMarkdownEditor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = '노트 내용을 입력하세요...',
  className = '',
  minHeight = 400,
  onFocus,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef<any>(null);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const handleInsert = useCallback((text: string, cursorOffset: number = 0) => {
    // AdvancedMarkdownEditor의 handleToolbarInsert와 동일한 로직
    if (editorRef.current && editorRef.current.view) {
      const view = editorRef.current.view;
      const { state } = view;
      const { selection } = state;
      const from = selection.main.from;
      
      view.dispatch({
        changes: {
          from,
          to: selection.main.to,
          insert: text,
        },
        selection: {
          anchor: from + text.length + cursorOffset,
        },
      });
      view.focus();
    }
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // 에디터 컨테이너 클릭 시 에디터에 포커스
    if (editorRef.current && editorRef.current.view) {
      console.log('📝 [MarkdownEditor] 컨테이너 클릭 - 포커스 처리');
      editorRef.current.view.focus();
    }
  }, []);

  const handleContainerTouchStart = useCallback((event: React.TouchEvent) => {
    // 모달 드래그 방지
    event.stopPropagation();
    
    // 모바일 터치 시 즉시 포커스 처리
    if (editorRef.current && editorRef.current.view) {
      console.log('📝 [MarkdownEditor] 컨테이너 터치 - 즉시 포커스 처리');
      editorRef.current.view.focus();
    }
  }, []);

  const handleContainerTouchMove = useCallback((event: React.TouchEvent) => {
    // 터치 드래그 시 모달 드래그 방지
    event.stopPropagation();
  }, []);

  const handleContainerTouchEnd = useCallback((event: React.TouchEvent) => {
    // 모달 드래그 방지
    event.stopPropagation();
  }, []);

  return (
    <div 
      className={`markdown-editor-container ${className}`}
      onClick={handleContainerClick}
      onTouchStart={handleContainerTouchStart}
      onTouchMove={handleContainerTouchMove}
      onTouchEnd={handleContainerTouchEnd}
      style={{
        touchAction: 'pan-y',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <AdvancedMarkdownEditor
        ref={editorRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={minHeight}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );
};

export default MarkdownEditor;