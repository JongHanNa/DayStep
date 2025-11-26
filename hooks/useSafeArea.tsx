'use client';

import React, { useState, useEffect } from 'react';

/**
 * Safe Area Insets 인터페이스
 */
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Safe Area 감지 및 CSS 변수 적용 훅
 * iOS notch, Android gesture bar 등 디바이스별 안전 영역을 감지하고 대응
 */
export function useSafeArea() {
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Capacitor 환경 감지 및 클래스 추가
    const detectAndAddCapacitorClass = () => {
      if (typeof window !== 'undefined') {
        const isCapacitor = window.location.protocol === 'capacitor:' ||
                            (window as any).Capacitor?.isNativePlatform?.();

        if (isCapacitor) {
          document.documentElement.classList.add('capacitor');
        }
      }
    };

    detectAndAddCapacitorClass();

    // Safe Area 지원 여부 감지
    const checkSafeAreaSupport = () => {
      // CSS env() 함수 지원 확인
      const testElement = document.createElement('div');
      testElement.style.paddingTop = 'env(safe-area-inset-top)';
      document.body.appendChild(testElement);
      const computedStyle = window.getComputedStyle(testElement);
      const supportsEnv = computedStyle.paddingTop !== '0px' && computedStyle.paddingTop !== '';
      document.body.removeChild(testElement);

      // viewport-fit=cover 메타태그 확인
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const hasViewportFit = viewportMeta?.getAttribute('content')?.includes('viewport-fit=cover') ?? false;

      return supportsEnv || hasViewportFit;
    };

    const updateSafeAreaInsets = () => {
      // CSS 환경 변수를 통한 Safe Area 값 획득
      const computedStyle = getComputedStyle(document.documentElement);
      
      const parseInsetValue = (value: string): number => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
      };

      // CSS env() 함수로 Safe Area 값 획득
      const top = parseInsetValue(computedStyle.getPropertyValue('--safe-area-inset-top')) ||
                  parseInsetValue(getComputedStyle(document.body).getPropertyValue('padding-top'));
      const bottom = parseInsetValue(computedStyle.getPropertyValue('--safe-area-inset-bottom')) ||
                     parseInsetValue(getComputedStyle(document.body).getPropertyValue('padding-bottom'));
      const left = parseInsetValue(computedStyle.getPropertyValue('--safe-area-inset-left')) ||
                   parseInsetValue(getComputedStyle(document.body).getPropertyValue('padding-left'));
      const right = parseInsetValue(computedStyle.getPropertyValue('--safe-area-inset-right')) ||
                    parseInsetValue(getComputedStyle(document.body).getPropertyValue('padding-right'));

      // 대체 방법: iOS 감지 및 추정값 적용
      let estimatedInsets = { top: 0, bottom: 0, left: 0, right: 0 };

      if (typeof window !== 'undefined') {
        const userAgent = window.navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isIPhoneX = isIOS && window.screen.height >= 812; // iPhone X 이상

        if (isIPhoneX) {
          // iPhone X 계열 추정값 (portrait)
          if (window.orientation === 0 || window.orientation === 180) {
            estimatedInsets.top = Math.max(top, 44); // notch 높이
            estimatedInsets.bottom = Math.max(bottom, 34); // home indicator 높이
          } else {
            // landscape
            estimatedInsets.left = Math.max(left, 44);
            estimatedInsets.right = Math.max(right, 44);
            estimatedInsets.bottom = Math.max(bottom, 21);
          }
        }

        // Android gesture navigation 감지
        const isAndroid = /Android/.test(userAgent);
        if (isAndroid && window.screen.height > 800) {
          estimatedInsets.bottom = Math.max(bottom, 24); // gesture bar 높이 추정
        }
      }

      const finalInsets = {
        top: Math.max(top, estimatedInsets.top),
        bottom: Math.max(bottom, estimatedInsets.bottom),
        left: Math.max(left, estimatedInsets.left),
        right: Math.max(right, estimatedInsets.right),
      };

      setSafeAreaInsets(finalInsets);

      // CSS 변수로 값 설정 (다른 컴포넌트에서 사용 가능)
      const root = document.documentElement;
      root.style.setProperty('--safe-area-top', `${finalInsets.top}px`);
      root.style.setProperty('--safe-area-bottom', `${finalInsets.bottom}px`);
      root.style.setProperty('--safe-area-left', `${finalInsets.left}px`);
      root.style.setProperty('--safe-area-right', `${finalInsets.right}px`);
    };

    // 초기 설정
    setIsSupported(checkSafeAreaSupport());
    updateSafeAreaInsets();

    // 화면 회전 및 리사이즈 이벤트 리스너
    const handleResize = () => {
      setTimeout(updateSafeAreaInsets, 100); // iOS 회전 애니메이션 대기
    };

    const handleOrientationChange = () => {
      setTimeout(updateSafeAreaInsets, 300); // 방향 변경 완료 대기
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // 뷰포트 메타태그 동적 업데이트
    const updateViewportMeta = () => {
      let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
      }

      const currentContent = viewportMeta.content || '';
      if (!currentContent.includes('viewport-fit=cover')) {
        const newContent = currentContent 
          ? `${currentContent}, viewport-fit=cover`
          : 'width=device-width, initial-scale=1.0, viewport-fit=cover';
        viewportMeta.content = newContent;
      }
    };

    updateViewportMeta();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  /**
   * Safe Area 스타일 객체 반환
   */
  const getSafeAreaStyle = (areas: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom']) => {
    const style: React.CSSProperties = {};
    
    areas.forEach(area => {
      const value = safeAreaInsets[area];
      if (value > 0) {
        switch (area) {
          case 'top':
            style.paddingTop = `${value}px`;
            break;
          case 'bottom':
            style.paddingBottom = `${value}px`;
            break;
          case 'left':
            style.paddingLeft = `${value}px`;
            break;
          case 'right':
            style.paddingRight = `${value}px`;
            break;
        }
      }
    });

    return style;
  };

  /**
   * Safe Area 마진 스타일 반환
   */
  const getSafeAreaMarginStyle = (areas: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom']) => {
    const style: React.CSSProperties = {};
    
    areas.forEach(area => {
      const value = safeAreaInsets[area];
      if (value > 0) {
        switch (area) {
          case 'top':
            style.marginTop = `${value}px`;
            break;
          case 'bottom':
            style.marginBottom = `${value}px`;
            break;
          case 'left':
            style.marginLeft = `${value}px`;
            break;
          case 'right':
            style.marginRight = `${value}px`;
            break;
        }
      }
    });

    return style;
  };

  /**
   * CSS 클래스명 반환 (Tailwind CSS에서 사용)
   */
  const getSafeAreaClasses = (areas: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom']) => {
    const classes: string[] = [];
    
    areas.forEach(area => {
      const value = safeAreaInsets[area];
      if (value > 0) {
        // Tailwind CSS arbitrary values 사용
        switch (area) {
          case 'top':
            classes.push(`pt-[${value}px]`);
            break;
          case 'bottom':
            classes.push(`pb-[${value}px]`);
            break;
          case 'left':
            classes.push(`pl-[${value}px]`);
            break;
          case 'right':
            classes.push(`pr-[${value}px]`);
            break;
        }
      }
    });

    return classes.join(' ');
  };

  return {
    safeAreaInsets,
    isSupported,
    getSafeAreaStyle,
    getSafeAreaMarginStyle,
    getSafeAreaClasses,
  };
}

/**
 * Safe Area 패딩을 적용하는 유틸리티 컴포넌트
 */
export interface SafeAreaViewProps {
  children: React.ReactNode;
  areas?: ('top' | 'bottom' | 'left' | 'right')[];
  className?: string;
  style?: React.CSSProperties;
  as?: keyof React.JSX.IntrinsicElements;
}

export function SafeAreaView({ 
  children, 
  areas = ['top', 'bottom'], 
  className = '',
  style = {},
  as: Component = 'div'
}: SafeAreaViewProps) {
  const { getSafeAreaStyle } = useSafeArea();
  
  const safeAreaStyle = getSafeAreaStyle(areas);
  const combinedStyle = { ...safeAreaStyle, ...style };

  return (
    <Component className={className} style={combinedStyle}>
      {children}
    </Component>
  );
}