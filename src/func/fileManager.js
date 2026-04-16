const axios = require('axios');
const favorite = require('./favorite.js');

// 파일/폴더 목록, 파일 불러오기/저장, 파일 리스트 렌더링 모듈 (비즈니스 로직)
let currentDir = '';
let selectedFile = null;

function apiPath(path) {
  const serverAddress = document.getElementById('server-address').value;
  return serverAddress.replace(/\/$/, '') + path;
}

function clearFileList() {
  document.getElementById('file-list').innerHTML = '';
}

function renderRootsList(roots) {
  const listDiv = document.getElementById('file-list');
  listDiv.innerHTML = '';
  roots.forEach(root => {
    const div = document.createElement('div');
    div.textContent = root;
    div.className = 'file-item';
    div.onclick = () => {
      currentDir = root;
      loadFileList();
    };
    listDiv.appendChild(div);
  });
}

function loadFileList() {
  axios.get(apiPath('/files'), { params: { dirPath: currentDir || undefined } })
    .then(res => {
      if (res.data.success) {
        renderFileList(res.data.files);
      }
    });
}

function renderNavigationBar() {
  const navDiv = document.getElementById('nav-bar');
  if (!navDiv) return;
  navDiv.innerHTML = '';
  const pathParts = currentDir.split(/[\\/]/).filter(Boolean);
  let pathSoFar = '';
  // 루트(드라이브) 버튼
  if (pathParts.length > 0) {
    const rootBtn = document.createElement('span');
    rootBtn.textContent = pathParts[0] + '/';
    rootBtn.className = 'nav-part';
    rootBtn.onclick = () => {
      currentDir = pathParts[0] + '/';
      loadFileList();
    };
    navDiv.appendChild(rootBtn);
    pathSoFar = pathParts[0] + '/';
  }
  // 하위 경로 버튼
  for (let i = 1; i < pathParts.length; i++) {
    const sep = document.createElement('span');
    sep.textContent = ' / ';
    navDiv.appendChild(sep);
    pathSoFar += (pathSoFar.endsWith('/') ? '' : '/') + pathParts[i];
    const partBtn = document.createElement('span');
    partBtn.textContent = pathParts[i];
    partBtn.className = 'nav-part';
    partBtn.onclick = () => {
      currentDir = pathSoFar;
      loadFileList();
    };
    navDiv.appendChild(partBtn);
  }
}

function isFavorite(path) {
  return favorite.isFavorite(path);
}

