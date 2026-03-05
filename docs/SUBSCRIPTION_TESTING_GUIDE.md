# 구독 테스트 가이드

구독 테스트 시 플랫폼별로 취소, 초기화, 재결제 방법이 다르다. 이 문서는 개발/운영 시 참조용으로 정리한 것이다.

## 1. 개요

| 항목 | Paddle (웹) | Apple/RevenueCat (모바일) |
|------|------------|------------------------|
| 구독 관리 주체 | Paddle 대시보드 | Apple (App Store) |
| 즉시 취소 | O (대시보드에서 직접) | X (개발자가 직접 불가) |
| DB 자동 반영 | O (webhook 즉시) | 부분적 (webhook 지연 가능) |
| 재결제 테스트 | Cancel 후 바로 가능 | Xcode Transaction Manager (권장) 또는 3단계 초기화 |
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

### 핵심 차이점

- **Apple이 구독 생명주기를 관리**하므로 개발자가 즉시 취소할 수 없다
- RevenueCat 대시보드에서는 **Extend subscription만 가능** (Revoke/Expire 없음)
- 샌드박스 구독은 갱신 주기가 짧음 (월간 → 5분, 연간 → 1시간)

### 비구독 상태 테스트

**가장 빠른 방법: Supabase DB 직접 수정**

```sql
-- 구독 만료 처리
UPDATE subscriptions SET status = 'expired', updated_at = now()
WHERE user_id = '...' AND platform = 'ios';
```

> **`cancelled` 상태 주의**: `cancelled` + `subscriptionEndDate > now()` 조합일 경우 앱이 여전히 활성 구독으로 판단한다.
> 이는 `subscriptionStore.ts`의 `checkActiveSubscription()` 로직 때문이다:
> ```ts
> if (status === 'cancelled' && subscriptionEndDate) {
>   return new Date(subscriptionEndDate) > new Date(); // 만료일 전이면 활성
> }
> ```
> 따라서 비구독 테스트 시 반드시 `status = 'expired'`로 변경해야 한다. `cancelled`로는 불충분하다.

**샌드박스 자동 만료 방법 (시간 소요)**

1. 기기 설정 → App Store → 샌드박스 계정 → Manage Subscriptions → Cancel
2. Opted-out of renewal 상태가 됨
3. 다음 renewal date에 자동 만료 (샌드박스 갱신 주기에 따라 수 분~1시간)

### 새 구독 결제 테스트

기존 구독 이력이 남아있으면 Apple이 "이미 구독 중"으로 판단하므로 초기화가 필요하다.

#### 권장: Xcode Transaction Manager

가장 확실한 방법. StoreKit 레벨에서 트랜잭션을 직접 삭제하므로 샌드박스 캐싱 문제를 우회한다.

1. 실기기를 Mac에 연결하고 Xcode에서 앱 실행
2. Xcode 메뉴 → **Debug** → **StoreKit** → **Manage Transactions**
3. 해당 트랜잭션 우클릭 → **Delete Transaction**
4. 앱에서 구독 화면으로 이동 → 새로 결제

- 샌드박스 계정 재생성 불필요
- RevenueCat/Supabase 별도 초기화 불필요 (새 트랜잭션으로 webhook이 다시 처리)

#### 보조: 3단계 초기화

> **주의**: Apple 샌드박스는 Apple ID 레벨에서 구독을 캐싱한다. 아래 3단계를 모두 수행해도 Apple이 구독을 캐싱하여 "이미 구독 중" 오류가 발생할 수 있다. 이 경우 위의 **Xcode Transaction Manager**를 사용하라.

**Step 1: Apple 구매 이력 초기화**
- App Store Connect → Users and Access → **Sandbox** → 해당 테스터 → **Clear Purchase History**
- 이것은 Apple 측만 초기화하며, RevenueCat/Supabase에는 영향 없음

**Step 2: RevenueCat 고객 정보 삭제**
- RevenueCat 대시보드 → **Customers** → 해당 App User ID 검색 → **Delete**
- 삭제하면 RevenueCat이 해당 유저를 새 고객으로 인식

**Step 3: 앱에서 재결제**
- 앱 재로그인 (또는 앱 재설치)
- 구독 화면에서 새로 결제

### 주의사항

- **Clear Purchase History만으로는 부족**: Apple만 초기화되고 RevenueCat/Supabase는 기존 구독 상태 유지
- **RevenueCat Delete만으로는 부족**: Apple에 구매 이력이 남아있으면 결제 시 "이미 구독 중" 오류
- **반드시 Step 1 + Step 2 모두 수행** 후 재결제해야 깨끗한 테스트 가능
- **3단계 초기화가 실패하면**: Xcode Transaction Manager 사용 (Apple 샌드박스 캐싱 우회)

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
| Cancel 했는데 앱에서 여전히 구독 상태 | Webhook 미처리 또는 클라이언트 캐시 | DB 직접 확인 후 수동 갱신 |
| 재결제 시 "이미 구독 중" (Apple) | Apple/RevenueCat에 이전 이력 잔존 | Xcode Transaction Manager로 트랜잭션 삭제 |
| 3단계 초기화 후에도 "이미 구독 중" | Apple 샌드박스가 Apple ID 레벨에서 구독 캐싱 | Xcode → Debug → StoreKit → Manage Transactions → Delete Transaction |
| DB는 expired인데 앱에서 구독 표시 | 클라이언트 store 캐시 | 앱 재로그인 또는 store 초기화 |
| cancelled인데 앱에서 구독 활성 표시 | `cancelled` + 만료일 미도래 시 활성 판단 로직 | DB에서 `status`를 `expired`로 변경 |
| RevenueCat에서 Delete 후에도 구독 유지 | Supabase DB 미정리 | DB에서 해당 레코드 삭제/만료 처리 |
