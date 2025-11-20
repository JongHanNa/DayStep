'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  Target,
  Brain,
  Sparkles,
  ArrowRight,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerFadeInUpVariants, scaleFadeInVariants, getViewportOptions, getBidirectionalViewportOptions, rotatingTextVariants } from '@/lib/animations/scrollAnimations';
import dynamic from 'next/dynamic';
import LandingNav from '@/components/layout/LandingNav';
import StatsSection from '@/components/landing/StatsSection';
import SystemSection from '@/components/landing/SystemSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import FAQSection from '@/components/landing/FAQSection';
import ScrollColorTransition from '@/components/landing/ScrollColorTransition';
import { useToast } from '@/hooks/use-toast';
import { getLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';
import { useNavigationStore } from '@/state/stores/navigationStore';

// Hydration 오류 방지를 위해 ScrollProgressSection을 클라이언트 전용 렌더링
const ScrollProgressSection = dynamic(
  () => import('@/components/landing/ScrollProgressSection'),
  { ssr: false }
);

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // 🔑 하이드레이션 안전한 Capacitor 감지 (서버/클라이언트 초기 렌더링 동일)
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasRedirectedRef = useRef(false);

  // 회전하는 기능 텍스트 상태
  const features = ['타임라인 뷰', 'Second Brain', '목표 관리', '할일 관리', 'AI 추천'];
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

  // Framer Motion variants
  const featureContainerVariants = staggerFadeInUpVariants(60, 0.15);
  const ctaVariants = scaleFadeInVariants(0.9);
  const viewportOptions = getViewportOptions(true, 0.3);
  const bidirectionalViewportOptions = getBidirectionalViewportOptions(0.3);

  // 3초마다 기능 텍스트 회전
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [features.length]);

  // 🚀 1단계: 하이드레이션 완료 후 Capacitor 환경 감지
  useEffect(() => {
    const checkCapacitor = typeof window !== 'undefined' &&
                          window.location.protocol === 'capacitor:';
    setIsCapacitor(checkCapacitor);

    if (checkCapacitor) {
      console.log('📱 Capacitor 환경 감지: capacitor:');
    }
  }, []); // 빈 배열로 한 번만 실행

  // 🔄 웹 환경에서만 인증 체크 및 리다이렉트
  useEffect(() => {
    // Capacitor 환경은 아래 useEffect에서 처리
    if (isCapacitor) return;

    // 웹 환경: 로딩 완료 후 인증 상태에 따라 리다이렉트
    if (!loading) {
      if (isAuthenticated) {
        console.log('✅ [웹] 인증됨 - Areas 페이지로 이동');
        router.replace('/second-brain/areas');
      }
      // 비인증 상태는 랜딩 페이지 그대로 표시
    }
  }, [isAuthenticated, loading, router, isCapacitor]);

  // "데스크톱에서 시작하기" 버튼 클릭 핸들러
  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/second-brain/areas');
    } else {
      router.push('/login');
    }
  };

  // "모바일 앱 다운로드" 버튼 클릭 핸들러
  const handleMobileDownload = () => {
    // TODO: 앱 다운로드 페이지 또는 모달 구현
    alert('모바일 앱은 곧 출시 예정입니다!\n\niOS와 Android에서 만나보세요.');
  };

  // 🚀 2단계: Capacitor 환경에서 마지막 방문 페이지로 리다이렉트
  useEffect(() => {
    // Capacitor 환경이 아니거나, 이미 리다이렉트 했거나, 아직 로딩 중이면 종료
    if (!isCapacitor || hasRedirectedRef.current || loading) return;

    // 리다이렉트 플래그 설정 (단 한 번만 실행 보장)
    hasRedirectedRef.current = true;
    setIsRedirecting(true);

    console.log('📱 Capacitor 환경 - 리다이렉트 시작');

    // 마지막 방문 페이지 복원 시도 (WebView 크래시 후에도 빠른 복구)
    getLastVisitedRoute()
      .then((lastRoute) => {
        const targetRoute = lastRoute && lastRoute !== '/'
          ? lastRoute
          : '/second-brain/areas';

        console.log(`📍 [Capacitor] 페이지로 이동: ${targetRoute}`);
        router.replace(targetRoute);
      })
      .catch((error) => {
        console.error('❌ [Capacitor] 마지막 방문 페이지 복원 실패:', error);
        // Fallback: Areas 페이지로 이동
        router.replace('/second-brain/areas');
      });
  }, [isCapacitor, loading, router]);

  // 🎯 로딩 화면 표시 (하이드레이션 안전: 서버/클라이언트 동일 조건)
  // - loading: 인증 상태 확인 중 (웹/모바일 공통)
  // - isCapacitor && isRedirecting: Capacitor 환경에서 리다이렉트 진행 중
  if (loading || (isCapacitor && isRedirecting)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary mx-auto mb-6"></div>
          <p className="text-lg text-base-content/70 font-medium">
            {isCapacitor ? '페이지 복원 중...' : '로딩 중...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen show-scrollbar">
      {/* 스크롤 기반 배경색 전환 */}
      <ScrollColorTransition />

      {/* 상단 네비게이션 */}
      <LandingNav />

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center px-4 py-20 pt-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo/Title */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="text-6xl sm:text-7xl font-semibold text-white flex flex-col items-center">
              <span className="mb-2">하루를 체계적으로 관리하는</span>
              <div className="relative min-h-[6rem] sm:min-h-[7.5rem] w-full flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentFeatureIndex}
                    variants={rotatingTextVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="text-white text-6xl sm:text-7xl"
                  >
                    {features[currentFeatureIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Description */}
          <motion.p
            className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            타임라인으로 하루를 시각화하고, Second Brain으로 생각을 정리하며,
            목표를 향해 한 걸음씩 나아가세요.
          </motion.p>

          {/* Dual CTA Buttons */}
          <motion.div
            className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <button
              onClick={handleGetStarted}
              className="btn btn-primary btn-lg gap-2 px-8 w-full sm:w-auto rounded-full"
            >
              데스크톱에서 시작하기
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleMobileDownload}
              className="btn btn-soft btn-lg gap-2 px-8 w-full sm:w-auto rounded-full"
            >
              모바일 앱 다운로드
              <Smartphone className="w-5 h-5" />
            </button>
          </motion.div>
          <motion.p
            className="text-sm text-white/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            iOS, Android 지원
          </motion.p>

          {/* Quick Stats */}
          <motion.div
            className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white">간편</div>
              <p className="text-sm text-white/80">직관적인 인터페이스</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white">체계적</div>
              <p className="text-sm text-white/80">Second Brain 시스템</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white">효율적</div>
              <p className="text-sm text-white/80">타임라인 뷰</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection />

      {/* Scroll Progress Section - 이미지 태그 모이는 효과 */}
      <ScrollProgressSection />

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={bidirectionalViewportOptions}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              주요 기능
            </h2>
            <p className="text-lg text-white/90">
              생산성을 높이는 강력한 도구들
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={featureContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewportOptions}
          >
            {/* Feature 1 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                타임라인 뷰
              </h3>
              <p className="text-base-content/70">
                하루 일정을 시각적으로 관리하고 시간대별로 할일을 배치하세요.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                Second Brain
              </h3>
              <p className="text-base-content/70">
                생각을 수집하고, 명료화하며, 체계적으로 정리하는 시스템.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                목표 관리
              </h3>
              <p className="text-base-content/70">
                장기 목표를 설정하고 단계별로 달성해 나가세요.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-info" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                할일 관리
              </h3>
              <p className="text-base-content/70">
                프로젝트별로 할일을 정리하고 우선순위를 관리하세요.
              </p>
            </motion.div>

            {/* Feature 5 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                AI 추천
              </h3>
              <p className="text-base-content/70">
                상황에 맞는 동기부여 문구와 추천 할일을 제공합니다.
              </p>
            </motion.div>

            {/* Feature 6 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-warning" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                반복 일정
              </h3>
              <p className="text-base-content/70">
                매일, 매주, 매월 반복되는 일정을 자동으로 생성하세요.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* System Section */}
      <SystemSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <motion.section
        className="py-20 px-4"
        variants={ctaVariants}
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewportOptions}
      >
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold text-white">
            지금 바로 시작하세요
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            무료로 시작하고, 생산성을 높이는 첫 걸음을 내딛으세요.
          </p>
          <button
            onClick={handleGetStarted}
            className="btn btn-primary btn-lg gap-2 px-8 rounded-full"
          >
            시작하기
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-base-300/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* About */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">DayStep</h3>
              <p className="text-sm text-white/80">
                하루를 체계적으로 관리하는 생산성 앱
              </p>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">링크</h3>
              <ul className="space-y-2 text-sm text-white/80">
                <li>
                  <a href="/terms" className="hover:text-white transition-colors">
                    이용약관
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-white transition-colors">
                    개인정보처리방침
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">문의</h3>
              <p className="text-sm text-white/80">
                support@daystep.app
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-base-300 text-center text-sm text-white/80">
            © 2024 DayStep. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
