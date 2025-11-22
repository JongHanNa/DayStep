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
- **프로덕션 앱** App-specific Public API Keys:
  - iOS: `appl_RwbvtdTdmeVjYzSeXFsvLrLGZRj` (com.daystep.app)
  - Android: `goog_xrcGLtpeKvXTWipzylWDMRZCCoD` (com.daystep.app)
- **개발 앱** App-specific Public API Keys:
  - iOS: `appl_mUUewYlCtREMQUmfobiDcQFHhwc` (com.daystep.app.dev)
  - Android: `goog_ErneYCWdfUDuKtRvMGNJTFDPnPm` (com.daystep.app.dev)

#### 2. iOS App Store Connect 설정 ✅
- 구독 그룹: "Pro Subscription" 생성
- **프로덕션 앱 (DayStep, com.daystep.app)** 상품 등록:
  - **pro_monthly**: ₩1,100/월
  - **pro_yearly**: ₩9,900/년 (25% 할인)
- **개발 앱 (DevDayStep, com.daystep.app.dev)** 상품 등록:
  - **pro_monthly_dev**: ₩1,100/월
  - **pro_yearly_dev**: ₩9,900/년 (25% 할인)
- StoreKit 2 (P8 Key) 연동 완료
- Apple Small Business Program 가입 완료

#### 3. Google Play Console 설정 ⏳
- **보류 중**: 결제 프로필 승인 대기
- Android 상품 등록은 승인 후 진행 예정

#### 4. Revenue Cat 앱 등록 ✅
- **프로덕션 앱**:
  - iOS: "DayStep iOS" (Bundle ID: `com.daystep.app`, StoreKit 2)
  - Android: "DayStep Android" (Bundle ID: `com.daystep.app`, 결제 프로필 승인 후 완료 예정)
- **개발 앱**:
  - iOS: "DayStep iOS Dev" (Bundle ID: `com.daystep.app.dev`, StoreKit 2, Sandbox only)
  - Android: "DayStep Android Dev" (Bundle ID: `com.daystep.app.dev`, 결제 프로필 승인 후 완료 예정)

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

#### 13. 환경별 설정 및 Product ID 분리 ✅

**개발/프로덕션 환경 완전 분리**:
- 개발 빌드 (`com.daystep.app.dev`) → Dev Keys + Dev Products
- 프로덕션 빌드 (`com.daystep.app`) → Prod Keys + Prod Products
- `lib/revenue-cat.ts`에서 `CAPACITOR_ENV` 기반 자동 전환

**환경별 Product ID 매핑**:
| 환경 | 월간 구독 | 연간 구독 |
|------|----------|----------|
| 개발 (Development) | `pro_monthly_dev` | `pro_yearly_dev` |
| 프로덕션 (Production) | `pro_monthly` | `pro_yearly` |

**가격 정보** (개발/프로덕션 동일):
- 월간 구독: ₩1,100/월
- 연간 구독: ₩9,900/년 (25% 할인)

**`.env.development`** (개발 빌드용):
```env
# Feature Flag
NEXT_PUBLIC_PAYMENTS_ENABLED=true  # 개발/테스트를 위해 활성화

# 가격 설정
NEXT_PUBLIC_PRO_MONTHLY_PRICE=₩1,100
NEXT_PUBLIC_PRO_YEARLY_PRICE=₩9,900
NEXT_PUBLIC_PRO_YEARLY_DISCOUNT_PERCENTAGE=25

# Revenue Cat Dev Keys (com.daystep.app.dev)
NEXT_PUBLIC_REVENUE_CAT_IOS_KEY=appl_mUUewYlCtREMQUmfobiDcQFHhwc
NEXT_PUBLIC_REVENUE_CAT_ANDROID_KEY=goog_ErneYCWdfUDuKtRvMGNJTFDPnPm

# Revenue Cat Webhook Secret (Supabase Functions용)
REVENUE_CAT_WEBHOOK_SECRET=3f28b12c-a7c5-4921-b982-2b0eac85bc9a
```

**`.env.production`** (프로덕션 빌드용):
```env
# Feature Flag
NEXT_PUBLIC_PAYMENTS_ENABLED=false  # 초기에는 false (유료화 오픈 시 true로 변경)

# 가격 설정
NEXT_PUBLIC_PRO_MONTHLY_PRICE=₩1,100
NEXT_PUBLIC_PRO_YEARLY_PRICE=₩9,900
NEXT_PUBLIC_PRO_YEARLY_DISCOUNT_PERCENTAGE=25

# Revenue Cat Prod Keys (com.daystep.app)
NEXT_PUBLIC_REVENUE_CAT_IOS_KEY=appl_RwbvtdTdmeVjYzSeXFsvLrLGZRj
NEXT_PUBLIC_REVENUE_CAT_ANDROID_KEY=goog_xrcGLtpeKvXTWipzylWDMRZCCoD

# Revenue Cat Webhook Secret (Supabase Functions용)
REVENUE_CAT_WEBHOOK_SECRET=3f28b12c-a7c5-4921-b982-2b0eac85bc9a
```

**환경별 빌드 동작**:
| 빌드 명령어 | Bundle ID | Revenue Cat Keys | Product IDs | 로그 레벨 |
|------------|-----------|------------------|-------------|----------|
| `npm run dev:mobile` | `com.daystep.app.dev` | Dev Keys | `*_dev` | DEBUG |
| `npm run build:mobile` | `com.daystep.app.dev` | Dev Keys | `*_dev` | DEBUG |
| `npm run build:mobile:prod` | `com.daystep.app` | Prod Keys | `pro_*` | INFO |

