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

        // 라인 내 실제 텍스트가 있는 DOM 요소 찾기
        // cm-line 클래스를 가진 요소를 직접 찾아서 정확한 폰트 크기 읽기
        let targetElement: HTMLElement | null = null;

        // 방법 1: lineBlock의 DOM 직접 찾기
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
                  element.classList.contains('cm-header-3')) {
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

        // 실제 computed fontSize 읽기
        const computedStyle = window.getComputedStyle(targetElement);
        const fontSize = computedStyle.fontSize;

        // CSS 변수를 사용하여 커서 높이 설정 (!important 충돌 회피)
        // cm-content에 CSS 변수 설정하여 모든 커서에 적용
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
      } catch (error) {
        // 에러 발생 시 조용히 무시 (에디터 동작에 영향 없도록)
        console.debug('Dynamic cursor plugin error:', error);
      }
    }
  }
);
