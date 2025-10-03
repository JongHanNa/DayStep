'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { detectPlatform, checkAppInstalled, getStoreUrl, getAppDeepLink, Platform } from './platformDetector';
import { Smartphone, Globe, Download } from 'lucide-react';

interface SmartCTAProps {
  path?: string;
  className?: string;
}

export const SmartCTA: React.FC<SmartCTAProps> = ({ path, className }) => {
  const [platform, setPlatform] = useState<Platform>('web');
  const [appInstalled, setAppInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkPlatformAndApp = async () => {
      try {
        // Detect platform
        const detectedPlatform = detectPlatform();
        setPlatform(detectedPlatform);

        // Check if app is installed (only for mobile platforms)
        if (detectedPlatform !== 'web') {
          const installed = await checkAppInstalled();
          setAppInstalled(installed);
        }
      } catch (error) {
        console.error('Error checking platform and app:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkPlatformAndApp();
  }, []);

  const handleCTAClick = () => {
    if (platform === 'web') {
      // On web, navigate to the app or signup page
      window.location.href = path || '/';
      return;
    }

    if (appInstalled) {
      // App is installed, open it with deep link
      window.location.href = getAppDeepLink(path);
    } else {
      // App not installed, redirect to store
      const storeUrl = getStoreUrl(platform);
      if (storeUrl) {
        window.location.href = storeUrl;
      }
    }
  };

  // While checking, show a loading state
  if (isChecking) {
    return (
      <Button 
        className={className} 
        size="lg"
        disabled
      >
        <Download className="mr-2 h-5 w-5 animate-pulse" />
        확인 중...
      </Button>
    );
  }

  // Platform-specific CTA content
  const getCTAContent = () => {
    if (platform === 'web') {
      return {
        icon: <Globe className="mr-2 h-5 w-5" />,
        text: '웹에서 시작하기'
      };
    }

    if (appInstalled) {
      return {
        icon: <Smartphone className="mr-2 h-5 w-5" />,
        text: '앱에서 열기'
      };
    }

    // App not installed
    if (platform === 'ios') {
      return {
        icon: <Download className="mr-2 h-5 w-5" />,
        text: 'App Store에서 다운로드'
      };
    }

    // Android
    return {
      icon: <Download className="mr-2 h-5 w-5" />,
      text: 'Google Play에서 다운로드'
    };
  };

  const { icon, text } = getCTAContent();

  return (
    <Button 
      className={className} 
      size="lg"
      onClick={handleCTAClick}
    >
      {icon}
      {text}
    </Button>
  );
};