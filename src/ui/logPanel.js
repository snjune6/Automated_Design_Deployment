function mountLogPanel() {
  let logPanel = document.getElementById('log-panel');
  if (!logPanel) {
    logPanel = document.createElement('div');
    logPanel.id = 'log-panel';
    logPanel.style = 'position:fixed;bottom:0;left:0;width:100vw;max-height:200px;overflow-y:auto;background:#222;color:#fff;font-size:13px;z-index:9999;padding:8px 12px;box-sizing:border-box;border-top:2px solid #444;';
    document.body.appendChild(logPanel);
  }
  logPanel.innerHTML = `
    <div id="log-panel-header" style="display:flex;align-items:center;justify-content:space-between;padding:0 2px 2px 2px;user-select:none;">
      <span style="font-weight:bold;">콘솔 로그</span>
      <button id="log-panel-toggle" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;">▼</button>
    </div>
    <div id="log-panel-body"></div>
  `;
  const logPanelBody = document.getElementById('log-panel-body');
  const logPanelToggle = document.getElementById('log-panel-toggle');
  let logPanelMin = false;
  logPanelToggle.onclick = () => {
    logPanelMin = !logPanelMin;
    if (logPanelMin) {
      logPanelBody.style.display = 'none';
      logPanel.style.maxHeight = '32px';
      logPanelToggle.textContent = '▲';
    } else {
      logPanelBody.style.display = '';
      logPanel.style.maxHeight = '200px';
      logPanelToggle.textContent = '▼';
    }
  };
  window.renderLogPanel = (msg, type = 'info') => {
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
    logPanelBody.appendChild(div);
    logPanelBody.scrollTop = logPanelBody.scrollHeight;
  };
  if (window.__logBuffer) {
    window.__logBuffer.forEach(({msg, type}) => window.renderLogPanel(msg, type));
    window.__logBuffer = [];
  }
}
module.exports = { mountLogPanel };
