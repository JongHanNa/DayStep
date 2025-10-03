#!/usr/bin/env node
// scripts/setup-dev-ip.js - 개발 서버 시작 전 IP 자동 설정 스크립트

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

/**
 * 현재 Mac의 네트워크 IP 주소를 자동으로 감지
 */
async function getLocalNetworkIP() {
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
function isValidIP(ip) {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

/**
 * Capacitor 설정 파일의 IP 주소를 동적으로 업데이트
 */
async function updateCapacitorConfigIP(currentIP) {
  try {
    const configPath = path.join(__dirname, '..', 'mobile', 'capacitor.config.ts');
    
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
 * .env.local 파일에 IP 주소 설정
 */
async function updateEnvFile(currentIP) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    
    try {
      // 기존 .env.local 읽기
      const existingEnv = await fs.readFile(envPath, 'utf-8');
      const lines = existingEnv.split('\n');
      
      // NEXT_PUBLIC_LOCAL_IP 라인 찾아서 교체
      let found = false;
      const updatedLines = lines.map(line => {
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
      const envContent = `# 자동 생성된 로컬 IP 설정 (${new Date().toISOString()})\nNEXT_PUBLIC_LOCAL_IP=${currentIP}\n`;
      await fs.writeFile(envPath, envContent);
    }
    
    console.log(`🌐 환경 변수 설정: NEXT_PUBLIC_LOCAL_IP=${currentIP}`);
    
  } catch (error) {
    console.error('🌐 환경 변수 설정 오류:', error);
    throw error;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log('🌐 개발 환경 IP 자동 설정 시작...');
    
    // 1. 현재 IP 감지
    const currentIP = await getLocalNetworkIP();
    
    // 2. Capacitor 설정 업데이트
    await updateCapacitorConfigIP(currentIP);
    
    // 3. 환경 변수 설정
    await updateEnvFile(currentIP);
    
    console.log('🌐 IP 설정 완료!');
    console.log(`🌐 개발 서버: http://${currentIP}:3000`);
    console.log(`🌐 모바일 앱에서 위 주소로 접근 가능`);
    
  } catch (error) {
    console.error('🌐 IP 설정 실패:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}

module.exports = { getLocalNetworkIP, updateCapacitorConfigIP, updateEnvFile };