function renderFileList(files) {
  renderNavigationBar();
  const listDiv = document.getElementById('file-list');
  const folders = files.filter(f => f.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
  const normalFiles = files.filter(f => !f.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
  listDiv.innerHTML = '';
  // 상위 폴더 이동
  if (currentDir && currentDir.replace(/[/\\]$/, '') !== '') {
    const upDiv = document.createElement('div');
    upDiv.className = 'file-item up-folder';
    upDiv.innerHTML = '⬆️ .. (상위 폴더)';
    upDiv.onclick = () => {
      let dir = currentDir.replace(/\\/g, '/');
      if (/^[A-Za-z]:\/?$/.test(dir)) {
        currentDir = dir;
        loadFileList();
        return;
      }
      dir = dir.replace(/\/$/, '');
      const idx = dir.lastIndexOf('/');
      if (idx > 2) {
        currentDir = dir.slice(0, idx + 1);
      } else if (idx === 2) {
        currentDir = dir.slice(0, 3);
      } else {
        currentDir = '';
      }
      loadFileList();
    };
    listDiv.appendChild(upDiv);
  }
  folders.forEach(f => {
    const div = document.createElement('div');
    div.className = 'file-item folder';
    div.innerHTML = '📁 ' + f.name;
    div.onclick = () => {
      currentDir += (currentDir.endsWith('/') ? '' : '/') + f.name;
      loadFileList();
    };
    // 즐겨찾기 추가 버튼
    const favBtn = document.createElement('button');
    favBtn.className = 'fav-add-btn';
    favBtn.style.marginLeft = '8px';
    const fullPath = (currentDir ? currentDir.replace(/\/$/, '') + '/' : '') + f.name;
    favBtn.textContent = isFavorite(fullPath) ? '★' : '☆';
    favBtn.title = isFavorite(fullPath) ? '즐겨찾기에서 제거하려면 클릭' : '즐겨찾기에 추가';
    favBtn.onclick = (e) => {
      e.stopPropagation();
      if (isFavorite(fullPath)) {
        favorite.removeFavoritePath(fullPath);
      } else {
        favorite.saveFavoritePath(fullPath);
      }
      renderFileList(files);
    };
    div.appendChild(favBtn);
    listDiv.appendChild(div);
  });
  normalFiles.forEach(f => {
    const div = document.createElement('div');
    div.className = 'file-item file';
    div.innerHTML = '📄 ' + f.name;
    // 파일 강조 및 에디터 표시
    div.onclick = () => {
      selectedFile = (currentDir ? currentDir + '/' : '') + f.name;
      // 모든 파일 강조 해제
      document.querySelectorAll('.file-item.file').forEach(el => el.classList.remove('selected-file'));
      // 현재 클릭 파일 강조
      div.classList.add('selected-file');
      // 파일 내용 불러오기 및 에디터 출력
      const serverAddress = document.getElementById('server-address').value;
      axios.get(serverAddress.replace(/\/$/, '') + '/file', { params: { filePath: selectedFile } })
        .then(res => {
          // 에디터 영역이 숨겨져 있으면 보이게
          const editorRow = document.querySelector('.editor-flex-row');
          if (editorRow) editorRow.style.display = '';
          // 기존 에디터 내용 모두 제거
          const wrapper = document.getElementById('diff-view-wrapper');
          if (wrapper) {
            wrapper.innerHTML = '';
            // 이미지 파일이면 <img>, 텍스트면 <pre>
            if (res.data.isBase64 && typeof res.data.content === 'string' && res.data.content.startsWith('data:image/')) {
              // DataURL이 너무 길어서 잘리는 현상이 있는지 콘솔에 일부 출력
              console.log('이미지 DataURL:', res.data.content.slice(0, 100) + '... (생략) ...' + res.data.content.slice(-50));
              const img = document.createElement('img');
              // 반드시 src 속성에만 직접 할당 (innerHTML 사용 금지)
              img.src = res.data.content;
              img.alt = '이미지 미리보기';
              img.style.maxWidth = '100%';
              img.style.maxHeight = '600px';
              img.style.display = 'block';
              img.style.margin = '0 auto';
              wrapper.appendChild(img);
            } else {
              const pre = document.createElement('pre');
              pre.style.background = '#181a1f';
              pre.style.color = '#e0e0e0';
              pre.style.padding = '16px';
              pre.style.borderRadius = '6px';
              pre.style.fontFamily = 'Consolas, Menlo, Monaco, monospace';
              pre.style.fontSize = '15px';
              pre.style.overflowX = 'auto';
              pre.textContent = res.data.content;
              wrapper.appendChild(pre);
            }
          }
        });
    };
    // 즐겨찾기 추가 버튼
    const favBtn = document.createElement('button');
    favBtn.className = 'fav-add-btn';
    favBtn.style.marginLeft = '8px';
    const fullPath = (currentDir ? currentDir.replace(/\/$/, '') + '/' : '') + f.name;
    favBtn.textContent = isFavorite(fullPath) ? '★' : '☆';
    favBtn.title = isFavorite(fullPath) ? '즐겨찾기에서 제거하려면 클릭' : '즐겨찾기에 추가';
    favBtn.onclick = (e) => {
      e.stopPropagation();
      if (isFavorite(fullPath)) {
        favorite.removeFavoritePath(fullPath);
      } else {
        favorite.saveFavoritePath(fullPath);
      }
      renderFileList(files);
    };
    div.appendChild(favBtn);
    listDiv.appendChild(div);
  });
}

module.exports = {
  clearFileList,
  renderRootsList,
  loadFileList,
  renderFileList,
  get currentDir() { return currentDir; },
  set currentDir(val) { currentDir = val; },
  get selectedFile() { return selectedFile; },
  set selectedFile(val) { selectedFile = val; }
};
