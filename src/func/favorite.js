// 즐겨찾기 관리 모듈
const { loadData, saveData } = require('./appDataStore.js');

const FAVORITE_KEY = 'favorites';

function getCurrentServer() {
  // 서버 주소 입력란에서 현재 주소를 가져옴
  const input = document.getElementById('server-address');
  return input ? input.value.trim() : '';
}

function isConnected() {
  // 서버 주소 입력란이 비어있지 않고, 연결 상태 메시지가 성공일 때만 true
  const statusDiv = document.getElementById('status-message');
  return statusDiv && statusDiv.textContent.includes('서버 연결 성공');
}

const favorite = (() => {
  function getFavoritePaths() {
    const data = loadData();
    const server = getCurrentServer();
    if (!server) return [];
    if (!data[FAVORITE_KEY]) data[FAVORITE_KEY] = {};
    return data[FAVORITE_KEY][server] || [];
  }
  function saveFavoritePath(path) {
    let data = loadData();
    const server = getCurrentServer();
    if (!server) return;
    if (!data[FAVORITE_KEY]) data[FAVORITE_KEY] = {};
    if (!data[FAVORITE_KEY][server]) data[FAVORITE_KEY][server] = [];
    if (data[FAVORITE_KEY][server].some(fp => fp.path === path)) return;
    showFavoriteNameInput(path, (name) => {
      if (!name) return;
      data[FAVORITE_KEY][server].push({ name, path });
      saveData(data);
      renderFavoriteList();
    });
  }

  // Electron에서는 prompt()를 쓸 수 없으므로, 입력창을 직접 만든다.
  function showFavoriteNameInput(path, callback) {
    // 이미 입력창이 있으면 제거
    let old = document.getElementById('fav-name-input-wrap');
    if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'fav-name-input-wrap';
    wrap.style.position = 'fixed';
    wrap.style.left = '0';
    wrap.style.top = '0';
    wrap.style.width = '100vw';
    wrap.style.height = '100vh';
    wrap.style.background = 'rgba(0,0,0,0.3)';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.zIndex = '9999';
    const box = document.createElement('div');
    box.style.background = '#222';
    box.style.padding = '24px 32px';
    box.style.borderRadius = '8px';
    box.style.boxShadow = '0 2px 16px #0008';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.alignItems = 'center';
    const label = document.createElement('div');
    label.textContent = '즐겨찾기 이름을 입력하세요';
    label.style.color = '#fff';
    label.style.marginBottom = '12px';
    box.appendChild(label);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = path;
    input.style.width = '240px';
    input.style.fontSize = '16px';
    input.style.padding = '6px 8px';
    input.style.marginBottom = '12px';
    box.appendChild(input);
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';
    const okBtn = document.createElement('button');
    okBtn.textContent = '확인';
    okBtn.onclick = () => {
      const name = input.value.trim();
      wrap.remove();
      callback(name);
    };
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '취소';
    cancelBtn.onclick = () => {
      wrap.remove();
      callback(null);
    };
    btnRow.appendChild(okBtn);
    btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    input.focus();
    input.select();
  }
  function removeFavoritePath(path) {
    let data = loadData();
    const server = getCurrentServer();
    if (!server) return;
    if (!data[FAVORITE_KEY]) data[FAVORITE_KEY] = {};
    if (!data[FAVORITE_KEY][server]) data[FAVORITE_KEY][server] = [];
    data[FAVORITE_KEY][server] = data[FAVORITE_KEY][server].filter(fp => fp.path !== path);
    saveData(data);
    renderFavoriteList();
  }
  // fileManager require를 renderFavoriteList 내부에서 동적으로 처리
  function renderFavoriteList() {
    const fileManager = require('./fileManager.js');
    const listDiv = document.getElementById('favorite-list');
    listDiv.className = 'fav-panel';
    if (!isConnected()) {
      listDiv.innerHTML = '';
      return;
    }
    const favoritePaths = getFavoritePaths();
    let html = '';
    html += `<div class="fav-title" style="margin-bottom:6px;"><span class="fav-star">★</span>즐겨찾기 경로</div>`;
    if (favoritePaths.length === 0) {
      html += '<div style="color:#aaa;padding:8px 0 0 2px;">(없음)</div>';
      listDiv.innerHTML = html;
      return;
    }
    html += '<div class="fav-list-row" style="display:flex;flex-wrap:wrap;gap:8px;">';
    favoritePaths.forEach((fp, idx) => {
      html += `<div style="display:flex;align-items:center;background:#23242a;border-radius:6px;padding:2px 6px 2px 8px;box-shadow:0 1px 4px #0002;">
        <button class="fav-path-btn" title="${fp.path.replace(/&/g,'&amp;')}" style="background:none;border:none;color:#4fc3f7;font-size:15px;display:flex;align-items:center;gap:3px;cursor:pointer;padding:0 2px 0 0;">
          <span class="fav-folder" style="font-size:15px;">📁</span>${fp.name}
        </button>
        <button class="fav-del-btn" title="즐겨찾기 삭제" style="background:none;border:none;color:#aaa;font-size:13px;padding:0 2px;cursor:pointer;margin-left:2px;border-radius:3px;transition:background 0.15s;">✕</button>
      </div>`;
    });
    html += '</div>';
    listDiv.innerHTML = html;
    const btns = listDiv.querySelectorAll('.fav-path-btn');
    const delBtns = listDiv.querySelectorAll('.fav-del-btn');
    favoritePaths.forEach((fp, idx) => {
      btns[idx].onclick = () => {
        if (!isConnected()) return;
        fileManager.currentDir = fp.path;
        fileManager.loadFileList();
      };
      delBtns[idx].onclick = (e) => {
        e.stopPropagation();
        removeFavoritePath(fp.path);
        renderFavoriteList();
      };
      // X버튼 hover 효과
      delBtns[idx].onmouseenter = () => { delBtns[idx].style.background = '#444'; delBtns[idx].style.color = '#ff5252'; };
      delBtns[idx].onmouseleave = () => { delBtns[idx].style.background = 'none'; delBtns[idx].style.color = '#aaa'; };
    });
  }
  function isFavorite(path) {
    const favoritePaths = getFavoritePaths();
    return favoritePaths.some(fp => fp.path === path);
  }
  return {
    saveFavoritePath,
    removeFavoritePath,
    renderFavoriteList,
    getFavoritePaths,
    isFavorite
  };
})();

module.exports = favorite;
