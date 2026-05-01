import { BrowserWindow } from 'electron';

const PROTOCOL = 'daystep';

export interface QuickAddPayload {
  text: string;
  receivedAt: number;
}

let pendingPayload: QuickAddPayload | null = null;
let ensureWindowFn: (() => BrowserWindow) | null = null;

export function registerQuickAddIPC(opts: {
  ensureWindow: () => BrowserWindow;
}) {
  ensureWindowFn = opts.ensureWindow;
}

export function handleQuickAddUrl(rawUrl: string): void {
  const payload = parseQuickAddUrl(rawUrl);
  if (!payload) {
    console.warn('[quickAdd] invalid url:', rawUrl);
    return;
  }

  console.log('[quickAdd] received text:', payload.text.slice(0, 80));

  pendingPayload = payload;
  flushPending();
}

function parseQuickAddUrl(rawUrl: string): QuickAddPayload | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== `${PROTOCOL}:`) return null;
    if (parsed.host !== 'add-todo') return null;
    const text = parsed.searchParams.get('text');
    if (!text || !text.trim()) return null;
    return { text: text.trim(), receivedAt: Date.now() };
  } catch {
    return null;
  }
}

function flushPending(): void {
  if (!pendingPayload || !ensureWindowFn) return;

  const win = ensureWindowFn();

  const send = () => {
    if (!pendingPayload) return;
    win.webContents.send('quickAdd:pending', pendingPayload);
    pendingPayload = null;
    win.show();
    win.focus();
  };

  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', send);
  } else {
    send();
  }
}

export function extractDayStepUrlFromArgv(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL}://`)) || null;
}
