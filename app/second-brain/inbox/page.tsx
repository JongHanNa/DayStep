'use client';

import { useEffect, useState } from 'react';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function InboxPage() {
  const { inboxItems, fetchInboxItems, createInboxItem, deleteInboxItem } = useInboxStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    fetchInboxItems();
  }, [fetchInboxItems]);

  const handleAdd = async () => {
    if (!newContent.trim()) return;

    try {
      await createInboxItem({
        content: newContent,
        status: 'inbox',
      });
      setNewContent('');
      setShowAddModal(false);
    } catch (error) {
      console.error('항목 추가 실패:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteInboxItem(id);
    } catch (error) {
      console.error('항목 삭제 실패:', error);
    }
  };

  const handleClarify = (id: string) => {
    // 명료화 페이지로 이동 (추후 구현)
    alert('명료화 기능은 추후 구현 예정입니다.');
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">수집함</h1>
            <p className="text-sm text-base-content/70">
              {inboxItems.length}개의 항목
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {inboxItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📥</div>
            <p className="text-base-content/50">수집함이 비어있습니다</p>
            <p className="text-sm text-base-content/30 mt-2">
              + 버튼을 눌러 새로운 항목을 추가하세요
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {inboxItems.map((item) => (
              <div key={item.id} className="card bg-base-200 hover:bg-base-300 transition-colors">
                <div className="card-body p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm">{item.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-base-content/50">
                          {formatDistanceToNow(new Date(item.created_at), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </span>
                        {item.context && (
                          <span className="badge badge-xs badge-ghost">{item.context}</span>
                        )}
                        {item.energy_level && (
                          <span className="badge badge-xs badge-ghost">{item.energy_level}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleClarify(item.id)}
                        className="btn btn-ghost btn-sm btn-square"
                        title="명료화"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn btn-ghost btn-sm btn-square text-error"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 추가 모달 */}
      {showAddModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">새 항목 추가</h3>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="머릿속에 떠오르는 모든 것을 입력하세요..."
              className="textarea textarea-bordered w-full h-32"
              autoFocus
            />
            <div className="modal-action">
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleAdd} disabled={!newContent.trim()} className="btn btn-primary">
                추가
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)} />
        </div>
      )}

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}
