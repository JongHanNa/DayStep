import { Metadata } from "next";

// 기본 SEO 설정
export const defaultSEO = {
  title: "DayStep - 나만의 할일 관리",
  description:
    "할일을 관리하는 개인 생산성 앱. 할일 목록과 템플릿 보관함을 한 곳에서 체계적으로 관리하세요.",
  keywords:
    "할일 관리, 생산성, 목표 관리, 템플릿, 보관함, todo, productivity",
  author: "DayStep Team",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://daystep.vercel.app",
  locale: "ko_KR",
};

// 페이지별 SEO 설정 생성
export function generateSEO({
  title,
  description,
  path = "",
  image,
  noIndex = false,
  keywords,
}: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string;
}): Metadata {
  const seo = {
    title: title ? `${title} - DayStep` : defaultSEO.title,
    description: description || defaultSEO.description,
    keywords: keywords || defaultSEO.keywords,
  };

  const url = `${defaultSEO.siteUrl}${path}`;
  const imageUrl = image || `${defaultSEO.siteUrl}/og-image.png`;

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    authors: [{ name: defaultSEO.author }],
    creator: defaultSEO.author,
    publisher: defaultSEO.author,

    // Open Graph
    openGraph: {
      type: "website",
      url,
      title: seo.title,
      description: seo.description,
      siteName: "DayStep",
      locale: defaultSEO.locale,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ],
    },

    // Twitter Card
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [imageUrl],
      creator: "@daystep_app",
    },

    // 추가 메타 태그
    other: {
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
      "apple-mobile-web-app-title": "DayStep",
      "application-name": "DayStep",
      "mobile-web-app-capable": "yes",
      "msapplication-TileColor": "#2563eb",
      "theme-color": "#ffffff",
    },

    // 인덱싱 제어
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },

    // 정규 URL
    alternates: {
      canonical: url,
    },

    // 뷰포트 설정은 app/viewport.ts에서 전역으로 관리됨
  };
}

// 구조화 데이터 생성
export function generateStructuredData(
  type: "website" | "webapp" | "article",
  data: any = {}
) {
  const baseStructuredData = {
    "@context": "https://schema.org",
    "@type":
      type === "website"
        ? "WebSite"
        : type === "webapp"
          ? "WebApplication"
          : "Article",
    name: defaultSEO.title,
    description: defaultSEO.description,
    url: defaultSEO.siteUrl,
    author: {
      "@type": "Organization",
      name: defaultSEO.author,
    },
    publisher: {
      "@type": "Organization",
      name: defaultSEO.author,
    },
    inLanguage: "ko-KR",
  };

  if (type === "website") {
    return {
      ...baseStructuredData,
      potentialAction: {
        "@type": "SearchAction",
        target: `${defaultSEO.siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };
  }

  if (type === "webapp") {
    return {
      ...baseStructuredData,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web Browser",
      browserRequirements: "Requires JavaScript enabled",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
      },
      featureList: [
        "할일 목록",
        "템플릿 보관함",
        "실시간 동기화",
        "다크모드 지원",
      ],
    };
  }

  if (type === "article") {
    return {
      ...baseStructuredData,
      headline: data.title || defaultSEO.title,
      datePublished: data.publishedAt || new Date().toISOString(),
      dateModified: data.modifiedAt || new Date().toISOString(),
      wordCount: data.wordCount || 0,
    };
  }

  return baseStructuredData;
}

// JSON-LD 스크립트 태그 생성
export function createJsonLd(structuredData: any) {
  return {
    __html: JSON.stringify(structuredData),
  };
}

// 페이지별 구조화 데이터
export const pageStructuredData = {
  home: generateStructuredData("website"),
  todos: generateStructuredData("webapp", {
    name: "할일 관리 - DayStep",
    description: "체계적으로 할일을 관리하고 생산성을 높여보세요.",
  }),
  repository: generateStructuredData("webapp", {
    name: "보관함 - DayStep",
    description: "재사용 가능한 템플릿과 중요한 내용을 보관하고 관리하세요.",
  }),
};

// robots.txt 생성
export const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${defaultSEO.siteUrl}/sitemap.xml

# 크롤링 속도 제한
Crawl-delay: 1

# 제외할 경로
Disallow: /api/
Disallow: /auth/
Disallow: /_next/
Disallow: /admin/
`;

// sitemap.xml 데이터
export const sitemapData = [
  {
    url: defaultSEO.siteUrl,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 1,
  },
  {
    url: `${defaultSEO.siteUrl}/todos`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  },
  {
    url: `${defaultSEO.siteUrl}/repository`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  },
  {
    url: `${defaultSEO.siteUrl}/login`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.4,
  },
];
