import { protocol, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.map': 'application/json',
};

export function registerAppProtocol() {
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let filePath = url.pathname;

    // 경로 정규화
    if (filePath === '/' || filePath === '') {
      filePath = '/index.html';
    }

    // out 디렉토리에서 파일 찾기 (__dirname = electron/dist/)
    const outDir = path.join(__dirname, '..', '..', 'out');
    let absolutePath = path.join(outDir, filePath);

    // 파일이 없거나 디렉토리인 경우 index.html로 폴백 (SPA 라우팅)
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      const withIndex = path.join(absolutePath, 'index.html');
      if (fs.existsSync(withIndex)) {
        absolutePath = withIndex;
      } else {
        // SPA 폴백
        absolutePath = path.join(outDir, 'index.html');
      }
    }

    // MIME type 결정
    const ext = path.extname(absolutePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const fileContent = fs.readFileSync(absolutePath);
      return new Response(fileContent, {
        headers: {
          'Content-Type': mimeType,
          'Content-Security-Policy': [
            "default-src 'self' app:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' app:",
            "style-src 'self' 'unsafe-inline' app:",
            "img-src 'self' data: blob: https: app:",
            "font-src 'self' data: app:",
            "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co app:",
          ].join('; '),
        },
      });
    } catch (err) {
      console.error(`[Protocol] Failed to read file: ${absolutePath}`, err);
      return new Response('Not Found', { status: 404 });
    }
  });
}
