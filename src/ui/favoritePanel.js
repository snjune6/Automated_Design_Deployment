// 즐겨찾기 UI 렌더링 모듈
const favorite = require('../func/favorite.js');

export function renderFavoriteList() {
  const favoritePaths = favorite.getFavoritePaths();
  const listDiv = document.getElementById('favorite-list');
  listDiv.className = 'fav-panel';
  let html = '';
  html += `<div class="fav-title"><span class="fav-star">★</span>즐겨찾기 경로</div>`;
  if (favoritePaths.length === 0) {
    html += '<div style="color:#aaa;padding:8px 0 0 2px;">(없음)</div>';
    listDiv.innerHTML = html;
    return;
  }
  html += '<div class="fav-list-row">';
  favoritePaths.forEach(fp => {
    html += `<button class="fav-path-btn" title="${fp.path.replace(/&/g,'&amp;')}"><span class="fav-folder">📁</span>${fp.name}</button>`;
    html += `<button class="fav-del-btn" title="즐겨찾기 삭제">✕</button>`;
  });
  html += '</div>';
  listDiv.innerHTML = html;
  const btns = listDiv.querySelectorAll('.fav-path-btn');
  const delBtns = listDiv.querySelectorAll('.fav-del-btn');
  favoritePaths.forEach((fp, idx) => {
    btns[idx].onclick = () => {
      // 외부에서 currentDir, loadFileList 등 연결 필요
    };
    delBtns[idx].onclick = (e) => {
      e.stopPropagation();
      favorite.removeFavoritePath(fp.path);
      renderFavoriteList();
    };
  });
}
