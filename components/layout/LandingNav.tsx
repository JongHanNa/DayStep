'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Menu, X } from 'lucide-react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export default function LandingNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // 페이지 배경색과 동일한 색상 계산
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // 스크롤 방향 감지
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 스크롤이 최상단에 있으면 항상 표시
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY < lastScrollY) {
        // 위로 스크롤 시 표시
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // 아래로 스크롤 시 숨김 (100px 이상일 때만)
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const colors = [
    { r: 147, g: 197, b: 253 }, // #93C5FD - 소프트 블루
    { r: 20, g: 184, b: 166 },  // #14B8A6 - 틸/청록
    { r: 59, g: 130, b: 246 },  // #3B82F6 - 딥 블루
    { r: 148, g: 163, b: 184 }  // #94A3B8 - 라이트 슬레이트
  ];

  const r = useTransform(smoothProgress, [0, 0.33, 0.66, 1],
    [colors[0].r, colors[1].r, colors[2].r, colors[3].r]);
  const g = useTransform(smoothProgress, [0, 0.33, 0.66, 1],
    [colors[0].g, colors[1].g, colors[2].g, colors[3].g]);
  const b = useTransform(smoothProgress, [0, 0.33, 0.66, 1],
    [colors[0].b, colors[1].b, colors[2].b, colors[3].b]);

  const backgroundColor = useTransform(
    [r, g, b],
    ([rValue, gValue, bValue]: number[]) => {
      return `rgb(${Math.round(rValue)}, ${Math.round(gValue)}, ${Math.round(bValue)})`;
    }
  );

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
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 transition-transform duration-300"
      style={{ backgroundColor }}
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : '-100%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
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
                    무료로 시작하기
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
        <motion.div
          className="md:hidden"
          style={{ backgroundColor }}
        >
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
              <div className="pt-4 space-y-2">
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
                    무료로 시작하기
                  </Link>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
