'use client';

import {
  Inbox, Search, Calendar, CheckCircle, Zap,
  FolderOpen, Target, BookOpen, Archive,
  Smartphone, Puzzle, RefreshCw, Clock, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUpVariants, getBidirectionalViewportOptions, staggerFadeInUpVariants, getMagneticProps } from '@/lib/animations/scrollAnimations';

export default function SystemSection() {
  const fadeInVariants = fadeInUpVariants(80);
  const bidirectionalViewportOptions = getBidirectionalViewportOptions(0.1);
  const staggerVariants = staggerFadeInUpVariants(60, 0.1);

  return (
    <motion.section
      id="system"
      className="py-20 px-4"
      variants={fadeInVariants}
      initial="hidden"
      whileInView="visible"
      viewport={bidirectionalViewportOptions}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Second Brain 시스템
          </h2>
          <p className="text-lg text-white/90 max-w-3xl mx-auto">
            GTD + PARA 방법론 기반의 체계적인 생산성 시스템으로
            <br className="hidden sm:block" />
            생각을 정리하고 목표를 달성하세요
          </p>
        </div>

        {/* GTD Process */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">
              GTD (Getting Things Done)
            </h3>
            <p className="text-white/90">
              생각을 비우고 명확하게 실행하는 5단계 프로세스
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4"
            variants={staggerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewportOptions}
          >
            <motion.div
              variants={staggerVariants.item}
              {...getMagneticProps()}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-semibold text-base-content mb-1">수집</h4>
              <p className="text-xs text-base-content/60">Inbox</p>
            </motion.div>

            <motion.div
              variants={staggerVariants.item}
              {...getMagneticProps()}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-secondary" />
              </div>
              <h4 className="font-semibold text-base-content mb-1">명료화</h4>
              <p className="text-xs text-base-content/60">Clarify</p>
            </motion.div>

            <motion.div
              variants={staggerVariants.item}
              {...getMagneticProps()}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-accent" />
              </div>
              <h4 className="font-semibold text-base-content mb-1">계획</h4>
              <p className="text-xs text-base-content/60">Plan</p>
            </motion.div>

            <motion.div
              variants={staggerVariants.item}
              {...getMagneticProps()}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-success" />
              </div>
              <h4 className="font-semibold text-base-content mb-1">실행</h4>
              <p className="text-xs text-base-content/60">Do</p>
            </motion.div>

            <motion.div
              variants={staggerVariants.item}
              {...getMagneticProps()}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-info" />
              </div>
              <h4 className="font-semibold text-base-content mb-1">점검</h4>
              <p className="text-xs text-base-content/60">Review</p>
            </motion.div>
          </motion.div>
        </div>

        {/* PARA System */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">
              PARA 정보 분류 체계
            </h3>
            <p className="text-white/90">
              목표와 정보를 체계적으로 정리하는 4가지 영역
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-lg font-semibold text-base-content mb-2">
                Projects
              </h4>
              <p className="text-sm text-base-content/70">
                종료일이 있는 단기 작업과 프로젝트
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-secondary" />
              </div>
              <h4 className="text-lg font-semibold text-base-content mb-2">
                Areas
              </h4>
              <p className="text-sm text-base-content/70">
                지속적으로 관리하는 책임 영역
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-lg font-semibold text-base-content mb-2">
                Resources
              </h4>
              <p className="text-sm text-base-content/70">
                관심 있는 주제와 학습 자료
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center mb-4">
                <Archive className="w-6 h-6 text-info" />
              </div>
              <h4 className="text-lg font-semibold text-base-content mb-2">
                Archive
              </h4>
              <p className="text-sm text-base-content/70">
                완료되거나 중단된 항목 보관
              </p>
            </div>
          </div>
        </div>

        {/* ADHD Friendly Design */}
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl p-8 md:p-12">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-white mb-2">
              ADHD 친화적 설계
            </h3>
            <p className="text-white/90">
              집중력과 생산성을 높이는 특별한 설계
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-base-content mb-2">
                    올인원 통합 관리
                  </h4>
                  <p className="text-sm text-base-content/70">
                    여러 앱을 오가며 생기는 집중력 분산을 방지합니다
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h4 className="font-semibold text-base-content mb-2">
                    즉시 피드백
                  </h4>
                  <p className="text-sm text-base-content/70">
                    완료할 때마다 성취감을 느끼고 지속적인 동기 부여를 받습니다
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Puzzle className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-base-content mb-2">
                    인지 부하 최소화
                  </h4>
                  <p className="text-sm text-base-content/70">
                    간단한 인터페이스와 명확한 프로세스로 실행 장벽을 낮춥니다
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-6 h-6 text-info" />
                </div>
                <div>
                  <h4 className="font-semibold text-base-content mb-2">
                    건강한 루틴 형성
                  </h4>
                  <p className="text-sm text-base-content/70">
                    충동적 행동을 계획적 행동으로 전환하는 습관을 만듭니다
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Workflow Preview */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* GTD Daily */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 border-l-4 border-primary">
            <div className="flex items-center gap-3 mb-4">
              <h4 className="text-xl font-bold text-white">GTD 루틴</h4>
              <span className="badge badge-primary badge-sm">매일 반복</span>
            </div>
            <p className="text-sm text-white/90 mb-6">
              생각을 비우고 명확하게 실행하는 일상 워크플로우
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Inbox className="w-5 h-5 text-primary" />
                <span>수집 → Inbox로 모든 생각 비우기</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Search className="w-5 h-5 text-primary" />
                <span>명료화 → 구체적 행동으로 전환</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-5 h-5 text-primary" />
                <span>계획 → 타임라인에 배치</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>점검 → 완료 항목 검토</span>
              </div>
            </div>
          </div>

          {/* PARA Long-term */}
          <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-2xl p-8 border-l-4 border-secondary">
            <div className="flex items-center gap-3 mb-4">
              <h4 className="text-xl font-bold text-white">PARA 생산성</h4>
              <span className="badge badge-secondary badge-sm">장기 관리</span>
            </div>
            <p className="text-sm text-white/90 mb-6">
              목표와 정보를 체계적으로 정리하는 생산성 도구
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-5 h-5 text-secondary" />
                <span>타임라인 → 일정과 할일 관리</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Target className="w-5 h-5 text-secondary" />
                <span>목표 → 장기 목표 설정</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FileText className="w-5 h-5 text-secondary" />
                <span>노트 → 지식 정리 및 보관</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Archive className="w-5 h-5 text-secondary" />
                <span>아카이브 → 완료 항목 보관</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
