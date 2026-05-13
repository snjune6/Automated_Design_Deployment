
console.log('[renderer.js] 로드됨');
const { mountLogPanel } = require('../src/ui/logPanel.js');
const { logPanel } = require('../src/func/log.js');
const ServerConnector = require('../src/func/serverConnector.js');
const { renderRootsList } = require('../src/func/fileManager.js');
const { ipcRenderer } = require('electron');
const favorite = require('../src/func/favorite.js');
const Diff = require('diff');

let cachedServers = [];
let isConnected = false;
let originalContent = '';
let attachedContent = '';

function updateConnectionUI() {
  document.getElementById('server-address').disabled = isConnected;
  document.getElementById('connect-btn').style.display = isConnected ? 'none' : '';
  document.getElementById('saved-server-list').style.display = isConnected ? '' : '';
  document.querySelector('.server-panel').style.display = isConnected ? 'none' : '';
  // 네이티브 메뉴에 접속 상태 전달
  ipcRenderer.send('set-connected', isConnected);
  renderSavedServersAndFavorites(); // 연결 상태 바뀔 때마다 즐겨찾기 버튼 갱신
}

// ...existing code...


