#!/usr/bin/env node
// scripts/update-bundle-id.js - Xcode Bundle Identifier 수정 스크립트

const xcode = require('xcode');
const path = require('path');
const fs = require('fs');

/**
 * Xcode 프로젝트의 Bundle Identifier와 Display Name을 수정합니다.
 * @param {string} bundleId - 새로운 Bundle Identifier (예: "com.daystep.app.dev")
 * @param {string} displayName - 홈 화면에 표시될 앱 이름 (예: "DevDayStep")
 */
function updateBundleId(bundleId, displayName) {
  const projectPath = path.join(__dirname, '..', '..', 'mobile-capacitor', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

  // 파일 존재 확인
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Xcode 프로젝트 파일을 찾을 수 없습니다: ${projectPath}`);
  }

  console.log(`📝 Xcode 프로젝트 파일 읽는 중: ${projectPath}`);

  // Xcode 프로젝트 파싱
  const project = xcode.project(projectPath);
  project.parseSync();

  console.log(`🔧 Bundle ID 변경 중: ${bundleId}`);
  if (displayName) {
    console.log(`🔧 Display Name 변경 중: ${displayName}`);
  }

  // 모든 Build Configuration의 Bundle ID 및 Display Name 수정
  let updateCount = 0;
  let widgetCount = 0;
  Object.values(project.pbxXCBuildConfigurationSection())
    .filter(item => typeof item === 'object' && item.buildSettings)
    .forEach(item => {
      if (item.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) {
        const productName = item.buildSettings.PRODUCT_NAME;
        const isWidget = productName && productName.replace(/['"]/g, '').includes('Widget');

        // Bundle ID 설정
        if (isWidget) {
          // Widget Extension은 접미사 추가
          item.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}.DayStepWidgetExtension"`;
          widgetCount++;
        } else {
          // App Target은 기본 Bundle ID
          item.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}"`;
        }

        // Display Name 설정 (displayName 파라미터가 제공된 경우)
        if (displayName) {
          if (isWidget) {
            // Widget Extension은 고정 이름
            item.buildSettings.INFOPLIST_KEY_CFBundleDisplayName = '"DayStepWidget"';
          } else {
            // App Target은 파라미터로 받은 displayName 사용
            item.buildSettings.INFOPLIST_KEY_CFBundleDisplayName = `"${displayName}"`;
          }
        }

        updateCount++;
      }
    });

  // 파일 저장
  fs.writeFileSync(projectPath, project.writeSync());

  console.log(`✅ Bundle ID 업데이트 완료 (${updateCount}개 Configuration 수정)`);
  console.log(`   → App Bundle ID: ${bundleId}`);
  if (displayName) {
    console.log(`   → App Display Name: ${displayName}`);
  }
  if (widgetCount > 0) {
    console.log(`   → Widget Bundle ID: ${bundleId}.DayStepWidgetExtension (${widgetCount}개 Configuration)`);
  }

  // Info.plist에 CFBundleDisplayName 직접 추가 (displayName이 제공된 경우)
  if (displayName) {
    try {
      const plist = require('plist');
      const infoPlistPath = path.join(__dirname, '..', '..', 'mobile-capacitor', 'ios', 'App', 'App', 'Info.plist');

      // Info.plist 파일 읽기
      const infoPlistContent = fs.readFileSync(infoPlistPath, 'utf8');
      const infoPlist = plist.parse(infoPlistContent);

      // CFBundleDisplayName 추가/수정
      infoPlist.CFBundleDisplayName = displayName;

      // Info.plist 파일 저장
      fs.writeFileSync(infoPlistPath, plist.build(infoPlist));

      console.log(`✅ Info.plist 업데이트 완료`);
      console.log(`   → Info.plist CFBundleDisplayName: ${displayName}`);
    } catch (error) {
      console.error(`⚠️  Info.plist 업데이트 실패:`, error.message);
      console.error(`   Build Settings의 INFOPLIST_KEY_CFBundleDisplayName은 설정되었습니다.`);
    }
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  const bundleId = process.argv[2];
  const displayName = process.argv[3];

  if (!bundleId) {
    console.error('❌ 사용법: node update-bundle-id.js <bundle-id> [display-name]');
    console.error('   예시: node update-bundle-id.js com.daystep.app.dev DevDayStep');
    process.exit(1);
  }

  try {
    updateBundleId(bundleId, displayName);
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

module.exports = { updateBundleId };
