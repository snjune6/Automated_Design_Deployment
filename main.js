const { app, BrowserWindow, Menu, ipcMain } = require('electron');

const appDataStore = require('./src/func/appDataStore.js');

let isConnected = false;
let win; // 전역 선언

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
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadFile('public/index.html');
  buildMenu(); // win 생성 후 메뉴 갱신
}

// ipcMain 핸들러 등록
ipcMain.handle('load-servers', () => appDataStore.loadServers());
ipcMain.handle('add-server', (e, addr) => appDataStore.addServer(addr));
ipcMain.handle('remove-server', (e, addr) => appDataStore.removeServer(addr));

// 접속 상태 변경 시 메뉴 갱신
ipcMain.on('set-connected', (e, connected) => {
  isConnected = connected;
  buildMenu();
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
