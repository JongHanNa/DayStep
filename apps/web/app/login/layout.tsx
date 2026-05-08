import type { Metadata } from "next";
import { generateSEO } from "@/lib/seo";

export const metadata: Metadata = generateSEO({
  title: "로그인",
  description: "일상투두에 로그인하여 나만의 다짐과 할일을 관리하세요.",
  path: "/login",
  noIndex: true, // 로그인 페이지는 검색 엔진에서 제외
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
