// lib/network-utils.ts - 네트워크 IP 자동 감지 및 설정 유틸리티

// 브라우저 환경에서는 Node.js 모듈을 import하지 않음
let exec: any, promisify: any, fs: any, path: any;

if (typeof window === 'undefined') {
  // 서버 환경에서만 Node.js 모듈 import
  exec = require('child_process').exec;
  promisify = require('util').promisify;
  fs = require('fs').promises;
  path = require('path');
}

const execAsync = typeof promisify !== 'undefined' ? promisify(exec) : null;

/**
 * 현재 Mac의 네트워크 IP 주소를 자동으로 감지합니다
 * 여러 네트워크 인터페이스를 확인하여 가장 적절한 IP를 선택합니다
 */
export async function getLocalNetworkIP(): Promise<string> {
  // 브라우저 환경에서는 실행하지 않음
  if (typeof window !== 'undefined' || !execAsync) {
    throw new Error('getLocalNetworkIP는 서버 환경에서만 사용 가능합니다');
  }

  try {
    // macOS에서 활성 네트워크 인터페이스의 IP 주소 조회
    const { stdout } = await execAsync(
      `ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1`
    );
    
    const ip = stdout.trim();
    
    if (ip && isValidIP(ip)) {
      console.log(`🌐 자동 감지된 로컬 IP: ${ip}`);
      return ip;
    }
    
    // 첫 번째 방법 실패 시 대안 방법
    const { stdout: stdout2 } = await execAsync(
      `route get default | grep interface | awk '{print $2}' | xargs -I {} ifconfig {} | grep "inet " | awk '{print $2}' | head -1`
    );
    
    const altIp = stdout2.trim();
    if (altIp && isValidIP(altIp)) {
      console.log(`🌐 대안 방법으로 감지된 로컬 IP: ${altIp}`);
      return altIp;
    }
    
    // 모든 방법 실패 시 기본값
    console.warn('🌐 IP 자동 감지 실패 - 기본값 사용: 192.168.1.100');
    return '192.168.1.100';
    
  } catch (error) {
    console.error('🌐 IP 주소 감지 오류:', error);
    return '192.168.1.100';
  }
}

/**
 * IP 주소 유효성 검사
 */
function isValidIP(ip: string): boolean {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

/**
 * Capacitor 설정 파일의 IP 주소를 동적으로 업데이트합니다
 */
export async function updateCapacitorConfigIP(): Promise<string> {
  try {
    const currentIP = await getLocalNetworkIP();
    const configPath = path.join(process.cwd(), 'mobile', 'capacitor.config.ts');
    
    // 현재 설정 파일 읽기
    const configContent = await fs.readFile(configPath, 'utf-8');
    
    // IP 주소 패턴 매칭 및 교체
    const ipPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000/g;
    const updatedContent = configContent.replace(ipPattern, `${currentIP}:3000`);
    
    // 변경사항이 있는 경우에만 파일 업데이트
    if (configContent !== updatedContent) {
      await fs.writeFile(configPath, updatedContent);
      console.log(`🌐 Capacitor 설정 업데이트: ${currentIP}:3000`);
    } else {
      console.log(`🌐 Capacitor 설정 이미 최신 상태: ${currentIP}:3000`);
    }
    
    return currentIP;
    
  } catch (error) {
    console.error('🌐 Capacitor 설정 업데이트 오류:', error);
    throw error;
  }
}

/**
 * 개발 서버 시작 전 자동 IP 설정
 * package.json 스크립트에서 호출됩니다
 */
export async function setupDevelopmentIP(): Promise<void> {
  try {
    console.log('🌐 개발 환경 IP 설정 시작...');
    
    // 1. 현재 IP 감지
    const currentIP = await getLocalNetworkIP();
    
    // 2. Capacitor 설정 업데이트
    await updateCapacitorConfigIP();
    
    // 3. IP 주소를 환경 변수로 설정 (.env.local 생성/업데이트)
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = `# 자동 생성된 로컬 IP 설정 (${new Date().toISOString()})\nNEXT_PUBLIC_LOCAL_IP=${currentIP}\n`;
    
    try {
      // 기존 .env.local 읽기
      const existingEnv = await fs.readFile(envPath, 'utf-8');
      const lines = existingEnv.split('\n');
      
      // NEXT_PUBLIC_LOCAL_IP 라인 찾아서 교체
      let found = false;
      const updatedLines = lines.map((line: string) => {
        if (line.startsWith('NEXT_PUBLIC_LOCAL_IP=')) {
          found = true;
          return `NEXT_PUBLIC_LOCAL_IP=${currentIP}`;
        }
        return line;
      });
      
      // 없으면 추가
      if (!found) {
        updatedLines.push(`NEXT_PUBLIC_LOCAL_IP=${currentIP}`);
      }
      
      await fs.writeFile(envPath, updatedLines.join('\n'));
      
    } catch (error) {
      // .env.local 파일이 없으면 새로 생성
      await fs.writeFile(envPath, envContent);
    }
    
    console.log(`🌐 개발 환경 IP 설정 완료: ${currentIP}`);
    console.log(`🌐 Capacitor 앱에서 http://${currentIP}:3000 접근 가능`);
    
  } catch (error) {
    console.error('🌐 개발 환경 IP 설정 실패:', error);
    process.exit(1);
  }
}

/**
 * 클라이언트 사이드에서 사용할 동적 서버 URL 조회
 * SSE 연결 시 사용됩니다
 */
export function getDynamicServerUrl(): string {
  // 브라우저 환경에서는 환경 변수 또는 현재 호스트 사용
  if (typeof window !== 'undefined') {
    // 모바일 환경: 환경 변수의 IP 사용
    const localIP = process.env.NEXT_PUBLIC_LOCAL_IP;
    if (localIP) {
      console.log(`🌐 동적 IP 사용: ${localIP}`);
      return `http://${localIP}:3000`;
    }
    
    // 환경 변수가 없으면 기본값 사용
    console.log('🌐 환경 변수 없음 - 기본 IP 사용: 192.168.1.100');
    return 'http://192.168.1.100:3000';
  }
  
  // 서버 사이드: 환경 변수 또는 기본값
  const localIP = process.env.NEXT_PUBLIC_LOCAL_IP || 'localhost';
  return `http://${localIP}:3000`;
}

/**
 * CLI 도구로 IP 설정 업데이트
 * 터미널에서 직접 실행 가능
 */
if (require.main === module) {
  setupDevelopmentIP().catch(console.error);
}