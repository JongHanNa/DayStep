/**
 * AccountView — 프로필 + 구독 상태 + 주문 내역
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {useAuthStore} from '@/stores/authStore';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import {useTheme} from '@/theme';
import {supabase} from '@/lib/supabase';
import {
  ArrowLeft,
  User,
  Crown,
  CreditCard,
  ChevronRight,
} from 'lucide-react-native';
import {showManageSubscriptions} from '@/lib/revenueCat';
import {AnimatedPressable} from '@/components/core';

interface AccountViewProps {
  onBack: () => void;
}

interface OrderRecord {
  id: string;
  event_type: string;
  platform: string;
  product_id: string | null;
  created_at: string;
  metadata: any;
}

export function AccountView({onBack}: AccountViewProps) {
  const {primaryColor} = useTheme();
  const {user} = useAuthStore();
  const {
    hasActiveSubscription,
    subscriptionInfo,
    isInGracePeriod,
    gracePeriodDaysRemaining,
  } = useSubscriptionStore();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '사용자';

  // 주문 내역 조회
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const {data, error} = await supabase
          .from('subscription_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', {ascending: false})
          .limit(50);

        if (!error && data) {
          setOrders(data);
        }
      } catch (err) {
        console.error('[AccountView] order fetch error:', err);
      } finally {
        setOrdersLoading(false);
      }
    })();
  }, [user?.id]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      trial_started: '무료 체험 시작',
      trial_converted: '구독 전환',
      trial_expired: '체험 만료',
      subscription_started: '구독 시작',
      subscription_renewed: '구독 갱신',
      subscription_cancelled: '구독 취소',
      subscription_expired: '구독 만료',
      subscription_paused: '구독 일시정지',
      subscription_resumed: '구독 재개',
      refund: '환불',
    };
    return labels[eventType] ?? eventType;
  };

  const getProductLabel = (productId: string | null) => {
    if (!productId) return '';
    if (productId.includes('monthly')) return '월간 플랜';
    if (productId.includes('yearly')) return '연간 플랜';
    return productId;
  };

  const getStatusText = () => {
    if (hasActiveSubscription) {
      if (subscriptionInfo?.status === 'trial') return 'Pro 체험 중';
      return 'Pro 구독 중';
    }
    if (isInGracePeriod && gracePeriodDaysRemaining > 0) {
      return `Pro 체험 중 (${gracePeriodDaysRemaining}일 남음)`;
    }
    return 'Free';
  };

  const getStatusColor = () => {
    if (hasActiveSubscription) return '#F59E0B';
    if (isInGracePeriod) return primaryColor;
    return '#9CA3AF';
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <AnimatedPressable onPress={onBack} hapticType="light" scaleValue={0.9}>
          <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
        </AnimatedPressable>
        <Text style={styles.title}>계정</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* 프로필 카드 */}
        <AnimatedCard enterDelay={0} style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{uri: avatarUrl}} style={styles.avatarImage} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {backgroundColor: primaryColor + '20'},
                ]}>
                <User size={32} color={primaryColor} strokeWidth={1.5} />
              </View>
            )}
            <View
              style={[
                styles.crownBadge,
                !hasActiveSubscription && styles.crownBadgeInactive,
              ]}>
              <Crown
                size={10}
                color={hasActiveSubscription ? '#92400E' : '#FFFFFF'}
                strokeWidth={2.5}
                fill={hasActiveSubscription ? '#FCD34D' : 'none'}
              />
            </View>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
          <View style={styles.statusRow}>
            <View
              style={[styles.statusDot, {backgroundColor: getStatusColor()}]}
            />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </AnimatedCard>

        {/* 구독 관리 */}
        {hasActiveSubscription && (
          <AnimatedCard
            enterDelay={50}
            style={styles.actionCard}
            onPress={() => showManageSubscriptions()}>
            <CreditCard size={18} color={primaryColor} strokeWidth={1.5} />
            <Text style={styles.actionText}>구독 관리</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </AnimatedCard>
        )}

        {/* 주문 내역 */}
        <Text style={styles.sectionTitle}>
          {ordersLoading
            ? '주문 내역'
            : orders.length > 0
            ? `${orders.length}건의 주문`
            : '주문 내역'}
        </Text>

        {ordersLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#9CA3AF" />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>주문 내역이 없습니다</Text>
          </View>
        ) : (
          orders.map((order, idx) => (
            <AnimatedCard
              key={order.id}
              enterDelay={100 + idx * 30}
              style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderDate}>
                  {formatDate(order.created_at)}
                </Text>
                <Text style={styles.orderEvent}>
                  {getEventLabel(order.event_type)}
                </Text>
              </View>
              {order.product_id && (
                <Text style={styles.orderProduct}>
                  {getProductLabel(order.product_id)}
                </Text>
              )}
              {order.platform && (
                <Text style={styles.orderPlatform}>
                  {order.platform === 'ios'
                    ? 'App Store'
                    : order.platform === 'web'
                    ? 'Paddle'
                    : order.platform}
                </Text>
              )}
            </AnimatedCard>
          ))
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    marginHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  crownBadgeInactive: {
    backgroundColor: '#D1D5DB',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  orderCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderEvent: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  orderProduct: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  orderPlatform: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