**자동 전환 로직** (`lib/revenue-cat.ts`):
```typescript
// 환경별 Product ID 매핑
const PRODUCT_IDS = {
  development: {
    monthly: 'pro_monthly_dev',
    yearly: 'pro_yearly_dev',
  },
  production: {
    monthly: 'pro_monthly',
    yearly: 'pro_yearly',
  },
};

// CAPACITOR_ENV 또는 NODE_ENV로 자동 판단
function getProductId(plan: 'monthly' | 'yearly'): string {
  const isDevelopment =
    process.env.CAPACITOR_ENV === 'development' ||
    process.env.NODE_ENV === 'development';

  return isDevelopment
    ? PRODUCT_IDS.development[plan]
    : PRODUCT_IDS.production[plan];
}
```

**⚠️ 추가 작업 필요 (앱 출시 전)**:
1. Vercel Dashboard → Settings → Environment Variables
2. 다음 변수들을 추가:
   - `NEXT_PUBLIC_REVENUE_CAT_IOS_KEY` (Prod Key)
   - `NEXT_PUBLIC_REVENUE_CAT_ANDROID_KEY` (Prod Key)
   - `NEXT_PUBLIC_PAYMENTS_ENABLED=true` (유료화 오픈 시)
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

## 🐛 트러블슈팅: "None of the products could be fetched from App Store Connect" 오류

### 문제 상황
- **RevenueCat Dashboard**: Products 상태가 **"Ready to Submit"** ✅ (메타데이터 읽기 성공)
- **App Store Connect**: 제품 상태가 **"제출 준비 완료"**
- **App Store Connect API**: "Valid credentials" ✅ (API 키 정상)
- **앱 실행 시**: 구독 구매 시도 시 **"None of the products could be fetched from App Store Connect"** 오류 발생

### 근본 원인
**RevenueCat API ≠ StoreKit API**

RevenueCat Dashboard가 "Ready to Submit"으로 표시되는 것은 **RevenueCat API가 App Store Connect에서 제품 메타데이터를 읽을 수 있다**는 의미일 뿐입니다.

**하지만 실제 앱에서는 Apple의 StoreKit API를 사용**하며, StoreKit API는 다음 조건이 필요합니다:
- ❌ **"제출 준비 완료" 상태**: 메타데이터만 완성, StoreKit API에 노출 안 됨
- ✅ **최소 1회 심사 제출**: 심사 통과/거부 무관, StoreKit API에 노출됨

**왜 이런 차이가 발생하나요?**
- **RevenueCat API**: App Store Connect API를 사용 → 제품 메타데이터만 읽음
- **StoreKit API**: Apple의 실제 구매 API → 심사 제출 이력 있는 제품만 조회 가능
- **결과**: RevenueCat Dashboard는 정상, 앱은 오류

### 해결 방법

#### Option 1: 즉시 테스트 (권장) - StoreKit Configuration 파일 사용
**장점**:
- 심사 제출 없이 즉시 테스트 가능
- Xcode 시뮬레이터 및 실제 기기에서 모두 작동
- 로컬 개발 환경에서 완전히 독립적으로 테스트

**단점**:
- 개발 환경에서만 사용 가능
- TestFlight 또는 프로덕션에서는 작동하지 않음

**구현 완료**:
- ✅ `mobile/ios/App/DayStepDev.storekit` 생성
- ✅ 개발용 제품 정의 (`pro_monthly_dev`, `pro_yearly_dev`)
- ✅ Xcode Scheme 설정에서 StoreKit 파일 연결 필요

**Xcode 설정 방법**:
1. Xcode에서 `mobile/ios/App/App.xcodeproj` 열기
2. Product → Scheme → Edit Scheme (⌘ + <)
3. Run → Options → StoreKit Configuration
4. `DayStepDev.storekit` 선택
5. 빌드 및 실행

#### Option 2: 장기 해결 - 심사 제출
**방법**:
1. App Store Connect → 인앱구매 → `pro_monthly_dev`, `pro_yearly_dev`
2. 각 제품의 "심사 제출" 버튼 클릭
3. 앱 전체를 심사에 올릴 필요 없음 (제품만 제출 가능)
4. 심사 통과/거부 여부와 무관 (제출 이력이 중요)

**효과**:
- RevenueCat이 App Store Connect API를 통해 제품 정보 조회 가능
- TestFlight 및 프로덕션에서 실제 결제 테스트 가능

**예상 소요 시간**:
- 심사 제출 후 API 동기화: 수 분 ~ 2시간
- 실제 심사 대기 시간: 무관 (동기화는 즉시 시작)

### 추가 체크 사항
만약 위 방법으로도 해결되지 않는다면:
- [ ] Bundle ID 일치 확인 (RevenueCat Dashboard vs Xcode)
- [ ] Product ID 일치 확인 (App Store Connect vs RevenueCat Products)
- [ ] API 키 권한 확인 ("앱 관리" 권한 필요)
- [ ] API 키가 모든 앱에 적용되는지 확인 (특정 앱만 선택한 경우 문제 발생)

---

**작성일**: 2025-11-21
**최종 업데이트**: 2025-11-22 
**작성자**: Claude (DayStep 결제 시스템 구현)
