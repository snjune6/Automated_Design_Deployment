// 로그 패널에 메시지 출력 함수
function logPanel(msg, type = 'info') {
  const panel = document.getElementById('log-panel');
  if (!panel) return;
  const div = document.createElement('div');
  let color = '#fff';
  let fontWeight = 'normal';
  if (type === 'request') color = '#4af';
  else if (type === 'response') color = '#6f6';
  else if (type === 'error') color = '#f44';
  else if (type === 'status') { color = '#fff'; fontWeight = 'bold'; }
  div.textContent = msg;
  div.style.color = color;
  div.style.fontWeight = fontWeight;
  panel.appendChild(div);
  panel.scrollTop = panel.scrollHeight;
}

module.exports = { logPanel };
