'use client';

import { useEffect, useState } from 'react';

export type PlatformType = 'mobile' | 'tablet' | 'desktop';
export type UIVariant = 'mobile' | 'desktop';

interface PlatformUIConfig {
  platform: PlatformType;
  variant: UIVariant;
  isTouch: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * 플랫폼별 UI 구성을 위한 훅
 * 모바일/데스크탑 각각에 최적화된 UI를 제공
 */
export function usePlatformUI(): PlatformUIConfig {
  const [config, setConfig] = useState<PlatformUIConfig>({
    platform: 'desktop',
    variant: 'desktop',
    isTouch: false,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  useEffect(() => {
    const detectPlatform = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent;
      
      // 터치 디바이스 감지
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // 모바일 기기 감지 (더 정확한 감지)
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isMobileSize = width < 768;
      const isMobile = isMobileUA || (isMobileSize && isTouch);
      
      // 태블릿 감지
      const isTabletSize = width >= 768 && width < 1024;
      const isTablet = (isTabletSize && isTouch) || /iPad/i.test(userAgent);
      
      // 데스크탑
      const isDesktop = !isMobile && !isTablet;
      
      // 플랫폼 결정
      let platform: PlatformType = 'desktop';
      if (isMobile) platform = 'mobile';
      else if (isTablet) platform = 'tablet';
      
      // UI 변형 결정 (태블릿은 상황에 따라 결정)
      const variant: UIVariant = (isMobile || (isTablet && width < 900)) ? 'mobile' : 'desktop';
      
      setConfig({
        platform,
        variant,
        isTouch,
        isMobile,
        isTablet,
        isDesktop,
      });
    };

    detectPlatform();
    window.addEventListener('resize', detectPlatform);
    window.addEventListener('orientationchange', detectPlatform);
    
    return () => {
      window.removeEventListener('resize', detectPlatform);
      window.removeEventListener('orientationchange', detectPlatform);
    };
  }, []);

  return config;
}

/**
 * 플랫폼별 CSS 클래스 생성
 */
export function usePlatformClasses() {
  const { platform, variant, isTouch } = usePlatformUI();
  
  return {
    platformClass: `platform-${platform}`,
    variantClass: `variant-${variant}`,
    touchClass: isTouch ? 'touch-enabled' : 'no-touch',
    combinedClass: `platform-${platform} variant-${variant} ${isTouch ? 'touch-enabled' : 'no-touch'}`,
  };
}

/**
 * 플랫폼별 스타일 설정
 */
export function usePlatformStyles() {
  const { variant, isTouch, isMobile } = usePlatformUI();
  
  return {
    // 레이아웃 스타일
    containerStyle: {
      padding: variant === 'mobile' ? '16px' : '24px',
      maxWidth: variant === 'mobile' ? '100%' : '1200px',
      margin: variant === 'mobile' ? '0' : '0 auto',
    },
    
    // 버튼 스타일
    buttonStyle: {
      minHeight: isTouch ? '44px' : '36px',
      padding: variant === 'mobile' ? '12px 16px' : '8px 16px',
      fontSize: variant === 'mobile' ? '16px' : '14px',
    },
    
    // 카드 스타일
    cardStyle: {
      padding: variant === 'mobile' ? '16px' : '20px',
      borderRadius: variant === 'mobile' ? '12px' : '8px',
      margin: variant === 'mobile' ? '8px 0' : '12px 0',
    },
    
    // 입력 필드 스타일
    inputStyle: {
      minHeight: isTouch ? '44px' : '36px',
      padding: variant === 'mobile' ? '12px' : '8px 12px',
      fontSize: isMobile ? '16px' : '14px', // iOS 줌 방지
      borderRadius: variant === 'mobile' ? '8px' : '4px',
    },
  };
}

/**
 * 플랫폼별 애니메이션 설정
 */
export function usePlatformAnimations() {
  const { variant, isTouch } = usePlatformUI();
  
  return {
    // 전환 애니메이션
    transition: {
      duration: variant === 'mobile' ? 300 : 200,
      easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    },
    
    // 터치 피드백
    touchFeedback: isTouch ? {
      scale: 0.98,
      transition: { duration: 150 },
    } : {
      scale: 1.02,
      transition: { duration: 100 },
    },
    
    // 로딩 애니메이션
    loading: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: variant === 'mobile' ? 1.5 : 1.2,
        repeat: Infinity,
      },
    },
  };
}