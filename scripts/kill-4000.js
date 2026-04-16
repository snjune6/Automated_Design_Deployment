// 4000번 포트에서 LISTEN 중인 프로세스를 찾아 강제 종료하는 스크립트 (Windows 전용)
const { execSync } = require('child_process');

try {
  // netstat로 4000번 포트 LISTEN 중인 PID 찾기
  const output = execSync('netstat -ano | findstr :4000', { encoding: 'utf-8' });
  const lines = output.split('\n').filter(line => line.includes('LISTEN'));
  const pids = Array.from(new Set(lines.map(line => line.trim().split(/\s+/).pop())));
  if (pids.length === 0) {
    console.log('4000번 포트에서 LISTEN 중인 프로세스가 없습니다.');
    process.exit(0);
  }
  pids.forEach(pid => {
    try {
      execSync(`taskkill /PID ${pid} /F`);
      console.log(`PID ${pid} 프로세스를 강제 종료했습니다.`);
    } catch (e) {
      console.error(`PID ${pid} 종료 실패:`, e.message);
    }
  });
} catch (e) {
  console.log('4000번 포트에서 LISTEN 중인 프로세스를 찾을 수 없습니다.');
}

