#!/usr/bin/env node
// scripts/build-mobile-prod.js - 프로덕션 DB를 사용하는 모바일 빌드 스크립트

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_PRODUCTION_LOCAL = path.join(__dirname, '..', '.env.production.local');

async function buildMobileProd() {
  console.log('🚀 프로덕션 DB 모바일 빌드 시작...\n');

  try {
    // 1. 안전장치: .env.production.local이 존재하면 삭제
    if (fs.existsSync(ENV_PRODUCTION_LOCAL)) {
      console.log('⚠️  .env.production.local 파일 발견 - 삭제 중...');
      fs.unlinkSync(ENV_PRODUCTION_LOCAL);
      console.log('✅ 삭제 완료 - .env.production 사용\n');
    } else {
      console.log('✅ .env.production 사용 확인\n');
    }

    // 2. Next.js 빌드 실행
    console.log('🏗️  Next.js 빌드 실행 중...\n');
    const buildEnv = {
      ...process.env,
      NODE_ENV: 'production',
      BUILD_TARGET: 'mobile',
      CAPACITOR_ENV: 'production'
    };

    execSync('npx next build', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: buildEnv
    });

    console.log('\n✅ 프로덕션 빌드 완료!');

    // 3. Capacitor sync 실행 (환경 변수 유지)
    console.log('\n📱 Capacitor sync 실행 중...\n');
    execSync('npx cap sync', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', 'mobile'),
      env: buildEnv
    });

    console.log('\n✅ Capacitor sync 완료!');

    // 4. Bundle Identifier 변경 (프로덕션용)
    console.log('\n📝 Bundle Identifier 업데이트 중...\n');
    const { updateBundleId } = require('./update-bundle-id.js');
    updateBundleId('com.daystep.app');

  } catch (error) {
    console.error('\n❌ 빌드 실패:', error.message);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  buildMobileProd().catch((error) => {
    process.exit(1);
  });
}

module.exports = { buildMobileProd };
