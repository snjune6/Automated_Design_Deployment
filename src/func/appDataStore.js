const fs = require('fs');
const path = require('path');
const STORE_PATH = path.join(__dirname, '../../app-data.json');

function loadData() {
  try {
    if (!fs.existsSync(STORE_PATH)) return { servers: [] };
    const data = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { servers: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function loadServers() {
  return loadData().servers || [];
}

function addServer(addr) {
  const data = loadData();
  if (!data.servers) data.servers = [];
  if (!data.servers.includes(addr)) {
    data.servers.push(addr);
    saveData(data);
  }
  return data.servers;
}

function removeServer(addr) {
  const data = loadData();
  if (!data.servers) data.servers = [];
  data.servers = data.servers.filter(a => a !== addr);
  saveData(data);
  return data.servers;
}

module.exports = { loadServers, addServer, removeServer, loadData, saveData };

