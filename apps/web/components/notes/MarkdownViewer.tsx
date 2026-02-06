'use client';

import React, { useMemo, useCallback } from 'react';

interface MarkdownViewerProps {
  content: string;
  className?: string;
  onContentChange?: (newContent: string) => void;
  interactive?: boolean;
}

/**
 * 마크다운 뷰어 컴포넌트
 * CodeMirror의 마크다운 스타일을 재사용하여 일관된 렌더링 제공
 * interactive 모드에서는 체크박스를 클릭할 수 있음
 */
const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  className = '',
  onContentChange,
  interactive = false
}) => {
  // 체크박스 클릭 핸들러
  const handleCheckboxClick = useCallback((lineIndex: number, isCurrentlyChecked: boolean) => {
    if (!interactive || !onContentChange) {
      return;
    }

    const lines = content.split('\n');
    if (lineIndex >= lines.length) {
      return;
    }

    const line = lines[lineIndex];
    let newLine: string;

    if (isCurrentlyChecked) {
      // 체크된 상태 → 체크 해제
      newLine = line.replace(/^- \[x\] /, '- [ ] ');
    } else {
      // 체크 해제된 상태 → 체크
      newLine = line.replace(/^- \[ \] /, '- [x] ');
    }

    lines[lineIndex] = newLine;
    const newContent = lines.join('\n');
    onContentChange(newContent);
  }, [content, interactive, onContentChange]);

  // 마크다운 텍스트를 HTML로 변환하는 파서
  const parsedContent = useMemo(() => {
    if (!content) {
      return '';
    }

    const lines = content.split('\n');
    let html = '';

    lines.forEach((line, index) => {
      let processedLine = line;
      let isBlockElement = false;

      // 헤더 파싱 (# ~ ######) - 블록 요소
      if (/^### /.test(processedLine)) {
        processedLine = processedLine.replace(/^### (.*$)/, '<h3>$1</h3>');
        isBlockElement = true;
      } else if (/^## /.test(processedLine)) {
        processedLine = processedLine.replace(/^## (.*$)/, '<h2>$1</h2>');
        isBlockElement = true;
      } else if (/^# /.test(processedLine)) {
        processedLine = processedLine.replace(/^# (.*$)/, '<h1>$1</h1>');
        isBlockElement = true;
      } else if (/^#### /.test(processedLine)) {
        processedLine = processedLine.replace(/^#### (.*$)/, '<h4>$1</h4>');
        isBlockElement = true;
      } else if (/^##### /.test(processedLine)) {
        processedLine = processedLine.replace(/^##### (.*$)/, '<h5>$1</h5>');
        isBlockElement = true;
      } else if (/^###### /.test(processedLine)) {
        processedLine = processedLine.replace(/^###### (.*$)/, '<h6>$1</h6>');
        isBlockElement = true;
      }
      // 체크박스 파싱 (인터랙티브) - 블록 요소
      else if (/^- \[ \] /.test(processedLine)) {
        const text = processedLine.replace(/^- \[ \] /, '');
        processedLine = `<div class="cm-checkbox-line">
          <span class="cm-checkbox ${interactive ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors' : ''}"
                data-line-index="${index}"
                data-checked="false">☐</span>
          <span class="cm-checkbox-content">${text}</span>
        </div>`;
        isBlockElement = true;
      } else if (/^- \[x\] /.test(processedLine)) {
        const text = processedLine.replace(/^- \[x\] /, '');
        processedLine = `<div class="cm-checkbox-line">
          <span class="cm-checkbox ${interactive ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors' : ''}"
                data-line-index="${index}"
                data-checked="true">☑</span>
          <span class="cm-checkbox-checked-content">${text}</span>
        </div>`;
        isBlockElement = true;
      }
      // 인용구 파싱 - 블록 요소
      else if (/^> /.test(processedLine)) {
        processedLine = processedLine.replace(/^> (.*$)/, '<blockquote class="cm-quote-content">$1</blockquote>');
        isBlockElement = true;
      }

      // 굵은 텍스트 (**bold** 또는 __bold__)
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="cm-bold-content">$1</strong>');
      processedLine = processedLine.replace(/__(.*?)__/g, '<strong class="cm-bold-content">$1</strong>');

      // 기울인 텍스트 (*italic* 또는 _italic_)
      processedLine = processedLine.replace(/\*(.*?)\*/g, '<em class="cm-italic-content">$1</em>');
      processedLine = processedLine.replace(/_(.*?)_/g, '<em class="cm-italic-content">$1</em>');

      // 취소선 (~~strikethrough~~)
      processedLine = processedLine.replace(/~~(.*?)~~/g, '<span class="cm-strikethrough-content">$1</span>');

      // 인라인 코드 (`code`)
      processedLine = processedLine.replace(/`([^`]+)`/g, '<code class="cm-code-content">$1</code>');

      // 하이라이트 (==highlight==)
      processedLine = processedLine.replace(/==(.*?)==/g, '<mark class="cm-highlight-content">$1</mark>');

      // 링크 ([text](url))
      processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>');

      html += processedLine;
      // 블록 요소는 자체적으로 줄바꿈을 하므로 <br> 추가 불필요
      if (index < lines.length - 1 && !isBlockElement) {
        html += '<br>';
      }
    });

    return html;
  }, [content, interactive]);

  // 체크박스 클릭 이벤트 핸들러
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!interactive) {
      return;
    }

    const target = e.target as HTMLElement;
    if (target.classList.contains('cm-checkbox')) {
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore - React 이벤트에서 stopImmediatePropagation은 네이티브 이벤트에서만 사용 가능
      e.nativeEvent.stopImmediatePropagation?.();

      const lineIndex = parseInt(target.getAttribute('data-line-index') || '0');
      const isChecked = target.getAttribute('data-checked') === 'true';

      handleCheckboxClick(lineIndex, isChecked);
    }
  }, [interactive, handleCheckboxClick]);

  // 터치 이벤트 핸들러 (모바일/웹 모두 지원)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!interactive) {
      return;
    }

    const target = e.target as HTMLElement;
    if (target.classList.contains('cm-checkbox')) {
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore - React 이벤트에서 stopImmediatePropagation은 네이티브 이벤트에서만 사용 가능
      e.nativeEvent.stopImmediatePropagation?.();
    }
  }, [interactive]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!interactive) {
      return;
    }

    const target = e.target as HTMLElement;
    if (target.classList.contains('cm-checkbox')) {
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore - React 이벤트에서 stopImmediatePropagation은 네이티브 이벤트에서만 사용 가능
      e.nativeEvent.stopImmediatePropagation?.();

      const lineIndex = parseInt(target.getAttribute('data-line-index') || '0');
      const isChecked = target.getAttribute('data-checked') === 'true';

      handleCheckboxClick(lineIndex, isChecked);
    }
  }, [interactive, handleCheckboxClick]);

  return (
    <>
      <style>
        {`
          .markdown-viewer h1 { font-size: 1.75em; font-weight: 700; margin: 0; line-height: 1.6; }
          .markdown-viewer h2 { font-size: 1.5em; font-weight: 600; margin: 0; line-height: 1.6; }
          .markdown-viewer h3 { font-size: 1.25em; font-weight: 600; margin: 0; line-height: 1.6; }
          .markdown-viewer h4 { font-size: 1.1em; font-weight: 600; margin: 0; line-height: 1.6; }
          .markdown-viewer h5 { font-size: 1em; font-weight: 600; margin: 0; line-height: 1.6; }
          .markdown-viewer h6 { font-size: 0.9em; font-weight: 600; margin: 0; line-height: 1.6; }
        `}
      </style>
      <div
        className={`markdown-viewer ${className}`}
        dangerouslySetInnerHTML={{ __html: parsedContent }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          // CodeMirror의 마크다운 스타일 재사용
          lineHeight: '1.6',
          fontSize: '14px',
          color: 'hsl(var(--foreground))',
        }}
      />
    </>
  );
};

export default MarkdownViewer;