# DayStep 결제 시스템 구현 가이드

## 📋 구현 완료 현황

### ✅ Week 1 Day 1-2: 완료 (2025-11-21)

**구현된 파일:**
- `supabase/migrations/20251121000001_create_subscriptions_table.sql` - 구독 테이블
- `supabase/migrations/20251121000002_create_subscription_history_table.sql` - 구독 히스토리
- `supabase/migrations/20251121000003_alter_users_add_subscription_columns.sql` - users 테이블 확장
- `supabase/migrations/20251121000004_add_auto_renew_enabled_to_subscriptions.sql` - auto_renew_enabled 컬럼 추가
- `supabase/functions/revenue-cat-webhook/index.ts` - Revenue Cat Webhook 핸들러
- `lib/revenue-cat.ts` - Revenue Cat TypeScript 래퍼
- `lib/featureFlags.ts` - Feature Flag 시스템
- `.env.development`, `.env.production` - Revenue Cat 설정 추가

**마이그레이션 적용 완료:**
- ✅ 개발 DB (DayStep) - subscriptions, subscription_history, users 테이블 생성
- ✅ 운영 DB (DayStep Production) - subscriptions, subscription_history, users 테이블 생성
- ✅ Supabase TypeScript 타입 재생성 완료 (`types/supabase.ts`)
- ✅ TypeScript 타입 체크 통과

---

### ✅ Week 1 Day 3-4: 완료 (2025-11-21)

**완료된 설정:**

#### 1. Revenue Cat 계정 및 API Keys ✅
- 프로젝트 생성: "DayStep"
- App-specific Public API Keys 획득:
  - iOS: `appl_RwbvtdTdmeVjYzSeXFsvLrLGZRj`
  - Android: `goog_xrcGLtpeKvXTWipzylWDMRZCCoD`

#### 2. iOS App Store Connect 설정 ✅
- 구독 그룹: "Pro Subscription" 생성
- 상품 등록:
  - **pro_monthly**: ₩5,900/월
  - **pro_yearly**: ₩49,000/년 (30% 할인)
- StoreKit 2 (P8 Key) 연동 완료
- Apple Small Business Program 가입 완료

#### 3. Google Play Console 설정 ⏳
- **보류 중**: 결제 프로필 승인 대기
- Android 상품 등록은 승인 후 진행 예정

#### 4. Revenue Cat 앱 등록 ✅
- iOS 앱: "DayStep iOS" (StoreKit 2)
- Android 앱: "DayStep Android" (결제 프로필 승인 후 완료 예정)

#### 5. Revenue Cat Products 매핑 ✅
- `pro_monthly` → iOS: `pro_monthly`
- `pro_yearly` → iOS: `pro_yearly`
- Android 매핑: 결제 프로필 승인 후 진행 예정

#### 6. Revenue Cat Entitlements 설정 ✅
- Entitlement ID: `pro`
- 연결된 상품: `pro_monthly`, `pro_yearly`

#### 7. Revenue Cat Offerings 설정 ✅
- Current Offering: `default`
- Packages:
  - Monthly: `pro_monthly`
  - Yearly: `pro_yearly` (30% 할인 표시)

#### 8. Webhook Secret 생성 ✅
```
REVENUE_CAT_WEBHOOK_SECRET=3f28b12c-a7c5-4921-b982-2b0eac85bc9a
```

#### 9. Supabase Functions 배포 ✅
**개발 DB (simbmdvtiukdbjxeepic)**:
```bash
SUPABASE_ACCESS_TOKEN="sbp_53f14e4e0be3fcd8e95cab1e9a8991ec8fd0fbb7" \
npx supabase functions deploy revenue-cat-webhook --project-ref simbmdvtiukdbjxeepic
```

**운영 DB (iqiwjorjyryxhcgucmnj)**:
```bash
SUPABASE_ACCESS_TOKEN="sbp_53f14e4e0be3fcd8e95cab1e9a8991ec8fd0fbb7" \
npx supabase functions deploy revenue-cat-webhook --project-ref iqiwjorjyryxhcgucmnj
```

#### 10. Supabase 환경 변수 설정 ✅
**개발 DB**:
```bash
npx supabase secrets set REVENUE_CAT_WEBHOOK_SECRET=3f28b12c-a7c5-4921-b982-2b0eac85bc9a \
  --project-ref simbmdvtiukdbjxeepic
```

