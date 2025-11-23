import { EditorView, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { EditorState, StateField, Range } from '@codemirror/state';

// Live Preview Extension - 헤더 마크다운 문법 숨기기
export const livePreviewField = StateField.define<Set<number>>({
  create() {
    return new Set();
  },
  update(set, tr) {
    // 문서 변경 또는 selection 변경 시 업데이트 (드래그 범위 포함)
    if (tr.docChanged || tr.selection) {
      // 드래그 범위 선택 시: 시작 라인부터 끝 라인까지 편집 모드
      const { from, to } = tr.state.selection.main;
      const startLine = tr.state.doc.lineAt(from).number;
      const endLine = tr.state.doc.lineAt(to).number;

      // 범위 내 모든 라인을 편집 모드로 전환
      const editLines = new Set<number>();
      for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
        editLines.add(lineNum);
      }
      return editLines;
    }
    return set;
  }
});

// 마크다운 문법 숨기기를 위한 데코레이션
export const hideMarkdownExtension = EditorView.updateListener.of((update) => {
  if (update.selectionSet || update.docChanged) {
    update.view.requestMeasure();
  }
});

// 마크다운 문법 숨기기 데코레이션 필드
export const markdownHideDecorations = StateField.define<DecorationSet>({
  create(state) {
    return buildMarkdownDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged) {
      return buildMarkdownDecorations(tr.state);
    }
    // selection만 변경된 경우 기존 decoration 유지 (DOM re-render 방지)
    if (tr.selection && !tr.docChanged) {
      return decorations;
    }
    return decorations.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f)
});

// View 참조를 저장할 전역 변수 (컴포넌트별로 고유 ID 사용)
let currentEditorView: EditorView | null = null;

// 전역 View 참조 설정
export function setCurrentEditorView(view: EditorView | null) {
  currentEditorView = view;
}

// 전역 View 참조 반환
export function getCurrentEditorView() {
  return currentEditorView;
}

function buildMarkdownDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const currentLineNum = state.doc.lineAt(state.selection.main.head).number;

  // 에디터 포커스 상태 확인
  const view = getCurrentEditorView();
  const isFocused = view?.hasFocus ?? false;

  for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
    const line = state.doc.line(lineNum);
    const lineText = line.text;

    // 비포커스 상태이거나, 포커스 상태에서 현재 라인이 아닌 경우 마크다운 문법 숨기기
    if (!isFocused || lineNum !== currentLineNum) {
      
      // 1. 헤더 문법 (# ## ### 등)
      const headerMatch = lineText.match(/^(#{1,6})\s/);
      if (headerMatch) {
        const headerSymbols = headerMatch[1];
        const from = line.from;
        const to = line.from + headerSymbols.length + 1; // # 문자들과 공백까지
        
        decorations.push(
          Decoration.mark({
            class: 'cm-markdown-hidden'
          }).range(from, to)
        );
      }
      
      // 2. Bold 문법 (**text**)
      const boldMatches = [...lineText.matchAll(/\*\*([^*]+)\*\*/g)];
      for (const match of boldMatches) {
        if (match.index !== undefined) {
          const from = line.from + match.index;
          const to = line.from + match.index + 2; // **
          const contentFrom = line.from + match.index + 2;
          const contentTo = line.from + match.index + match[0].length - 2;
          const endFrom = line.from + match.index + match[0].length - 2; // **
          const endTo = line.from + match.index + match[0].length;
          
          // 범위 유효성 검사
          if (from < to && contentFrom < contentTo && endFrom < endTo) {
            // 중간 텍스트에 Bold 스타일 적용 (우선 적용)
            decorations.push(
              Decoration.mark({
                class: 'cm-bold-content',
                tagName: 'strong',
                startSide: -1,
                endSide: 1
              }).range(contentFrom, contentTo)
            );
            // 앞 ** 숨기기
            decorations.push(
              Decoration.mark({
                class: 'cm-markdown-hidden',
                startSide: 1
              }).range(from, to)
            );
            // 뒤 ** 숨기기
            decorations.push(
              Decoration.mark({
                class: 'cm-markdown-hidden',
                startSide: 1
              }).range(endFrom, endTo)
            );
          }
        }
      }
      
      // 3. Italic 문법 (*text*) - Bold와 겹치지 않는 경우만
      const italicMatches = [...lineText.matchAll(/(?<!\*)\*([^*]+)\*(?!\*)/g)];
      for (const match of italicMatches) {
        if (match.index !== undefined) {
          const from = line.from + match.index;
          const to = line.from + match.index + 1; // *
          const contentFrom = line.from + match.index + 1;
          const contentTo = line.from + match.index + match[0].length - 1;
          const endFrom = line.from + match.index + match[0].length - 1; // *
          const endTo = line.from + match.index + match[0].length;
          
          // 범위 유효성 검사
          if (from < to && contentFrom < contentTo && endFrom < endTo) {
            // 앞 * 숨기기
            decorations.push(
              Decoration.mark({
                class: 'cm-markdown-hidden'
              }).range(from, to)
            );
            // 뒤 * 숨기기
            decorations.push(
              Decoration.mark({
                class: 'cm-markdown-hidden'
              }).range(endFrom, endTo)
            );
            // 중간 텍스트에 Italic 스타일 적용
            decorations.push(
              Decoration.mark({
                class: 'cm-italic-content',
                tagName: 'em'
              }).range(contentFrom, contentTo)
            );
          }
        }
      }
      
      // 4. Strikethrough 문법 (~~text~~)
      const strikeMatches = [...lineText.matchAll(/~~([^~]+)~~/g)];
      for (const match of strikeMatches) {
        if (match.index !== undefined) {
          const from = line.from + match.index;
          const to = line.from + match.index + 2; // ~~
          const contentFrom = line.from + match.index + 2;
          const contentTo = line.from + match.index + match[0].length - 2;
          const endFrom = line.from + match.index + match[0].length - 2; // ~~
          const endTo = line.from + match.index + match[0].length;
          
          // 범위 유효성 검사
          if (from < to && contentFrom < contentTo && endFrom < endTo) {
            // 앞 ~~ 숨기기
            decorations.push(
              Decoration.mark({
                class: 'cm-markdown-hidden'
              }).range(from, to)
            );
            // 뒤 ~~ 숨기기
            decorations.push(
              Decoration.mark({
                class: 'cm-markdown-hidden'
              }).range(endFrom, endTo)
            );
            // 중간 텍스트에 Strikethrough 스타일 적용
            decorations.push(
              Decoration.mark({
                class: 'cm-strikethrough-content',
                tagName: 'del'
              }).range(contentFrom, contentTo)
            );
          }
        }
      }
      
      // 5. Inline Code 문법 (`text`)
      const codeMatches = [...lineText.matchAll(/`([^`]+)`/g)];
      for (const match of codeMatches) {
        if (match.index !== undefined) {
          const from = line.from + match.index;
          const to = line.from + match.index + 1; // `
          const contentFrom = line.from + match.index + 1;
          const contentTo = line.from + match.index + match[0].length - 1;
          const endFrom = line.from + match.index + match[0].length - 1; // `
          const endTo = line.from + match.index + match[0].length;
          
          // 범위 유효성 검사
          if (from < to && contentFrom < contentTo && endFrom < endTo) {
            // 앞 ` 숨기기
            decorations.push(
              Decoration.mark({
                class: 'cm-markdown-hidden'
              }).range(from, to)
            );
            // 뒤 ` 숨기기
            decorations.push(
              Decoration.mark({
                class: 'cm-markdown-hidden'
              }).range(endFrom, endTo)
            );
            // 중간 텍스트에 Code 스타일 적용
            decorations.push(
              Decoration.mark({
                class: 'cm-code-content',
                tagName: 'code'
              }).range(contentFrom, contentTo)
            );
          }
        }
      }
      
      // 6. 체크박스 문법 (- [ ] 또는 - [x])
      const checkboxMatch = lineText.match(/^-\s(\[[ x]\])\s/);
      if (checkboxMatch) {
        const from = line.from;
        const to = line.from + checkboxMatch[0].length; // - [ ] 또는 - [x] 
        const contentFrom = line.from + checkboxMatch[0].length;
        const contentTo = line.to;
        const isChecked = checkboxMatch[1] === '[x]';
        
        // 범위 유효성 검사
        if (from < to) {
          // - [ ] 또는 - [x] 숨기기
          decorations.push(
            Decoration.mark({
              class: 'cm-markdown-hidden'
            }).range(from, to)
          );
          
          // 체크박스 아이콘 추가
          decorations.push(
            Decoration.widget({
              widget: new CheckboxWidget(lineNum, isChecked),
              side: 1
            }).range(from)
          );
          
          // 텍스트에 체크박스 스타일 적용
          if (contentFrom < contentTo) {
            decorations.push(
              Decoration.mark({
                class: isChecked ? 'cm-checkbox-checked-content' : 'cm-checkbox-content'
              }).range(contentFrom, contentTo)
            );
          }
        }
      }
      
      // 7. 형광펜 문법 (==text==)
      const highlightMatches = [...lineText.matchAll(/==([^=]+)==/g)];
      for (const match of highlightMatches) {
        if (match.index !== undefined) {
          const from = line.from + match.index;
          const to = line.from + match.index + 2; // ==
          const contentFrom = line.from + match.index + 2;
          const contentTo = line.from + match.index + match[0].length - 2;
          const endFrom = line.from + match.index + match[0].length - 2; // ==
          const endTo = line.from + match.index + match[0].length;
          
          // 범위 유효성 검사
          if (from < to && contentFrom < contentTo && endFrom < endTo) {
            // 앞 == 숨기기
            decorations.push(
              Decoration.mark({
                class: 'cm-markdown-hidden'
              }).range(from, to)
            );
            // 뒤 == 숨기기
            decorations.push(
              Decoration.mark({
                class: 'cm-markdown-hidden'
              }).range(endFrom, endTo)
            );
            // 중간 텍스트에 Highlight 스타일 적용
            decorations.push(
              Decoration.mark({
                class: 'cm-highlight-content',
                tagName: 'mark'
              }).range(contentFrom, contentTo)
            );
          }
        }
      }
      
      // 8. Quote 문법 (> text)
      const quoteMatch = lineText.match(/^>\s/);
      if (quoteMatch) {
        const from = line.from;
        const to = line.from + quoteMatch[0].length; // > 
        const contentFrom = line.from + quoteMatch[0].length;
        const contentTo = line.to;
        
        // 범위 유효성 검사
        if (from < to && contentFrom <= contentTo) {
          // > 숨기기
          decorations.push(
            Decoration.mark({
              class: 'cm-markdown-hidden'
            }).range(from, to)
          );
          // 인용문 내용에 Quote 스타일 적용 (내용이 있는 경우만)
          if (contentFrom < contentTo) {
            decorations.push(
              Decoration.mark({
                class: 'cm-quote-content'
              }).range(contentFrom, contentTo)
            );
          }
        }
      }
    }
  }
  
  // 데코레이션을 위치와 startSide 순서대로 정렬
  decorations.sort((a, b) => {
    if (a.from !== b.from) {
      return a.from - b.from;
    }
    if (a.to !== b.to) {
      return a.to - b.to;
    }
    // startSide 고려한 정렬
    const aStartSide = a.value.startSide || 0;
    const bStartSide = b.value.startSide || 0;
    return aStartSide - bStartSide;
  });
  
  // 유효하지 않은 범위 제거
  const validDecorations = decorations.filter(dec => 
    dec.from >= 0 && dec.to >= dec.from && dec.to <= state.doc.length
  );
  
  return Decoration.set(validDecorations);
}

