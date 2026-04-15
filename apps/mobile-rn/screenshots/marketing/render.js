#!/usr/bin/env node

/**
 * DayStep App Store 마케팅 스크린샷 렌더러
 *
 * 사용법: node render.js [--source <path>]
 *
 * 1. templates/slide-data.json 에서 슬라이드 정보 로드
 * 2. 원본 스크린샷을 base64로 변환
 * 3. base-template.html을 Playwright로 렌더링
 * 4. 1284x2778px PNG로 출력
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const MARKETING_DIR = __dirname;
const TEMPLATE_PATH = path.join(MARKETING_DIR, 'templates', 'base-template.html');
const SLIDES_PATH = path.join(MARKETING_DIR, 'templates', 'slide-data.json');
const OUTPUT_DIR = path.join(MARKETING_DIR, 'output');

// App Store 요구사항: iPhone 6.7" display
const WIDTH = 1284;
const HEIGHT = 2778;

// 원본 스크린샷 검색 경로 (우선순위 순)
function getScreenshotDirs() {
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf('--source');
  if (sourceIdx !== -1 && args[sourceIdx + 1]) {
    return [path.resolve(args[sourceIdx + 1])];
  }

  return [
    path.join(MARKETING_DIR, '..', 'screenshots'),           // screenshots/screenshots/
    path.join(MARKETING_DIR, '..', '..', 'fastlane', 'screenshots', 'ko'), // fastlane/screenshots/ko/
    path.join(MARKETING_DIR, '..', '..', 'fastlane', 'screenshots'),       // fastlane/screenshots/
  ];
}

// 여러 패턴과 경로에서 스크린샷 찾기
function findScreenshot(patterns, dirs) {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const pattern of patterns) {
      const fullPath = path.join(dir, pattern);
      if (fs.existsSync(fullPath)) return fullPath;
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const slides = JSON.parse(fs.readFileSync(SLIDES_PATH, 'utf-8'));
  const templateUrl = `file://${TEMPLATE_PATH}`;
  const screenshotDirs = getScreenshotDirs();

  console.log(`\n🎨 DayStep App Store 스크린샷 렌더링 시작`);
  console.log(`   템플릿: ${TEMPLATE_PATH}`);
  console.log(`   검색 경로: ${screenshotDirs.join(', ')}`);
  console.log(`   출력: ${OUTPUT_DIR}`);
  console.log(`   해상도: ${WIDTH}x${HEIGHT}px`);
  console.log(`   슬라이드: ${slides.length}장\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });

  let rendered = 0;

  for (const slide of slides) {
    const screenshotPath = findScreenshot(slide.screenshotPatterns, screenshotDirs);

    if (!screenshotPath) {
      console.log(`⚠️  [${slide.id}] 원본 없음: ${slide.screenshotPatterns.join(', ')} — 건너뜀`);
      continue;
    }

    const screenshotBase64 = fs.readFileSync(screenshotPath).toString('base64');
    const screenshotDataUri = `data:image/png;base64,${screenshotBase64}`;

    const params = new URLSearchParams({
      title: slide.title,
      subtitle: slide.subtitle,
      bgStart: slide.bgStart,
      bgEnd: slide.bgEnd,
      glow: slide.glow,
      glowPosition: slide.glowPosition || 'top-right',
      screenshot: '', // placeholder — injected via evaluate
      rotateY: slide.rotateY || '0',
      rotateX: slide.rotateX || '1',
    });

    const page = await context.newPage();
    await page.goto(`${templateUrl}?${params.toString()}`, {
      waitUntil: 'load',
    });

    // base64 데이터는 URL 크기 제한을 초과할 수 있으므로 evaluate로 주입
    await page.evaluate((dataUri) => {
      const img = document.getElementById('screenshot');
      if (img) img.src = dataUri;
    }, screenshotDataUri);

    await page.waitForTimeout(800);

    const outputPath = path.join(OUTPUT_DIR, `appstore_${slide.id}.png`);
    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });

    const fileSizeKB = Math.round(fs.statSync(outputPath).size / 1024);
    console.log(`✅ [${slide.id}] ${path.basename(screenshotPath)} → appstore_${slide.id}.png (${fileSizeKB}KB)`);
    await page.close();
    rendered++;
  }

  await browser.close();
  console.log(`\n🎉 완료! ${rendered}/${slides.length}장 렌더링됨 → ${OUTPUT_DIR}\n`);
}

main().catch((err) => {
  console.error('❌ 렌더링 실패:', err);
  process.exit(1);
});
