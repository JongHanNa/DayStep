import { keymap } from '@codemirror/view';

// 마크다운 에디터용 키맵 정의
export const markdownKeymap = keymap.of([
  {
    key: 'Enter',
    preventDefault: true,
    stopPropagation: true,
    run: (view) => {
      const { state } = view;
      const { selection } = state;
      
      const line = state.doc.lineAt(selection.main.head);
      const lineText = line.text;
      const cursorPos = selection.main.head - line.from;
      
      console.log('Enter key pressed:', { 
        lineText, 
        cursorPos, 
        lineLength: lineText.length,
        selectionFrom: selection.main.from,
        selectionHead: selection.main.head
      });
      
      // 체크박스 패턴 확인
      const checkboxMatch = lineText.match(/^(\s*- \[[ x]\] )/);
      if (checkboxMatch && cursorPos >= lineText.length - 1) {
        console.log('Checkbox pattern matched, creating new checkbox');
        
        // 현재 라인 끝에 새 줄과 체크박스 추가
        const insertPos = line.to;
        const newCheckbox = '\n- [ ] ';
        
        view.dispatch({
          changes: [{
            from: insertPos,
            to: insertPos,
            insert: newCheckbox
          }],
          selection: {
            anchor: insertPos + newCheckbox.length,
            head: insertPos + newCheckbox.length
          },
          // 스크롤도 따라오게 함
          scrollIntoView: true
        });
        return true;
      }
      
      // 일반 리스트 패턴 확인 (체크박스가 아닌 경우만)
      const listMatch = lineText.match(/^(\s*- )(?!\[)/);
      if (listMatch && cursorPos >= lineText.length - 1) {
        const prefix = listMatch[1];
        const insertPos = line.to;
        const newList = `\n${prefix}`;
        
        view.dispatch({
          changes: [{
            from: insertPos,
            to: insertPos,
            insert: newList
          }],
          selection: {
            anchor: insertPos + newList.length,
            head: insertPos + newList.length
          },
          scrollIntoView: true
        });
        return true;
      }
      
      // 번호 있는 리스트 패턴 확인
      const numberedListMatch = lineText.match(/^(\s*)(\d+)\. /);
      if (numberedListMatch && cursorPos >= lineText.length - 1) {
        const spaces = numberedListMatch[1];
        const nextNumber = parseInt(numberedListMatch[2]) + 1;
        const prefix = `${spaces}${nextNumber}. `;
        const insertPos = line.to;
        const newNumberedList = `\n${prefix}`;
        
        view.dispatch({
          changes: [{
            from: insertPos,
            to: insertPos,
            insert: newNumberedList
          }],
          selection: {
            anchor: insertPos + newNumberedList.length,
            head: insertPos + newNumberedList.length
          },
          scrollIntoView: true
        });
        return true;
      }
      
      // 기본 엔터 처리
      const insertPos = selection.main.head;
      view.dispatch({
        changes: [{
          from: insertPos,
          to: insertPos,
          insert: '\n'
        }],
        selection: {
          anchor: insertPos + 1,
          head: insertPos + 1
        },
        scrollIntoView: true
      });
      return true;
    },
  },
  {
    key: 'Ctrl-b',
    mac: 'Cmd-b',
    run: (view) => {
      const { state } = view;
      const { selection } = state;
      const text = state.sliceDoc(selection.main.from, selection.main.to);
      const replacement = `**${text}**`;
      view.dispatch({
        changes: {
          from: selection.main.from,
          to: selection.main.to,
          insert: replacement,
        },
        selection: {
          anchor: selection.main.from + 2,
          head: selection.main.from + 2 + text.length,
        },
      });
      return true;
    },
  },
  {
    key: 'Ctrl-i', 
    mac: 'Cmd-i',
    run: (view) => {
      const { state } = view;
      const { selection } = state;
      const text = state.sliceDoc(selection.main.from, selection.main.to);
      const replacement = `*${text}*`;
      view.dispatch({
        changes: {
          from: selection.main.from,
          to: selection.main.to,
          insert: replacement,
        },
        selection: {
          anchor: selection.main.from + 1,
          head: selection.main.from + 1 + text.length,
        },
      });
      return true;
    },
  },
]);