// 체크박스 위젯 클래스
class CheckboxWidget extends WidgetType {
  constructor(private lineNumber: number, private isChecked: boolean) {
    super();
  }
  
  toDOM() {
    const container = document.createElement('span');
    container.style.display = 'inline-block';
    container.style.cursor = 'pointer';
    container.style.marginRight = '8px';
    container.style.padding = '2px';
    container.style.userSelect = 'none';
    
    const checkbox = document.createElement('span');
    checkbox.className = `cm-checkbox ${this.isChecked ? 'checked' : 'unchecked'}`;
    checkbox.innerHTML = this.isChecked ? '☑️' : '☐';
    checkbox.style.fontSize = '14px';
    checkbox.style.pointerEvents = 'auto';
    
    // 라인 번호 정보를 컨테이너에 추가
    container.setAttribute('data-line-number', this.lineNumber.toString());
    container.setAttribute('data-checkbox-state', this.isChecked ? 'checked' : 'unchecked');
    container.className = `cm-checkbox-container ${this.isChecked ? 'checked' : 'unchecked'}`;
    
    // 클릭 이벤트를 컨테이너에 직접 추가
    container.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Direct checkbox container mousedown!', this.lineNumber);
      
      // 전역 view 참조 사용
      const view = getCurrentEditorView();
      if (!view) {
        console.log('No view reference available in global store');
        return;
      }
      console.log('Using view reference, toggling checkbox for line:', this.lineNumber);
      
      // 직접 토글 실행
      if (this.lineNumber >= 1 && this.lineNumber <= view.state.doc.lines) {
        const line = view.state.doc.line(this.lineNumber);
        const lineText = line.text;
        
        let newText;
        if (lineText.includes('- [ ]')) {
          newText = lineText.replace('- [ ]', '- [x]');
        } else if (lineText.includes('- [x]')) {
          newText = lineText.replace('- [x]', '- [ ]');
        }
        
        if (newText) {
          console.log('Direct update:', lineText, '→', newText);
          view.dispatch({
            changes: {
              from: line.from,
              to: line.to,
              insert: newText
            }
          });
        }
      }
    });
    
    container.appendChild(checkbox);
    return container;
  }
}