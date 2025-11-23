import { ViewPlugin, ViewUpdate, EditorView } from '@codemirror/view';

/**
 * 커서 크기를 현재 라인의 폰트 크기에 맞게 동적으로 조정하는 플러그인
 * Heading(# 제목)에서는 커서가 크게, 일반 텍스트에서는 작게 표시됨
 */
export const dynamicCursorPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      this.updateCursorStyle(view);
    }

    update(update: ViewUpdate) {
      // 선택 영역이 변경되거나 문서가 변경될 때마다 커서 스타일 업데이트
      if (update.selectionSet || update.docChanged || update.viewportChanged) {
        this.updateCursorStyle(update.view);
      }
    }

    updateCursorStyle(view: EditorView) {
      try {
        const { state } = view;
        const cursorPos = state.selection.main.head;

        // 커서가 위치한 라인 찾기
        const lineBlock = view.lineBlockAt(cursorPos);
        const line = state.doc.lineAt(cursorPos);
        const lineText = line.text;

        // 헤더 패턴 직접 감지하여 즉시 폰트 크기 결정 (타이핑 시 즉각 반응)
        const headerMatch = lineText.match(/^(#{1,6})\s/);
        let immediateFontSize: string | null = null;

        if (headerMatch) {
          const headerLevel = headerMatch[1].length;
          // 헤더 레벨별 폰트 크기 (markdownStyles.ts와 동일)
          const headerSizes: { [key: number]: string } = {
            1: '28px',
            2: '24px',
            3: '20px',
            4: '18px',
            5: '16px',
            6: '15px'
          };
          immediateFontSize = headerSizes[headerLevel] || '14px';
        } else {
          immediateFontSize = '14px'; // 일반 텍스트
        }

        // 즉시 CSS 변수 적용 (타이핑 시 커서 높이 즉각 반영)
        const applyFontSize = (fontSize: string) => {
          const cmContent = view.dom.querySelector('.cm-content');
          if (cmContent instanceof HTMLElement) {
            cmContent.style.setProperty('--cursor-height', fontSize);
          }

          // 추가로 직접 커서 요소에도 CSS 변수 설정 (백업)
          const cursorElements = view.dom.querySelectorAll('.cm-cursor, .cm-cursor-primary');
          cursorElements.forEach((cursor) => {
            if (cursor instanceof HTMLElement) {
              cursor.style.setProperty('--cursor-height', fontSize);
            }
          });
        };

        // 1단계: 패턴 기반 즉시 적용
        applyFontSize(immediateFontSize);

        // 2단계: DOM 업데이트 완료 대기 후 실제 스타일 재확인 (정확도 보장)
        requestAnimationFrame(() => {
          try {
            // 라인 내 실제 텍스트가 있는 DOM 요소 찾기
            let targetElement: HTMLElement | null = null;

            // lineBlock의 DOM 직접 찾기
            for (const { from, to } of view.visibleRanges) {
              if (lineBlock.from >= from && lineBlock.from <= to) {
                const lineDOM = view.domAtPos(lineBlock.from);
                let element = lineDOM.node;

                // 텍스트 노드면 부모로 올라가기
                while (element && element.nodeType !== Node.ELEMENT_NODE) {
                  const parent = element.parentNode;
                  if (!parent) break;
                  element = parent;
                }

                // cm-line 또는 헤더 클래스를 가진 요소 찾기
                while (element instanceof HTMLElement) {
                  if (element.classList.contains('cm-line') ||
                      element.classList.contains('cm-header-1') ||
                      element.classList.contains('cm-header-2') ||
                      element.classList.contains('cm-header-3') ||
                      element.classList.contains('cm-header-4') ||
                      element.classList.contains('cm-header-5') ||
                      element.classList.contains('cm-header-6')) {
                    targetElement = element;
                    break;
                  }
                  const parent = element.parentElement;
                  if (!parent) break;
                  element = parent;
                }
                break;
              }
            }

            if (!targetElement) return;

            // 실제 computed fontSize 읽기 (데코레이션 적용 후)
            const computedStyle = window.getComputedStyle(targetElement);
            const actualFontSize = computedStyle.fontSize;

            // 실제 DOM 스타일로 최종 업데이트 (패턴 기반 값과 다를 수 있음)
            if (actualFontSize !== immediateFontSize) {
              applyFontSize(actualFontSize);
            }
          } catch (rafError) {
            console.debug('RAF cursor update error:', rafError);
          }
        });
      } catch (error) {
        // 에러 발생 시 조용히 무시 (에디터 동작에 영향 없도록)
        console.debug('Dynamic cursor plugin error:', error);
      }
    }
  }
);
