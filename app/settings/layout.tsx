/**
 * 설정 페이지 레이아웃
 * 메인 레이아웃에서 이미 Navigation을 렌더링하므로 여기서는 제거
 */

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {children}
    </div>
  );
}