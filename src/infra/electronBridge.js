// 파일 탐색, diff, 변경 적용 기능 개발을 위한 기본 구조 준비
const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

// 파일 목록 조회
ipcMain.handle('list-files', async (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath).map(name => {
      const stat = fs.statSync(path.join(dirPath, name));
      return { name, isDirectory: stat.isDirectory() };
    });
    return { success: true, files };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 파일 읽기
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 파일 저장(백업 후 덮어쓰기)
ipcMain.handle('save-file', async (event, filePath, newContent) => {
  try {
    const backupPath = filePath + '.bak';
    fs.copyFileSync(filePath, backupPath);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

