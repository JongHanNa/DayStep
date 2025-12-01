import { HighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

// CodeMirror 6 마크다운 하이라이트 스타일 (색상 및 기본 스타일만)
export const markdownHighlightStyle = HighlightStyle.define([
  { 
    tag: tags.heading1, 
    fontWeight: 'bold', 
    textDecoration: 'none',
    color: 'hsl(var(--foreground))'
  },
  { 
    tag: tags.heading2, 
    fontWeight: 'bold', 
    textDecoration: 'none',
    color: 'hsl(var(--foreground))'
  },
  { 
    tag: tags.heading3, 
    fontWeight: 'bold', 
    textDecoration: 'none',
    color: 'hsl(var(--foreground))'
  },
  { 
    tag: tags.heading4, 
    fontWeight: 'bold', 
    textDecoration: 'none',
    color: 'hsl(var(--foreground))'
  },
  { 
    tag: tags.heading5, 
    fontWeight: 'bold', 
    textDecoration: 'none',
    color: 'hsl(var(--foreground))'
  },
  { 
    tag: tags.heading6, 
    fontWeight: 'bold', 
    textDecoration: 'none',
    color: 'hsl(var(--muted-foreground))'
  },
  { 
    tag: tags.strong, 
    fontWeight: 'bold',
    color: 'hsl(var(--foreground))'
  },
  { 
    tag: tags.emphasis, 
    fontStyle: 'italic',
    color: 'hsl(var(--foreground))'
  },
  { 
    tag: tags.strikethrough, 
    textDecoration: 'line-through',
    color: 'hsl(var(--muted-foreground))'
  },
  { 
    tag: tags.monospace, 
    backgroundColor: 'hsl(var(--muted))',
    color: 'hsl(var(--foreground))',
    padding: '2px 4px',
    borderRadius: '3px',
    fontFamily: "'SFMono-Regular', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace"
  },
  { 
    tag: tags.link, 
    color: 'hsl(var(--primary))',
    textDecoration: 'underline'
  },
  { 
    tag: tags.quote, 
    color: 'hsl(var(--muted-foreground))',
    borderLeft: '4px solid hsl(var(--border))',
    paddingLeft: '12px',
    marginLeft: '8px'
  }
]);

// Live Preview 테마 생성 함수 (글자 크기 직접 지정)
export function createLivePreviewTheme(fontSizePx: number = 14) {
  return EditorView.theme({
    '.cm-line': {
      padding: '4px 0',
      lineHeight: '1.6',
    },
    '.cm-line.editing': {
      backgroundColor: 'transparent',
    },
    '.cm-editor': {
      fontSize: `${fontSizePx}px !important`,
    },
    '.cm-content': {
      fontSize: `${fontSizePx}px !important`,
    },
  // 마크다운 헤더 크기 스타일 (다양한 가능한 클래스명 모두 시도)
  '.cm-header-1, .cm-header1, .cm-heading-1, .cm-heading1, .tok-heading1, .tok-ATXHeading1': {
    fontSize: '2em !important',
    fontWeight: 'bold !important',
    lineHeight: '1.2 !important'
  },
  '.cm-header-2, .cm-header2, .cm-heading-2, .cm-heading2, .tok-heading2, .tok-ATXHeading2': {
    fontSize: '1.5em !important',
    fontWeight: 'bold !important',
    lineHeight: '1.3 !important'
  },
  '.cm-header-3, .cm-header3, .cm-heading-3, .cm-heading3, .tok-heading3, .tok-ATXHeading3': {
    fontSize: '1.17em !important',
    fontWeight: 'bold !important',
    lineHeight: '1.4 !important'
  },
  '.cm-header-4, .cm-header4, .cm-heading-4, .cm-heading4, .tok-heading4, .tok-ATXHeading4': {
    fontSize: '1.1em !important',
    fontWeight: 'bold !important',
    lineHeight: '1.4 !important'
  },
  '.cm-header-5, .cm-header5, .cm-heading-5, .cm-heading5, .tok-heading5, .tok-ATXHeading5': {
    fontSize: '1em !important',
    fontWeight: 'bold !important',
    lineHeight: '1.5 !important'
  },
  '.cm-header-6, .cm-header6, .cm-heading-6, .cm-heading6, .tok-heading6, .tok-ATXHeading6': {
    fontSize: '1em !important',
    fontWeight: 'bold !important',
    lineHeight: '1.5 !important',
    color: 'hsl(var(--muted-foreground)) !important'
  },
  // 더 광범위한 선택자 - 행 전체에 적용
  '& .cm-line:has([class*="header"]), & .cm-line:has([class*="heading"])': {
    fontWeight: 'bold !important'
  },
  // 모바일 환경에서만 포커스 스타일 제거
  '.cm-focused': {
    outline: 'none !important',
    border: 'none !important',
    boxShadow: 'none !important',
  },
  '.cm-editor.cm-focused': {
    outline: 'none !important',
    border: 'none !important',
    boxShadow: 'none !important',
  },
  // 마크다운 문법 숨기기 스타일
  '.cm-markdown-hidden': {
    display: 'none !important',
  },
  // 마크다운 시각적 효과 스타일 (높은 우선순위)
  '.cm-bold-content': {
    fontWeight: '800 !important',
    color: 'hsl(var(--foreground)) !important',
    textDecoration: 'none !important',
    fontStyle: 'normal !important',
    textShadow: '0.5px 0 0 currentColor, -0.5px 0 0 currentColor !important',
  },
  '.cm-italic-content': {
    fontStyle: 'italic !important',
    color: 'hsl(var(--foreground)) !important',
  },
  '.cm-strikethrough-content': {
    textDecoration: 'line-through !important',
    color: 'hsl(var(--muted-foreground)) !important',
  },
  '.cm-code-content': {
    backgroundColor: 'hsl(var(--muted)) !important',
    color: 'hsl(var(--foreground)) !important',
    padding: '3px 6px !important',
    borderRadius: '4px !important',
    fontFamily: "'SFMono-Regular', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace !important",
    fontSize: '0.9em !important',
    border: '1px solid hsl(var(--border)) !important',
    fontWeight: '500 !important',
  },
  '.cm-highlight-content': {
    backgroundColor: 'hsl(45, 100%, 80%) !important',
    color: 'hsl(var(--foreground)) !important',
    padding: '1px 2px !important',
    borderRadius: '2px !important',
  },
  '.cm-checkbox': {
    display: 'inline-block !important',
    cursor: 'pointer !important',
    userSelect: 'none !important',
    fontSize: '16px !important',
    lineHeight: '1 !important',
  },
  '.cm-checkbox-content': {
    color: 'hsl(var(--foreground)) !important',
  },
  '.cm-checkbox-checked-content': {
    color: 'hsl(var(--muted-foreground)) !important',
    textDecoration: 'line-through !important',
  },
  '.cm-quote-content': {
    display: 'block !important',
    color: 'hsl(var(--muted-foreground)) !important',
    borderLeft: '4px solid hsl(var(--primary)) !important',
    paddingLeft: '12px !important',
    marginLeft: '8px !important',
    fontStyle: 'italic !important',
    backgroundColor: 'hsl(var(--muted) / 0.3) !important',
    padding: '8px 12px !important',
    borderRadius: '0 4px 4px 0 !important',
    marginTop: '4px !important',
    marginBottom: '4px !important',
  }
  });
}

// 기본 livePreviewTheme (하위 호환성 - 웹 기본값 14px)
export const livePreviewTheme = createLivePreviewTheme(14);

// 웹 환경용 포커스 테마 (CodeMirror 6 공식 방법)
export const webFocusTheme = EditorView.theme({
  '&.cm-focused': {
    outline: '3px solid hsl(var(--primary)) !important',
    outlineOffset: '2px !important',
    borderRadius: '6px !important',
    boxShadow: '0 0 0 1px hsl(var(--primary) / 0.3), 0 0 8px hsl(var(--primary) / 0.2) !important',
  },
  '&.cm-focused .cm-content': {
    outline: 'none',
  },
  '&.cm-focused .cm-scroller': {
    outline: 'none',
  },
  // 비포커스 상태: 커서 및 selection 완전 숨김
  '&:not(.cm-focused) .cm-cursor, &:not(.cm-focused) .cm-cursor-primary': {
    visibility: 'hidden !important',
    opacity: '0 !important',
  },
  // 비포커스 상태: selection 투명도 낮춤 (드래그 시 보이도록)
  '&:not(.cm-focused) .cm-selectionBackground': {
    backgroundColor: 'hsl(var(--accent) / 0.3)',
  },
  // 비포커스 상태: active line 배경 완전 숨김
  '&:not(.cm-focused) .cm-activeLine': {
    background: 'transparent !important',
    backgroundColor: 'transparent !important',
  },
  // 포커스 상태: 커서 표시 + 깜빡임
  '&.cm-focused .cm-cursor, &.cm-focused .cm-cursor-primary': {
    visibility: 'visible !important',
    opacity: '1 !important',
    animation: 'cm-blink 1.2s infinite !important',
  },
  // 웹 환경 커서 스타일 (정확한 위치 표시와 시각적 명확성)
  '.cm-cursor': {
    borderLeft: '2px solid hsl(var(--primary)) !important',
    borderLeftColor: 'hsl(var(--primary)) !important',
    borderLeftWidth: '2px !important',
    borderLeftStyle: 'solid !important',
    display: 'inline-block !important',
    visibility: 'visible !important',
    opacity: '1 !important',
    height: 'var(--cursor-height, 1em) !important',
    width: '0 !important',
    margin: '0 !important',
    padding: '0 !important',
    background: 'transparent !important',
    position: 'relative !important',
    verticalAlign: 'top !important',
    lineHeight: 'inherit !important',
    animation: 'cm-blink 1.2s infinite !important',
    zIndex: '1 !important',
    pointerEvents: 'none !important',
  },
  '.cm-cursor-primary': {
    borderLeft: '2px solid hsl(var(--primary)) !important',
    borderLeftColor: 'hsl(var(--primary)) !important',
    borderLeftWidth: '2px !important',
    borderLeftStyle: 'solid !important',
    display: 'inline-block !important',
    visibility: 'visible !important',
    opacity: '1 !important',
    height: 'var(--cursor-height, 1em) !important',
    width: '0 !important',
    margin: '0 !important',
    padding: '0 !important',
    background: 'transparent !important',
    position: 'relative !important',
    verticalAlign: 'top !important',
    lineHeight: 'inherit !important',
    animation: 'cm-blink 1.2s infinite !important',
    zIndex: '1 !important',
    pointerEvents: 'none !important',
  },
  '@keyframes cm-blink': {
    '0%, 50%': { opacity: '1' },
    '51%, 100%': { opacity: '0' },
  },
});

// 모바일 환경용 포커스 제거 테마
export const mobileFocusTheme = EditorView.theme({
  '&.cm-focused': {
    outline: 'none !important',
    border: 'none !important',
    boxShadow: 'none !important',
  },
  '&.cm-focused .cm-content': {
    outline: 'none !important',
  },
  '&.cm-focused .cm-scroller': {
    outline: 'none !important',
  },
  '&:focus, &:focus-visible, &:focus-within': {
    outline: 'none !important',
    border: 'none !important',
    boxShadow: 'none !important',
  },
});

// 글로벌 CSS 스타일 문자열
export const globalMarkdownStyles = `
  /* 모바일 터치 최적화 스타일 */
  .advanced-markdown-editor-container .editor-touch-wrapper {
    touch-action: manipulation !important;
    -webkit-touch-callout: none !important;
    -webkit-tap-highlight-color: transparent !important;
    /* user-select은 .cm-content에서 text로 설정됨 (328-330라인) */
  }
  
  .advanced-markdown-editor-container .cm-editor {
    background-color: hsl(var(--background)) !important;
    color: hsl(var(--foreground)) !important;
    touch-action: manipulation !important;
    -webkit-touch-callout: none !important;
    -webkit-tap-highlight-color: transparent !important;
  }

  /* 모바일 환경: 글자 크기는 createLivePreviewTheme에서 동적으로 관리 */
  /* fontSize prop 또는 플랫폼 기본값(모바일: 16px, 웹: 14px)이 적용됨 */
  
  .advanced-markdown-editor-container .cm-content {
    touch-action: manipulation !important;
    -webkit-user-select: text !important;
    user-select: text !important;
  }

  /* 웹 전용: 네이티브 caret 표시 */
  [data-platform="web"] .advanced-markdown-editor-container .cm-content {
    caret-color: hsl(var(--foreground)) !important;
  }

  /* 모바일: 네이티브 caret 숨김 (CodeMirror 커서만 사용) */
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-content,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-editor .cm-content {
    caret-color: transparent !important;
  }

  /* iOS WebView 전용: 네이티브 caret 완전 숨김 (가장 강력한 우선순위) */
  @supports (-webkit-touch-callout: none) {
    [data-platform="mobile"] .advanced-markdown-editor-container .cm-content {
      caret-color: transparent !important;
    }
  }

  /* 텍스트 선택 강제 활성화 */
  .advanced-markdown-editor-container .cm-editor *,
  .advanced-markdown-editor-container .cm-content * {
    user-select: text !important;
    -webkit-user-select: text !important;
  }

  /* 모바일 환경에서만 포커스 완전 제거 (Capacitor 환경) */
  [data-platform="mobile"] .advanced-markdown-editor-container *:focus,
  [data-platform="mobile"] .advanced-markdown-editor-container *:focus-visible,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-focused,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-editor.cm-focused,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-content:focus,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-content:focus-visible,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-scroller:focus,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-scroller:focus-visible,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-editor *:focus,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-editor *:focus-visible,
  [data-platform="mobile"] .advanced-markdown-editor-container div:focus,
  [data-platform="mobile"] .advanced-markdown-editor-container div:focus-visible {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
    -webkit-tap-highlight-color: transparent !important;
    -webkit-focus-ring-color: transparent !important;
  }

  /* 모바일 환경에서만 검은색 커서/포커스 링 제거 */
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-editor:focus-within,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-content:focus-within {
    outline: none !important;
    border: 0 !important;
    box-shadow: 0 0 0 0 transparent !important;
  }

  /* 웹 환경에서 명확한 포커스 스타일 (높은 우선순위) */
  [data-platform="web"] .advanced-markdown-editor-container .cm-editor.cm-focused,
  [data-platform="web"] .advanced-markdown-editor-container .cm-editor:focus-within,
  [data-platform="web"] .advanced-markdown-editor-container .cm-content:focus,
  [data-platform="web"] .advanced-markdown-editor-container .cm-content:focus-visible {
    outline: 3px solid hsl(var(--primary)) !important;
    outline-offset: 2px !important;
    border-radius: 6px !important;
    box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3), 0 0 8px hsl(var(--primary) / 0.2) !important;
  }

  /* 웹 환경에서 에디터 전체 컨테이너 포커스 스타일 */
  [data-platform="web"] .advanced-markdown-editor-container:focus-within .cm-editor {
    outline: 3px solid hsl(var(--primary)) !important;
    outline-offset: 2px !important;
    border-radius: 6px !important;
    box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3), 0 0 8px hsl(var(--primary) / 0.2) !important;
  }
  
  /* 커서 스타일은 웹/모바일 테마에서 관리 */

  /* 포커스 상태에서만 selection 배경 표시 */
  .advanced-markdown-editor-container .cm-editor.cm-focused .cm-selectionBackground {
    background-color: rgba(59, 130, 246, 0.3) !important;
  }

  /* 비포커스 상태: selection 투명도 낮춤 (드래그 시 보이도록) */
  .advanced-markdown-editor-container .cm-editor:not(.cm-focused) .cm-selectionBackground {
    background-color: rgba(59, 130, 246, 0.35) !important;
  }

  /* 비포커스 상태: active line 배경 완전 숨김 */
  .advanced-markdown-editor-container .cm-editor:not(.cm-focused) .cm-activeLine {
    background: transparent !important;
    background-color: transparent !important;
  }

  /* 마크다운 시각적 효과 글로벌 스타일 */
  .advanced-markdown-editor-container .cm-bold-content,
  .advanced-markdown-editor-container strong,
  .advanced-markdown-editor-container .cm-content strong,
  .advanced-markdown-editor-container .cm-line strong {
    font-weight: 800 !important;
    color: hsl(var(--foreground)) !important;
    text-decoration: none !important;
    font-style: normal !important;
    font-family: inherit !important;
    text-shadow: 0.5px 0 0 currentColor, -0.5px 0 0 currentColor !important;
  }
  
  /* CodeMirror 내부 요소들에 대한 더 구체적인 스타일 */
  .advanced-markdown-editor-container .cm-editor .cm-bold-content {
    font-weight: 800 !important;
    text-shadow: 0.5px 0 0 currentColor, -0.5px 0 0 currentColor !important;
  }
  
  .advanced-markdown-editor-container .cm-editor .cm-content .cm-bold-content {
    font-weight: 800 !important;
    text-shadow: 0.5px 0 0 currentColor, -0.5px 0 0 currentColor !important;
  }
  
  /* 가장 높은 우선순위로 Bold 스타일 강제 적용 */
  .advanced-markdown-editor-container * .cm-bold-content {
    font-weight: 800 !important;
    text-shadow: 0.5px 0 0 currentColor, -0.5px 0 0 currentColor !important;
  }
  
  .advanced-markdown-editor-container .cm-italic-content {
    font-style: italic !important;
    color: hsl(var(--foreground)) !important;
  }
  
  .advanced-markdown-editor-container .cm-strikethrough-content {
    text-decoration: line-through !important;
    color: hsl(var(--muted-foreground)) !important;
  }
  
  .advanced-markdown-editor-container .cm-code-content,
  .advanced-markdown-editor-container code {
    background-color: hsl(var(--muted)) !important;
    color: hsl(var(--foreground)) !important;
    padding: 3px 6px !important;
    border-radius: 4px !important;
    font-family: 'SFMono-Regular', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace !important;
    font-size: 0.9em !important;
    border: 1px solid hsl(var(--border)) !important;
    font-weight: 500 !important;
  }
  
  .advanced-markdown-editor-container .cm-highlight-content,
  .advanced-markdown-editor-container mark {
    background-color: hsl(45, 100%, 80%) !important;
    color: hsl(var(--foreground)) !important;
    padding: 1px 2px !important;
    border-radius: 2px !important;
  }
  
  .advanced-markdown-editor-container .cm-checkbox {
    display: inline-block !important;
    cursor: pointer !important;
    user-select: none !important;
    font-size: 16px !important;
    line-height: 1 !important;
  }
  
  .advanced-markdown-editor-container .cm-checkbox-content {
    color: hsl(var(--foreground)) !important;
  }
  
  .advanced-markdown-editor-container .cm-checkbox-checked-content {
    color: hsl(var(--muted-foreground)) !important;
    text-decoration: line-through !important;
  }
  
  .advanced-markdown-editor-container .cm-quote-content {
    display: block !important;
    color: hsl(var(--muted-foreground)) !important;
    border-left: 4px solid hsl(var(--primary)) !important;
    padding-left: 12px !important;
    margin-left: 8px !important;
    font-style: italic !important;
    background-color: hsl(var(--muted) / 0.3) !important;
    padding: 8px 12px !important;
    border-radius: 0 4px 4px 0 !important;
    margin-top: 4px !important;
    margin-bottom: 4px !important;
  }
  
  .advanced-markdown-editor-container .cm-markdown-hidden {
    display: none !important;
  }
  
  /* 마크다운 헤더 크기 스타일 (모든 가능한 클래스와 텍스트 패턴) */
  .advanced-markdown-editor-container .cm-header-1,
  .advanced-markdown-editor-container .cm-header1,
  .advanced-markdown-editor-container .cm-heading-1,
  .advanced-markdown-editor-container .cm-heading1,
  .advanced-markdown-editor-container .tok-heading1,
  .advanced-markdown-editor-container .tok-ATXHeading1,
  .advanced-markdown-editor-container .cm-line:has([class*="header-1"]),
  .advanced-markdown-editor-container .cm-line:has([class*="heading1"]) {
    font-size: 2em !important;
    font-weight: bold !important;
    line-height: 1.2 !important;
  }
  
  .advanced-markdown-editor-container .cm-header-2,
  .advanced-markdown-editor-container .cm-header2,
  .advanced-markdown-editor-container .cm-heading-2,
  .advanced-markdown-editor-container .cm-heading2,
  .advanced-markdown-editor-container .tok-heading2,
  .advanced-markdown-editor-container .tok-ATXHeading2,
  .advanced-markdown-editor-container .cm-line:has([class*="header-2"]),
  .advanced-markdown-editor-container .cm-line:has([class*="heading2"]) {
    font-size: 1.5em !important;
    font-weight: bold !important;
    line-height: 1.3 !important;
  }
  
  .advanced-markdown-editor-container .cm-header-3,
  .advanced-markdown-editor-container .cm-header3,
  .advanced-markdown-editor-container .cm-heading-3,
  .advanced-markdown-editor-container .cm-heading3,
  .advanced-markdown-editor-container .tok-heading3,
  .advanced-markdown-editor-container .tok-ATXHeading3,
  .advanced-markdown-editor-container .cm-line:has([class*="header-3"]),
  .advanced-markdown-editor-container .cm-line:has([class*="heading3"]) {
    font-size: 1.17em !important;
    font-weight: bold !important;
    line-height: 1.4 !important;
  }
  
  .advanced-markdown-editor-container .cm-header-4,
  .advanced-markdown-editor-container .cm-header4,
  .advanced-markdown-editor-container .cm-heading-4,
  .advanced-markdown-editor-container .cm-heading4,
  .advanced-markdown-editor-container .tok-heading4,
  .advanced-markdown-editor-container .tok-ATXHeading4 {
    font-size: 1.1em !important;
    font-weight: bold !important;
    line-height: 1.4 !important;
  }
  
  .advanced-markdown-editor-container .cm-header-5,
  .advanced-markdown-editor-container .cm-header5,
  .advanced-markdown-editor-container .cm-heading-5,
  .advanced-markdown-editor-container .cm-heading5,
  .advanced-markdown-editor-container .tok-heading5,
  .advanced-markdown-editor-container .tok-ATXHeading5 {
    font-size: 1em !important;
    font-weight: bold !important;
    line-height: 1.5 !important;
  }
  
  .advanced-markdown-editor-container .cm-header-6,
  .advanced-markdown-editor-container .cm-header6,
  .advanced-markdown-editor-container .cm-heading-6,
  .advanced-markdown-editor-container .cm-heading6,
  .advanced-markdown-editor-container .tok-heading6,
  .advanced-markdown-editor-container .tok-ATXHeading6 {
    font-size: 1em !important;
    font-weight: bold !important;
    line-height: 1.5 !important;
    color: hsl(var(--muted-foreground)) !important;
  }
  
  /* 텍스트 패턴 기반 헤더 인식 (백업 방법) */
  .advanced-markdown-editor-container .cm-content .cm-line {
    position: relative;
  }
  
  /* # 로 시작하는 라인 스타일링 */
  .advanced-markdown-editor-container .cm-content .cm-line:has-text('^# .*') {
    font-size: 2em !important;
    font-weight: bold !important;
    line-height: 1.2 !important;
  }
  
  /* 다크 모드 지원 */
  [data-theme="dark"] .advanced-markdown-editor-container .cm-editor {
    background-color: hsl(var(--background)) !important;
    color: hsl(var(--foreground)) !important;
  }
  
  /* Capacitor WebView 특화: WKWebView 포커스 링 제거하되 CodeMirror 커서는 유지 */
  .advanced-markdown-editor-container *:not(.cm-cursor):not(.cm-line) {
    outline: none !important;
    -webkit-tap-highlight-color: transparent !important;
    -webkit-focus-ring-color: transparent !important;
  }
  
  /* iOS WebView 전용 포커스 스타일 제거 */
  @supports (-webkit-touch-callout: none) {
    .advanced-markdown-editor-container .cm-focused,
    .advanced-markdown-editor-container .cm-editor.cm-focused,
    .advanced-markdown-editor-container textarea:focus,
    .advanced-markdown-editor-container input:focus,
    .advanced-markdown-editor-container *:focus,
    .advanced-markdown-editor-container *:focus-visible,
    .advanced-markdown-editor-container *:focus-within {
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
      -webkit-appearance: none !important;
      -webkit-tap-highlight-color: transparent !important;
      -webkit-focus-ring-color: transparent !important;
    }
  }
  
  /* 모바일 환경에서만 강력한 포커스 제거 */
  [data-platform="mobile"] .advanced-markdown-editor-container *:focus,
  [data-platform="mobile"] .advanced-markdown-editor-container *:focus-visible,
  [data-platform="mobile"] .advanced-markdown-editor-container *:focus-within {
    outline: 0 !important;
    outline-width: 0 !important;
    outline-style: none !important;
    outline-color: transparent !important;
    outline-offset: 0 !important;
    border: none !important;
    box-shadow: none !important;
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
  }

  /* 모바일 환경에서만 CodeMirror 특화 포커스 제거 - 커서는 보존 */
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-editor,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-content,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-scroller,
  [data-platform="mobile"] .advanced-markdown-editor-container .cm-focused {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
    -webkit-tap-highlight-color: transparent !important;
    -webkit-focus-ring-color: transparent !important;
  }
  
  /* 글로벌 커서 스타일은 테마에서 관리하므로 제거 */
  
  @keyframes cm-blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  /* 모바일 최적화 */
  @media (max-width: 768px) {
    .advanced-markdown-editor-container .cm-content {
      padding: 12px !important;
    }
  }
`;

// 에디터 기본 테마 설정 함수
export function createEditorTheme(minHeight: number) {
  return EditorView.theme({
    '&': {
      height: 'auto',
      minHeight: `${minHeight}px`,
    },
    '.cm-editor': {
      backgroundColor: 'transparent',
    },
    '.cm-scroller': {
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    },
    '.cm-content': {
      padding: '16px',
      paddingBottom: '200px', // 하단 추가 여백 (스크롤 시 마지막 줄 편안하게 보기)
      minHeight: `${minHeight - 32}px`,
    },
    // 모바일 환경에서만 포커스 제거
    '[data-platform="mobile"] .cm-focused .cm-content': {
      outline: 'none !important',
      border: 'none !important',
      boxShadow: 'none !important',
    },
    '[data-platform="mobile"] &:focus, [data-platform="mobile"] &:focus-visible, [data-platform="mobile"] &:focus-within': {
      outline: 'none !important',
      border: 'none !important',
      boxShadow: 'none !important',
    },
    '[data-platform="mobile"] .cm-editor:focus, [data-platform="mobile"] .cm-editor:focus-visible, [data-platform="mobile"] .cm-editor:focus-within': {
      outline: 'none !important',
      border: 'none !important',
      boxShadow: 'none !important',
    },
    '[data-platform="mobile"] .cm-content:focus, [data-platform="mobile"] .cm-content:focus-visible': {
      outline: 'none !important',
      border: 'none !important',
      boxShadow: 'none !important',
      WebkitTapHighlightColor: 'transparent !important',
      WebkitFocusRingColor: 'transparent !important',
      WebkitAppearance: 'none !important',
    },
    // 모바일 환경에서만 Capacitor WebView 특화 스타일
    '[data-platform="mobile"] *': {
      outline: 'none !important',
      WebkitTapHighlightColor: 'transparent !important',
      WebkitFocusRingColor: 'transparent !important',
    },
    // 웹 환경에서 포커스 스타일
    '[data-platform="web"] .cm-focused .cm-content': {
      outline: '3px solid hsl(var(--primary)) !important',
      outlineOffset: '2px !important',
      borderRadius: '6px !important',
      boxShadow: '0 0 0 1px hsl(var(--primary) / 0.3), 0 0 8px hsl(var(--primary) / 0.2) !important',
    },
    '[data-platform="web"] &:focus-within': {
      outline: '3px solid hsl(var(--primary)) !important',
      outlineOffset: '2px !important',
      borderRadius: '6px !important',
      boxShadow: '0 0 0 1px hsl(var(--primary) / 0.3), 0 0 8px hsl(var(--primary) / 0.2) !important',
    },
    '[data-platform="web"] .cm-editor:focus-within': {
      outline: '3px solid hsl(var(--primary)) !important',
      outlineOffset: '2px !important',
      borderRadius: '6px !important',
      boxShadow: '0 0 0 1px hsl(var(--primary) / 0.3), 0 0 8px hsl(var(--primary) / 0.2) !important',
    },
    // CodeMirror 커서 스타일 보장 (웹 환경에서 정확한 위치 표시)
    '.cm-cursor, .cm-cursor-primary': {
      borderLeft: '2px solid hsl(var(--primary)) !important',
      borderLeftColor: 'hsl(var(--primary)) !important',
      borderLeftWidth: '2px !important',
      borderLeftStyle: 'solid !important',
      background: 'transparent !important',
      display: 'inline-block !important',
      visibility: 'visible !important',
      opacity: '1 !important',
      height: 'var(--cursor-height, 1em) !important',
      width: '0 !important',
      margin: '0 !important',
      padding: '0 !important',
      position: 'relative !important',
      verticalAlign: 'top !important',
      lineHeight: 'inherit !important',
      pointerEvents: 'none !important',
      animation: 'cm-blink 1.2s infinite !important',
      zIndex: '1 !important',
    },
  });
}