'use client';

import { useState, useEffect, useRef } from 'react';

interface UseTypingEffectOptions {
  texts: string[];
  speed?: number;
  deleteSpeed?: number;
  delayBetweenTexts?: number;
  loop?: boolean;
}

export const useTypingEffect = ({
  texts,
  speed = 100,
  deleteSpeed = 50,
  delayBetweenTexts = 2000,
  loop = true,
}: UseTypingEffectOptions) => {
  const [displayText, setDisplayText] = useState('');
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentText = texts[currentTextIndex];

    if (!currentText) return;

    const typeCharacter = () => {
      if (isDeleting) {
        // 삭제 중
        if (displayText.length > 0) {
          setDisplayText(prev => prev.slice(0, -1));
          timeoutRef.current = setTimeout(typeCharacter, deleteSpeed);
        } else {
          // 삭제 완료, 다음 텍스트로
          setIsDeleting(false);
          setCurrentTextIndex(prev => {
            if (loop) {
              return (prev + 1) % texts.length;
            }
            return Math.min(prev + 1, texts.length - 1);
          });
        }
      } else {
        // 타이핑 중
        if (displayText.length < currentText.length) {
          setDisplayText(prev => currentText.slice(0, prev.length + 1));
          timeoutRef.current = setTimeout(typeCharacter, speed);
        } else {
          // 타이핑 완료, 잠시 대기 후 삭제 시작
          if (loop || currentTextIndex < texts.length - 1) {
            timeoutRef.current = setTimeout(() => {
              setIsDeleting(true);
            }, delayBetweenTexts);
          }
        }
      }
    };

    timeoutRef.current = setTimeout(typeCharacter, speed);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [displayText, currentTextIndex, isDeleting, texts, speed, deleteSpeed, delayBetweenTexts, loop]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return displayText;
};