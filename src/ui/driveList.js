function renderRootsList(roots) {
  const fileList = document.getElementById('file-list');
  if (!fileList) return;
  fileList.innerHTML = '';
  if (!roots || roots.length === 0) {
    fileList.textContent = '드라이브 없음';
    return;
  }
  const ul = document.createElement('ul');
  roots.forEach(root => {
    const li = document.createElement('li');
    li.textContent = root;
    ul.appendChild(li);
  });
  fileList.appendChild(ul);
}
module.exports = { renderRootsList };

