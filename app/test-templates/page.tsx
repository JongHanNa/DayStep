'use client';

import { useEffect, useState } from 'react';
import { fetchNoteTagTemplatesWithJWT } from '@/lib/supabaseWebViewHelper';
import { useMemoTagStore } from '@/state/stores/memoTagStore';
import type { NoteTagTemplate } from '@/types';

export default function TestTemplatesPage() {
  const [directApiResults, setDirectApiResults] = useState<NoteTagTemplate[]>([]);
  const [directApiLoading, setDirectApiLoading] = useState(false);
  const [directApiError, setDirectApiError] = useState<string | null>(null);

  const {
    templates,
    templatesLoading,
    loadTemplates,
    getFilteredTemplates,
    loadState
  } = useMemoTagStore();

  const testDirectApi = async () => {
    setDirectApiLoading(true);
    setDirectApiError(null);
    try {
      console.log('🧪 직접 API 호출 테스트 시작');
      const results = await fetchNoteTagTemplatesWithJWT();
      console.log('🧪 직접 API 결과:', results);
      setDirectApiResults(results);
    } catch (error) {
      console.error('🧪 직접 API 오류:', error);
      setDirectApiError(error instanceof Error ? error.message : '알 수 없는 오류');
    } finally {
      setDirectApiLoading(false);
    }
  };

  const testStoreLoad = async () => {
    console.log('🧪 스토어 로딩 테스트 시작');
    await loadTemplates(true);
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('memo-tag-store');
    console.log('🧹 로컬 스토리지 클리어 완료');
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">템플릿 로딩 테스트</h1>

      {/* 스토어 상태 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">스토어 상태</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>템플릿 개수: {templates.length}</div>
          <div>로딩 중: {templatesLoading ? 'Yes' : 'No'}</div>
          <div>초기화됨: {loadState.templatesInitialized ? 'Yes' : 'No'}</div>
          <div>필터된 템플릿: {getFilteredTemplates().length}</div>
        </div>
        <button
          onClick={testStoreLoad}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          스토어 템플릿 로드 테스트
        </button>
      </div>

      {/* 직접 API 테스트 */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">직접 API 테스트</h2>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>API 결과 개수: {directApiResults.length}</div>
          <div>API 로딩 중: {directApiLoading ? 'Yes' : 'No'}</div>
          <div>API 오류: {directApiError || 'None'}</div>
        </div>
        <button
          onClick={testDirectApi}
          disabled={directApiLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          직접 API 호출 테스트
        </button>
      </div>

      {/* 유틸리티 */}
      <div className="bg-red-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">유틸리티</h2>
        <button
          onClick={clearLocalStorage}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          로컬 스토리지 클리어 & 새로고침
        </button>
      </div>

      {/* 스토어 템플릿 목록 */}
      {templates.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">스토어 템플릿 목록</h2>
          <div className="grid grid-cols-3 gap-2">
            {templates.slice(0, 6).map((template) => (
              <div key={template.id} className="p-2 bg-white rounded text-sm">
                <div className="font-medium">{template.name}</div>
                <div className="text-gray-500">{template.category}</div>
              </div>
            ))}
          </div>
          {templates.length > 6 && (
            <div className="mt-2 text-sm text-gray-500">
              ... 및 {templates.length - 6}개 더
            </div>
          )}
        </div>
      )}

      {/* 직접 API 결과 */}
      {directApiResults.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">직접 API 결과</h2>
          <div className="grid grid-cols-3 gap-2">
            {directApiResults.slice(0, 6).map((template) => (
              <div key={template.id} className="p-2 bg-white rounded text-sm">
                <div className="font-medium">{template.name}</div>
                <div className="text-gray-500">{template.category}</div>
              </div>
            ))}
          </div>
          {directApiResults.length > 6 && (
            <div className="mt-2 text-sm text-gray-500">
              ... 및 {directApiResults.length - 6}개 더
            </div>
          )}
        </div>
      )}
    </div>
  );
}