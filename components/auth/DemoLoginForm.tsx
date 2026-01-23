'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Mail, Lock, LogIn } from 'lucide-react';

/**
 * 데모 계정 로그인 폼
 * 포트폴리오 체험용 이메일/비밀번호 로그인
 */
export default function DemoLoginForm() {
  const { signInWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 안내 문구 */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        <p className="mt-1">
          아래 계정으로  Pro의 모든 기능을 체험해보세요
        </p>
      </div>

      {/* 이메일 입력 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Mail className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="demo@daystep.app"
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          disabled={loading}
        />
      </div>

      {/* 비밀번호 입력 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Lock className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          disabled={loading}
        />
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      {/* 로그인 버튼 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            <span>로그인 중...</span>
          </>
        ) : (
          <>
            <LogIn className="h-5 w-5" />
            <span>체험 계정으로 로그인</span>
          </>
        )}
      </button>

      {/* 계정 정보 힌트 */}
      <div className="text-xs text-center text-gray-500 dark:text-gray-400 space-y-1 mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p><strong>이메일:</strong> demo@daystep.app</p>
        <p><strong>비밀번호:</strong> Demo2026!</p>
      </div>
    </form>
  );
}
