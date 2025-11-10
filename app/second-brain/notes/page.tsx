'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/app/context/AuthContext';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { Plus, Pin, FileText, Bookmark } from 'lucide-react';
import type { NoteType } from '@/types/second-brain';

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  note: '일반 노트',
  reference: '레퍼런스',
  work_in_progress: '진행 중',
  read_later: '나중에 읽기',
};

export default function NotesPage() {
  const { appUser } = useAuth();
  const { notes, fetchNotes } = useNoteStore();
  const [filterType, setFilterType] = useState<NoteType | 'all'>('all');

  useEffect(() => {
    if (appUser?.id) {
      fetchNotes(appUser.id);
    }
  }, [appUser?.id, fetchNotes]);

  const filteredNotes = filterType === 'all'
    ? notes
    : notes.filter((note) => note.memo_type === filterType);

  // 고정된 노트와 일반 노트 분리
  const pinnedNotes = filteredNotes.filter((note) => note.is_pinned);
  const regularNotes = filteredNotes.filter((note) => !note.is_pinned);

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-100 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold">노트 관리함</h1>
                <p className="text-sm text-base-content/70">
                  {filteredNotes.length}개의 노트
                </p>
              </div>
              <button className="btn btn-primary btn-sm">
                <Plus className="w-4 h-4" />
                추가
              </button>
            </div>

            {/* 필터 탭 */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setFilterType('all')}
                className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              >
                전체
              </button>
              {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`btn btn-sm ${filterType === type ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {NOTE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-3xl mx-auto px-4 py-6">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-base-content/50">아직 노트가 없습니다</p>
              <p className="text-sm text-base-content/30 mt-2">
                + 버튼을 눌러 새로운 노트를 추가하세요
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 고정된 노트 */}
              {pinnedNotes.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-base-content/70 mb-3 flex items-center gap-2">
                    <Pin className="w-4 h-4" />
                    고정된 노트
                  </h2>
                  <div className="space-y-2">
                    {pinnedNotes.map((note) => (
                      <div key={note.id} className="card bg-primary/10 border border-primary/20">
                        <div className="card-body p-4">
                          <div className="flex items-start gap-3">
                            <Pin className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{note.title}</h3>
                              <p className="text-sm text-base-content/70 line-clamp-2 mt-1">
                                {note.content.replace(/[#*`]/g, '').substring(0, 100)}...
                              </p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="badge badge-xs">{NOTE_TYPE_LABELS[note.memo_type]}</span>
                                {note.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="badge badge-xs badge-ghost"
                                    style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : undefined}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 일반 노트 */}
              {regularNotes.length > 0 && (
                <div>
                  {pinnedNotes.length > 0 && (
                    <h2 className="text-sm font-semibold text-base-content/70 mb-3">
                      모든 노트
                    </h2>
                  )}
                  <div className="space-y-2">
                    {regularNotes.map((note) => (
                      <div key={note.id} className="card bg-base-200 hover:bg-base-300 transition-colors">
                        <div className="card-body p-4">
                          <h3 className="font-semibold truncate">{note.title}</h3>
                          <p className="text-sm text-base-content/70 line-clamp-2 mt-1">
                            {note.content.replace(/[#*`]/g, '').substring(0, 100)}...
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="badge badge-xs">{NOTE_TYPE_LABELS[note.memo_type]}</span>
                            {(note.tags || []).slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="badge badge-xs badge-ghost"
                                style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : undefined}
                              >
                                {tag.name}
                              </span>
                            ))}
                            {(note.tags || []).length > 3 && (
                              <span className="badge badge-xs badge-ghost">
                                +{(note.tags || []).length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 네비게이션 */}
        <SecondBrainBottomNav />
      </div>
    </AuthGuard>
  );
}
