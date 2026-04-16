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

async function renderSavedServersAndFavorites() {
  cachedServers = await ipcRenderer.invoke('load-servers');
  const wrap = document.getElementById('saved-server-list');
  wrap.innerHTML = '';
  // 서버 주소 버튼 렌더
  cachedServers.forEach(addr => {
    const btn = document.createElement('button');
    btn.textContent = addr;
    btn.onclick = () => {
      document.getElementById('server-address').value = addr;
      connectToServer(addr, true);
    };
    const del = document.createElement('button');
    del.textContent = 'X';
    del.style.marginLeft = '4px';
    del.onclick = async (e) => {
      e.stopPropagation();
      await ipcRenderer.invoke('remove-server', addr);
      renderSavedServersAndFavorites();
    };
    wrap.appendChild(btn);
    wrap.appendChild(del);
  });
  // 즐겨찾기 영역 처리
  if (!isConnected) {
    // 연결이 끊긴 경우 안내 메시지 출력하지 않음 (서버 주소 버튼만 렌더)
    return;
  }
  // 즐겨찾기 구분선
  if (cachedServers.length > 0 && isConnected) {
    const hr = document.createElement('hr');
    hr.style.margin = '8px 0';
    wrap.appendChild(hr);
  }
  // 즐겨찾기 버튼 렌더 (연결된 경우에만)
  if (isConnected) {
    // favorite.js의 공식 API 사용
    const favoritePaths = favorite.getFavoritePaths();
    favoritePaths.forEach(fp => {
      const btn = document.createElement('button');
      btn.textContent = '★ ' + fp.name;
      btn.title = fp.path;
      btn.onclick = () => {
        if (!isConnected) return; // 접속 끊긴 경우 동작하지 않음
        // 탐색기 currentDir 이동
        const fileManager = require('../src/func/fileManager.js');
        fileManager.currentDir = fp.path;
        fileManager.loadFileList();
      };
      const del = document.createElement('button');
      del.textContent = 'X';
      del.style.marginLeft = '4px';
      del.onclick = (e) => {
        e.stopPropagation();
        if (!isConnected) return;
        favorite.removeFavoritePath(fp.path);
        renderSavedServersAndFavorites();
      };
      wrap.appendChild(btn);
      wrap.appendChild(del);
    });
  }
}

async function saveServer(addr) {
  await ipcRenderer.invoke('add-server', addr);
  renderSavedServersAndFavorites();
}

function connectToServer(addr, isSaved = false) {
  logPanel('[요청] GET ' + addr + '/roots', 'request');
  ServerConnector.tryConnect(
    addr,
    (roots) => {
      logPanel('[응답] /roots ' + JSON.stringify(roots), 'response');
      renderRootsList(roots);
      isConnected = true;
      updateConnectionUI();
      if (!isSaved && !cachedServers.includes(addr)) {
        if (confirm('이 서버 주소를 저장할까요?')) {
          saveServer(addr);
        }
      }
    },
    (errMsg) => {
      logPanel('[에러] /roots ' + errMsg, 'error');
    }
  );
}

function normalizeContent(str) {
  if (!str) return '';
  return str
    .replace(/\r\n?/g, '\n')
    .replace(/^\uFEFF/, '')
    .trimEnd();
}

