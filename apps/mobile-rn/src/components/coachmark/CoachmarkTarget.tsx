/**
 * CoachmarkTarget — 강조 대상 UI를 감싸는 래퍼
 *
 * 사용:
 *   <CoachmarkTarget id="home-progress">
 *     <NativeProgressCardNative ... />
 *   </CoachmarkTarget>
 *
 * 내부적으로 ref + measureInWindow로 절대 좌표를 측정해 Provider에 등록한다.
 * 자식의 레이아웃에 영향을 주지 않도록 onLayout만 사용 (스타일 무수정).
 */
import React, {useEffect, useRef} from 'react';
import {View, type ViewProps} from 'react-native';
import {useCoachmark} from './CoachmarkProvider';
import type {MeasureFn, TargetRect} from './types';

interface CoachmarkTargetProps extends ViewProps {
  id: string;
  children: React.ReactNode;
}

export function CoachmarkTarget({id, children, style, ...rest}: CoachmarkTargetProps) {
  const viewRef = useRef<View | null>(null);
  const {registerTarget} = useCoachmark();

  useEffect(() => {
    const measure: MeasureFn = () =>
      new Promise<TargetRect | null>(resolve => {
        const node = viewRef.current;
        if (!node) {
          resolve(null);
          return;
        }
        node.measureInWindow((x, y, width, height) => {
          if (
            typeof x !== 'number' ||
            typeof y !== 'number' ||
            !width ||
            !height
          ) {
            resolve(null);
            return;
          }
          resolve({x, y, width, height});
        });
      });

    const unregister = registerTarget(id, measure);
    return unregister;
  }, [id, registerTarget]);

  return (
    <View ref={viewRef} collapsable={false} style={style} {...rest}>
      {children}
    </View>
  );
}
