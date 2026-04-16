const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 4000; // 필요에 따라 변경

app.use(cors());
app.use(bodyParser.json({ limit: '1gb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1gb' }));

// 파일 목록 조회 (폴더만 조회 지원)
app.get('/files', (req, res) => {
  const dirPath = req.query.dirPath || process.cwd();
  const onlyDir = req.query.onlyDir === 'true';
  try {
    const files = fs.readdirSync(dirPath).map(name => {
      try {
        const stat = fs.statSync(path.join(dirPath, name));
        if (onlyDir && !stat.isDirectory()) return null;
        return { name, isDirectory: stat.isDirectory() };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    res.json({ success: true, files });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// 파일 읽기
app.get('/file', (req, res) => {
  const filePath = req.query.filePath;
  try {
    const ext = path.extname(filePath).toLowerCase();
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
    if (imageExts.includes(ext)) {
      const mime = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      }[ext] || 'application/octet-stream';
      let dataUrl;
      if (ext === '.svg') {
        // SVG는 텍스트 기반이므로 utf-8로 읽어서 DataURL 생성
        const svgText = fs.readFileSync(filePath, 'utf-8');
        // encodeURIComponent로 안전하게 인코딩
        dataUrl = `data:${mime};charset=utf-8,${encodeURIComponent(svgText)}`;
      } else {
        // 반드시 Buffer로 읽어서 Base64 인코딩 (인코딩 옵션 넣지 말 것!)
        const bin = fs.readFileSync(filePath);
        const base64 = bin.toString('base64');
        dataUrl = `data:${mime};base64,${base64}`;
      }
      res.json({ success: true, content: dataUrl, isBase64: true });
    } else {
      // 텍스트 파일은 utf-8로 읽음
      const content = fs.readFileSync(filePath, 'utf-8');
      res.json({ success: true, content, isBase64: false });
    }
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// 파일 저장(백업 후 덮어쓰기)
app.post('/file', (req, res) => {
  const { filePath, newContent } = req.body;
  try {
    const backupPath = filePath + '.bak';
    fs.copyFileSync(filePath, backupPath);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// 루트(드라이브/홈) 목록 조회
app.get('/roots', (req, res) => {
  try {
    let roots = [];
    if (process.platform === 'win32') {
      // 윈도우: 드라이브 목록
      try {
        const { execSync } = require('child_process');
        const stdout = execSync('wmic logicaldisk get name', { encoding: 'utf-8' });
        roots = stdout.split('\n').filter(line => /[A-Z]:/.test(line)).map(line => line.trim() + '/');
        if (roots.length === 0) roots = ['C:/'];
      } catch (e) {
        // wmic 실패 시 C:/만 안내
        roots = ['C:/'];
      }
    } else {
      // 유닉스: / 만
      roots = ['/'];
    }
    res.json({ success: true, roots, platform: process.platform });
  } catch (e) {
    res.json({ success: false, error: e.message, platform: process.platform });
  }
});

// 파일 업로드 (경로 포함)
app.post('/upload', (req, res) => {
  console.log('[UPLOAD] ROUTE CALLED');
  const { dir, filename, content, isBase64 } = req.body;
  if (!dir || !filename || typeof content !== 'string') {
    res.status(400).json({ success: false, error: 'dir, filename, content 필수' });
    return;
  }
  let base64 = null;
  let buffer = null;
  try {
    const safeDir = path.resolve(dir);
    const savePath = path.join(safeDir, filename);
    if (isBase64 && typeof content === 'string') {
      if (content.startsWith('data:')) {
        base64 = content.split(',').pop();
      } else {
        base64 = content;
      }
      if (!base64) throw new Error('Base64 데이터가 비어 있음');
      base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
      buffer = Buffer.from(base64, 'base64');
      // 로그 반드시 출력
      console.log('[UPLOAD] content length:', content.length);
      console.log('[UPLOAD] base64 length:', base64.length);
      console.log('[UPLOAD] buffer length:', buffer.length);
    } else {
      buffer = Buffer.from(content, 'utf-8');
      console.log('[UPLOAD] utf8 content length:', content.length);
      console.log('[UPLOAD] utf8 buffer length:', buffer.length);
    }
    fs.writeFileSync(savePath, buffer);
    res.json({ success: true, path: savePath });
  } catch (e) {
    // 예외 발생 시에도 로그 출력
    console.error('[UPLOAD][ERROR]', e);
    if (content) console.log('[UPLOAD][ERROR] content length:', content.length);
    if (base64) console.log('[UPLOAD][ERROR] base64 length:', base64.length);
    if (buffer) console.log('[UPLOAD][ERROR] buffer length:', buffer.length);
    res.status(500).json({ success: false, error: e.message });
  }
});

// 전체 빌드 엔드포인트
const { spawn } = require('child_process');
app.post('/build', (req, res) => {
  // 고정 경로 사용
  const buildDir = 'C:/KOJE.KAIM2026';
  const sln = 'KOJE.KAIMS2026.sln';
  try {
    const build = spawn('dotnet', ['build', sln], { cwd: buildDir });
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    build.stdout.on('data', (data) => {
      res.write(data);
    });
    build.stderr.on('data', (data) => {
      res.write(data);
    });
    build.on('close', (code) => {
      res.write(`\n[빌드 종료] 종료코드: ${code}\n`);
      res.end();
    });
  } catch (e) {
    res.status(500).end('[에러] 빌드 실행 실패: ' + e.message);
  }
});

app.listen(PORT, () => {
  console.log(`File server listening on port ${PORT}`);
});
