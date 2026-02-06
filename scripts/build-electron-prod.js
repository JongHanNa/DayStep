#!/usr/bin/env node
// scripts/build-electron-prod.js - 프로덕션 Electron 빌드 + 패키징 스크립트

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

async function buildElectronProd() {
  console.log('🖥️  Electron 프로덕션 빌드 시작...\n');

  try {
    // 1. Next.js 빌드 (프로덕션 환경변수 사용 - .env.production)
    console.log('🏗️  Next.js 빌드 실행 중 (BUILD_TARGET=electron, production)...\n');
    execSync('npx next build', {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        BUILD_TARGET: 'electron',
      },
    });

    console.log('\n✅ Next.js 빌드 완료!');

    // 2. Electron TypeScript 컴파일
    console.log('\n🔨 Electron TypeScript 컴파일 중...\n');
    execSync('npx tsc -p electron/tsconfig.json', {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
    });

    console.log('✅ Electron 컴파일 완료!');

    // 3. electron-builder 패키징
    console.log('\n📦 Electron 패키징 중...\n');

    const args = process.argv.slice(2);
    let builderArgs = '';

    if (args.includes('--mac')) {
      builderArgs = '--mac';
    } else if (args.includes('--win')) {
      builderArgs = '--win';
    } else {
      // 기본: 현재 플랫폼
      builderArgs = process.platform === 'darwin' ? '--mac' : '--win';
    }

    execSync(`npx electron-builder ${builderArgs}`, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
    });

    console.log('\n✅ Electron 패키징 완료!');
    console.log('📁 출력 디렉토리: dist-electron/');
  } catch (error) {
    console.error('\n❌ 프로덕션 빌드 실패:', error.message);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  buildElectronProd().catch(() => {
    process.exit(1);
  });
}

module.exports = { buildElectronProd };
