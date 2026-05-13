// 8200포트로 들어온 요청을 사설서버(192.168.20.166:4000)로 프록시
// 필요 패키지: express, http-proxy-middleware
// 설치: npm install express http-proxy-middleware

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const LOCAL_PORT = 8200;
const TARGET = 'http://192.168.20.166:8200'; // 사설서버 주소

const app = express();

// 모든 요청을 프록시
app.use('/', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  ws: true,
  logLevel: 'info',
}));

app.listen(LOCAL_PORT, () => {
  console.log(`프록시 서버가 http://localhost:${LOCAL_PORT} → ${TARGET} 으로 중계합니다.`);
});

// 사용법:
// 1. npm install express http-proxy-middleware
// 2. node scripts/proxy8200.js
// 3. 클라이언트에서 http://localhost:8200 으로 요청하면 사설서버로 중계됨

