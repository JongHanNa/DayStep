#!/usr/bin/env node
// scripts/build-electron-dev.js - 개발 DB를 사용하는 Electron 빌드 스크립트

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_PRODUCTION_LOCAL = path.join(__dirname, '..', '.env.production.local');
const ENV_DEVELOPMENT = path.join(__dirname, '..', '.env.development');
const PROJECT_ROOT = path.join(__dirname, '..');
const API_DIR = path.join(PROJECT_ROOT, 'app', 'api');
const API_DIR_DISABLED = path.join(PROJECT_ROOT, 'app', '_api');
const AUTH_CALLBACK_DIR = path.join(PROJECT_ROOT, 'app', 'auth', 'callback');
const AUTH_CALLBACK_DIR_DISABLED = path.join(PROJECT_ROOT, 'app', 'auth', '_callback');

async function buildElectronDev() {
  console.log('🖥️  Electron 개발 빌드 시작...\n');

  try {
    // 1. .env.development 파일 존재 확인
    if (!fs.existsSync(ENV_DEVELOPMENT)) {
      throw new Error('.env.development 파일이 존재하지 않습니다.');
    }

    // 2. .env.development 내용 읽기
    console.log('📖 .env.development 읽는 중...');
    const devEnvContent = fs.readFileSync(ENV_DEVELOPMENT, 'utf-8');

    // 3. .env.production.local 임시 생성 (개발 DB 설정)
    console.log('📝 .env.production.local 생성 중...');
    fs.writeFileSync(ENV_PRODUCTION_LOCAL, devEnvContent);
    console.log('✅ 개발 DB 설정으로 임시 환경 파일 생성 완료\n');

    // 4. 서버 전용 라우트 임시 비활성화 (Electron 정적 빌드와 충돌 방지)
    if (fs.existsSync(API_DIR)) {
      console.log('📁 API 라우트 임시 비활성화 (app/api/ → app/_api/)...');
      fs.renameSync(API_DIR, API_DIR_DISABLED);
    }
    if (fs.existsSync(AUTH_CALLBACK_DIR)) {
      console.log('📁 OAuth 콜백 라우트 임시 비활성화 (app/auth/callback/ → app/auth/_callback/)...');
      fs.renameSync(AUTH_CALLBACK_DIR, AUTH_CALLBACK_DIR_DISABLED);
    }

    // 5. Next.js 빌드 실행 (BUILD_TARGET=electron)
    console.log('🏗️  Next.js 빌드 실행 중 (BUILD_TARGET=electron)...\n');
    const buildEnv = {
      ...process.env,
      NODE_ENV: 'production',
      BUILD_TARGET: 'electron',
    };

    execSync('npx next build', {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      env: buildEnv,
    });

    console.log('\n✅ Next.js 빌드 완료!');

    // 6. Electron TypeScript 컴파일
    console.log('\n🔨 Electron TypeScript 컴파일 중...\n');
    execSync('npx tsc -p ../desktop/tsconfig.json', {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
    });

    console.log('✅ Electron 컴파일 완료!');

    // 7. Electron 앱 실행
    console.log('\n🚀 Electron 앱 실행 중...\n');
    const electronProcess = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        // .env.development 환경변수 주입
        ...parseEnvFile(devEnvContent),
      },
    });

    electronProcess.on('close', (code) => {
      console.log(`\nElectron 앱 종료 (코드: ${code})`);
    });
  } catch (error) {
    console.error('\n❌ 빌드 실패:', error.message);
    throw error;
  } finally {
    // 8. Cleanup: 서버 전용 라우트 복원
    if (fs.existsSync(API_DIR_DISABLED)) {
      console.log('\n🧹 API 라우트 복원 (app/_api/ → app/api/)...');
      fs.renameSync(API_DIR_DISABLED, API_DIR);
    }
    if (fs.existsSync(AUTH_CALLBACK_DIR_DISABLED)) {
      console.log('🧹 OAuth 콜백 라우트 복원 (app/auth/_callback/ → app/auth/callback/)...');
      fs.renameSync(AUTH_CALLBACK_DIR_DISABLED, AUTH_CALLBACK_DIR);
    }

    // 9. Cleanup: .env.production.local 삭제
    if (fs.existsSync(ENV_PRODUCTION_LOCAL)) {
      console.log('🧹 임시 환경 파일 정리 중...');
      fs.unlinkSync(ENV_PRODUCTION_LOCAL);
      console.log('✅ Cleanup 완료');
    }
  }
}

/**
 * .env 파일 내용을 파싱하여 객체로 변환
 */
function parseEnvFile(content) {
  const env = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();
    // 따옴표 제거
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// 스크립트 직접 실행 시
if (require.main === module) {
  buildElectronDev().catch(() => {
    process.exit(1);
  });
}

module.exports = { buildElectronDev };
