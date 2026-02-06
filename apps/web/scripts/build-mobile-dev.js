#!/usr/bin/env node
// scripts/build-mobile-dev.js - 개발 DB를 사용하는 모바일 빌드 스크립트

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_PRODUCTION_LOCAL = path.join(__dirname, '..', '.env.production.local');
const ENV_DEVELOPMENT = path.join(__dirname, '..', '.env.development');

async function buildMobileDev() {
  console.log('🔧 개발 DB 모바일 빌드 시작...\n');

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

    // 4. Next.js 빌드 실행
    console.log('🏗️  Next.js 빌드 실행 중...\n');
    const buildEnv = {
      ...process.env,
      NODE_ENV: 'production',
      BUILD_TARGET: 'mobile',
      CAPACITOR_ENV: 'development',
      NEXT_PUBLIC_CAPACITOR_ENV: 'development'
    };

    execSync('npx next build', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: buildEnv
    });

    console.log('\n✅ 빌드 완료!');

    // 5. Capacitor sync 실행 (환경 변수 유지)
    console.log('\n📱 Capacitor sync 실행 중...\n');
    execSync('npx cap sync', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', '..', 'mobile-capacitor'),
      env: buildEnv
    });

    console.log('\n✅ Capacitor sync 완료!');

    // 6. Bundle Identifier 및 Display Name 변경 (개발용)
    console.log('\n📝 Bundle Identifier 및 Display Name 업데이트 중...\n');
    const { updateBundleId } = require('./update-bundle-id.js');
    updateBundleId('com.daystep.app.dev', 'DevDayStep');

  } catch (error) {
    console.error('\n❌ 빌드 실패:', error.message);
    throw error;

  } finally {
    // 6. Cleanup: .env.production.local 삭제 (빌드 성공/실패 무관)
    if (fs.existsSync(ENV_PRODUCTION_LOCAL)) {
      console.log('\n🧹 임시 환경 파일 정리 중...');
      fs.unlinkSync(ENV_PRODUCTION_LOCAL);
      console.log('✅ Cleanup 완료');
    }
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  buildMobileDev().catch((error) => {
    process.exit(1);
  });
}

module.exports = { buildMobileDev };
