'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    redirect('/login');
  }

  if (!appUser?.isAdmin) {
    redirect('/');
  }

  return <>{children}</>;
}
