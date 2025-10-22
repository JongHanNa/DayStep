import { EditorView, Decoration, DecorationSet, ViewUpdate, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// 헤더 데코레이션을 생성하는 함수
function buildHeaderDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  
  for (let line = 1; line <= doc.lines; line++) {
    const lineInfo = doc.line(line);
    const text = lineInfo.text.trim();
    
    // ATX 헤더 패턴 매칭 (# ## ### 등)
    const headerMatch = text.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      
      let style = '';
      switch (level) {
        case 1:
          style = 'font-size: 2em; font-weight: bold; line-height: 1.2;';
          break;
        case 2:
          style = 'font-size: 1.5em; font-weight: bold; line-height: 1.3;';
          break;
        case 3:
          style = 'font-size: 1.17em; font-weight: bold; line-height: 1.4;';
          break;
        case 4:
          style = 'font-size: 1.1em; font-weight: bold; line-height: 1.4;';
          break;
        case 5:
          style = 'font-size: 1em; font-weight: bold; line-height: 1.5;';
          break;
        case 6:
          style = 'font-size: 1em; font-weight: bold; line-height: 1.5; color: hsl(var(--muted-foreground));';
          break;
      }
      
      if (style) {
        const decoration = Decoration.line({
          attributes: { style },
          class: `cm-header-${level}`
        });
        builder.add(lineInfo.from, lineInfo.from, decoration);
      }
    }
  }
  
  return builder.finish();
}

// 헤더 데코레이션 플러그인
const headerDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildHeaderDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildHeaderDecorations(update.view);
      }
    }
  },
  {
    decorations: v => v.decorations
  }
);

// 헤더 데코레이션 확장
export const headerDecorationExtension = [headerDecorationPlugin];