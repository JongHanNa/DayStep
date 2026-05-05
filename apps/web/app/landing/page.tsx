'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect, useState } from 'react';
import {
  Timer,
  Heart,
  BookOpen,
  BarChart3,
  MessageCircle,
  ArrowRight,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerFadeInUpVariants, scaleFadeInVariants, getViewportOptions, getBidirectionalViewportOptions, rotatingTextVariants } from '@/lib/animations/scrollAnimations';
import dynamic from 'next/dynamic';
import LandingNav from '@/components/layout/LandingNav';
import StatsSection from '@/components/landing/StatsSection';
import SystemSection from '@/components/landing/SystemSection';
import PlanningSection from '@/components/landing/PlanningSection';
// TODO: 실제 사용자 후기 수집 후 활성화 예정
// import TestimonialsSection from '@/components/landing/TestimonialsSection';
import FAQSection from '@/components/landing/FAQSection';
import ScrollColorTransition from '@/components/landing/ScrollColorTransition';

// Hydration 오류 방지를 위해 ScrollProgressSection을 클라이언트 전용 렌더링
const ScrollProgressSection = dynamic(
  () => import('@/components/landing/ScrollProgressSection'),
  { ssr: false }
);

// 컴포넌트 외부 상수 (리렌더링 시 참조 변경 방지)
// 현재 앱의 핵심 기능 기반 회전 텍스트
const FEATURES = ['실행과 집중', '소중한 사람 챙기기', '기록에서 계획까지', '기록과 통계', '관계 기록'];

/**
 * 마케팅 랜딩 페이지 (/landing)
 * - 웹 비인증 사용자용 마케팅 페이지
 * - 인증된 사용자는 메인 페이지(/)로 리다이렉트
 */
