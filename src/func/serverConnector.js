const axios = require('axios');
const { logPanel } = require('./log.js');
const favorite = require('./favorite.js');

module.exports = (() => {
  let serverAddress = document.getElementById('server-address').value;
  let savedServers = JSON.parse(localStorage.getItem('savedServers') || '[]');
  const addressInput = document.getElementById('server-address');
  const datalist = document.getElementById('server-datalist');
  const savedListDiv = document.getElementById('saved-server-list');
  const connectBtn = document.getElementById('connect-btn');
  const statusDiv = document.getElementById('status-message');

  function saveServerAddress(addr) {
    if (!savedServers.includes(addr)) {
      savedServers.push(addr);
      localStorage.setItem('savedServers', JSON.stringify(savedServers));
      renderSavedServerList();
      renderServerDatalist();
    }
    renderSavedServerList();
  }
  function renderServerDatalist() {
    datalist.innerHTML = '';
    savedServers.forEach(addr => {
      const option = document.createElement('option');
      option.value = addr;
      datalist.appendChild(option);
    });
  }
  function renderSavedServerList() {
    savedListDiv.innerHTML = '';
    savedServers.forEach(addr => {
      const btn = document.createElement('button');
      btn.textContent = addr;
      btn.onclick = () => { addressInput.value = addr; };
      savedListDiv.appendChild(btn);
    });
  }
  function renderStatus(msg, success) {
    statusDiv.textContent = msg;
    statusDiv.style.color = success ? 'green' : 'red';
  }
  function getServerAddress() {
    return addressInput.value;
  }
  function setServerAddress(addr) {
    addressInput.value = addr;
  }
  function tryConnect(addr, onSuccess, onError) {
    serverAddress = addr;
    renderStatus('서버 연결 시도 중...', true);
    logPanel('[요청] GET ' + serverAddress + '/roots', 'request');
    axios.get(serverAddress.replace(/\/$/, '') + '/roots')
      .then(r => {
        logPanel('[응답] /roots ' + JSON.stringify(r.data), 'response');
        if (r.data.success) {
          renderStatus('서버 연결 성공! 드라이브를 선택하세요.', true);
          saveServerAddress(serverAddress);
          favorite.renderFavoriteList(); // 접속 성공 시 즐겨찾기 리스트 출력
          if (onSuccess) onSuccess(r.data.roots);
        } else {
          renderStatus('서버 연결 실패', false);
          if (onError) onError('서버 연결 실패');
        }
      })
      .catch(err => {
        logPanel('[에러] /roots ' + err, 'error');
        renderStatus('서버 연결 실패 (네트워크 오류)', false);
        if (onError) onError('서버 연결 실패(' + err + ')');
      });
  }
  connectBtn.onclick = () => tryConnect();
  renderSavedServerList();
  renderServerDatalist();
  return {
    getServerAddress,
    setServerAddress,
    tryConnect,
    renderStatus,
    saveServerAddress,
    renderSavedServerList,
    renderServerDatalist
  };
})();
