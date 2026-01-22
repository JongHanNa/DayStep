'use client';

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView, drawSelection } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';

// 분리된 모듈들 임포트
import { markdownHighlightStyle, createLivePreviewTheme, createEditorTheme, globalMarkdownStyles, webFocusTheme, mobileFocusTheme } from './editor/markdownStyles';
import { livePreviewField, markdownHideDecorations, hideMarkdownExtension, setCurrentEditorView } from './editor/markdownDecorations';
import { checkboxClickExtension } from './editor/checkboxFeature';
import { markdownKeymap } from './editor/markdownKeymap';
import { headerDecorationExtension } from './editor/markdownHeaderDecorations';
import { dynamicCursorPlugin } from './editor/markdownCursorPlugin';
import MarkdownToolbar from './editor/MarkdownToolbar';

// 에디터 ref 인터페이스 (외부에서 조작 시 사용)
export interface AdvancedMarkdownEditorRef {
  view: any;
  insertText: (text: string, cursorOffset?: number) => void;
  wrapSelection: (prefix: string, suffix: string) => void;
}

interface AdvancedMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  /** 글자 크기 (px). 미지정 시 플랫폼별 기본값 적용 (웹: 14px, 모바일: 16px) */
  fontSize?: number;
  /** 글자 크기 변경 콜백 */
  onFontSizeChange?: (size: number) => void;
  /** 툴바 표시 여부 (기본: true) */
  showToolbar?: boolean;
}












// 더블탭 감지 임계값 (ms)
const DOUBLE_TAP_THRESHOLD = 300;

