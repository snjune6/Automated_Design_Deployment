import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import LogPanel, { LogMessage } from './components/LogPanel';
import FileList, { FileNode } from './components/FileList';

// 파일 미리보기/수정 에디터(줄번호 동기화)
type InlineEditorProps = {
  value: string;
  onChange: (val: string) => void;
};
const InlineEditor: React.FC<InlineEditorProps> = ({ value, onChange }) => {
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleScroll = () => {
    if (lineNumberRef.current && textareaRef.current) {
      lineNumberRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };
  return (
    <div style={{ display: 'flex', background: '#181a1f', borderRadius: 6, overflow: 'hidden', maxHeight: '50vh', fontFamily: 'Consolas, Menlo, Monaco, monospace', fontSize: 15 }}>
      <div
        ref={lineNumberRef}
        style={{ background: '#23242a', color: '#888', padding: '18px 8px 18px 12px', textAlign: 'right', userSelect: 'none', minWidth: 38, overflow: 'hidden', maxHeight: '50vh' }}
      >
        {value.split('\n').map((_, i: number) => (
          <div key={i} style={{ height: '1.5em', lineHeight: '1.5em' }}>{i + 1}</div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex' }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onScroll={handleScroll}
          style={{
            background: 'none', color: '#e0e0e0', padding: 18, margin: 0, border: 'none', fontFamily: 'inherit', fontSize: 'inherit', overflowX: 'auto', overflowY: 'auto', whiteSpace: 'pre', width: '100%', height: '100%', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: '1.5em', maxHeight: '50vh',
          }}
          spellCheck={false}
          rows={Math.max(5, value.split('\n').length)}
        />
      </div>
    </div>
  );
};

function App() {
  // 파일 뷰어 상태
  const [selectedFile, setSelectedFile] = useState<{ name: string; path: string } | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileContentLoading, setFileContentLoading] = useState(false);
  const [fileContentError, setFileContentError] = useState<string | null>(null);
  // 파일 선택이 바뀔 때마다 fileContent 초기화
  useEffect(() => {
    setFileContent('');
  }, [selectedFile]);
  const [serverAddress, setServerAddress] = useState('http://localhost:4000');
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('서버에 연결되어 있지 않습니다.');
  const [savedServers, setSavedServers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [roots, setRoots] = useState<string[]>([]);
  const [rootsLoading, setRootsLoading] = useState(false);
  const [rootsError, setRootsError] = useState<string | null>(null);
  const [minimizedCard, setMinimizedCard] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [fileNodes, setFileNodes] = useState<FileNode[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  // 즐겨찾기: { name, path }[]
  const [favoritePaths, setFavoritePaths] = useState<{ name: string; path: string }[]>([]);

  // 즐겨찾기 명칭 입력 모달 상태
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [favoriteModalPath, setFavoriteModalPath] = useState<string | null>(null);
   // (불필요한 favoriteModalCallback 제거)

  // 즐겨찾기 최소화 상태
  const [favoriteMinimized, setFavoriteMinimized] = useState(false);

  // 이미지 파일 미리보기 상태
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);

  // 파일 첨부 input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 로그 추가
  const addLog = (type: LogMessage['type'], message: string) => {
    setLogs(logs => [...logs, { type, message, timestamp: new Date().toLocaleTimeString() }]);
  };

  // 저장된 서버 목록 불러오기
  const loadServers = async () => {
    const servers = await window.api.ipcRenderer.invoke('load-servers');
    setSavedServers(servers || []);
  };

  // 즐겨찾기 목록 불러오기
  const loadFavorites = () => {
    // 기존 string[] 데이터도 마이그레이션
    const fav = localStorage.getItem('favorites');
    if (!fav) {
      setFavoritePaths([]);
      return;
    }
    try {
      const arr = JSON.parse(fav);
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && arr[0].name && arr[0].path) {
        setFavoritePaths(arr);
      } else if (Array.isArray(arr)) {
        // string[] → {name, path}[]
        setFavoritePaths(arr.map((p: string) => ({ name: p.split('/').pop() || p, path: p })));
      } else {
        setFavoritePaths([]);
      }
    } catch {
      setFavoritePaths([]);
    }
  };

  // 앱 시작 시 localStorage에서 접속 상태 복원
  useEffect(() => {
    loadServers();
    loadFavorites();
    const saved = localStorage.getItem('connectedServer');
    if (saved) {
      setIsConnected(true);
      setServerAddress(saved);
      setStatus(`${saved} 서버에 연결되었습니다.`);
      window.api.ipcRenderer.send('set-connected', true);
      addLog('status', `${saved} 서버에 자동 접속되었습니다.`);
    }
  }, []);
  // 즐겨찾기 토글
  const handleToggleFavorite = (path: string) => {
    setFavoritePaths(prev => {
      let next;
      if (prev.some(fp => fp.path === path)) {
        next = prev.filter(fp => fp.path !== path);
        localStorage.setItem('favorites', JSON.stringify(next));
        return next;
      } else {
        // 명칭 입력 모달 표시
        setFavoriteModalPath(path);
        setShowFavoriteModal(true);
        return prev;
      }
    });
  };

  // 모달에서 확인 시 호출
  const handleFavoriteModalConfirm = (name: string|null) => {
    setShowFavoriteModal(false);
    const path = favoriteModalPath;
    setFavoriteModalPath(null);
    if (!name || !path) return;
    setFavoritePaths(prev => {
      if (prev.some(fp => fp.path === path)) return prev;
      const next = [...prev, { name: name.trim(), path }];
      localStorage.setItem('favorites', JSON.stringify(next));
      return next;
    });
  };

  // 서버 접속
  const connectToServer = async (addr: string) => {
    setLoading(true);
    setStatus('서버 접속 시도 중...');
    addLog('request', `${addr} 서버 접속 시도`);
    setTimeout(() => {
      setIsConnected(true);
      setStatus(`${addr} 서버에 연결되었습니다.`);
      addLog('status', `${addr} 서버에 연결되었습니다.`);
      window.api.ipcRenderer.send('set-connected', true);
      loadServers();
      setLoading(false);
      localStorage.setItem('connectedServer', addr);
      fetchRoots(addr);
    }, 800);
  };

  // 서버 저장
  const saveServer = async (addr: string) => {
    await window.api.ipcRenderer.invoke('add-server', addr);
    addLog('info', `서버 저장: ${addr}`);
    loadServers();
  };

  // 서버 삭제
  const removeServer = async (addr: string) => {
    await window.api.ipcRenderer.invoke('remove-server', addr);
    addLog('info', `서버 삭제: ${addr}`);
    loadServers();
  };

  // 로그 전체 삭제
  const clearLogs = () => setLogs([]);

  // 로그아웃/접속 해제
  const disconnect = () => {
    setIsConnected(false);
    setStatus('서버에 연결되어 있지 않습니다.');
    localStorage.removeItem('connectedServer');
    window.api.ipcRenderer.send('set-connected', false);
    addLog('status', '서버 연결이 해제되었습니다.');
    setRoots([]);
    setRootsError(null);
  };

  // 루트 디렉토리 목록 불러오기
  const fetchRoots = async (addr: string) => {
    setRootsLoading(true);
    setRootsError(null);
    setCurrentPath('');
    setFileNodes([]);
    addLog('request', `${addr}/roots 디렉토리 목록 요청`);
    try {
      const res = await fetch(`${addr.replace(/\/$/, '')}/roots`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let rootsArr: string[] = [];
      if (Array.isArray(data)) rootsArr = data;
      else if (data && Array.isArray(data.roots)) rootsArr = data.roots;
      else throw new Error('서버 응답 형식 오류');
      setRoots(rootsArr);
      setFileNodes(rootsArr.map(name => ({ name, path: name, isDir: true })));
      addLog('response', `디렉토리 목록 수신: ${rootsArr.length}개`);
    } catch (e: any) {
      setRoots([]);
      setRootsError(e.message || '네트워크 오류');
      setFileNodes([]);
      addLog('error', `디렉토리 목록 오류: ${e.message}`);
    } finally {
      setRootsLoading(false);
    }
  };

  // 하위 디렉토리/파일 목록 불러오기
  const fetchDir = async (node: FileNode) => {
    setFileLoading(true);
    setFileError(null);
    addLog('request', `${serverAddress}/files?dirPath=${encodeURIComponent(node.path)} 목록 요청`);
    try {
      const res = await fetch(`${serverAddress.replace(/\/$/, '')}/files?dirPath=${encodeURIComponent(node.path)}`);
      const data = await res.json();
      if (!data.success || !Array.isArray(data.files)) throw new Error(data.error || '서버 응답 형식 오류');
      setCurrentPath(node.path);
      setFileNodes(data.files.map((item: any) => ({
        name: item.name,
        path: node.path.endsWith('/') ? node.path + item.name : node.path + '/' + item.name,
        isDir: !!item.isDirectory
      })));
      addLog('response', `${node.path} 목록 수신: ${data.files.length}개`);
    } catch (e: any) {
      setFileError(e.message || '네트워크 오류');
      addLog('error', `목록 오류: ${e.message}`);
    } finally {
      setFileLoading(false);
    }
  };

  // 접속 상태가 되면 루트 디렉토리 목록 자동 로드
  useEffect(() => {
    if (isConnected) {
      fetchRoots(serverAddress);
    }
  }, [isConnected]);

  // 파일 클릭 핸들러 (FileList에 전달)
  const handleFileClick = async (node: FileNode) => {
    // 이미지 확장자 판별
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lower = node.name.toLowerCase();
    if (imageExtensions.some(ext => lower.endsWith(ext))) {
      // 서버에서 DataURL을 받아서 미리보기
      try {
        const res = await fetch(`${serverAddress.replace(/\/$/, '')}/file?filePath=${encodeURIComponent(node.path)}`);
        const data = await res.json();
        if (data && data.content && data.isBase64) {
          setImagePreviewSrc(data.content);
          setImagePreviewOpen(true);
          return;
        } else {
          alert('이미지 파일을 불러올 수 없습니다.');
          return;
        }
      } catch (e) {
        alert('이미지 파일을 불러오는 중 오류가 발생했습니다.');
        return;
      }
    }
    setSelectedFile({ name: node.name, path: node.path });
    setFileContent('');
    setFileContentLoading(true);
    setFileContentError(null);
    fetch(`${serverAddress.replace(/\/$/, '')}/file?filePath=${encodeURIComponent(node.path)}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        if (typeof data.content === 'string') setFileContent(data.content);
        else setFileContentError('파일 내용 없음');
      })
      .catch(e => setFileContentError(e.message || '파일 불러오기 오류'))
      .finally(() => setFileContentLoading(false));
  };

  // 파일 첨부 버튼 클릭 시 input 클릭
  const handleAttachClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  // 파일 첨부 실제 업로드 처리
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 현재 경로의 파일 목록에서 같은 이름이 있는지 확인
    const exists = fileNodes.some(node => node.name === file.name && !node.isDir);
    if (exists) {
      const overwrite = window.confirm('같은 이름의 파일이 이미 존재합니다. 덮어쓰시겠습니까?');
      if (!overwrite) return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result;
      if (!result || typeof result !== 'string' && !(result instanceof ArrayBuffer)) return;
      // 바이너리 파일도 지원 (Base64로 전송)
      let content: string;
      let isBase64 = false;
      if (typeof result === 'string') {
        // 텍스트 파일
        content = result;
      } else {
        // 바이너리 파일(Base64)
        content = btoa(String.fromCharCode(...new Uint8Array(result)));
        isBase64 = true;
      }
      try {
        const res = await fetch(`${serverAddress.replace(/\/$/, '')}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dir: currentPath,
            filename: file.name,
            content,
            isBase64
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('파일이 성공적으로 첨부되었습니다.');
          fetchDir({ name: currentPath.split('/').pop() || currentPath, path: currentPath, isDir: true });
        } else {
          alert('파일 첨부 실패: ' + (data.error || '오류'));
        }
      } catch (err) {
        alert('파일 첨부 중 오류 발생');
      }
    };
    // 텍스트/바이너리 구분
    if (file.type.startsWith('text/')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
      // ...existing code...
  };

  return (
    <div style={{ minHeight: '100vh', background: '#23272e', color: '#e0e0e0' }}>
      <header style={{ padding: '32px 0 0 32px', position: 'relative' }}>
        <h2 style={{ margin: 0, fontWeight: 600, color: '#fff', letterSpacing: 1 }}>Automated Design Deployment</h2>
        {isConnected && (
          <>
            <div style={{
              position: 'absolute', top: 32, right: 36, background: '#23272e', border: '2px solid #2d8cf0', borderRadius: 12, boxShadow: '0 2px 12px #0006', padding: '18px 32px', minWidth: 320, zIndex: 100,
              display: minimizedCard ? 'none' : 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8
            }}>
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#2d8cf0', fontWeight: 700, fontSize: 16 }}>서버 접속 중</div>
                <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', marginLeft: 12 }} onClick={() => setMinimizedCard(true)}>–</button>
              </div>
              <div style={{ color: '#fff', fontSize: 15, marginBottom: 2 }}>
                <span style={{ color: '#b0b0b0', fontWeight: 500, marginRight: 8 }}>주소:</span>
                {serverAddress}
              </div>
              <div style={{ color: '#b0b0b0', fontSize: 14, marginBottom: 8 }}>상태: <span style={{ color: '#2d8cf0', fontWeight: 500 }}>연결됨</span></div>
              <button style={{ background: '#2d8cf0', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 22px', fontSize: 15, fontWeight: 500, cursor: 'pointer', alignSelf: 'flex-end' }}
                onClick={disconnect}
              >
                접속 해제
              </button>
            </div>
            {minimizedCard && (
              <button style={{ position: 'absolute', top: 36, right: 36, background: '#2d8cf0', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 18px', fontSize: 15, fontWeight: 500, cursor: 'pointer', zIndex: 101 }} onClick={() => setMinimizedCard(false)}>
                서버 상태 보기
              </button>
            )}
          </>
        )}
      </header>
      {/* 즐겨찾기 명칭 입력 모달 */}
      {showFavoriteModal && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{ background: '#23242a', padding: 32, borderRadius: 10, boxShadow: '0 2px 16px #0008', minWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: '#fff', fontSize: 17, marginBottom: 18 }}>즐겨찾기 명칭을 입력하세요</div>
            <input
              type="text"
              defaultValue={favoriteModalPath ? favoriteModalPath.split('/').pop() : ''}
              style={{ width: 220, fontSize: 16, padding: '7px 10px', marginBottom: 18, borderRadius: 5, border: '1px solid #444', background: '#181a1f', color: '#fff' }}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleFavoriteModalConfirm((e.target as HTMLInputElement).value);
                }
              }}
              id="fav-modal-input"
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                style={{ background: '#2d8cf0', color: '#fff', border: 'none', borderRadius: 5, padding: '7px 22px', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
                onClick={() => {
                  const input = document.getElementById('fav-modal-input') as HTMLInputElement;
                  handleFavoriteModalConfirm(input.value);
                }}
              >확인</button>
              <button
                style={{ background: '#444', color: '#fff', border: 'none', borderRadius: 5, padding: '7px 18px', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
                onClick={() => { setShowFavoriteModal(false); setFavoriteModalPath(null); }}
              >취소</button>
            </div>
          </div>
        </div>
      )}
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '60vh' }}>
        {!isConnected ? (
          <div style={{ background: '#262a31', borderRadius: 8, padding: '36px 48px', boxShadow: '0 2px 16px #0004', minWidth: 420 }}>
            {/* ...기존 서버 접속 UI... */}
            <h3 style={{ color: '#2d8cf0', marginBottom: 16 }}>서버 접속</h3>
            <div style={{ marginBottom: 18 }}>
              <input
                type="text"
                value={serverAddress}
                onChange={e => setServerAddress(e.target.value)}
                style={{ width: 260, marginRight: 12 }}
                disabled={isConnected || loading}
                placeholder="서버 주소 (예: http://localhost:4000)"
              />
              <button
                style={{ background: '#2d8cf0', color: '#fff', border: 'none', borderRadius: 5, padding: '8px 22px', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
                onClick={() => connectToServer(serverAddress)}
                disabled={isConnected || loading}
              >
                {loading ? '접속 중...' : '접속'}
              </button>
            </div>
            <div style={{ marginBottom: 18, color: isConnected ? '#2d8cf0' : '#b0b0b0' }}>{status}</div>
            <div style={{ marginBottom: 10, fontWeight: 500 }}>저장된 서버</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {savedServers.length === 0 && <span style={{ color: '#888' }}>없음</span>}
              {savedServers.map(addr => (
                <span key={addr} style={{ background: '#23272e', border: '1px solid #444', borderRadius: 5, padding: '4px 10px', color: '#b6c2e0', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 8, cursor: 'pointer' }} onClick={() => setServerAddress(addr)}>{addr}</span>
                  <button style={{ background: 'none', border: 'none', color: '#f55', cursor: 'pointer', fontSize: 15 }} onClick={() => removeServer(addr)}>X</button>
                </span>
              ))}
            </div>
            <button
              style={{ background: '#444', color: '#fff', border: 'none', borderRadius: 5, padding: '7px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              onClick={() => saveServer(serverAddress)}
              disabled={isConnected || loading || !serverAddress}
            >
              서버 저장
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 32 }}>
            {/* 즐겨찾기 리스트 영역 */}
            <div style={{ minWidth: 220, background: '#23242a', borderRadius: 8, padding: '18px 18px 18px 18px', marginRight: 12, boxShadow: '0 2px 8px #0002', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: favoriteMinimized ? 0 : 10, gap: 6 }}>
                <span style={{ color: '#ffe066', fontWeight: 700, fontSize: 17, letterSpacing: -1 }}>★ 즐겨찾기</span>
                <button
                  style={{ background: 'none', border: 'none', color: '#ffe066', fontSize: 18, cursor: 'pointer', marginLeft: 4 }}
                  title={favoriteMinimized ? '펼치기' : '최소화'}
                  onClick={() => setFavoriteMinimized(v => !v)}
                >
                  {favoriteMinimized ? '▽' : '△'}
                </button>
              </div>
              {!favoriteMinimized && (
                <>
                  {favoritePaths.length === 0 && <div style={{ color: '#888', fontSize: 15, padding: '8px 0' }}>(없음)</div>}
                  {favoritePaths.map(fp => (
                    <div key={fp.path} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                      <button
                        style={{ background: 'none', border: 'none', color: '#4fc3f7', fontSize: 15, cursor: 'pointer', padding: 0, marginRight: 6, textAlign: 'left', flex: 1 }}
                        title={fp.path}
                        onClick={() => {
                          setCurrentPath(fp.path);
                          fetchDir({ name: fp.name, path: fp.path, isDir: true });
                        }}
                      >
                        <span style={{ marginRight: 5 }}>📁</span>{fp.name}
                      </button>
                      <button
                        style={{ background: 'none', border: 'none', color: '#f55', fontSize: 15, cursor: 'pointer', padding: 0, marginLeft: 2 }}
                        title="즐겨찾기에서 제거"
                        onClick={() => handleToggleFavorite(fp.path)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
            {/* 파일/폴더 목록 영역 */}
            <div style={{ background: '#23272e', borderRadius: 8, padding: '36px 48px', boxShadow: '0 2px 16px #0004', minWidth: 420, minHeight: 320 }}>
              <h2 style={{ color: '#2d8cf0', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                디렉토리 구조
                <button
                  style={{ background: '#2d8cf0', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 16px', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
                  onClick={handleAttachClick}
                >파일첨부</button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                />
              </h2>
              {rootsLoading || fileLoading ? <div style={{ color: '#b0b0b0', marginBottom: 16 }}>디렉토리 목록 불러오는 중...</div> : null}
              {rootsError || fileError ? <div style={{ color: '#ffb6b6', marginBottom: 16 }}>오류: {rootsError || fileError}</div> : null}
              {!rootsLoading && !fileLoading && !rootsError && !fileError && fileNodes.length === 0 && <div style={{ color: '#888', marginBottom: 16 }}>디렉토리 없음</div>}
              {currentPath && (
                <div style={{ marginBottom: 10, color: '#b6c2e0', fontSize: 15 }}>
                  <span style={{ color: '#888' }}>경로: </span>{currentPath}
                  <button style={{ marginLeft: 12, background: 'none', border: 'none', color: '#2d8cf0', cursor: 'pointer', fontSize: 15 }} onClick={() => fetchRoots(serverAddress)}>최상위로</button>
                </div>
              )}
              <FileList
                nodes={fileNodes}
                onDirClick={fetchDir}
                onFileClick={handleFileClick}
                parentNode={(() => {
                  function getParentPath(path: string): string | undefined {
                    let p = path.replace(/\\/g, '/');
                    // 드라이브 루트(C:/, D:/ 등)에서는 상위 없음
                    if (/^[A-Za-z]:\\?$/.test(p) || /^[A-Za-z]:\/?$/.test(p)) return undefined;
                    if (p.endsWith('/')) p = p.slice(0, -1);
                    const idx = p.lastIndexOf('/');
                    if (idx === -1) return undefined;
                    // 드라이브 루트로 이동
                    if (idx === 2 && /^[A-Za-z]:$/.test(p.slice(0, 2))) return p.slice(0, 3);
                    return p.slice(0, idx);
                  }
                  const parentPath = getParentPath(currentPath);
                  if (!parentPath) return undefined;
                  return { name: '..', path: parentPath, isDir: true };
                })()}
                favoritePaths={favoritePaths.map(fp => fp.path)}
                onToggleFavorite={handleToggleFavorite}
              />
            </div>
          </div>
        )}
      </main>
      <footer style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: '24px 0 8px 0' }}>
        © 2026 Automated Design Deployment
      </footer>
      <LogPanel logs={logs} onClear={clearLogs} />
      {/* 파일 내용 뷰어 모달 */}
      {selectedFile && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{ background: '#23242a', padding: 32, borderRadius: 10, boxShadow: '0 2px 16px #0008', minWidth: 480, width: '80vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              {/* <button
                style={{ background: '#2d8cf0', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 16px', fontSize: 15, fontWeight: 500, cursor: 'pointer', marginRight: 12 }}
                onClick={() => alert('파일 첨부 기능은 추후 구현 예정입니다.')}
              >파일첨부</button> */}
              <span style={{ color: '#2d8cf0', fontWeight: 700, fontSize: 17, flex: 1 }}>{selectedFile.name}</span>
              <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', marginLeft: 8 }} onClick={() => setSelectedFile(null)}>✕</button>
            </div>
            {fileContentLoading && <div style={{ color: '#b0b0b0', margin: '24px 0', textAlign: 'center' }}>불러오는 중...</div>}
            {fileContentError && <div style={{ color: '#ffb6b6', margin: '24px 0', textAlign: 'center' }}>{fileContentError}</div>}
            {!fileContentLoading && !fileContentError && (
              <>
                <InlineEditor value={fileContent} onChange={setFileContent} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button
                    style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 5, padding: '7px 22px', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
                    onClick={async () => {
                      if (!selectedFile) return;
                      try {
                        const res = await fetch(`${serverAddress.replace(/\/$/, '')}/file`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ filePath: selectedFile.path, newContent: fileContent })
                        });
                        const data = await res.json();
                        if (data.success) {
                          addLog('info', `${selectedFile.path} 저장 완료`);
                          alert('저장되었습니다.');
                          setSelectedFile(null);
                        } else {
                          addLog('error', `${selectedFile.path} 저장 실패: ${data.error}`);
                          alert('저장 실패: ' + (data.error || '오류'));
                        }
                      } catch (e: any) {
                        addLog('error', `${selectedFile.path} 저장 실패: ${e.message}`);
                        alert('저장 실패: ' + (e.message || '오류'));
                      }
                    }}
                  >저장</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* 이미지 미리보기 모달 */}
      {imagePreviewOpen && imagePreviewSrc && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div style={{ background: '#23242a', padding: 32, borderRadius: 10, boxShadow: '0 2px 16px #0008', minWidth: 480, width: '80vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <button
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', position: 'absolute', top: 18, right: 18 }}
              onClick={() => setImagePreviewOpen(false)}
              title="닫기"
            >✕</button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <img
                src={imagePreviewSrc}
                alt="미리보기"
                style={{
                  maxWidth: '70vw',
                  maxHeight: '60vh',
                  boxShadow: '0 0 16px #000',
                  background: '#fff',
                  borderRadius: 8,
                  objectFit: 'contain',
                  display: 'block',
                }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
