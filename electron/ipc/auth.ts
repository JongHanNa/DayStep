import { ipcMain, shell, BrowserWindow } from 'electron';
import * as http from 'http';
import * as url from 'url';

let authServer: http.Server | null = null;

export function registerAuthIPC() {
  ipcMain.handle('auth:openOAuth', async (_event, provider: string) => {
    const mainWindow = BrowserWindow.getFocusedWindow();
    if (!mainWindow) return { error: 'No window found' };

    // 로컬 HTTP 서버로 OAuth 콜백 수신
    return new Promise((resolve) => {
      // 이전 서버가 있으면 정리
      if (authServer) {
        authServer.close();
        authServer = null;
      }

      authServer = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url || '', true);

        if (parsedUrl.pathname === '/auth/callback') {
          // PKCE flow: code가 query param으로 옴
          const code = parsedUrl.query.code as string;
          const error = parsedUrl.query.error as string;

          if (code || error) {
            // PKCE flow 성공 — 코드 또는 에러가 query param에 있음
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f7;">
                  <div style="text-align: center;">
                    <h2>${error ? '로그인 실패' : '로그인 성공!'}</h2>
                    <p>${error ? '다시 시도해주세요.' : 'DayStep으로 돌아가세요.'}</p>
                    <p style="color: #999;">이 창은 닫아도 됩니다.</p>
                  </div>
                </body>
              </html>
            `);

            mainWindow?.webContents.send('auth:oauthCallback', {
              code,
              error,
              provider,
            });

            setTimeout(() => {
              authServer?.close();
              authServer = null;
            }, 1000);

            resolve({ success: !error });
          } else {
            // Implicit flow fallback — 토큰이 hash fragment에 있음
            // JS로 hash를 읽어 /auth/complete로 전달하는 HTML 서빙
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f7;">
                  <div style="text-align: center;">
                    <h2 id="status">로그인 처리 중...</h2>
                    <p id="message">잠시만 기다려주세요.</p>
                    <p style="color: #999;">이 창은 닫아도 됩니다.</p>
                  </div>
                  <script>
                    (function() {
                      var hash = window.location.hash.substring(1);
                      if (!hash) {
                        document.getElementById('status').textContent = '로그인 실패';
                        document.getElementById('message').textContent = '인증 정보를 받지 못했습니다.';
                        fetch('/auth/complete?error=no_hash_fragment');
                        return;
                      }
                      var params = new URLSearchParams(hash);
                      var accessToken = params.get('access_token');
                      var refreshToken = params.get('refresh_token');
                      var error = params.get('error');
                      if (error) {
                        document.getElementById('status').textContent = '로그인 실패';
                        document.getElementById('message').textContent = '다시 시도해주세요.';
                        fetch('/auth/complete?error=' + encodeURIComponent(error));
                        return;
                      }
                      if (accessToken) {
                        var qs = 'access_token=' + encodeURIComponent(accessToken);
                        if (refreshToken) qs += '&refresh_token=' + encodeURIComponent(refreshToken);
                        var expiresIn = params.get('expires_in');
                        if (expiresIn) qs += '&expires_in=' + encodeURIComponent(expiresIn);
                        var tokenType = params.get('token_type');
                        if (tokenType) qs += '&token_type=' + encodeURIComponent(tokenType);
                        fetch('/auth/complete?' + qs).then(function() {
                          document.getElementById('status').textContent = '로그인 성공!';
                          document.getElementById('message').textContent = 'DayStep으로 돌아가세요.';
                        });
                      } else {
                        document.getElementById('status').textContent = '로그인 실패';
                        document.getElementById('message').textContent = '인증 토큰을 받지 못했습니다.';
                        fetch('/auth/complete?error=no_access_token');
                      }
                    })();
                  </script>
                </body>
              </html>
            `);
          }
        } else if (parsedUrl.pathname === '/auth/complete') {
          // Hash fragment에서 추출된 토큰을 query param으로 수신
          const accessToken = parsedUrl.query.access_token as string;
          const refreshToken = parsedUrl.query.refresh_token as string;
          const error = parsedUrl.query.error as string;

          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('OK');

          mainWindow?.webContents.send('auth:oauthCallback', {
            access_token: accessToken,
            refresh_token: refreshToken,
            error,
            provider,
          });

          setTimeout(() => {
            authServer?.close();
            authServer = null;
          }, 1000);

          resolve({ success: !error });
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      authServer.listen(0, '127.0.0.1', () => {
        const address = authServer!.address();
        if (!address || typeof address === 'string') {
          resolve({ error: 'Failed to start auth server' });
          return;
        }

        const port = address.port;
        const redirectUri = `http://127.0.0.1:${port}/auth/callback`;

        // 환경변수에서 Supabase URL 가져오기 (빌드 시 주입됨)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

        // Supabase OAuth URL 생성 (PKCE flow로 code를 query param으로 받음)
        const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUri)}&flow_type=pkce`;

        // 시스템 브라우저에서 OAuth 페이지 열기
        shell.openExternal(oauthUrl);
      });

      // 2분 타임아웃
      setTimeout(() => {
        if (authServer) {
          authServer.close();
          authServer = null;
          resolve({ error: 'OAuth timeout' });
        }
      }, 120000);
    });
  });
}
