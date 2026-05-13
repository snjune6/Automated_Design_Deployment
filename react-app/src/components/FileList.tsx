import React from 'react';

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

interface FileListProps {
  nodes: FileNode[];
  onDirClick: (node: FileNode) => void;
  parentNode?: FileNode;
  favoritePaths: string[];
  onToggleFavorite: (path: string) => void;
  onFileClick?: (node: FileNode) => void;
}

const FileList: React.FC<FileListProps> = ({ nodes, onDirClick, parentNode, favoritePaths, onToggleFavorite, onFileClick }) => {
  // 디렉토리 우선, 이름 오름차순 정렬
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, 'ko');
  });
  const isFavorite = (path: string) => (favoritePaths || []).includes(path);
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {parentNode && (
        <li key="__parent__" style={{ padding: '8px 0', borderBottom: '1px solid #333', color: '#b6c2e0', fontSize: 16, cursor: 'pointer' }}
            onClick={() => onDirClick(parentNode)}>
          <span style={{ marginRight: 8, color: '#2d8cf0' }}>⬆</span>
          상위 폴더
        </li>
      )}
      {sortedNodes.map((node) => (
        <li key={node.path} style={{ padding: '8px 0', borderBottom: '1px solid #333', color: '#b6c2e0', fontSize: 16, display: 'flex', alignItems: 'center', cursor: node.isDir ? 'pointer' : 'default' }}>
          <span style={{ marginRight: 8, color: node.isDir ? '#2d8cf0' : '#aaa' }}>{node.isDir ? '📁' : '📄'}</span>
          <span style={{ flex: 1 }}
            onClick={() => {
              if (node.isDir) onDirClick(node);
              else if (onFileClick) onFileClick(node);
            }}
          >{node.name}</span>
          {node.isDir && (
            <button
              style={{ background: 'none', border: 'none', color: isFavorite(node.path) ? '#ffe066' : '#888', fontSize: 18, cursor: 'pointer', marginLeft: 8 }}
              title={isFavorite(node.path) ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
              onClick={e => { e.stopPropagation(); onToggleFavorite(node.path); }}
            >
              {isFavorite(node.path) ? '★' : '☆'}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

export default FileList;
