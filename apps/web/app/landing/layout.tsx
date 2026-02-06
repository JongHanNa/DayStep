import { Metadata } from 'next';
import { generateStructuredData, createJsonLd, defaultSEO } from '@/lib/seo';

// 랜딩 페이지 전용 메타데이터
export const metadata: Metadata = {
  title: 'DayStep - ADHD 친화적 할일 관리',
  description:
    '실행과 집중에 최적화된 할일 관리 앱. 소중한 사람 챙기기, 복잡한 생각 정리까지. ADHD 성향이 있어도 복잡하지 않은 도구로 하루를 관리하세요.',
  keywords:
    'ADHD, 할일 관리, 생산성, 집중력, 실행 모드, 타이머, 일정 관리, 관계 관리, todo, productivity',
  authors: [{ name: 'DayStep Team' }],

  // Open Graph
  openGraph: {
    type: 'website',
    url: `${defaultSEO.siteUrl}/landing`,
    title: 'DayStep - ADHD 친화적 할일 관리',
    description:
      '실행과 집중에 최적화된 할일 관리 앱. 소중한 사람 챙기기, 복잡한 생각 정리까지.',
    siteName: 'DayStep',
    locale: 'ko_KR',
    images: [
      {
        url: `${defaultSEO.siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'DayStep - ADHD 친화적 할일 관리',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'DayStep - ADHD 친화적 할일 관리',
    description:
      '실행과 집중에 최적화된 할일 관리 앱. 소중한 사람 챙기기, 복잡한 생각 정리까지.',
    images: [`${defaultSEO.siteUrl}/og-image.png`],
  },

  // Canonical URL - 중복 콘텐츠 방지 (/ 대신 /landing 사용)
  alternates: {
    canonical: `${defaultSEO.siteUrl}/landing`,
  },

  // 인덱싱 허용
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

// JSON-LD 구조화 데이터 생성
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'DayStep',
  description:
    '실행과 집중에 최적화된 ADHD 친화적 할일 관리 앱. 소중한 사람 챙기기, 복잡한 생각 정리까지.',
  url: defaultSEO.siteUrl,
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'Web Browser, iOS, Android',
  browserRequirements: 'Requires JavaScript enabled',
  author: {
    '@type': 'Organization',
    name: 'DayStep Team',
    url: defaultSEO.siteUrl,
  },
  publisher: {
    '@type': 'Organization',
    name: 'DayStep Team',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
  },
  featureList: [
    '실행과 집중 - 타이머 기반 집중 모드',
    '소중한 사람 챙기기 - 관계 관리',
    '복잡한 생각 정리 - 메모 및 계획',
    '일정/통계 - 기록 및 성장 확인',
    '관계 기록 - 대화 및 감사 기록',
  ],
  inLanguage: 'ko-KR',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* JSON-LD 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLd(structuredData)}
      />
      {children}
    </>
  );
}
