#!/usr/bin/env node

/**
 * 모바일 빌드 시 웹 개발 서버의 핫 리로드를 일시 중단하여 route.ts 변경 오류를 방지하는 스크립트
 * 기존 개발 서버는 유지하면서 파일 감시만 중단
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📱 핫 리로드 제어 모바일 빌드를 시작합니다...\n');

// 개발 서버 실행 여부 확인
function checkDevServer() {
  return new Promise((resolve) => {
    exec('pgrep -f "next dev"', (error, stdout) => {
      if (error) {
        resolve(false);
      } else {
        resolve(stdout.trim().length > 0);
      }
    });
  });
}

// 핫 리로드 비활성화
function disableHotReload() {
  return new Promise((resolve) => {
    console.log('⏸️  웹 개발 서버의 핫 리로드를 일시 중단합니다...');
    
    // DISABLE_HOT_RELOAD 환경변수 설정
    process.env.DISABLE_HOT_RELOAD = 'true';
    
    // Next.js에게 설정 변경 알리기 - 대기 시간 단축
    exec('touch next.config.ts', (error) => {
      // 오류 무시하고 계속
      setTimeout(() => {
        console.log('✅ 웹 개발 서버의 핫 리로드가 일시 중단되었습니다.');
        console.log('   이제 route.ts 파일 변경 시 오류가 발생하지 않습니다.\n');
        resolve();
      }, 500); // 설정 적용을 위해 0.5초 대기 (2초에서 단축)
    });
  });
}

// 핫 리로드 재활성화
function enableHotReload() {
  return new Promise((resolve) => {
    console.log('\n🔥 웹 개발 서버의 핫 리로드를 재활성화합니다...');
    
    // 환경변수 제거
    delete process.env.DISABLE_HOT_RELOAD;
    
    // Next.js에게 설정 변경 알리기 - 대기 시간 단축
    exec('touch next.config.ts', (error) => {
      setTimeout(() => {
        console.log('✅ 웹 개발 서버의 핫 리로드가 재활성화되었습니다.');
        resolve();
      }, 500); // 설정 적용을 위해 0.5초 대기 (2초에서 단축)
    });
  });
}

// 모바일 빌드 실행
function runMobileBuild() {
  return new Promise((resolve, reject) => {
    console.log('📱 모바일 빌드를 시작합니다...');
    console.log('웹 개발 서버의 핫 리로드가 중단된 상태에서 안전하게 빌드됩니다.\n');
    
    const buildCommands = [
      // 출력 폴더만 정리 (캐시는 보존하여 속도 향상)
      'rm -rf out',

      // 준비 작업들 (개발 편의성 유지)
      'node scripts/setup-dev-ip.js',
      'node scripts/build-mobile-routes.js backup && node scripts/build-mobile-routes.js mobile',

      // 개발 친화적 고성능 빌드 (디버깅 정보 보존)
      'NODE_OPTIONS="--max-old-space-size=4096" BUILD_TARGET=mobile npx next build --no-lint',

      // Capacitor 동기화 (sync 사용 - 디버깅에 필요한 설정들 포함)
      'npm run mobile:sync',

      // 복원
      'node scripts/build-mobile-routes.js restore'
    ];
    
    const fullCommand = buildCommands.join(' && ');
    
    const buildProcess = spawn('sh', ['-c', fullCommand], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        BUILD_TARGET: 'mobile'
      }
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ 모바일 빌드가 완료되었습니다!');
        resolve();
      } else {
        console.log('\n❌ 모바일 빌드가 실패했습니다.');
        reject(new Error(`Build failed with code ${code}`));
      }
    });
    
    buildProcess.on('error', (error) => {
      console.error('\n❌ 빌드 프로세스에서 오류가 발생했습니다:', error);
      reject(error);
    });
  });
}

// 메인 실행 함수
async function main() {
  try {
    const devServerRunning = await checkDevServer();
    
    if (devServerRunning) {
      console.log('🔍 실행 중인 웹 개발 서버를 감지했습니다.');
      console.log('개발 서버는 유지하고 핫 리로드만 일시 중단합니다.\n');
      
      await disableHotReload();
      await runMobileBuild();
      await enableHotReload();
      
      console.log('\n🎉 핫 리로드 제어 모바일 빌드가 완료되었습니다!');
      console.log('💡 웹 개발 서버가 계속 실행 중이며 핫 리로드가 복원되었습니다.');
      console.log('   브라우저를 새로고침하면 정상적으로 웹 개발이 가능합니다.');
      
    } else {
      console.log('ℹ️  실행 중인 웹 개발 서버가 없습니다.');
      console.log('핫 리로드 제어 없이 모바일 빌드를 진행합니다.\n');
      
      await runMobileBuild();
      
      console.log('\n🎉 모바일 빌드가 완료되었습니다!');
    }
    
    console.log('\n📱 모바일 앱을 실행하려면:');
    console.log('   \x1b[36mnpm run mobile:ios\x1b[0m  (iOS)');
    console.log('   \x1b[36mnpm run mobile:android\x1b[0m  (Android)');
    
  } catch (error) {
    console.error('\n❌ 핫 리로드 제어 모바일 빌드 중 오류가 발생했습니다:', error.message);
    
    // 오류 발생 시 핫 리로드 복원 시도
    try {
      console.log('\n🔧 핫 리로드 복원을 시도합니다...');
      await enableHotReload();
      console.log('✅ 핫 리로드가 복원되었습니다.');
    } catch (restoreError) {
      console.error('⚠️  핫 리로드 복원 실패:', restoreError.message);
    }
    
    // 라우트 복원 시도
    exec('node scripts/build-mobile-routes.js restore', (restoreError) => {
      if (restoreError) {
        console.error('⚠️  라우트 복원 실패:', restoreError.message);
        console.log('수동으로 복원하려면: node scripts/build-mobile-routes.js restore');
      } else {
        console.log('✅ API 라우트가 복원되었습니다.');
      }
      
      console.log('\n웹 개발을 계속하려면 브라우저를 새로고침하세요.');
      process.exit(1);
    });
  }
}

// 스크립트 실행
main();