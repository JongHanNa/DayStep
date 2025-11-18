#!/usr/bin/env node
// scripts/update-bundle-id.js - Xcode Bundle Identifier 수정 스크립트

const xcode = require('xcode');
const path = require('path');
const fs = require('fs');

/**
 * Xcode 프로젝트의 Bundle Identifier를 수정합니다.
 * @param {string} bundleId - 새로운 Bundle Identifier (예: "com.daystep.app.dev")
 */
function updateBundleId(bundleId) {
  const projectPath = path.join(__dirname, '..', 'mobile', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

  // 파일 존재 확인
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Xcode 프로젝트 파일을 찾을 수 없습니다: ${projectPath}`);
  }

  console.log(`📝 Xcode 프로젝트 파일 읽는 중: ${projectPath}`);

  // Xcode 프로젝트 파싱
  const project = xcode.project(projectPath);
  project.parseSync();

  console.log(`🔧 Bundle ID 변경 중: ${bundleId}`);

  // 모든 Build Configuration의 Bundle ID 수정
  let updateCount = 0;
  Object.values(project.pbxXCBuildConfigurationSection())
    .filter(item => typeof item === 'object' && item.buildSettings)
    .forEach(item => {
      if (item.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) {
        item.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}"`;
        updateCount++;
      }
    });

  // 파일 저장
  fs.writeFileSync(projectPath, project.writeSync());

  console.log(`✅ Bundle ID 업데이트 완료 (${updateCount}개 Configuration 수정)`);
  console.log(`   → Bundle ID: ${bundleId}`);
}

// 스크립트 직접 실행 시
if (require.main === module) {
  const bundleId = process.argv[2];

  if (!bundleId) {
    console.error('❌ 사용법: node update-bundle-id.js <bundle-id>');
    console.error('   예시: node update-bundle-id.js com.daystep.app.dev');
    process.exit(1);
  }

  try {
    updateBundleId(bundleId);
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

module.exports = { updateBundleId };
