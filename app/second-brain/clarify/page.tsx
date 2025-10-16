'use client';

import { useEffect, useState } from 'react';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import InboxTabs, { type InboxTabType } from '@/components/second-brain/clarify/InboxTabs';
import TodoInboxList from '@/components/second-brain/clarify/TodoInboxList';
import NoteInboxList from '@/components/second-brain/clarify/NoteInboxList';
import ProjectInboxList from '@/components/second-brain/clarify/ProjectInboxList';
import ActiveProjectsSection from '@/components/second-brain/clarify/ActiveProjectsSection';
import GTDGuideSection from '@/components/second-brain/clarify/GTDGuideSection';
import type { InboxItem } from '@/types/second-brain';

export default function ClarifyPage() {
  const { inboxItems, fetchInboxItems, fetchInboxItemsByType } = useInboxStore();
  const { projects } = useProjectStore();
  const { notes, fetchNotes } = useNoteStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();

  const [activeTab, setActiveTab] = useState<InboxTabType>('todos');
  const [todoInbox, setTodoInbox] = useState<InboxItem[]>([]);
  const [noteInbox, setNoteInbox] = useState<InboxItem[]>([]);
  const [projectInbox, setProjectInbox] = useState<InboxItem[]>([]);
  const [goalInbox, setGoalInbox] = useState<InboxItem[]>([]);

  useEffect(() => {
    loadInboxData();
  }, []);

  const loadInboxData = async () => {
    await fetchInboxItems();
    await fetchAreas();
    await fetchResources();
    await fetchNotes();
    const todos = await fetchInboxItemsByType('todo');
    const notes = await fetchInboxItemsByType('note');
    const projects = await fetchInboxItemsByType('project');
    const goals = await fetchInboxItemsByType('goal');

    setTodoInbox(todos);
    setNoteInbox(notes);
    setProjectInbox(projects);
    setGoalInbox(goals);
  };

  const handleRefresh = () => {
    loadInboxData();
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-1">명료화</h1>
          <p className="text-sm text-base-content/70">
            수집한 항목을 분류하고 처리하세요
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* 수집함 영역 */}
        <section>
          <h2 className="text-xl font-bold mb-4">수집함 비우기</h2>

          {/* 수집함 탭 */}
          <InboxTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={{
              todos: todoInbox.length,
              notes: noteInbox.length,
              projects: projectInbox.length,
              goals: goalInbox.length,
            }}
          />

          {/* 수집함 리스트 */}
          <div className="mt-4">
            {activeTab === 'todos' && (
              <TodoInboxList
                todos={todoInbox}
                projects={projects}
                notes={notes}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'notes' && (
              <NoteInboxList
                notes={noteInbox}
                areas={areas}
                resources={resources}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'projects' && (
              <ProjectInboxList
                projects={projectInbox}
                onProjectClick={(project) => {
                  alert(`프로젝트 편집 기능은 추후 구현됩니다:\n${project.content}`);
                }}
              />
            )}
            {activeTab === 'goals' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-lg font-semibold text-base-content/70 mb-2">
                  목표 수집함
                </p>
                <p className="text-sm text-base-content/50">
                  목표 수집 기능은 추후 구현 예정입니다
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 구분선 */}
        <div className="divider"></div>

        {/* 진행중인 프로젝트 영역 */}
        <section>
          <ActiveProjectsSection
            projects={projects}
            goals={[]}
            onProjectClick={(project) => {
              alert(`프로젝트 상세 보기:\n${project.title}`);
            }}
          />
        </section>

        {/* 구분선 */}
        <div className="divider"></div>

        {/* GTD 알고리즘 설명 영역 */}
        <section>
          <GTDGuideSection />
        </section>
      </div>

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}
