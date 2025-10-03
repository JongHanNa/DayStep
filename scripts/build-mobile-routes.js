#!/usr/bin/env node

/**
 * 모바일 빌드 시 API 라우트를 정적 빈 라우트로 교체
 * Next.js 15에서 조건부 export 설정이 허용되지 않는 문제 해결
 */

const fs = require('fs');
const path = require('path');

const API_ROUTES = [
  'app/api/analytics/performance/route.ts',
  'app/api/auth/callback/route.ts', 
  'app/auth/callback/route.ts',
  'app/api/sse/route.ts'
];

const MOBILE_ROUTE_TEMPLATE = `import { NextRequest, NextResponse } from 'next/server';

// 모바일 빌드용 빈 API 라우트
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  return NextResponse.json({ error: 'Not available in mobile build' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: 'Not available in mobile build' }, { status: 404 });
}
`;

function createBackups() {
  console.log('📁 API 라우트 백업 생성 중...');
  
  API_ROUTES.forEach(routePath => {
    const backupPath = `${routePath}.backup`;
    if (fs.existsSync(routePath) && !fs.existsSync(backupPath)) {
      fs.copyFileSync(routePath, backupPath);
      console.log(`✅ ${routePath} -> ${backupPath}`);
    }
  });
}

function replaceMobileRoutes() {
  console.log('🔄 모바일용 API 라우트로 교체 중...');
  
  API_ROUTES.forEach(routePath => {
    if (fs.existsSync(routePath)) {
      fs.writeFileSync(routePath, MOBILE_ROUTE_TEMPLATE);
      console.log(`✅ ${routePath} -> 모바일용으로 교체`);
    }
  });
}

function restoreRoutes() {
  console.log('🔄 원본 API 라우트 복원 중...');
  
  API_ROUTES.forEach(routePath => {
    const backupPath = `${routePath}.backup`;
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, routePath);
      fs.unlinkSync(backupPath);
      console.log(`✅ ${backupPath} -> ${routePath}`);
    }
  });
}

const command = process.argv[2];

switch (command) {
  case 'backup':
    createBackups();
    break;
  case 'mobile':
    replaceMobileRoutes();
    break;
  case 'restore':
    restoreRoutes();
    break;
  default:
    console.log('사용법: node scripts/build-mobile-routes.js [backup|mobile|restore]');
    process.exit(1);
}