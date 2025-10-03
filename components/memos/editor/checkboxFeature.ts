import { EditorView } from '@codemirror/view';
import { getCurrentEditorView } from './markdownDecorations';

// 체크박스 토글 함수
export function toggleCheckbox(view: EditorView, lineNumber: number) {
  if (lineNumber > 0 && lineNumber <= view.state.doc.lines) {
    const line = view.state.doc.line(lineNumber);
    const lineText = line.text;
    
    console.log('Toggling checkbox on line:', lineNumber, 'text:', lineText);
    
    let newText;
    if (lineText.includes('- [ ]')) {
      newText = lineText.replace('- [ ]', '- [x]');
      console.log('Checking checkbox');
    } else if (lineText.includes('- [x]')) {
      newText = lineText.replace('- [x]', '- [ ]');
      console.log('Unchecking checkbox');
    }
    
    if (newText) {
      console.log('Updating text:', newText);
      view.dispatch({
        changes: {
          from: line.from,
          to: line.to,
          insert: newText
        }
      });
      console.log('Update dispatched successfully!');
      return true;
    }
  }
  return false;
}

// 체크박스 클릭 이벤트 처리 (커스텀 이벤트 + 일반 클릭 모두 지원)
export const checkboxClickExtension = EditorView.domEventHandlers({
  'checkbox-toggle': (event, view) => {
    console.log('Custom checkbox-toggle event received:', event.detail);
    const { lineNumber } = event.detail;
    toggleCheckbox(view, lineNumber);
    return true;
  },
  mousedown: (event, view) => {
    const target = event.target as HTMLElement;
    
    console.log('MouseDown event:', target, target.className, target.innerHTML);
    
    // 체크박스 컨테이너 클릭 감지
    if (target.classList.contains('cm-checkbox-container')) {
      const lineNumber = parseInt(target.getAttribute('data-line-number') || '0', 10);
      if (lineNumber > 0) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Checkbox container click detected, line:', lineNumber);
        toggleCheckbox(view, lineNumber);
        return true;
      }
    }
    
    // 체크박스 아이콘 직접 클릭만 감지 (☐ 또는 ☑️)
    if (target.classList.contains('cm-checkbox') || 
        target.innerHTML === '☐' || 
        target.innerHTML === '☑️') {
      
      event.preventDefault();
      event.stopPropagation();
      console.log('Direct checkbox icon click detected');
      
      // 체크박스 컨테이너에서 라인 번호 가져오기
      const container = target.closest('.cm-checkbox-container');
      const lineNumber = parseInt(container?.getAttribute('data-line-number') || '0', 10);
      if (lineNumber > 0) {
        toggleCheckbox(view, lineNumber);
        return true;
      }
    }
    
    return false;
  }
});