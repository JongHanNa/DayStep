'use client';

import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import {
  Inbox, Search, Calendar, Zap, CheckCircle,
  FolderOpen, Target, BookOpen, Archive,
  Smartphone, Puzzle, RefreshCw,
  Clock, FileText, Lightbulb, Settings
} from 'lucide-react';

export default function SecondBrainStartPage() {
  const router = useRouter();

  const handleStartSetup = () => {
    router.push('/second-brain/areas');
  };

  const handleSkipToMain = () => {
    router.push('/second-brain/inbox');
  };

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
          <h1 className="text-2xl font-bold">DayStep</h1>
          <p className="text-sm text-base-content/70 mt-1">
            ADHD를 위한 체계적인 생산성 시스템
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* 히어로 메시지 */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-2xl">환영합니다!</h2>
              <p className="text-base-content/70">
                DayStep은 <strong>ADHD를 위한 체계적인 생산성 시스템</strong>입니다.
                <br />
                GTD + PARA 방법론 기반 Second Brain으로 일상을 관리하세요.
              </p>
            </div>
          </div>

          {/* Second Brain 시스템 소개 */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-lg">
                Second Brain 시스템이란?
              </h3>
              <div className="space-y-4 mt-2">
                {/* GTD 5단계 */}
                <div>
                  <p className="font-medium text-sm mb-2">
                    GTD (Getting Things Done) 5단계 프로세스
                  </p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <div className="badge badge-primary badge-lg whitespace-nowrap flex items-center gap-1">
                      <Inbox className="w-3 h-3" />
                      수집
                    </div>
                    <span className="text-base-content/50">→</span>
                    <div className="badge badge-secondary badge-lg whitespace-nowrap flex items-center gap-1">
                      <Search className="w-3 h-3" />
                      명료화
                    </div>
                    <span className="text-base-content/50">→</span>
                    <div className="badge badge-accent badge-lg whitespace-nowrap flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      계획
                    </div>
                    <span className="text-base-content/50">→</span>
                    <div className="badge badge-success badge-lg whitespace-nowrap flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      실행
                    </div>
                    <span className="text-base-content/50">→</span>
                    <div className="badge badge-info badge-lg whitespace-nowrap flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      점검
                    </div>
                  </div>
                </div>

                {/* PARA 4분류 */}
                <div>
                  <p className="font-medium text-sm mb-2">PARA 정보 분류 체계</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-start gap-2 text-xs">
                      <FolderOpen className="w-4 h-4 mt-0.5" />
                      <div>
                        <span className="font-medium">Projects</span>
                        <br />
                        <span className="text-base-content/60">종료일 있는 작업</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <Target className="w-4 h-4 mt-0.5" />
                      <div>
                        <span className="font-medium">Areas</span>
                        <br />
                        <span className="text-base-content/60">지속적 책임영역</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <BookOpen className="w-4 h-4 mt-0.5" />
                      <div>
                        <span className="font-medium">Resources</span>
                        <br />
                        <span className="text-base-content/60">관심 주제</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <Archive className="w-4 h-4 mt-0.5" />
                      <div>
                        <span className="font-medium">Archive</span>
                        <br />
                        <span className="text-base-content/60">완료/중단 항목</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ADHD 친화적 설계 */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-lg">
                왜 ADHD에 적합한가요?
              </h3>
              <div className="space-y-3 mt-2">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">올인원 통합 관리</p>
                    <p className="text-xs text-base-content/60 mt-1">
                      여러 앱을 오가며 생기는 집중력 분산을 방지합니다
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">즉시 피드백</p>
                    <p className="text-xs text-base-content/60 mt-1">
                      완료할 때마다 성취감을 느끼고 지속적인 동기 부여를 받습니다
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Puzzle className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">인지 부하 최소화</p>
                    <p className="text-xs text-base-content/60 mt-1">
                      간단한 인터페이스와 명확한 프로세스로 실행 장벽을 낮춥니다
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">건강한 루틴 형성</p>
                    <p className="text-xs text-base-content/60 mt-1">
                      충동적 행동을 계획적 행동으로 전환하는 습관을 만듭니다
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GTD 루틴 시스템 */}
          <div className="card bg-base-200 border-l-4 border-primary">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="card-title text-base m-0">GTD 루틴</h3>
                <span className="badge badge-primary badge-sm">매일 반복</span>
              </div>
              <p className="text-xs text-base-content/60 mt-1">
                생각을 비우고 명확하게 실행하는 일상 워크플로우
              </p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex flex-col items-center text-center p-3 bg-base-100/50 rounded-lg">
                  <Inbox className="w-8 h-8 mb-2" />
                  <div className="text-xs font-medium">수집</div>
                  <div className="text-[10px] text-base-content/50">Inbox</div>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-base-100/50 rounded-lg">
                  <Search className="w-8 h-8 mb-2" />
                  <div className="text-xs font-medium">명료화</div>
                  <div className="text-[10px] text-base-content/50">Clarify</div>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-base-100/50 rounded-lg">
                  <Calendar className="w-8 h-8 mb-2" />
                  <div className="text-xs font-medium">계획</div>
                  <div className="text-[10px] text-base-content/50">Plan</div>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-base-100/50 rounded-lg">
                  <CheckCircle className="w-8 h-8 mb-2" />
                  <div className="text-xs font-medium">점검</div>
                  <div className="text-[10px] text-base-content/50">Review</div>
                </div>
              </div>
            </div>
          </div>

          {/* PARA 생산성 시스템 */}
          <div className="card bg-base-200 border-l-4 border-secondary">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="card-title text-base m-0">PARA 생산성</h3>
                <span className="badge badge-secondary badge-sm">장기 관리</span>
              </div>
              <p className="text-xs text-base-content/60 mt-1">
                목표와 정보를 체계적으로 정리하는 생산성 도구
              </p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex flex-col items-center text-center p-3 bg-base-100/50 rounded-lg">
                  <Clock className="w-8 h-8 mb-2" />
                  <div className="text-xs font-medium">타임라인</div>
                  <div className="text-[10px] text-base-content/50">Do</div>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-base-100/50 rounded-lg">
                  <Target className="w-8 h-8 mb-2" />
                  <div className="text-xs font-medium">목표</div>
                  <div className="text-[10px] text-base-content/50">Goals</div>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-base-100/50 rounded-lg">
                  <FileText className="w-8 h-8 mb-2" />
                  <div className="text-xs font-medium">노트</div>
                  <div className="text-[10px] text-base-content/50">Notes</div>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-base-100/50 rounded-lg">
                  <Archive className="w-8 h-8 mb-2" />
                  <div className="text-xs font-medium">아카이브</div>
                  <div className="text-[10px] text-base-content/50">Archive</div>
                </div>
              </div>
            </div>
          </div>

          {/* 시작하기 안내 */}
          <div className="alert bg-primary/10 border-0">
            <Lightbulb className="w-5 h-5" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                처음 사용하시나요?
              </p>
              <p className="text-xs text-base-content/70">
                5분 가이드로 나만의 Second Brain을 직접 만들어보세요
              </p>
            </div>
          </div>

          {/* Second Brain 셋업 시작하기 */}
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-6 h-6" />
                <h3 className="card-title text-lg m-0">Second Brain 셋업</h3>
              </div>
              <p className="text-sm text-base-content/70 mb-4">
                5단계로 나만의 생산성 시스템을 설정하세요.
                <br />
                <span className="text-xs">
                  <strong>설정 &gt; Second Brain 설정</strong>에서 차근차근 진행할 수 있습니다.
                </span>
              </p>

              {/* 5단계 미리보기 */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <span className="text-sm">책임 영역 만들기</span>
                  <span className="text-xs text-base-content/50 ml-auto hidden sm:block">
                    Areas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs">
                    2
                  </div>
                  <span className="text-sm">관심 자원 만들기</span>
                  <span className="text-xs text-base-content/50 ml-auto hidden sm:block">
                    Resources
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs">
                    3
                  </div>
                  <span className="text-sm">목표 설정하기</span>
                  <span className="text-xs text-base-content/50 ml-auto hidden sm:block">
                    Goals
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs">
                    4
                  </div>
                  <span className="text-sm">프로젝트 설정하기</span>
                  <span className="text-xs text-base-content/50 ml-auto hidden sm:block">
                    Projects
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs">
                    5
                  </div>
                  <span className="text-sm">할일 템플릿 설정하기</span>
                  <span className="text-xs text-base-content/50 ml-auto hidden sm:block">
                    Todos
                  </span>
                </div>
              </div>

              {/* 시작 안내 */}
              <div className="bg-info/10 p-4 rounded-lg mb-6">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-base-content/80 space-y-2">
                    <p>
                      <strong>추천 항목</strong> 버튼으로 빠르게 시작할 수 있어요.
                    </p>
                    <p>
                      직장, 가족, 건강 등 시작하기 좋은 영역들을 준비했습니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="card-actions">
                <button onClick={handleStartSetup} className="btn btn-primary w-full">
                  <Settings className="w-4 h-4" />
                  설정에서 시작하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
    </AuthGuard>
  );
}