export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // 회전하는 기능 텍스트 상태
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

  // 데모 모드 상태 (URL 파라미터 ?demo=true)
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Framer Motion variants
  const featureContainerVariants = staggerFadeInUpVariants(60, 0.15);
  const ctaVariants = scaleFadeInVariants(0.9);
  const bidirectionalViewportOptions = getBidirectionalViewportOptions(0.3);

  // 3초마다 기능 텍스트 회전
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % FEATURES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // URL 파라미터에서 데모 모드 감지
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDemoMode(params.get('demo') === 'true');
  }, []);

  // 랜딩 페이지에서만 html/body의 bg-base-200 제거
  // (ScrollColorTransition이 동적 배경 처리)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // 현재 클래스 저장
    const htmlClasses = html.className;
    const bodyClasses = body.className;

    // bg-base-200 제거
    html.classList.remove('bg-base-200');
    body.classList.remove('bg-base-200');

    // 인라인 배경색을 투명으로 설정 (globals.css의 !important 오버라이드)
    const originalHtmlBg = html.style.backgroundColor;
    const originalBodyBg = body.style.backgroundColor;
    html.style.setProperty('background-color', 'transparent', 'important');
    body.style.setProperty('background-color', 'transparent', 'important');

    // 언마운트 시 원복
    return () => {
      html.className = htmlClasses;
      body.className = bodyClasses;
      html.style.backgroundColor = originalHtmlBg;
      body.style.backgroundColor = originalBodyBg;
    };
  }, []);

  // 참고: 로그인 사용자도 랜딩 페이지에 머물 수 있음
  // 루트 페이지(/)에서 비인증 사용자만 /landing으로 리다이렉트됨

  // "데스크톱에서 시작하기" 버튼 클릭 핸들러
  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/');
    } else {
      // 데모 모드면 파라미터 유지
      router.push(isDemoMode ? '/login?demo=true' : '/login');
    }
  };

  // "모바일 앱 다운로드" 버튼 클릭 핸들러
  const handleMobileDownload = () => {
    const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6755368911';
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
    const isAndroid = /Android/i.test(ua);

    if (isIOS) {
      // iOS: App Store로 바로 이동
      window.location.href = APP_STORE_URL;
    } else if (isAndroid) {
      // Android: 아직 출시 전
      alert('Android 앱은 곧 출시 예정입니다!\n\niOS는 App Store에서 다운로드하실 수 있습니다.');
    } else {
      // Desktop: iOS 출시 안내 + App Store 이동 옵션
      const goToAppStore = confirm(
        'iOS 앱이 출시되었습니다!\nApp Store로 이동하시겠습니까?\n\n(Android 앱은 곧 출시 예정입니다)'
      );
      if (goToAppStore) {
        window.open(APP_STORE_URL, '_blank');
      }
    }
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary mx-auto mb-6" />
          <p className="text-lg text-base-content/70 font-medium">로딩 중...</p>
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
            <div className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white flex flex-col items-center">
              <span className="mb-2">집중이 어려운 당신을 위한</span>
              <div className="relative min-h-[5rem] sm:min-h-[6rem] lg:min-h-[7rem] w-full flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentFeatureIndex}
                    variants={rotatingTextVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="text-white text-4xl sm:text-5xl lg:text-6xl"
                  >
                    {FEATURES[currentFeatureIndex]}
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
            ADHD 성향이 있어도 괜찮아요.
            <br />
            복잡하지 않은 도구로 오늘 하루를 함께 관리해요.
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
              className="btn btn-lg gap-2 px-8 w-full sm:w-auto rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:brightness-110 border-none shadow-lg shadow-indigo-500/30"
            >
              데스크톱에서 시작하기
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleMobileDownload}
              className="btn btn-lg gap-2 px-8 w-full sm:w-auto rounded-full bg-white text-indigo-600 hover:bg-indigo-50 border-2 border-white/80 shadow-lg"
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
              <div className="text-3xl font-bold text-white">간단하게</div>
              <p className="text-sm text-white/80">복잡하지 않은 인터페이스</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white">바로 실행</div>
              <p className="text-sm text-white/80">시작 장벽을 낮춰요</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white">함께 관리</div>
              <p className="text-sm text-white/80">일과 사람 모두 챙겨요</p>
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
              바로 실행
            </h2>
            <p className="text-lg text-white/90">
              복잡하지 않아요. 필요한 것만 담았어요.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={featureContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewportOptions}
          >
            {/* Feature 1 - 실행과 집중 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                실행과 집중
              </h3>
              <p className="text-base-content/70">
                계획된 일과 떠오른 일을 바로 타이머 켜고 실행할 수 있어요. 시작이 어려울 때 도움이 돼요.
              </p>
            </motion.div>

            {/* Feature 2 - 소중한 사람 챙기기 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                소중한 사람 챙기기
              </h3>
              <p className="text-base-content/70">
                일에 몰입하다 보면 소중한 사람들을 놓치기 쉬워요. 주기적으로 안부를 챙길 수 있게 도와줘요.
              </p>
            </motion.div>

            {/* Feature 3 - 복잡한 머릿속, 정리해줄게 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                복잡한 머릿속, 정리해줄게
              </h3>
              <p className="text-base-content/70">
                생각이나 정보를 수집하고, 명료화하고, 할일을 계획하세요.
              </p>
            </motion.div>

            {/* Feature 4 - 일정/통계 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-info" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                일정/통계
              </h3>
              <p className="text-base-content/70">
                지난 기록을 확인하고, 일정을 관리하고, 통계로 성장을 확인하세요.
              </p>
            </motion.div>

            {/* Feature 5 - 관계 기록 보기 */}
            <motion.div
              variants={featureContainerVariants.item}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold text-base-content">
                관계 기록 보기
              </h3>
              <p className="text-base-content/70">
                누구에게 뭘 들었는지 기억하기 어렵죠. 대화 내용과 감사한 점을 기록하고 다시 볼 수 있어요.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* System Section */}
      <SystemSection />

      {/* Planning Section - 계획 세우기 기능 소개 */}
      <PlanningSection />

      {/*
        TODO: 실제 사용자 후기 수집 후 활성화 예정
        현재는 임시 데이터이므로 숨김 처리
        - 추후 실제 후기 연동 시 TestimonialsSection 컴포넌트 활성화
        - 후기 데이터는 DB에서 가져오도록 리팩토링 예정
        <TestimonialsSection />
      */}

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
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            집중이 어려운 하루,
            <br />
            DayStep과 함께 시작하세요
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            ADHD가 있어도 일상을 잘 돌볼 수 있습니다.
            <br />
            DayStep이 함께할게요.
          </p>
          <button
            onClick={handleGetStarted}
            className="btn btn-lg gap-2 px-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:brightness-110 border-none shadow-lg shadow-indigo-500/30"
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
                집중이 어려운 당신을 위한 하루 관리 앱
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
