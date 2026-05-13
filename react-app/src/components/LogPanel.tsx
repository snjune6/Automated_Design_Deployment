import React, { useRef, useEffect, useState } from 'react';

export type LogType = 'status' | 'request' | 'response' | 'error' | 'build' | 'info';

export interface LogMessage {
  type: LogType;
  message: string;
  timestamp?: string;
}

const typeColor: Record<LogType, string> = {
  status: '#2d8cf0',
  request: '#b6eaff',
  response: '#b6ffb6',
  error: '#ffb6b6',
  build: '#ffe0b6',
  info: '#e0e0e0',
};

function LogPanel({ logs, onClear }: { logs: LogMessage[]; onClear: () => void }) {
  const [open, setOpen] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs, open]);

  return (
    <>
      <div id="log-panel" style={{
        position: 'fixed', bottom: 0, left: 0, width: '100vw', maxHeight: 200, overflowY: 'auto', background: '#181818', color: '#e0e0e0', fontFamily: 'Consolas, Menlo, Monaco, monospace', fontSize: 13, zIndex: 9999, padding: '8px 12px 0 12px', boxSizing: 'border-box', borderTop: '1.5px solid #444', boxShadow: 'none', display: open ? 'block' : 'none'
      }}>
        <div id="log-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 2px 2px', userSelect: 'none', fontSize: 14, color: '#fff', fontWeight: 500, letterSpacing: 1 }}>
          <span>로그 패널</span>
          <span>
            <button id="log-panel-toggle" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1, marginRight: 8 }} onClick={() => setOpen(false)}>▼</button>
            <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: 15, cursor: 'pointer', lineHeight: 1 }} onClick={onClear}>🗑</button>
          </span>
        </div>
        <div id="log-panel-body" ref={bodyRef} style={{ marginTop: 2, minHeight: 24 }}>
          {logs.length === 0 && <div style={{ color: '#888' }}>로그가 없습니다.</div>}
          {logs.map((log, idx) => (
            <div key={idx} style={{ color: typeColor[log.type] || '#e0e0e0' }}>
              <span style={{ color: '#888', marginRight: 6 }}>{log.timestamp || ''}</span>
              [{log.type}] {log.message}
            </div>
          ))}
        </div>
      </div>
      {!open && (
        <button style={{ position: 'fixed', bottom: 10, right: 24, background: '#2d8cf0', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 18px', fontSize: 14, cursor: 'pointer', zIndex: 10000 }} onClick={() => setOpen(true)}>▲ 로그 열기</button>
      )}
    </>
  );
}

export default LogPanel;