**운영 DB**:
```bash
npx supabase secrets set REVENUE_CAT_WEBHOOK_SECRET=3f28b12c-a7c5-4921-b982-2b0eac85bc9a \
  --project-ref iqiwjorjyryxhcgucmnj
```

#### 11. Supabase JWT 검증 비활성화 ✅
**개발 DB & 운영 DB 모두 설정**:
1. Supabase Dashboard → Edge Functions → `revenue-cat-webhook`
2. Details → Function Configuration
3. **"Verify JWT with legacy secret"** → OFF
4. Save changes

**이유**: Revenue Cat Webhook은 Bearer Token(Webhook Secret)을 사용하므로, Supabase의 JWT 검증을 비활성화해야 합니다. 함수 내부 코드에서 Webhook Secret 검증을 수행합니다 (index.ts 58-65줄).

#### 12. Revenue Cat Webhook 설정 및 테스트 ✅
**개발 DB Webhook**:
- Name: `Supabase Development`
- URL: `https://simbmdvtiukdbjxeepic.supabase.co/functions/v1/revenue-cat-webhook`
- Authorization: `Bearer 3f28b12c-a7c5-4921-b982-2b0eac85bc9a`
- Environment: `Both Production and Sandbox`
- Test Result: ✅ **200 OK**

**운영 DB Webhook**:
- Name: `Supabase Production`
- URL: `https://iqiwjorjyryxhcgucmnj.supabase.co/functions/v1/revenue-cat-webhook`
- Authorization: `Bearer 3f28b12c-a7c5-4921-b982-2b0eac85bc9a`
- Environment: `Production only`
- Test Result: ✅ **200 OK**

#### 13. 환경 변수 업데이트 ✅
**`.env.development`**:
```env
# Revenue Cat API Keys (App-specific Public API Keys)
NEXT_PUBLIC_REVENUE_CAT_IOS_KEY=appl_RwbvtdTdmeVjYzSeXFsvLrLGZRj
NEXT_PUBLIC_REVENUE_CAT_ANDROID_KEY=goog_xrcGLtpeKvXTWipzylWDMRZCCoD

# Revenue Cat Webhook Secret (Supabase Functions용)
REVENUE_CAT_WEBHOOK_SECRET=3f28b12c-a7c5-4921-b982-2b0eac85bc9a
```

**`.env.production`**: 동일한 값

**⚠️ 추가 작업 필요 (앱 출시 전)**:
1. Vercel Dashboard → Settings → Environment Variables
2. 다음 변수들을 추가:
   - `NEXT_PUBLIC_REVENUE_CAT_IOS_KEY`
   - `NEXT_PUBLIC_REVENUE_CAT_ANDROID_KEY`
3. Production과 Preview 모두 설정

---

## 🎯 다음 작업 (Week 1 Day 5)

### Capacitor 플러그인 통합

#### 1. 패키지 설치
```bash
npm install @revenuecat/purchases-capacitor @revenuecat/purchases-capacitor-ui
```

#### 2. Revenue Cat 초기화 코드
**App.tsx 또는 _app.tsx**:
```typescript
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

function App() {
  useEffect(() => {
    async function configurePurchases() {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

      const platform = Capacitor.getPlatform();

      if (platform === 'ios') {
        await Purchases.configure({ apiKey: "appl_RwbvtdTdmeVjYzSeXFsvLrLGZRj" });
      } else if (platform === 'android') {
        await Purchases.configure({ apiKey: "goog_xrcGLtpeKvXTWipzylWDMRZCCoD" });
      }
    }
    configurePurchases();
  }, []);

  return <div>DayStep</div>;
}

export default App;
```

#### 3. Entitlement 확인
```typescript
import { Purchases } from '@revenuecat/purchases-capacitor';

try {
  const { customerInfo } = await Purchases.getCustomerInfo();

  if(typeof customerInfo.entitlements.active["pro"] !== "undefined") {
    // Grant user access to pro features
  }
} catch (e) {
  // Error fetching customer info
}
```

#### 4. Paywall 표시
```typescript
import { RevenueCatUI, PAYWALL_RESULT } from '@revenuecat/purchases-capacitor-ui';

async function presentPaywall(): Promise<boolean> {
  const { result } = await RevenueCatUI.presentPaywall();

  switch (result) {
    case PAYWALL_RESULT.NOT_PRESENTED:
    case PAYWALL_RESULT.ERROR:
    case PAYWALL_RESULT.CANCELLED:
      return false;
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      return true;
    default:
      return false;
  }
}
```