const AdvancedMarkdownEditor = React.forwardRef<any, AdvancedMarkdownEditorProps>(({
  value,
  onChange,
  placeholder = '노트 내용을 입력하세요...',
  className = '',
  minHeight = 400,
  onFocus,
  onBlur,
  fontSize,
  onFontSizeChange,
  showToolbar = true,
}, ref) => {
  const editorRef = useRef<any>(null);
  const [platform, setPlatform] = useState<'web' | 'mobile'>('web');

  // 더블탭 감지를 위한 마지막 터치 시간 추적
  const lastTouchTimeRef = useRef<number>(0);

  // 플랫폼 감지 - 더 정확한 감지 로직
  useEffect(() => {
    const detectPlatform = async () => {
      try {
        // 먼저 웹 환경인지 확인 (window.navigator 존재 여부)
        if (typeof window !== 'undefined' && window.navigator) {
          // User Agent를 통한 모바일 기기 감지
          const userAgent = window.navigator.userAgent.toLowerCase();
          const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

          // Capacitor 환경인지 확인
          const { isCapacitorEnvironment } = await import('@/lib/supabaseWebViewHelper');

          if (isCapacitorEnvironment() && isMobileDevice) {
            console.log('📝 [Editor] 모바일 Capacitor 환경 감지');
            setPlatform('mobile');
          } else {
            console.log('📝 [Editor] 웹 브라우저 환경 감지');
            setPlatform('web');
          }
        } else {
          // 서버 사이드 렌더링 환경
          setPlatform('web');
        }
      } catch (error) {
        console.log('📝 [Editor] 플랫폼 감지 실패, 웹으로 설정:', error);
        // 기본값은 웹
        setPlatform('web');
      }
    };

    detectPlatform();
  }, []);
  
  // 텍스트 삽입 함수 (ref로 노출)
  const insertText = useCallback((text: string, cursorOffset: number = 0) => {
    if (editorRef.current) {
      const view = editorRef.current.view;
      if (view) {
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
    }
  }, []);

  // 선택 영역 감싸기 함수 (ref로 노출)
  const wrapSelection = useCallback((prefix: string, suffix: string) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    if (selectedText) {
      view.dispatch({
        changes: { from, to, insert: `${prefix}${selectedText}${suffix}` },
        selection: { anchor: from + prefix.length + selectedText.length + suffix.length }
      });
    } else {
      view.dispatch({
        changes: { from, to, insert: `${prefix}${suffix}` },
        selection: { anchor: from + prefix.length }
      });
    }
    view.focus();
  }, []);

  // ref 전달 - 외부에서 에디터 조작 가능
  React.useImperativeHandle(ref, () => ({
    view: editorRef.current?.view,
    insertText,
    wrapSelection,
  }), [insertText, wrapSelection]);
  
  const extensions = useMemo(() => [
    // 키맵을 가장 먼저 배치하여 최고 우선순위 확보
    markdownKeymap,
    // 마크다운 파싱 - 헤더 클래스 생성을 위해 필요
    markdown(),
    syntaxHighlighting(markdownHighlightStyle),
    livePreviewField,
    markdownHideDecorations,
    hideMarkdownExtension,
    checkboxClickExtension,
    // 헤더 크기 데코레이션 (직접 스타일 적용)
    headerDecorationExtension,
    // 동적 커서 크기 조정 플러그인
    dynamicCursorPlugin,
    // drawSelection() 추가 - .cm-selectionBackground 활성화 (필수)
    drawSelection(),
    // 글자 크기 적용: props로 지정된 값 > 플랫폼별 기본값 (웹: 14px, 모바일: 16px)
    createLivePreviewTheme(fontSize ?? (platform === 'mobile' ? 16 : 14)),
    // 플랫폼별 포커스 테마 적용 (CodeMirror 6 공식 방법)
    platform === 'web' ? webFocusTheme : mobileFocusTheme,
    EditorView.lineWrapping,
    createEditorTheme(minHeight),
  ], [minHeight, platform, fontSize]);

  // ✅ 디바운스 제거 - 즉시 onChange 호출
  // 디바운스가 있으면 빠른 연속 입력 시 Controlled Component 동기화로 입력 손실 발생
  // 자동저장은 useAutoSave에서 1000ms 디바운스로 별도 처리됨
  const handleChange = useCallback((val: string) => {
    onChange(val);
  }, [onChange]);
  
  // CodeMirror view가 생성될 때 view 참조 저장
  const handleCreateEditor = useCallback((view: EditorView) => {
    setCurrentEditorView(view);
    console.log('View reference stored globally for checkbox functionality');
  }, []);
  
  // 컴포넌트 언마운트 시 view 참조 정리
  useEffect(() => {
    return () => {
      setCurrentEditorView(null);
    };
  }, []);

  // 이 코드는 사이드 이펙트를 발생시키므로 제거합니다.
  // CSS로만 포커스 제거를 처리합니다.

  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    onBlur?.();
  }, [onBlur]);

  const handleToolbarInsert = useCallback((text: string, cursorOffset: number = 0) => {
    if (editorRef.current) {
      const view = editorRef.current.view;
      if (view) {
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
    }
  }, []);

  // 선택된 텍스트를 감싸는 함수 (형광펜 등에 사용)
  const handleWrapSelection = useCallback((prefix: string, suffix: string) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    if (selectedText) {
      // 선택된 텍스트가 있으면 감싸기
      view.dispatch({
        changes: { from, to, insert: `${prefix}${selectedText}${suffix}` },
        selection: { anchor: from + prefix.length + selectedText.length + suffix.length }
      });
    } else {
      // 선택된 텍스트가 없으면 마커 삽입 후 커서를 중간으로
      view.dispatch({
        changes: { from, to, insert: `${prefix}${suffix}` },
        selection: { anchor: from + prefix.length }
      });
    }
    view.focus();
  }, []);

  // 터치 드래그 시 모달 드래그 방지
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    // 모달 드래그를 방지하기 위해 이벤트 전파 중단
    event.stopPropagation();
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    // 터치 드래그 시 모달 드래그 방지
    event.stopPropagation();
  }, []);

  // 터치 위치에 정확한 커서 위치 설정 (onTouchEnd에서 처리)
  const handleTouchPositioning = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    // 모달 드래그를 방지하기 위해 이벤트 전파 중단
    event.stopPropagation();

    // 더블탭 감지: iOS 네이티브 단어 선택에 위임
    const now = Date.now();
    const timeSinceLastTouch = now - lastTouchTimeRef.current;
    lastTouchTimeRef.current = now;

    if (timeSinceLastTouch < DOUBLE_TAP_THRESHOLD) {
      console.log('📝 [Editor] 더블탭 감지, iOS 네이티브 단어 선택에 위임');
      return; // 커서 이동 로직 스킵 → iOS가 단어 선택 처리
    }

    const editorView = editorRef.current?.view;
    if (!editorView) return;

    // 체크박스나 다른 위젯 클릭은 제외
    const target = event.target as HTMLElement;
    if (target.classList.contains('cm-checkbox-container') ||
        target.classList.contains('cm-checkbox') ||
        target.closest('.cm-checkbox-container')) {
      console.log('📝 [Editor] 체크박스 클릭 감지, 커서 이동 스킵');
      return;
    }

    // changedTouches에서 터치 위치 구하기 (터치 종료 지점)
    if (event.changedTouches.length === 0) return;
    const touch = event.changedTouches[0];

    const clientX = touch.clientX;
    const clientY = touch.clientY;

    console.log('📝 [Editor] 싱글탭 감지, 터치 종료 위치 기반 커서 이동:', {
      clientX,
      clientY,
      touchType: 'touchend'
    });

    // 짧은 지연 후 커서 위치 설정 (키보드 전환 등을 고려)
    setTimeout(() => {
      const editorView = editorRef.current?.view;
      if (!editorView) {
        return;
      }

      // 이미 단어 선택(드래그 selection)이 있으면 스킵 (iOS 더블탭 또는 드래그 선택 보호)
      const currentSelection = editorView.state.selection.main;
      if (!currentSelection.empty) {
        console.log('📝 [Editor] 기존 selection 유지:', currentSelection.from, '-', currentSelection.to);
        editorView.focus();
        return;
      }

      // 에디터 영역 확인 (최신 rect 가져오기)
      const editorRect = editorView.dom.getBoundingClientRect();
      const isInEditorArea = clientX >= editorRect.left &&
                            clientX <= editorRect.right &&
                            clientY >= editorRect.top &&
                            clientY <= editorRect.bottom;

      if (!isInEditorArea) {
        console.log('📝 [Editor] 에디터 영역 외부 터치, 일반 포커스만 수행');
        editorView.focus();
        return;
      }

      console.log('📝 [Editor] 지연 후 커서 위치 계산:', {
        clientX,
        clientY,
        editorRect: {
          left: editorRect.left,
          top: editorRect.top,
          width: editorRect.width,
          height: editorRect.height
        }
      });

      // posAtCoords로 정확한 위치 계산
      const pos = editorView.posAtCoords({ x: clientX, y: clientY });

      if (typeof pos === 'number' && pos >= 0 && pos <= editorView.state.doc.length) {
        console.log('📝 [Editor] 계산된 텍스트 위치:', pos, '/ 전체 길이:', editorView.state.doc.length);

        // 현재 커서 위치와 다른 경우에만 이동
        const currentPos = editorView.state.selection.main.head;
        if (Math.abs(currentPos - pos) > 1) { // 1자 이상 차이날 때만 이동
          // 커서를 해당 위치로 정확히 이동
          editorView.dispatch({
            selection: { anchor: pos, head: pos },
            scrollIntoView: true,
          });
          console.log('📝 [Editor] 커서 위치 설정 완료 (', currentPos, '→', pos, ')');
        } else {
          console.log('📝 [Editor] 비슷한 위치에 커서가 있어서 이동 스킵');
        }

        // 포커스 보장
        editorView.focus();
      } else {
        console.log('📝 [Editor] 유효하지 않은 터치 위치 (pos:', pos, '), 일반 포커스만 수행');
        editorView.focus();
      }
    }, 100); // 100ms 지연
  }, []);


  const handleMobilePointerDown = useCallback(() => {
    // 포인터 이벤트로도 즉시 포커스 처리 (백업)
    if (editorRef.current && editorRef.current.view) {
      console.log('📝 [Editor] 포인터 다운 - 즉시 포커스 처리');
      editorRef.current.view.focus();
    }
  }, []);

  // 웹 환경용 마우스 클릭 이벤트 처리
  const handleWebMouseClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (platform !== 'web') return;

    const editorView = editorRef.current?.view;
    if (!editorView) return;

    // 체크박스나 다른 위젯 클릭은 제외
    const target = event.target as HTMLElement;
    if (target.classList.contains('cm-checkbox-container') ||
        target.classList.contains('cm-checkbox') ||
        target.closest('.cm-checkbox-container')) {
      console.log('📝 [Editor] 체크박스 클릭 감지, 커서 이동 스킵');
      return;
    }

    // 드래그로 생성된 selection이 있는 경우 커서 이동 스킵
    const currentSelection = editorView.state.selection.main;
    if (!currentSelection.empty) {
      console.log('📝 [Editor] 드래그 selection 감지, 커서 이동 스킵 (selection 유지)');
      editorView.focus(); // 포커스만 보장
      return;
    }

    const clientX = event.clientX;
    const clientY = event.clientY;

    console.log('📝 [Editor] 웹 마우스 클릭 위치 기반 커서 이동:', {
      clientX,
      clientY,
      eventType: 'click'
    });

    // 에디터 영역 확인
    const editorRect = editorView.dom.getBoundingClientRect();
    const isInEditorArea = clientX >= editorRect.left &&
                          clientX <= editorRect.right &&
                          clientY >= editorRect.top &&
                          clientY <= editorRect.bottom;

    if (!isInEditorArea) {
      console.log('📝 [Editor] 에디터 영역 외부 클릭, 일반 포커스만 수행');
      editorView.focus();
      return;
    }

    // posAtCoords로 정확한 위치 계산
    const pos = editorView.posAtCoords({ x: clientX, y: clientY });

    if (typeof pos === 'number' && pos >= 0 && pos <= editorView.state.doc.length) {
      console.log('📝 [Editor] 계산된 텍스트 위치:', pos, '/ 전체 길이:', editorView.state.doc.length);

      // 커서를 해당 위치로 정확히 이동
      editorView.dispatch({
        selection: { anchor: pos, head: pos },
        scrollIntoView: true,
      });
      console.log('📝 [Editor] 웹 환경 커서 위치 설정 완료:', pos);

      // 포커스 보장
      editorView.focus();
    } else {
      console.log('📝 [Editor] 빈 영역 클릭 - 문서 끝으로 커서 이동');
      // 빈 영역 클릭 시 문서 끝으로 커서 이동
      editorView.dispatch({
        selection: { anchor: editorView.state.doc.length },
        scrollIntoView: true,
      });
      editorView.focus();
    }
  }, [platform]);

  // 빈 영역 클릭 시 mousedown 단계에서 포커스 처리 (mousedown은 빈 영역에서도 캡처됨)
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const editorView = editorRef.current?.view;
    if (!editorView) return;

    // 클릭한 위치가 실제 텍스트 영역인지 확인
    const pos = editorView.posAtCoords({ x: event.clientX, y: event.clientY });

    if (typeof pos !== 'number' || pos < 0) {
      // 빈 영역 클릭 → 문서 끝으로 커서 이동 + 포커스
      editorView.dispatch({
        selection: { anchor: editorView.state.doc.length },
        scrollIntoView: true,
      });
      editorView.focus();
      event.preventDefault();
    }
  }, []);

  return (
    <div
      className={`advanced-markdown-editor-container ${className}`}
      data-platform={platform}
      onClick={handleWebMouseClick}
      onMouseDown={handleMouseDown}
    >
      {showToolbar && (
        <MarkdownToolbar
          onInsert={handleToolbarInsert}
          onWrapSelection={handleWrapSelection}
          fontSize={fontSize}
          onFontSizeChange={onFontSizeChange}
        />
      )}
      
      <div
        className="rounded-b-lg overflow-hidden editor-touch-wrapper"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchPositioning}
        onPointerDown={handleMobilePointerDown}
        onClick={handleWebMouseClick}
        style={{
          touchAction: 'pan-y',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          minHeight: `${minHeight}px`,
        }}
      >
        <CodeMirror
          key={`editor-${fontSize ?? (platform === 'mobile' ? 16 : 14)}`}
          ref={editorRef}
          value={value}
          onChange={handleChange}
          extensions={extensions}
          placeholder={placeholder}
          onCreateEditor={handleCreateEditor}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: true,
            indentOnInput: false,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            highlightSelectionMatches: false,
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <style jsx global>{globalMarkdownStyles}</style>
    </div>
  );
});

AdvancedMarkdownEditor.displayName = 'AdvancedMarkdownEditor';

export default AdvancedMarkdownEditor;