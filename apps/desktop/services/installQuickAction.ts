import { app, dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

const SERVICE_NAME = 'AddToDayStep';
const MARKER_FILE = 'quick-action-installed-v1';
const SERVICES_DIR = path.join(os.homedir(), 'Library', 'Services');

export async function installQuickActionIfNeeded(): Promise<void> {
  if (process.platform !== 'darwin') return;

  const markerPath = path.join(app.getPath('userData'), MARKER_FILE);
  if (await fileExists(markerPath)) return;

  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['활성화', '나중에'],
    defaultId: 0,
    cancelId: 1,
    title: '빠른 할일 추가 활성화',
    message: '다른 앱에서 텍스트를 선택해 DayStep에 바로 등록할 수 있습니다.',
    detail:
      '활성화하면 macOS의 우클릭 → 서비스 메뉴에 "Add to DayStep" 항목이 추가됩니다.\n언제든 시스템 환경설정에서 끌 수 있습니다.',
  });

  if (result.response !== 0) return;

  try {
    await writeWorkflowBundle();
    await flushServicesCache();
    await fs.writeFile(markerPath, new Date().toISOString());
    console.log('[installQuickAction] installed at', SERVICES_DIR);
  } catch (error) {
    console.error('[installQuickAction] failed:', error);
    await dialog.showMessageBox({
      type: 'warning',
      buttons: ['확인'],
      title: '설치 실패',
      message: '서비스 메뉴 항목을 설치하지 못했습니다.',
      detail: String((error as Error)?.message || error),
    });
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeWorkflowBundle(): Promise<void> {
  const workflowPath = path.join(SERVICES_DIR, `${SERVICE_NAME}.workflow`);
  const contentsPath = path.join(workflowPath, 'Contents');
  await fs.mkdir(contentsPath, { recursive: true });

  await fs.writeFile(path.join(contentsPath, 'Info.plist'), buildInfoPlist(), 'utf8');
  await fs.writeFile(path.join(contentsPath, 'document.wflow'), buildDocumentWflow(), 'utf8');
}

async function flushServicesCache(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('/System/Library/CoreServices/pbs', ['-flush'], { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pbs -flush exited with code ${code}`));
    });
  });
}

function buildInfoPlist(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSServices</key>
    <array>
        <dict>
            <key>NSMenuItem</key>
            <dict>
                <key>default</key>
                <string>Add to DayStep</string>
            </dict>
            <key>NSMessage</key>
            <string>runWorkflowAsService</string>
            <key>NSRequiredContext</key>
            <dict>
                <key>NSTextContent</key>
                <string>Plain</string>
            </dict>
            <key>NSSendFileTypes</key>
            <array/>
            <key>NSSendTypes</key>
            <array>
                <string>public.utf8-plain-text</string>
                <string>public.plain-text</string>
                <string>public.text</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
`;
}

// Automator "Run Shell Script" Quick Action
// 입력: stdin 텍스트 → URL-encode 후 daystep:// 프로토콜 호출
function buildDocumentWflow(): string {
  const shellScript = `TEXT=$(/usr/bin/python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))")
/usr/bin/open "daystep://add-todo?text=$TEXT"
`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>AMApplicationBuild</key>
\t<string>523</string>
\t<key>AMApplicationVersion</key>
\t<string>2.10</string>
\t<key>AMDocumentVersion</key>
\t<string>2</string>
\t<key>actions</key>
\t<array>
\t\t<dict>
\t\t\t<key>action</key>
\t\t\t<dict>
\t\t\t\t<key>AMAccepts</key>
\t\t\t\t<dict>
\t\t\t\t\t<key>Container</key>
\t\t\t\t\t<string>List</string>
\t\t\t\t\t<key>Optional</key>
\t\t\t\t\t<true/>
\t\t\t\t\t<key>Types</key>
\t\t\t\t\t<array>
\t\t\t\t\t\t<string>com.apple.cocoa.string</string>
\t\t\t\t\t</array>
\t\t\t\t</dict>
\t\t\t\t<key>AMActionVersion</key>
\t\t\t\t<string>2.0.3</string>
\t\t\t\t<key>AMApplication</key>
\t\t\t\t<array>
\t\t\t\t\t<string>Automator</string>
\t\t\t\t</array>
\t\t\t\t<key>AMParameterProperties</key>
\t\t\t\t<dict>
\t\t\t\t\t<key>COMMAND_STRING</key>
\t\t\t\t\t<dict/>
\t\t\t\t\t<key>CheckedForUserDefaultShell</key>
\t\t\t\t\t<dict/>
\t\t\t\t\t<key>inputMethod</key>
\t\t\t\t\t<dict/>
\t\t\t\t\t<key>shell</key>
\t\t\t\t\t<dict/>
\t\t\t\t\t<key>source</key>
\t\t\t\t\t<dict/>
\t\t\t\t</dict>
\t\t\t\t<key>AMProvides</key>
\t\t\t\t<dict>
\t\t\t\t\t<key>Container</key>
\t\t\t\t\t<string>List</string>
\t\t\t\t\t<key>Types</key>
\t\t\t\t\t<array>
\t\t\t\t\t\t<string>com.apple.cocoa.string</string>
\t\t\t\t\t</array>
\t\t\t\t</dict>
\t\t\t\t<key>ActionBundlePath</key>
\t\t\t\t<string>/System/Library/Automator/Run Shell Script.action</string>
\t\t\t\t<key>ActionName</key>
\t\t\t\t<string>Run Shell Script</string>
\t\t\t\t<key>ActionParameters</key>
\t\t\t\t<dict>
\t\t\t\t\t<key>COMMAND_STRING</key>
\t\t\t\t\t<string>${escapeXml(shellScript)}</string>
\t\t\t\t\t<key>CheckedForUserDefaultShell</key>
\t\t\t\t\t<true/>
\t\t\t\t\t<key>inputMethod</key>
\t\t\t\t\t<integer>0</integer>
\t\t\t\t\t<key>shell</key>
\t\t\t\t\t<string>/bin/zsh</string>
\t\t\t\t\t<key>source</key>
\t\t\t\t\t<string></string>
\t\t\t\t</dict>
\t\t\t\t<key>BundleIdentifier</key>
\t\t\t\t<string>com.apple.RunShellScript</string>
\t\t\t\t<key>CFBundleVersion</key>
\t\t\t\t<string>2.0.3</string>
\t\t\t\t<key>CanShowSelectedItemsWhenRun</key>
\t\t\t\t<false/>
\t\t\t\t<key>CanShowWhenRun</key>
\t\t\t\t<true/>
\t\t\t\t<key>Category</key>
\t\t\t\t<array>
\t\t\t\t\t<string>AMCategoryUtilities</string>
\t\t\t\t</array>
\t\t\t\t<key>Class Name</key>
\t\t\t\t<string>RunShellScriptAction</string>
\t\t\t\t<key>InputUUID</key>
\t\t\t\t<string>D4F3C9E2-1A2B-4C5D-8E9F-0A1B2C3D4E5F</string>
\t\t\t\t<key>Keywords</key>
\t\t\t\t<array>
\t\t\t\t\t<string>Shell</string>
\t\t\t\t\t<string>Script</string>
\t\t\t\t\t<string>Command</string>
\t\t\t\t\t<string>Run</string>
\t\t\t\t\t<string>Unix</string>
\t\t\t\t</array>
\t\t\t\t<key>OutputUUID</key>
\t\t\t\t<string>F5E4D3C2-B1A0-4F5E-8D9C-7B6A5F4E3D2C</string>
\t\t\t\t<key>UUID</key>
\t\t\t\t<string>11111111-2222-3333-4444-555555555555</string>
\t\t\t\t<key>UnlocalizedApplications</key>
\t\t\t\t<array>
\t\t\t\t\t<string>Automator</string>
\t\t\t\t</array>
\t\t\t\t<key>arguments</key>
\t\t\t\t<dict/>
\t\t\t\t<key>isViewVisible</key>
\t\t\t\t<true/>
\t\t\t\t<key>location</key>
\t\t\t\t<string>309.500000:316.000000</string>
\t\t\t\t<key>nibPath</key>
\t\t\t\t<string>/System/Library/Automator/Run Shell Script.action/Contents/Resources/Base.lproj/main.nib</string>
\t\t\t</dict>
\t\t\t<key>isViewVisible</key>
\t\t\t<true/>
\t\t</dict>
\t</array>
\t<key>connectors</key>
\t<dict/>
\t<key>workflowMetaData</key>
\t<dict>
\t\t<key>serviceApplicationBundleID</key>
\t\t<string></string>
\t\t<key>serviceApplicationPath</key>
\t\t<string></string>
\t\t<key>serviceInputTypeIdentifier</key>
\t\t<string>com.apple.Automator.text</string>
\t\t<key>serviceOutputTypeIdentifier</key>
\t\t<string>com.apple.Automator.nothing</string>
\t\t<key>serviceProcessesInput</key>
\t\t<integer>0</integer>
\t\t<key>workflowTypeIdentifier</key>
\t\t<string>com.apple.Automator.servicesMenu</string>
\t</dict>
</dict>
</plist>
`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
