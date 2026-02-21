'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CenteredLoadingSpinner } from '@/components/ui/loading-spinner';
import type { AdminStats } from '@/lib/admin/types';

const STATUS_LABELS: Record<string, string> = {
  trial: 'Trial',
  active: 'Active',
  cancelled: 'Cancelled',
  expired: 'Expired',
  paused: 'Paused',
};

const STATUS_COLORS: Record<string, string> = {
  trial: 'text-info',
  active: 'text-success',
  cancelled: 'text-warning',
  expired: 'text-error',
  paused: 'text-base-content/50',
};

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
};

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session?.access_token]);

  if (loading) return <CenteredLoadingSpinner />;
  if (error) return <div className="text-error text-center py-12">{error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Total Subscriptions" value={stats.totalSubscriptions} />
        <StatCard
          label="Active"
          value={stats.byStatus.active + stats.byStatus.trial}
          sub={`${stats.byStatus.active} active + ${stats.byStatus.trial} trial`}
        />
        <StatCard label="Events (7d)" value={stats.recentEventsCount} />
      </div>

      {/* By Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">By Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className={`text-2xl font-bold ${STATUS_COLORS[status] || ''}`}>
                  {count}
                </div>
                <div className="text-sm text-base-content/60">
                  {STATUS_LABELS[status] || status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Platform & Product */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byPlatform).map(([platform, count]) => (
                <div key={platform} className="flex justify-between items-center">
                  <span className="text-sm">{PLATFORM_LABELS[platform] || platform}</span>
                  <span className="font-mono font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byProduct).map(([product, count]) => (
                <div key={product} className="flex justify-between items-center">
                  <span className="text-sm font-mono">{product}</span>
                  <span className="font-mono font-bold">{count}</span>
                </div>
              ))}
              {Object.keys(stats.byProduct).length === 0 && (
                <div className="text-base-content/40 text-sm">No subscriptions yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-3xl font-bold">{value.toLocaleString()}</div>
        <div className="text-sm text-base-content/60 mt-1">{label}</div>
        {sub && <div className="text-xs text-base-content/40 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
