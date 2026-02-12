'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface KeyboardInfo {
  height: number;
  isVisible: boolean;
}

type KeyboardResizeMode = 'body' | 'ionic' | 'native' | 'none';

interface KeyboardAwareModalConfig {
  /**
   * 키보드가 나타날 때 모달을 얼마나 위로 이동시킬지 (기본값: 키보드 높이만큼)
   */
  offsetRatio?: number;
  /**
   * 애니메이션 지속 시간 (ms)
   */
  animationDuration?: number;
  /**
   * 키보드가 나타날 때 추가로 적용할 여백 (px)
   */
  extraPadding?: number;
  /**
   * 최소 상단 여백 (px) - 모달이 너무 위로 올라가지 않도록 제한
   */
  minTopPadding?: number;
  /**
   * 강제로 특정 resize 모드 사용 (자동 감지 무시)
   */
  forceResizeMode?: KeyboardResizeMode;
}

interface UseKeyboardAwareModalResult {
  keyboardInfo: KeyboardInfo;
  modalStyle: React.CSSProperties;
  isKeyboardVisible: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleCursorMove: (cursorPosition: { top: number; left: number }) => void;
  handleEditorFocus: () => void;
  handleEditorBlur: () => void;
  resizeMode: KeyboardResizeMode;
}

/**
 * 모바일 키보드 감지 및 모달 위치 자동 조정 훅
 * Visual Viewport API를 사용한 키보드 처리
 */
export function useKeyboardAwareModal(
  config: KeyboardAwareModalConfig = {}
): UseKeyboardAwareModalResult {
  const {
    offsetRatio = 1.0,
    animationDuration = 250,
    extraPadding = 20,
    minTopPadding = 50,
    forceResizeMode
  } = config;

  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    height: 0,
    isVisible: false
  });

  const [isModalMoving, setIsModalMoving] = useState(false);
  const [resizeMode, setResizeMode] = useState<KeyboardResizeMode>('none');
  const containerRef = useRef<HTMLDivElement>(null);
  const movingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 모달 움직임 상태 관리
  const setModalMovingWithTimeout = useCallback((moving: boolean) => {
    setIsModalMoving(moving);
    
    if (movingTimeoutRef.current) {
      clearTimeout(movingTimeoutRef.current);
    }
    
    if (moving) {
      // 모달이 움직일 때 포커스 해제
      if (document.activeElement && 'blur' in document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }
      
      // 애니메이션 시간보다 조금 더 길게 설정
      movingTimeoutRef.current = setTimeout(() => {
        setIsModalMoving(false);
      }, animationDuration + 50);
    }
  }, [animationDuration]);

  // 키보드 표시 이벤트 핸들러 (Will Show)
  const handleKeyboardWillShow = useCallback(async (info: any) => {
    console.log('🎹 [Keyboard] 키보드 표시 시작:', info);
    
    setModalMovingWithTimeout(true);
    setKeyboardInfo({
      height: info.keyboardHeight || 0,
      isVisible: true
    });
  }, [setModalMovingWithTimeout]);

  // 키보드 표시 완료 이벤트 핸들러 (Did Show)
  const handleKeyboardDidShow = useCallback(async (info: any) => {
    console.log('🎹 [Keyboard] 키보드 표시 완료:', info);
    
    // 키보드가 완전히 표시된 후 최종 높이로 업데이트
    setKeyboardInfo({
      height: info.keyboardHeight || 0,
      isVisible: true
    });
  }, []);

  // 키보드 숨김 시작 이벤트 핸들러 (Will Hide)
  const handleKeyboardWillHide = useCallback(() => {
    console.log('🎹 [Keyboard] 키보드 숨김 시작');
    
    setModalMovingWithTimeout(true);
    setKeyboardInfo({
      height: 0,
      isVisible: false
    });
  }, [setModalMovingWithTimeout]);

  // 키보드 숨김 완료 이벤트 핸들러 (Did Hide)
  const handleKeyboardDidHide = useCallback(() => {
    console.log('🎹 [Keyboard] 키보드 숨김 완료');
    
    // 키보드가 완전히 숨겨진 후 최종 상태로 업데이트
    setKeyboardInfo({
      height: 0,
      isVisible: false
    });
  }, []);

  // Visual Viewport API 이벤트 리스너 설정
  useEffect(() => {
    const listeners: (() => void)[] = [];

    // Visual Viewport API 지원 확인 및 리스너 설정
    if (window.visualViewport) {
      const handleVisualViewportChange = () => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const windowHeight = window.innerHeight;
        const viewportHeight = viewport.height;
        const keyboardHeight = windowHeight - viewportHeight;

        if (keyboardHeight > 50) { // 키보드가 나타남 (50px 임계값)
          setKeyboardInfo({
            height: keyboardHeight,
            isVisible: true
          });
        } else { // 키보드가 숨겨짐
          setKeyboardInfo({
            height: 0,
            isVisible: false
          });
        }
      };

      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      listeners.push(() => window.visualViewport?.removeEventListener('resize', handleVisualViewportChange));
    }

    if (forceResizeMode) {
      setResizeMode(forceResizeMode);
    }

    return () => {
      listeners.forEach(remove => remove());
    };
  }, [forceResizeMode]);

  // 커서 위치 핸들러 - 모달 움직임 중에는 동작하지 않음
  const handleCursorMove = useCallback((position: { top: number; left: number }) => {
    // 모달이 움직이는 중이면 커서 위치 추적 안함
    if (isModalMoving) {
      return;
    }
    
    console.log('📍 [Cursor] 커서 위치 업데이트:', position);
  }, [isModalMoving]);

  // 에디터 포커스 핸들러 - 모달 움직임 중에는 동작하지 않음
  const handleEditorFocus = useCallback(() => {
    // 모달이 움직이는 중이면 포커스 처리 안함
    if (isModalMoving) {
      return;
    }
    
    console.log('📝 [Editor] 포커스됨');
  }, [isModalMoving]);

  // 에디터 블러 핸들러  
  const handleEditorBlur = useCallback(() => {
    console.log('📝 [Editor] 포커스 해제됨');
  }, []);

  // 모달 스타일 계산 (iOS 시뮬레이터 호환성을 위한 적극적 transform 조정)
  const modalStyle: React.CSSProperties = (() => {
    // iOS 시뮬레이터에서 안정성을 위해 항상 transform 방식 사용
    const transformValue = keyboardInfo.isVisible 
      ? `translateY(-${keyboardInfo.height * offsetRatio}px)`
      : 'translateY(0)';
    
    return {
      transform: transformValue,
      transition: `transform ${animationDuration}ms ease-out`,
      // 추가적인 안정성을 위한 z-index 설정
      zIndex: keyboardInfo.isVisible ? 9999 : 'auto',
    };
  })();

  return {
    keyboardInfo,
    modalStyle,
    isKeyboardVisible: keyboardInfo.isVisible,
    containerRef,
    handleCursorMove,
    handleEditorFocus,
    handleEditorBlur,
    resizeMode
  };
}