function renderDiff() {
  const diffWrapper = document.getElementById('diff-view-wrapper');
  if (!diffWrapper) return;
  // normalize 후 비교
  const normOrig = normalizeContent(originalContent);
  const normAttach = normalizeContent(attachedContent);
  if (normOrig === normAttach) {
    diffWrapper.innerHTML = '';
    return;
  }
  diffWrapper.innerHTML = '';
  const diff = Diff.diffLines(normOrig, normAttach);
  diff.forEach(part => {
    const span = document.createElement('span');
    if (part.added) {
      span.style.background = '#204d1c';
      span.style.color = '#b6ffb6';
    } else if (part.removed) {
      span.style.background = '#5a1a1a';
      span.style.color = '#ffd6d6';
      span.style.textDecoration = 'line-through';
    } else {
      span.style.background = 'none';
      span.style.color = '#e0e0e0';
    }
    span.textContent = part.value;
    diffWrapper.appendChild(span);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  mountLogPanel();
  renderSavedServersAndFavorites();
  updateConnectionUI();
  const connectBtn = document.getElementById('connect-btn');
  connectBtn.onclick = () => {
    const addr = document.getElementById('server-address').value;
    connectToServer(addr, false);
  };

  // 네이티브 메뉴에서 접속 끊기 이벤트 수신
  ipcRenderer.on('disconnect', () => {
    if (!isConnected) return;
    isConnected = false;
    updateConnectionUI();
    document.getElementById('file-list').innerHTML = '';
    // 경로 네비게이션도 초기화
    const fileManager = require('../src/func/fileManager.js');
    fileManager.currentDir = '';
    if (fileManager.renderNavigationBar) fileManager.renderNavigationBar();
    // nav-bar DOM도 직접 비움
    const navDiv = document.getElementById('nav-bar');
    if (navDiv) navDiv.innerHTML = '';
    // 상태 메시지를 먼저 변경 (favorite.js의 isConnected()가 올바르게 동작하도록)
    const statusDiv = document.getElementById('status-message');
    if (statusDiv) statusDiv.textContent = '서버 연결 해제';
    // 즐겨찾기 목록도 즉시 갱신(숨김)
    renderSavedServersAndFavorites();
    // #favorite-list 영역도 즉시 안내 메시지로 갱신
    if (favorite.renderFavoriteList) favorite.renderFavoriteList();
    logPanel('[상태] 서버 연결이 해제되었습니다.', 'status');
  });

  // 네이티브 메뉴에서 전체 빌드 명령 수신
  ipcRenderer.on('build-all', async () => {
    const serverAddr = document.getElementById('server-address').value.replace(/\/$/, '');
    if (!isConnected) {
      logPanel('[에러] 서버에 연결되어 있지 않습니다.', 'error');
      alert('서버에 연결되어 있지 않습니다.');
      return;
    }
    logPanel(`[요청] POST ${serverAddr}/build`, 'request');
    const res = await fetch(`${serverAddr}/build`, { method: 'POST' });
    if (!res.body) {
      logPanel('[에러] 빌드 응답 스트림 없음', 'error');
      alert('빌드 응답 스트림 없음');
      return;
    }
    const reader = res.body.getReader();
    let decoder = new TextDecoder('utf-8');
    let log = '';
    function readChunk() {
      return reader.read().then(({ done, value }) => {
        if (done) {
          logPanel('[빌드 완료]', 'status');
          return;
        }
        const chunk = decoder.decode(value);
        log += chunk;
        logPanel(chunk, 'build');
        return readChunk();
      });
    }
    readChunk();
  });

  // 파일 첨부 버튼 클릭 시 파일 선택창 열기
  const attachBtn = document.getElementById('attach-btn');
  const fileInput = document.getElementById('file-input');
  attachBtn.disabled = false;
  attachBtn.onclick = () => fileInput.click();

  // 파일 첨부(선택) 시: 내용 미리보기 없이 바로 전송 여부 확인 및 서버 전송
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    window._attachedFileName = file.name;
    const fileManager = require('../src/func/fileManager.js');
    const currentDir = fileManager.currentDir || '';
    const serverAddr = document.getElementById('server-address').value.replace(/\/$/, '');
    const filePath = currentDir ? (currentDir.endsWith('/') ? currentDir + file.name : currentDir + '/' + file.name) : file.name;

    // 서버에 파일 존재 여부 확인
    let exists = false;
    try {
      const res = await fetch(`${serverAddr}/file?filePath=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.success) exists = true;
    } catch {}
    // 전송 여부 확인
    if (!confirm(`이 파일을 서버로 전송할까요? (파일명: ${file.name})`)) {
      return;
    }
    // 이미 존재하면 덮어쓰기 여부 확인
    if (exists) {
      if (!confirm(`이미 존재하는 파일입니다. 덮어쓸까요? (파일명: ${file.name})`)) {
        return;
      }
    }
    // 파일을 Base64(DataURL)로 읽기
    const reader = new FileReader();
    reader.onload = async function(ev) {
      const content = ev.target.result; // data:<mime>;base64,xxxx
      try {
        await fetch(`${serverAddr}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dir: currentDir, filename: file.name, content, isBase64: true })
        });
        logPanel(`[응답] /upload 성공 (${file.name})`, 'response');
        alert('첨부파일이 ' + file.name + ' 으로 전송되었습니다.');
        // 파일 목록 새로고침
        if (fileManager && typeof fileManager.loadFileList === 'function') {
          fileManager.loadFileList();
        }
      } catch (e) {
        logPanel(`[에러] /upload 네트워크 오류: ${e}`, 'error');
        alert('전송 중 오류: ' + e);
      }
    };
    reader.readAsDataURL(file);
  });

  // 원본 파일 클릭 시 diff 갱신을 위해 fileManager에 hook 추가 필요
  // 아래는 예시: fileManager.loadFileToEditor = function(content) { ... }
  const fileManager = require('../src/func/fileManager.js');
  const origLoadFile = fileManager.loadFileToEditor;
  fileManager.loadFileToEditor = function(content) {
    // 기존 동작 유지
    if (origLoadFile) origLoadFile.call(this, content);
    // 원본 에디터에 내용 출력
    const wrapper = document.getElementById('diff-view-wrapper');
    if (wrapper) {
      wrapper.innerHTML = '';
      const pre = document.createElement('pre');
      pre.style.background = '#181a1f';
      pre.style.color = '#e0e0e0';
      pre.style.padding = '16px';
      pre.style.borderRadius = '6px';
      pre.style.fontFamily = 'Consolas, Menlo, Monaco, monospace';
      pre.style.fontSize = '15px';
      pre.style.overflowX = 'auto';
      pre.textContent = content;
      wrapper.appendChild(pre);
    }
    originalContent = content;
    renderDiff();
  };

  // 변경하기 버튼 클릭 시 첨부파일을 서버로 전송 (파일명_sned, 경로 포함)
  const changeBtn = document.getElementById('change-btn');
  if (changeBtn) {
    changeBtn.onclick = async () => {
      if (!window._attachedFileName || !attachedContent) {
        alert('첨부된 파일이 없습니다.');
        return;
      }
      // 파일명_sned로 전송
      const sendName = window._attachedFileName.replace(/(\.[^.]*)$/, '_sned$1');
      // 현재 탐색기 경로
      const fileManager = require('../src/func/fileManager.js');
      const currentDir = fileManager.currentDir || '';
      try {
        const res = await fetch('/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dir: currentDir, filename: sendName, content: attachedContent })
        });
        if (res.ok) {
          alert('첨부파일이 ' + sendName + ' 으로 전송되었습니다.');
        } else {
          alert('전송 실패: ' + (await res.text()));
        }
      } catch (e) {
        alert('전송 중 오류: ' + e);
      }
    };
  }

  // 변경하기 버튼에 대한 네트워크 동작 및 로그 출력 추가
  const applyBtn = document.getElementById('apply-btn');
  if (applyBtn) {
    applyBtn.disabled = false;
    applyBtn.onclick = async () => {
      logPanel('[상태] 변경하기 버튼 클릭됨', 'status');
      if (!window._attachedFileName || !attachedContent) {
        logPanel('[에러] 첨부된 파일이 없습니다.', 'error');
        alert('첨부된 파일이 없습니다.');
        return;
      }
      const sendName = window._attachedFileName.replace(/(\.[^.]*)$/, '_sned$1');
      const fileManager = require('../src/func/fileManager.js');
      const currentDir = fileManager.currentDir || '';
      // 현재 입력된 서버 주소 사용
      const serverAddr = document.getElementById('server-address').value.replace(/\/$/, '');
      try {
        logPanel(`[요청] POST ${serverAddr}/upload (${currentDir}/${sendName})`, 'request');
        const res = await fetch(`${serverAddr}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dir: currentDir, filename: sendName, content: attachedContent })
        });
        if (res.ok) {
          logPanel(`[응답] /upload 성공 (${sendName})`, 'response');
          alert('첨부파일이 ' + sendName + ' 으로 전송되었습니다.');
        } else {
          const err = await res.text();
          logPanel(`[에러] /upload 실패: ${err}`, 'error');
          alert('전송 실패: ' + err);
        }
      } catch (e) {
        logPanel(`[에러] /upload 네트워크 오류: ${e}`, 'error');
        alert('전송 중 오류: ' + e);
      }
    };
  }

  // 파일 첨부 버튼, 변경하기 버튼, 에디터 영역 표시/숨김 제어
  function updatePanelVisibility() {
    const attachBtn = document.getElementById('attach-btn');
    const applyBtn = document.getElementById('apply-btn');
    const editorRow = document.querySelector('.editor-flex-row');
    // 접속 안되어있으면 모두 숨김
    if (!isConnected) {
      if (attachBtn) attachBtn.style.display = 'none';
      if (applyBtn) applyBtn.style.display = 'none';
      if (editorRow) editorRow.style.display = 'none';
      return;
    }
    // 접속되어있으면 파일 첨부 버튼은 항상 보임
    if (attachBtn) attachBtn.style.display = '';
    // 파일이 선택되어야 변경하기 버튼/에디터 보임
    const show = !!window._attachedFileName;
    if (applyBtn) applyBtn.style.display = show ? '' : 'none';
    if (editorRow) editorRow.style.display = show ? '' : 'none';
  }
  // 파일명 하이라이트
  function highlightSelectedFile() {
    const fileList = document.getElementById('file-list');
    if (!fileList) return;
    const items = fileList.querySelectorAll('.file-item');
    items.forEach(el => {
      if (el.dataset && el.dataset.filename === window._attachedFileName) {
        el.classList.add('selected-file');
      } else {
        el.classList.remove('selected-file');
      }
    });
  }
  // 스타일 추가 (파일명 하이라이트 + 스크롤바 커스텀 + 즐겨찾기 버튼 개선)
  const style = document.createElement('style');
  style.textContent = `
    .selected-file { background: #2a4a7a !important; color: #fff !important; }
    /* 스크롤바 커스텀 */
    .editor-flex-row pre, #file-list {
      scrollbar-width: thin;
      scrollbar-color: #444 #23272e;
    }
    .editor-flex-row pre::-webkit-scrollbar, #file-list::-webkit-scrollbar {
      width: 8px;
      height: 8px;
      background: #23272e;
      display: none;
    }
    .editor-flex-row pre:hover::-webkit-scrollbar, #file-list:hover::-webkit-scrollbar {
      display: block;
    }
    .editor-flex-row pre::-webkit-scrollbar-thumb, #file-list::-webkit-scrollbar-thumb {
      background: #444;
      border-radius: 4px;
    }
    .editor-flex-row pre::-webkit-scrollbar-corner, #file-list::-webkit-scrollbar-corner {
      background: #23272e;
    }
    /* 스크롤바 항상 보이지 않게 */
    .editor-flex-row pre, #file-list {
      overflow-y: auto;
      overflow-x: auto;
    }
    .editor-flex-row pre:empty {
      overflow: hidden !important;
    }
    #file-list:empty {
      overflow: hidden !important;
    }
    /* 즐겨찾기 버튼 개선 */
    #saved-server-list button {
      font-size: 13px !important;
      padding: 2px 8px !important;
      margin: 2px 2px 2px 0 !important;
      border-radius: 4px !important;
      background: #23272e !important;
      color: #b6c2e0 !important;
      border: 1px solid #444 !important;
      min-width: 0 !important;
      min-height: 0 !important;
      height: 26px !important;
      line-height: 1.2 !important;
      box-shadow: none !important;
    }
    #saved-server-list button:hover {
      background: #2a4a7a !important;
      color: #fff !important;
    }
  `;
  document.head.appendChild(style);
  // 기존 updateConnectionUI에 패널 표시/숨김 추가
  const origUpdateConnectionUI = updateConnectionUI;
  updateConnectionUI = function() {
    origUpdateConnectionUI();
    updatePanelVisibility();
    highlightSelectedFile();
  };
  // 파일 첨부 후에도 하이라이트/패널 표시
  fileInput.addEventListener('change', () => {
    updatePanelVisibility();
    highlightSelectedFile();
  });
  // 최초 진입 시 패널 표시
  updatePanelVisibility();
});
