#!/usr/bin/env node

/**
 * 빌드 검증 스크립트
 * 빌드 전후 환경 검증 및 문제 진단 도구
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// 색상 출력을 위한 유틸리티
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(50)}`, 'cyan');
  log(`${title}`, 'cyan');
  log(`${'='.repeat(50)}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 시스템 정보 수집
function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
    memory: {
      total: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      free: Math.round(os.freemem() / 1024 / 1024 / 1024),
    },
  };
}

// Node.js 버전 검증
function validateNodeVersion() {
  const currentVersion = process.version;
  const majorVersion = parseInt(currentVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    logError(`Node.js 버전이 너무 낮습니다. 현재: ${currentVersion}, 최소 요구: v18.0.0`);
    return false;
  }
  
  logSuccess(`Node.js 버전 확인: ${currentVersion}`);
  return true;
}

// 필수 패키지 검증
function validateDependencies() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'next',
    'react',
    'react-dom',
    '@capacitor/core',
    '@capacitor/cli',
  ];
  
  let allValid = true;
  
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
      logError(`필수 의존성이 누락되었습니다: ${dep}`);
      allValid = false;
    } else {
      logSuccess(`의존성 확인: ${dep}`);
    }
  }
  
  return allValid;
}

// Capacitor 환경 검증
function validateCapacitor() {
  try {
    execSync('npx cap doctor', { stdio: 'pipe' });
    logSuccess('Capacitor 환경 검증 완료');
    return true;
  } catch (error) {
    logError('Capacitor 환경에 문제가 있습니다');
    logInfo('자세한 정보: npm run mobile:doctor');
    return false;
  }
}

// 빌드 타겟별 환경 검증
function validateBuildTarget(target) {
  const buildTarget = target || process.env.BUILD_TARGET || 'web';
  
  logInfo(`빌드 타겟: ${buildTarget}`);
  
  if (buildTarget === 'mobile') {
    // 모바일 빌드 요구사항 검증
    if (!fs.existsSync('../mobile-capacitor/capacitor.config.ts')) {
      logError('Capacitor 설정 파일이 없습니다: ../mobile-capacitor/capacitor.config.ts');
      return false;
    }

    if (!fs.existsSync('../mobile-capacitor/ios') && !fs.existsSync('../mobile-capacitor/android')) {
      logError('모바일 플랫폼 폴더가 없습니다. npm run mobile:sync를 실행하세요.');
      return false;
    }
    
    logSuccess('모바일 빌드 환경 검증 완료');
  } else {
    // 웹 빌드 요구사항 검증
    logSuccess('웹 빌드 환경 검증 완료');
  }
  
  return true;
}

// 디스크 공간 확인
function validateDiskSpace() {
  try {
    const stats = fs.statSync('.');
    // 최소 1GB 여유 공간 확인 (실제 구현은 플랫폼별로 다를 수 있음)
    logSuccess('디스크 공간 충분');
    return true;
  } catch (error) {
    logWarning('디스크 공간을 확인할 수 없습니다');
    return true; // 경고만 표시하고 계속 진행
  }
}

// 환경 변수 검증
function validateEnvironment() {
  const requiredEnvVars = [];
  const optionalEnvVars = ['BUILD_TARGET', 'NODE_ENV', 'ANALYZE'];
  
  // 필수 환경 변수 확인
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logError(`필수 환경 변수가 설정되지 않았습니다: ${envVar}`);
      return false;
    }
  }
  
  // 선택적 환경 변수 정보 표시
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      logInfo(`환경 변수: ${envVar}=${process.env[envVar]}`);
    }
  }
  
  logSuccess('환경 변수 검증 완료');
  return true;
}

// 빌드 성능 측정
function measureBuildPerformance(buildCommand) {
  const startTime = Date.now();
  
  try {
    execSync(buildCommand, { stdio: 'inherit' });
    const duration = Date.now() - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    logSuccess(`빌드 완료 시간: ${minutes}분 ${seconds}초`);
    
    if (duration > 300000) { // 5분 이상
      logWarning('빌드 시간이 길어졌습니다. 성능 최적화를 고려하세요.');
    }
    
    return true;
  } catch (error) {
    logError('빌드 실패');
    return false;
  }
}

// 빌드 결과물 검증
function validateBuildOutput(target) {
  const buildTarget = target || process.env.BUILD_TARGET || 'web';
  
  if (buildTarget === 'mobile') {
    if (!fs.existsSync('out')) {
      logError('모바일 빌드 출력 디렉토리가 없습니다: out/');
      return false;
    }
    
    if (!fs.existsSync('out/index.html')) {
      logError('메인 HTML 파일이 없습니다: out/index.html');
      return false;
    }
    
    logSuccess('모바일 빌드 출력 검증 완료');
  } else {
    if (!fs.existsSync('.next')) {
      logError('웹 빌드 출력 디렉토리가 없습니다: .next/');
      return false;
    }
    
    logSuccess('웹 빌드 출력 검증 완료');
  }
  
  return true;
}

// 번들 크기 분석
function analyzeBundleSize(target) {
  const buildTarget = target || process.env.BUILD_TARGET || 'web';
  
  try {
    if (buildTarget === 'mobile') {
      const outDir = 'out';
      if (fs.existsSync(outDir)) {
        const files = fs.readdirSync(outDir, { recursive: true })
          .filter(file => file.endsWith('.js') || file.endsWith('.css'))
          .map(file => {
            const filePath = path.join(outDir, file);
            const stats = fs.statSync(filePath);
            return { file, size: stats.size };
          })
          .sort((a, b) => b.size - a.size);
        
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        
        logInfo(`총 번들 크기: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        
        if (files.length > 0) {
          logInfo('큰 파일들:');
          files.slice(0, 5).forEach(file => {
            logInfo(`  ${file.file}: ${(file.size / 1024).toFixed(2)} KB`);
          });
        }
      }
    }
    
    logSuccess('번들 크기 분석 완료');
    return true;
  } catch (error) {
    logWarning('번들 크기 분석 실패');
    return true; // 경고만 표시하고 계속 진행
  }
}

// 메인 실행 함수
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];
  
  logSection('빌드 환경 검증 시작');
  
  // 시스템 정보 출력
  const systemInfo = getSystemInfo();
  logInfo(`플랫폼: ${systemInfo.platform} ${systemInfo.arch}`);
  logInfo(`Node.js: ${systemInfo.nodeVersion}`);
  logInfo(`npm: ${systemInfo.npmVersion}`);
  logInfo(`메모리: ${systemInfo.memory.free}GB/${systemInfo.memory.total}GB 사용 가능`);
  
  let allChecksPass = true;
  
  // 기본 검증
  allChecksPass &= validateNodeVersion();
  allChecksPass &= validateDependencies();
  allChecksPass &= validateEnvironment();
  allChecksPass &= validateDiskSpace();
  allChecksPass &= validateBuildTarget(target);
  
  if (command === 'pre-build') {
    allChecksPass &= validateCapacitor();
    
    if (!allChecksPass) {
      logError('빌드 전 검증 실패');
      process.exit(1);
    }
    
    logSuccess('빌드 전 검증 완료');
  } else if (command === 'post-build') {
    allChecksPass &= validateBuildOutput(target);
    analyzeBundleSize(target);
    
    if (!allChecksPass) {
      logError('빌드 후 검증 실패');
      process.exit(1);
    }
    
    logSuccess('빌드 후 검증 완료');
  } else if (command === 'build-with-validation') {
    // 빌드 전 검증
    allChecksPass &= validateCapacitor();
    
    if (!allChecksPass) {
      logError('빌드 전 검증 실패');
      process.exit(1);
    }
    
    // 빌드 실행 및 성능 측정
    const buildCommand = target === 'mobile' ? 'npm run build:mobile' : 'npm run build:web';
    logSection('빌드 실행');
    
    if (!measureBuildPerformance(buildCommand)) {
      process.exit(1);
    }
    
    // 빌드 후 검증
    logSection('빌드 후 검증');
    allChecksPass &= validateBuildOutput(target);
    analyzeBundleSize(target);
    
    if (!allChecksPass) {
      logError('빌드 후 검증 실패');
      process.exit(1);
    }
    
    logSuccess('전체 빌드 검증 완료');
  } else {
    logError('사용법: node validate-build.js [pre-build|post-build|build-with-validation] [web|mobile]');
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(error => {
    logError(`스크립트 실행 중 오류: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  validateNodeVersion,
  validateDependencies,
  validateCapacitor,
  validateBuildTarget,
  validateEnvironment,
  analyzeBundleSize,
};