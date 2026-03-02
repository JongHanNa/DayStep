# Paddle 구독 운영 가이드

## 핵심 원칙: 환불과 구독 취소는 별개

Paddle에서 **환불(Refund)과 구독 취소(Cancellation)는 완전히 별개의 작업**이다.
환불만 처리하면 구독이 자동으로 비활성화되지 않는다.

| 작업 | Paddle 메뉴 | 구독 상태 변화 | 금액 처리 |
|------|------------|--------------|---------|
| 환불(Refund) | Transactions → Refund | **변화 없음** (Active 유지) | 환불 완료 |
| 구독 취소(Cancel) | Subscriptions → Cancel | Active → Cancelled | 변화 없음 |
| 둘 다 필요 | 각각 별도 수행 | Cancelled | 환불 완료 |

---

## 운영 절차

### 환불 + 즉시 액세스 차단이 필요한 경우

1. Paddle → **Subscriptions** → 해당 구독 → **Cancel** (즉시 취소)
2. Paddle → **Transactions** → 해당 트랜잭션 → **Refund**

### 환불만 하고 구독 기간은 유지해도 되는 경우

1. Paddle → **Transactions** → 해당 트랜잭션 → **Refund**만 수행

---

## 실제 사례 (2026-03-02)

- **계정**: skwhdgks@gmail.com
- **트랜잭션**: `txn_01khk5003kejme343f9h38mm49`
- **구독**: `sub_01khk534danggr7qam6v49y3f2`

**처리 과정**:
1. 웹앱에서 구독 취소 요청 → 구독 취소 예약됨 (Mar 16까지 이용 가능)
2. Paddle 대시보드에서 환불 처리 → ₩5,500 환불 완료
3. 그러나 구독은 여전히 Active (Scheduled cancellation 상태)
4. 즉시 비활성화하려면 Paddle 대시보드에서 구독을 직접 Cancel해야 함

---

## Supabase DB 상태 확인

Paddle에서 구독 취소 시 webhook으로 Supabase `subscriptions` 테이블이 자동 갱신된다.
webhook이 정상 처리되지 않았을 경우 수동 확인 및 업데이트 필요.

```sql
-- 상태 확인
SELECT id, status, updated_at FROM subscriptions WHERE user_id = '...';

-- 수동 비활성화 (webhook 미처리 시)
UPDATE subscriptions SET status = 'cancelled', updated_at = now() WHERE id = '...';

-- 수동 복원 (잘못 비활성화했을 때)
UPDATE subscriptions SET status = 'active', updated_at = now() WHERE id = '...';
```

> 참고: 구독 테스트/복원 관련 패턴은 `MEMORY.md`의 Subscription Architecture 섹션도 참고.