#### 5. 사용자 ID 연동
```typescript
// 로그인 시
await Purchases.logIn({ appUserID: userId });

// 로그아웃 시
await Purchases.logOut();
```

---

## 📊 DB 마이그레이션 적용

### 개발 DB (DayStep) ✅
마이그레이션 자동 적용 완료:
- `20251121000001_create_subscriptions_table.sql`
- `20251121000002_create_subscription_history_table.sql`
- `20251121000003_alter_users_add_subscription_columns.sql`

### 프로덕션 DB (DayStep Production) ✅
마이그레이션 자동 적용 완료 (개발 DB와 동일)

---

## 🧪 테스트 체크리스트

### Revenue Cat Webhook 테스트
- [x] 개발 DB Webhook 연결 확인 (200 OK)
- [x] 운영 DB Webhook 연결 확인 (200 OK)
- [x] Authorization 헤더 검증 동작 확인
- [x] JWT 검증 비활성화 완료

### Revenue Cat 샌드박스 테스트 (앱 통합 후)
- [ ] iOS TestFlight에서 샌드박스 구매 테스트
- [ ] Android Internal Testing에서 샌드박스 구매 테스트
- [ ] Webhook 이벤트 수신 확인 (Supabase Logs)
- [ ] subscriptions 테이블 업데이트 확인
- [ ] users 테이블 캐시 동기화 확인
- [ ] subscription_history 이벤트 기록 확인

### 구독 시나리오 테스트 (앱 통합 후)
- [ ] 신규 가입 → 7일 체험 시작
- [ ] 체험 → 유료 전환 (월간)
- [ ] 체험 → 유료 전환 (연간)
- [ ] 구독 취소 → 만료일까지 유지
- [ ] 구독 만료 → 기능 제한
- [ ] 구독 복원 (앱 재설치)
- [ ] 구독 갱신 (자동)

---

## 📚 참고 자료

- [Revenue Cat Docs](https://www.revenuecat.com/docs/)
- [Capacitor Purchases Plugin](https://github.com/RevenueCat/purchases-capacitor)
- [Apple StoreKit](https://developer.apple.com/storekit/)
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [Supabase Functions](https://supabase.com/docs/guides/functions)

---

## 💡 유용한 명령어

### Supabase Functions 로그 확인
```bash
# 개발 DB
npx supabase functions logs revenue-cat-webhook --project-ref simbmdvtiukdbjxeepic

# 운영 DB
npx supabase functions logs revenue-cat-webhook --project-ref iqiwjorjyryxhcgucmnj
```

### Revenue Cat CLI
```bash
# Revenue Cat CLI 설치
npm install -g @revenuecat/revenuecat-cli

# 로그인
revenuecat login

# 상품 목록 조회
revenuecat products list
```

### Webhook 재배포
```bash
# 개발 DB
SUPABASE_ACCESS_TOKEN="sbp_53f14e4e0be3fcd8e95cab1e9a8991ec8fd0fbb7" \
npx supabase functions deploy revenue-cat-webhook --project-ref simbmdvtiukdbjxeepic

# 운영 DB
SUPABASE_ACCESS_TOKEN="sbp_53f14e4e0be3fcd8e95cab1e9a8991ec8fd0fbb7" \
npx supabase functions deploy revenue-cat-webhook --project-ref iqiwjorjyryxhcgucmnj
```

---

## 🔐 보안 고려사항

### Webhook Secret 보호
- ✅ 환경 변수로 관리 (`.env` 파일)
- ✅ Supabase Secrets로 안전하게 저장
- ⚠️ Git 커밋 금지 (`.gitignore`에 포함)

### JWT 검증 비활성화
- ✅ Webhook Secret으로 인증 (함수 내부 코드)
- ✅ 잘못된 Secret → 401 Unauthorized 반환
- ✅ 표준 Webhook 패턴 (GitHub, Stripe 등도 동일)

### API Keys 관리
- ✅ App-specific Public API Keys 사용 (앱별 분리)
- ✅ Test Store Key는 개발/테스트 전용
- ⚠️ Production Key 발급 시 `.env.production` 업데이트

---

**작성일**: 2025-11-21
**최종 업데이트**: 2025-11-21
**작성자**: Claude (DayStep 결제 시스템 구현)
