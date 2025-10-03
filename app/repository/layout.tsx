import type { Metadata } from 'next';
import { generateSEO, createJsonLd, pageStructuredData } from '@/lib/seo';

export const metadata: Metadata = generateSEO({
  title: '보관함',
  description: '재사용 가능한 템플릿과 중요한 내용을 보관하고 관리하세요.',
  path: '/repository',
});

export default function RepositoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={createJsonLd(pageStructuredData.repository)}
      />
      {children}
    </>
  );
}