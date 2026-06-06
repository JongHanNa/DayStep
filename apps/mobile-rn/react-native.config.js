module.exports = {
  dependencies: {
    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENTS_ENABLED = false 동안 네이티브 링킹 비활성화
    //
    // 구독제 재전환 시 복구 방법:
    //   1. 아래 platforms 블록 삭제 (또는 이 항목 전체 삭제)
    //   2. cd ios && pod install
    //   3. featureFlags.ts 에서 PAYMENTS_ENABLED: true 로 변경
    //   4. SubscriptionView.tsx 원본 코드 주석 해제
    // ─────────────────────────────────────────────────────────────────────────
    'react-native-purchases': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
