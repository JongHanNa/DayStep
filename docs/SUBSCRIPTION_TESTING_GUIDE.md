# 구독 테스트 가이드

구독 테스트 시 플랫폼별로 취소, 초기화, 재결제 방법이 다르다. 이 문서는 개발/운영 시 참조용으로 정리한 것이다.

## 1. 개요

| 항목 | Paddle (웹) | Apple/RevenueCat (모바일) |
|------|------------|------------------------|
| 구독 관리 주체 | Paddle 대시보드 | Apple (App Store) |
| 즉시 취소 | O (대시보드에서 직접) | X (개발자가 직접 불가) |
| DB 자동 반영 | O (webhook 즉시) | 결제만 자동 (Xcode 환경), 전체 자동 (TestFlight) |
| 재결제 테스트 | Cancel 후 바로 가능 | Xcode Delete Transaction + DB 수동 만료 |
| Source of Truth | Supabase `subscriptions` | Supabase `subscriptions` |

---

## 2. Paddle (웹) 구독 테스트

> 상세 운영 절차는 [PADDLE_GUIDE.md](./PADDLE_GUIDE.md) 참고.

### 비구독 상태 테스트

1. Paddle 대시보드 → **Subscriptions** → 해당 구독 → **Cancel** (즉시 취소)
2. Webhook이 Supabase `subscriptions` 테이블을 자동 갱신
3. 앱에서 즉시 비구독 상태로 전환됨

### 환불 처리

- Paddle → **Transactions** → 해당 트랜잭션 → **Refund**
- 환불과 구독 취소는 **별개 작업** (환불만으로 구독 비활성화 안됨)
- 자세한 내용은 [PADDLE_GUIDE.md](./PADDLE_GUIDE.md) 참고

### 새 구독 결제 테스트

1. 기존 구독을 Cancel
2. 앱에서 바로 재구독 가능 (추가 초기화 불필요)

---

## 3. Apple/RevenueCat (모바일) 구독 테스트

### Xcode 실행 환경의 한계

> **중요**: Xcode를 통해 실행한 앱에서는 구독 취소/만료 시 **RevenueCat Webhook이 발생하지 않는다.**
> Xcode가 StoreKit을 로컬로 관리하므로, 앱 내 "App Store에서 관리" 버튼이나 Xcode의 "Edit Subscription" UI에서 Cancel Subscription을 눌러도 Apple 서버를 거치지 않는다.

| 실행 방식 | 구독 관리 주체 | Cancel 시 Webhook 발생 |
|-----------|-------------|---------------------|
| **Xcode로 실행** | Xcode (로컬 StoreKit) | X |
| **TestFlight / 직접 설치** | Apple 서버 | O |

따라서 Xcode 개발 환경에서의 구독 테스트는 **결제(INITIAL_PURCHASE)만 Webhook 자동 동기화**되고, 취소/만료는 DB 수동 처리가 필요하다.

### 비구독 상태 테스트

**Supabase DB 직접 수정** (Xcode 환경에서 유일한 방법):

```sql
-- subscriptions 만료 처리
UPDATE subscriptions SET status = 'expired', updated_at = now()
WHERE user_id = '...' AND platform = 'ios';

-- users 캐시 갱신
UPDATE users SET has_active_subscription = false, subscription_type = 'free', subscription_expires_at = null
WHERE id = '...';
```

> **`cancelled` 상태 주의**: `cancelled` + `subscriptionEndDate > now()` 조합일 경우 앱이 여전히 활성 구독으로 판단한다.
> 이는 `subscriptionStore.ts`의 `checkActiveSubscription()` 로직 때문이다:
> ```ts
> if (status === 'cancelled' && subscriptionEndDate) {
>   return new Date(subscriptionEndDate) > new Date(); // 만료일 전이면 활성
> }
> ```
> 따라서 비구독 테스트 시 반드시 `status = 'expired'`로 변경해야 한다. `cancelled`로는 불충분하다.

### 재결제 테스트

기존 구독 이력이 남아있으면 Apple이 "이미 구독 중"으로 판단하므로 초기화가 필요하다.

#### 권장: Xcode Transaction Manager + DB 수동 초기화

1. Xcode 메뉴 → **Debug** → **StoreKit** → **Manage Transactions**
2. 해당 트랜잭션 우클릭 → **Delete Transaction**
3. **Supabase DB 수동 만료 처리** (위 SQL 실행)
4. 앱 재실행 → 비구독 상태 확인 → 구독 화면에서 새로 결제
5. 재결제 시 새 INITIAL_PURCHASE webhook이 발생하여 RevenueCat/DB 자동 갱신

#### 보조: 3단계 초기화

> Apple 샌드박스 캐싱으로 "이미 구독 중" 오류가 발생할 수 있다. 이 경우 위의 Xcode Transaction Manager를 우선 사용하라.

1. **Apple 구매 이력 초기화**: App Store Connect → Users and Access → Sandbox → 해당 테스터 → Clear Purchase History
2. **RevenueCat 고객 삭제**: RevenueCat 대시보드 → Customers → 해당 App User ID → Delete
3. **앱에서 재결제**: 앱 재로그인 후 구독 화면에서 결제

### Webhook 자동 동기화 테스트 (취소/만료 포함)

Xcode 없이 앱을 설치해야 Apple 서버 경로를 타서 모든 이벤트의 Webhook이 발생한다.

1. **TestFlight에 빌드 업로드** 후 설치
2. 샌드박스 계정으로 결제 → INITIAL_PURCHASE webhook → DB 자동 동기화
3. 기기 설정에서 구독 취소 → CANCELLATION webhook → DB 자동 동기화
4. 샌드박스 가속 주기(월간 ~5분) 후 → EXPIRATION webhook → DB 자동 동기화

---

## 4. Supabase DB 직접 관리 (공통)

두 플랫폼 모두 `subscriptions` 테이블이 Source of Truth이다.

```sql
-- 상태 확인
SELECT id, user_id, status, platform, subscription_end_date, updated_at
FROM subscriptions
WHERE user_id = '...';

-- 수동 만료 (비구독 테스트)
UPDATE subscriptions SET status = 'expired', updated_at = now()
WHERE user_id = '...' AND platform = 'paddle';  -- 또는 'ios'

-- 수동 복원 (구독 복원)
UPDATE subscriptions SET status = 'active', updated_at = now()
WHERE user_id = '...';

-- 레코드 삭제 (완전 초기화)
DELETE FROM subscriptions WHERE user_id = '...' AND platform = 'ios';
```

> 주의: DB 직접 수정은 테스트 환경에서만 사용. 프로덕션에서는 webhook 흐름을 따라야 한다.

---

## 5. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| Xcode에서 Cancel 했는데 DB 변화 없음 | Xcode 실행 시 StoreKit이 로컬 관리됨 → Webhook 미발생 | DB 수동 만료 처리 (Xcode 환경의 정상 동작) |
| 재결제 시 "이미 구독 중" (Apple) | Apple/Xcode에 이전 트랜잭션 잔존 | Xcode Transaction Manager → Delete Transaction + DB 수동 만료 |
| DB는 expired인데 앱에서 구독 표시 | 클라이언트 store 캐시 | 앱 재로그인 또는 store 초기화 |
| cancelled인데 앱에서 구독 활성 표시 | `cancelled` + 만료일 미도래 시 활성 판단 로직 | DB에서 `status`를 `expired`로 변경 |
| RevenueCat에서 Delete 후에도 구독 유지 | Supabase DB 미정리 | DB에서 해당 레코드 삭제/만료 처리 |
