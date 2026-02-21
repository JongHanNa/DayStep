'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CenteredLoadingSpinner } from '@/components/ui/loading-spinner';
import type { SubscriptionListResponse, SubscriptionStatus, Platform } from '@/lib/admin/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
  { value: 'paused', label: 'Paused' },
];

const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Platforms' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'web', label: 'Web' },
];

const STATUS_BADGE_CLASS: Record<string, string> = {
  trial: 'bg-info/20 text-info border-info/30',
  active: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-warning/20 text-warning border-warning/30',
  expired: 'bg-error/20 text-error border-error/30',
  paused: 'bg-base-300 text-base-content/50 border-base-300',
};

export default function SubscriptionsListPage() {
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<SubscriptionListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // URL search params에서 필터 상태 읽기
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const platform = searchParams.get('platform') || '';

  const [searchInput, setSearchInput] = useState(search);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    // 필터 변경 시 page를 1로 리셋 (page 변경 제외)
    if (!('page' in updates)) {
      params.delete('page');
    }
    router.push(`/admin/subscriptions?${params.toString()}`);
  }, [searchParams, router]);

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (platform) params.set('platform', platform);

      const res = await fetch(`/api/admin/subscriptions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, page, search, status, platform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 검색 debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Subscriptions</h1>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input input-bordered input-sm flex-1 bg-base-100"
            />
            <select
              value={status}
              onChange={(e) => updateParams({ status: e.target.value })}
              className="select select-bordered select-sm bg-base-100"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={platform}
              onChange={(e) => updateParams({ platform: e.target.value })}
              className="select select-bordered select-sm bg-base-100"
            >
              {PLATFORM_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <CenteredLoadingSpinner />
      ) : error ? (
        <div className="text-error text-center py-8">{error}</div>
      ) : !data || data.subscriptions.length === 0 ? (
        <div className="text-base-content/40 text-center py-8">No subscriptions found</div>
      ) : (
        <>
          {/* Info */}
          <div className="text-sm text-base-content/60">
            Showing {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} of {data.total}
          </div>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-base-content/60">
                    <th>User</th>
                    <th>Status</th>
                    <th>Platform</th>
                    <th>Product</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover">
                      <td>
                        <div className="font-medium text-sm truncate max-w-[200px]">
                          {sub.userEmail || sub.user_id}
                        </div>
                        {sub.userName && (
                          <div className="text-xs text-base-content/40">{sub.userName}</div>
                        )}
                      </td>
                      <td>
                        <Badge className={STATUS_BADGE_CLASS[sub.status] || ''}>
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="text-sm">{sub.platform}</td>
                      <td className="text-sm font-mono">{sub.product_id}</td>
                      <td className="text-sm text-base-content/60">
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        <Link
                          href={`/admin/subscriptions/${sub.user_id}`}
                          className="btn btn-ghost btn-xs"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                className="btn btn-sm btn-ghost"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                ← Prev
              </button>
              <span className="flex items-center px-3 text-sm text-base-content/60">
                {page} / {data.totalPages}
              </span>
              <button
                className="btn btn-sm btn-ghost"
                disabled={page >= data.totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
