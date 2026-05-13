const { app, BrowserWindow, Menu, ipcMain } = require('electron');

let isConnected = false;
let win;

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: '접속 끊기',
          id: 'disconnect',
          enabled: isConnected,
          click: () => {
            BrowserWindow.getAllWindows()[0].webContents.send('disconnect');
          },
        },
        { type: 'separator' },
        { role: 'quit', label: '종료' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'toggledevtools' }],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
    { label: 'Help', submenu: [{ label: 'About' }] },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const path = require('path');
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // app-data.json 직접 접근 IPC 핸들러 (React에서 window.api로 접근)
  const fs = require('fs');
  const appDataPath = path.join(__dirname, 'app-data.json');
  ipcMain.handle('load-app-data', async () => {
    try {
      if (!fs.existsSync(appDataPath)) return {};
      const raw = fs.readFileSync(appDataPath, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  });
  ipcMain.handle('save-app-data', async (e, data) => {
    try {
      fs.writeFileSync(appDataPath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      return false;
    }
  });

  // 서버 목록 관리 IPC 핸들러 추가
  ipcMain.handle('load-servers', async () => {
    try {
      if (!fs.existsSync(appDataPath)) return [];
      const raw = fs.readFileSync(appDataPath, 'utf-8');
      const data = JSON.parse(raw);
      return Array.isArray(data.servers) ? data.servers : [];
    } catch (e) {
      return [];
    }
  });
  ipcMain.handle('add-server', async (e, addr) => {
    try {
      let data = {};
      if (fs.existsSync(appDataPath)) {
        data = JSON.parse(fs.readFileSync(appDataPath, 'utf-8'));
      }
      if (!Array.isArray(data.servers)) data.servers = [];
      if (!data.servers.includes(addr)) data.servers.push(addr);
      fs.writeFileSync(appDataPath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      return false;
    }
  });
  ipcMain.handle('remove-server', async (e, addr) => {
    try {
      let data = {};
      if (fs.existsSync(appDataPath)) {
        data = JSON.parse(fs.readFileSync(appDataPath, 'utf-8'));
      }
      if (!Array.isArray(data.servers)) data.servers = [];
      data.servers = data.servers.filter(a => a !== addr);
      fs.writeFileSync(appDataPath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      return false;
    }
  });
  // 개발: Vite dev 서버, 운영: React 빌드 파일
  const isDev = !app.isPackaged;
  const startUrl = isDev
    ? 'http://localhost:5173/'
    : `file://${__dirname}/react-app/dist/index.html`;
  win.loadURL(startUrl);
  buildMenu();
}

ipcMain.on('set-connected', (e, connected) => {
  isConnected = connected;
  buildMenu();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
