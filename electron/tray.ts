import { Tray, Menu, nativeImage, NativeImage, BrowserWindow, app } from 'electron';
import * as path from 'path';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow) {
  // 트레이 아이콘 (16x16 또는 22x22 권장)
  const iconPath = path.join(__dirname, '..', 'resources', 'tray-icon.png');
  let icon: NativeImage;

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // 기본 아이콘이 없으면 빈 아이콘 생성
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  // macOS에서는 템플릿 이미지 사용
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('DayStep');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'DayStep 열기',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // 트레이 클릭 시 윈도우 표시
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });
}

export function updateTrayBadge(count: number) {
  if (!tray) return;

  if (process.platform === 'darwin') {
    app.dock?.setBadge(count > 0 ? String(count) : '');
  }

  tray.setToolTip(count > 0 ? `DayStep - ${count}개의 할일` : 'DayStep');
}
