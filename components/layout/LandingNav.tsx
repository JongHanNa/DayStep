'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Menu, X } from 'lucide-react';

export default function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: '기능 소개', href: '/#features' },
    { label: '시스템 소개', href: '/#system' },
    { label: 'FAQ', href: '/#faq' },
  ];

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/second-brain/areas');
    } else {
      router.push('/login');
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/10 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-white">DayStep</span>
          </Link>

          {/* 데스크톱 메뉴 */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/90 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* 데스크톱 버튼 */}
          <div className="hidden md:flex items-center space-x-4">
            {!loading && (
              <>
                {!isAuthenticated ? (
                  <>
                    <Link
                      href="/login"
                      className="text-white/90 hover:text-white transition-colors"
                    >
                      로그인
                    </Link>
                    <button
                      onClick={handleGetStarted}
                      className="btn btn-primary btn-sm rounded-full"
                    >
                      시작하기
                    </button>
                  </>
                ) : (
                  <Link href="/second-brain/areas" className="btn btn-primary btn-sm rounded-full">
                    대시보드
                  </Link>
                )}
              </>
            )}
          </div>

          {/* 모바일 햄버거 버튼 */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/10 backdrop-blur-md border-t border-white/20">
          <div className="px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-white/90 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!loading && (
              <div className="pt-4 border-t border-white/20 space-y-2">
                {!isAuthenticated ? (
                  <>
                    <Link
                      href="/login"
                      className="block w-full btn btn-ghost text-white/90 hover:text-white"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      로그인
                    </Link>
                    <button
                      onClick={() => {
                        handleGetStarted();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full btn btn-primary"
                    >
                      시작하기
                    </button>
                  </>
                ) : (
                  <Link
                    href="/second-brain/areas"
                    className="block w-full btn btn-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    대시보드
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
