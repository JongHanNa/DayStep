'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 최적화된 이미지 컴포넌트
 * Next.js Image 컴포넌트를 기반으로 성능 최적화 및 lazy loading 적용
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  sizes,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground text-sm',
          className
        )}
        style={{ width, height }}
      >
        이미지를 불러올 수 없습니다
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse"
          style={{ width, height }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={quality}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
      />
    </div>
  );
}

/**
 * 아바타 이미지 컴포넌트
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  className,
  fallback,
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  fallback?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-primary text-primary-foreground font-medium rounded-full',
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      quality={90}
      onError={() => setHasError(true)}
    />
  );
}

/**
 * 배경 이미지 컴포넌트
 */
export function BackgroundImage({
  src,
  alt,
  children,
  className,
  overlay = false,
}: {
  src: string;
  alt: string;
  children?: React.ReactNode;
  className?: string;
  overlay?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        width={1920}
        height={1080}
        className="absolute inset-0 w-full h-full object-cover"
        sizes="100vw"
      />
      {overlay && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Intersection Observer를 사용한 lazy loading 컴포넌트
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  ...props
}: OptimizedImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // 모바일에서 더 빠른 로딩을 위해 확장
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={imgRef}
      className={cn('relative', className)}
      style={{ width, height }}
    >
      {!isInView ? (
        <div className="w-full h-full bg-muted animate-pulse" />
      ) : (
        <OptimizedImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setIsLoaded(true)}
          {...props}
        />
      )}
    </div>
  );
}

/**
 * Progressive Image Loading - 저화질 이미지를 먼저 로드하고 고화질로 교체
 */
export function ProgressiveImage({
  src,
  lowQualitySrc,
  alt,
  width,
  height,
  className,
  ...props
}: OptimizedImageProps & { lowQualitySrc?: string }) {
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);
  const [showHighQuality, setShowHighQuality] = useState(false);

  // 고화질 이미지 프리로드
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setIsHighQualityLoaded(true);
      // 부드러운 전환을 위한 딜레이
      setTimeout(() => setShowHighQuality(true), 100);
    };
    img.src = src;
  }, [src]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* 저화질 이미지 (즉시 표시) */}
      {lowQualitySrc && !showHighQuality && (
        <OptimizedImage
          src={lowQualitySrc}
          alt={alt}
          width={width}
          height={height}
          quality={30}
          className="absolute inset-0 filter blur-sm scale-110"
          {...props}
        />
      )}
      
      {/* 고화질 이미지 (로드 완료 후 표시) */}
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'transition-opacity duration-500',
          showHighQuality ? 'opacity-100' : 'opacity-0'
        )}
        {...props}
      />
    </div>
  );
}

/**
 * 반응형 이미지 컴포넌트 - 디바이스에 따라 다른 이미지 소스 제공
 */
export function ResponsiveImage({
  src,
  mobileSrc,
  tabletSrc,
  alt,
  width,
  height,
  className,
  ...props
}: OptimizedImageProps & { 
  mobileSrc?: string;
  tabletSrc?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640 && mobileSrc) {
        setCurrentSrc(mobileSrc);
      } else if (width < 1024 && tabletSrc) {
        setCurrentSrc(tabletSrc);
      } else {
        setCurrentSrc(src);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [src, mobileSrc, tabletSrc]);

  return (
    <OptimizedImage
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      {...props}
    />
  );
}

/**
 * 네트워크 상태에 따른 적응형 이미지 로딩
 */
export function AdaptiveImage({
  src,
  alt,
  width,
  height,
  className,
  ...props
}: OptimizedImageProps) {
  const [quality, setQuality] = useState(85);

  useEffect(() => {
    // 네트워크 정보 확인
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;
      
      // 느린 연결에서는 품질 낮춤
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1) {
        setQuality(60);
      } else if (effectiveType === '3g' || downlink < 2) {
        setQuality(75);
      } else {
        setQuality(85);
      }
    }
  }, []);

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      quality={quality}
      className={className}
      {...props}
    />
  );
}