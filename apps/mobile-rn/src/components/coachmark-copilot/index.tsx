/**
 * PoC B — react-native-copilot 기반 코치마크 래퍼
 *
 * PoC A와 동일한 5-step 콘텐츠를 같은 i18n 키로 노출. 시각 비교 공정성을 위해
 * 동일 디자인 토큰의 CustomTooltip 사용.
 *
 * 사용:
 *   1) App.tsx를 <CopilotProvider tooltipComponent={CustomTooltip}>로 감싸기
 *   2) 강조할 UI를 <CopilotStep order=N text="i18n.key" name="...">로 감싸기
 *      → 그 안의 단일 자식은 walkthroughable이어야 함
 *   3) useCopilot().start() 호출
 */
import React from 'react';
import {View, type ViewProps} from 'react-native';
import {
  CopilotProvider,
  CopilotStep,
  walkthroughable,
  useCopilot,
} from 'react-native-copilot';
import {CustomTooltip} from './CustomTooltip';

const WalkthroughView = walkthroughable(View);

interface CopilotWrapperProps {
  children: React.ReactNode;
}

/**
 * App 루트에서 사용. 한 번만 마운트.
 */
export function HomeCopilotProvider({children}: CopilotWrapperProps) {
  return (
    <CopilotProvider
      tooltipComponent={CustomTooltip}
      overlay="view"
      stopOnOutsideClick={false}
      androidStatusBarVisible>
      {children}
    </CopilotProvider>
  );
}

/**
 * 강조 대상 래퍼 — order/i18nKey/name 정의
 */
export function CopilotTarget({
  order,
  i18nKey,
  name,
  children,
  style,
  ...rest
}: {
  order: number;
  i18nKey: string;
  name: string;
  children: React.ReactNode;
} & ViewProps) {
  return (
    <CopilotStep order={order} text={i18nKey} name={name}>
      <WalkthroughView style={style} {...rest}>
        {children}
      </WalkthroughView>
    </CopilotStep>
  );
}

export {useCopilot};
