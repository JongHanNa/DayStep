/**
 * Electron 데스크톱 전용 키보드 단축키
 * 렌더러 측에서 키보드 이벤트를 감지하여 처리
 */

interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
}

let shortcuts: ShortcutHandler[] = [];
let isInitialized = false;

function handleKeyDown(event: KeyboardEvent) {
  const isMod = event.metaKey || event.ctrlKey;

  for (const shortcut of shortcuts) {
    const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
    const modMatch = shortcut.ctrl || shortcut.meta ? isMod : !isMod;
    const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

    if (keyMatch && modMatch && shiftMatch) {
      event.preventDefault();
      shortcut.handler();
      return;
    }
  }
}

/**
 * 단축키 시스템 초기화
 * @param navigationCallback 페이지 이동 콜백
 */
export function initShortcuts(navigationCallback: (path: string) => void) {
  if (isInitialized) return;
  if (typeof window === 'undefined') return;
  if (!(window as any).electronAPI) return;

  shortcuts = [
    {
      key: 'n',
      ctrl: true,
      handler: () => {
        // 새 할일 추가 - 커스텀 이벤트 발송
        window.dispatchEvent(new CustomEvent('electron:new-todo'));
      },
      description: '새 할일 추가',
    },
    {
      key: 'f',
      ctrl: true,
      handler: () => {
        window.dispatchEvent(new CustomEvent('electron:search'));
      },
      description: '검색',
    },
    {
      key: ',',
      ctrl: true,
      handler: () => {
        navigationCallback('/settings');
      },
      description: '설정',
    },
    {
      key: '1',
      ctrl: true,
      handler: () => navigationCallback('/'),
      description: '홈',
    },
    {
      key: '2',
      ctrl: true,
      handler: () => navigationCallback('/adhd'),
      description: 'ADHD',
    },
  ];

  window.addEventListener('keydown', handleKeyDown);
  isInitialized = true;
}

/**
 * 단축키 시스템 정리
 */
export function cleanupShortcuts() {
  if (!isInitialized) return;
  window.removeEventListener('keydown', handleKeyDown);
  shortcuts = [];
  isInitialized = false;
}
