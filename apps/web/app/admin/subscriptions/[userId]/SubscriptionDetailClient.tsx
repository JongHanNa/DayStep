'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CenteredLoadingSpinner } from '@/components/ui/loading-spinner';
import type { UserDetailResponse } from '@/lib/admin/types';

const STATUS_BADGE_CLASS: Record<string, string> = {
  trial: 'bg-info/20 text-info border-info/30',
  active: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-warning/20 text-warning border-warning/30',
  expired: 'bg-error/20 text-error border-error/30',
  paused: 'bg-base-300 text-base-content/50 border-base-300',
};

const EVENT_COLORS: Record<string, string> = {
  trial_started: 'bg-info',
  trial_converted: 'bg-success',
  trial_expired: 'bg-warning',
  subscription_started: 'bg-success',
  subscription_renewed: 'bg-success',
  subscription_cancelled: 'bg-warning',
  subscription_expired: 'bg-error',
  subscription_paused: 'bg-base-300',
  subscription_resumed: 'bg-info',
  product_changed: 'bg-primary',
  refund_issued: 'bg-error',
  payment_refunded: 'bg-error',
  billing_issue: 'bg-warning',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { session } = useAuth();
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token || !userId) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/subscriptions/${userId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session?.access_token, userId]);

  if (loading) return <CenteredLoadingSpinner />;
  if (error) return <div className="text-error text-center py-12">{error}</div>;
  if (!data) return null;

  const { user, subscription, history, authInfo } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-base-content/60">
        <Link href="/admin/subscriptions" className="hover:text-base-content">
          Subscriptions
        </Link>
        <span>/</span>
        <span className="text-base-content">{user.email || userId}</span>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoRow label="ID" value={user.id} mono />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Name" value={user.name} />
            <InfoRow label="Subscription Type" value={user.subscription_type} />
            <InfoRow label="Has Active Sub" value={user.has_active_subscription ? 'Yes' : 'No'} />
            <InfoRow label="Sub Expires" value={formatDate(user.subscription_expires_at)} />
            <InfoRow label="Refund Count" value={String(user.refund_count ?? 0)} />
            <InfoRow label="Created" value={formatDate(user.created_at)} />
            {authInfo && (
              <>
                <InfoRow label="Auth Provider" value={authInfo.provider} />
                <InfoRow label="Last Sign In" value={formatDate(authInfo.lastSignIn)} />
                <InfoRow label="Auth Created" value={formatDate(authInfo.createdAt)} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Detail */}
      {subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Subscription</CardTitle>
              <Badge className={STATUS_BADGE_CLASS[subscription.status] || ''}>
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow label="ID" value={subscription.id} mono />
              <InfoRow label="Platform" value={subscription.platform} />
              <InfoRow label="Product" value={subscription.product_id} mono />
              <InfoRow label="Auto Renew" value={subscription.auto_renew_enabled ? 'Yes' : 'No'} />
              <InfoRow label="Start Date" value={formatDate(subscription.subscription_start_date)} />
              <InfoRow label="End Date" value={formatDate(subscription.subscription_end_date)} />
              <InfoRow label="Trial Start" value={formatDate(subscription.trial_start_date)} />
              <InfoRow label="Trial End" value={formatDate(subscription.trial_end_date)} />
              <InfoRow label="Cancelled At" value={formatDate(subscription.cancelled_at)} />
              <InfoRow label="Promo Code" value={subscription.promo_code} />
              {subscription.promo_discount_percentage && (
                <InfoRow label="Promo Discount" value={`${subscription.promo_discount_percentage}%`} />
              )}
              <InfoRow label="RevenueCat Subscriber" value={subscription.revenue_cat_subscriber_id} mono />
              <InfoRow label="Legacy User" value={subscription.is_legacy_user ? 'Yes' : 'No'} />
              <InfoRow label="Created" value={formatDate(subscription.created_at)} />
              <InfoRow label="Updated" value={formatDate(subscription.updated_at)} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-base-content/40">
            No subscription found
          </CardContent>
        </Card>
      )}

      {/* Event Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event History ({history.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-base-content/40 text-center py-4">No events</div>
          ) : (
            <div className="relative pl-6 space-y-4">
              {/* Timeline line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-base-300" />

              {history.map((event) => (
                <div key={event.id} className="relative flex gap-3">
                  {/* Dot */}
                  <div
                    className={`absolute left-[-15px] top-1.5 w-3 h-3 rounded-full border-2 border-base-100 ${
                      EVENT_COLORS[event.event_type] || 'bg-base-300'
                    }`}
                  />
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{event.event_type}</span>
                      <span className="text-xs text-base-content/40">
                        {event.platform}
                      </span>
                      <span className="text-xs text-base-content/40 font-mono">
                        {event.product_id}
                      </span>
                    </div>
                    <div className="text-xs text-base-content/50 mt-0.5">
                      {formatDate(event.event_timestamp || event.created_at)}
                    </div>
                    {event.metadata && (
                      <details className="mt-1">
                        <summary className="text-xs text-base-content/40 cursor-pointer hover:text-base-content/60">
                          metadata
                        </summary>
                        <pre className="text-xs bg-base-200 rounded p-2 mt-1 overflow-x-auto max-h-32">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-base-content/50">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : ''} ${!value ? 'text-base-content/30' : ''} break-all`}>
        {value || '-'}
      </div>
    </div>
  );
}
