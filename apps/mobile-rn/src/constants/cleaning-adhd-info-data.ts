/**
 * 청소/정리와 ADHD 교육 정보 — 섹션별 콘텐츠 데이터
 */
import type {InfoSection, ComparisonRow} from './sleep-adhd-info-data';

// ─── 히어로 ───
export const CLEANING_HERO_DATA = {
  badge: '청소/정리와 ADHD',
  title: '왜 ADHD인에게\n청소 시작이 유독 어려울까요',
  intro:
    'ADHD 뇌는 실행기능 장애, 도파민 보상 부재, 감각 과부하라는 삼중 장벽 때문에 청소를 시작하는 것 자체가 일반인과는 차원이 다른 난이도입니다. 이 글에서는 그 이유와 일상투두의 접근법을 설명합니다.',
};

// ─── 섹션 1: 왜 청소가 특히 어려운가 ───
export const WHY_CLEANING_HARD_DATA: InfoSection = {
  title: '왜 청소가 특히 어려운가',
  paragraphs: [
    '청소는 "계획 → 실행 → 유지"의 전 과정에서 실행기능을 요구합니다. 어디부터 시작할지 결정하고, 물건을 분류하고, 순서를 정하는 모든 단계가 전두엽의 작업 기억과 의사결정 능력에 의존해요. ADHD 뇌는 이 실행기능이 기본적으로 약하기 때문에, "방 좀 치워야지"라는 단순한 의도조차 행동으로 전환되기 어렵습니다.',
    '청소는 즉각적인 보상이 없는 대표적인 활동입니다. 도파민 기저치가 낮은 ADHD 뇌는 "깨끗해진 방"이라는 미래 보상보다 "지금 당장 재미있는 것"에 끌릴 수밖에 없어요. 30분 동안 열심히 치워도 "아직도 이만큼 남았네"라는 생각이 보상을 상쇄해버립니다.',
    '물건을 만지고, 먼지 냄새를 맡고, 어질러진 공간을 시각적으로 인식하는 것 자체가 감각 과부하를 일으킬 수 있습니다. 특히 물건이 많이 쌓인 공간에서는 "어디서부터 손을 대야 할지" 뇌가 과부하 상태에 빠져 아예 행동을 멈추게 돼요.',
  ],
  highlights: ['실행기능', '즉각적인 보상이 없는', '감각 과부하'],
};

// ─── 섹션 2: 마이크로태스크 분해 원리 ───
export const MICROTASK_BREAKDOWN_DATA: InfoSection = {
  title: '마이크로태스크 분해 원리',
  paragraphs: [
    '"방 청소하기"는 ADHD 뇌에게 등산과 같습니다. 하지만 "책상 위 컵 3개 싱크대로 옮기기"는 계단 한 칸이에요. 시작 장벽을 극단적으로 낮추면, 전두엽의 의사결정 부담이 줄어들어 "일단 해볼까" 수준으로 진입 장벽이 내려갑니다.',
    'ADHD 뇌는 도파민 보상 주기가 짧아야 동기가 유지됩니다. 마이크로태스크는 2~5분 단위로 "완료!" 체크를 할 수 있게 해주어, 매 완료마다 작은 도파민 히트를 제공합니다. 이 짧은 보상 주기가 다음 태스크로의 이행을 자연스럽게 만들어요.',
    '체크리스트의 힘은 "다음에 뭘 해야 하지?"라는 의사결정을 제거하는 데 있습니다. 서브태스크가 미리 정해져 있으면 작업 기억의 부담이 사라지고, ADHD 뇌도 자동 조종 모드로 진행할 수 있어요.',
  ],
  highlights: ['시작 장벽을 극단적으로 낮추면', '도파민 보상 주기', '의사결정을 제거'],
};

// ─── 섹션 3: 에너지 관리 ───
export const ENERGY_MANAGEMENT_DATA: InfoSection = {
  title: '에너지 기반 태스크 관리',
  paragraphs: [
    'ADHD인의 에너지는 날마다 크게 변동합니다. 어제는 방 전체를 치울 수 있었는데, 오늘은 컵 하나 치우는 것도 힘들 수 있어요. 고정된 청소 루틴은 "나쁜 날"에 실패 경험을 쌓고, 이 실패가 다음 시도의 장벽을 더 높입니다.',
    '일상투두은 에너지를 좋음/보통/힘듦 3단계로 나누고, 각 단계에 맞는 태스크 양을 자동으로 조절합니다. 에너지가 낮은 날에는 가장 간단한 2~3개 태스크만 보여주고, 좋은 날에는 더 많은 태스크를 제안해요.',
    '이 시스템의 핵심은 "과부하 방지"입니다. ADHD 뇌는 할 일이 너무 많으면 전부 포기하는 경향이 있어요. 에너지에 맞게 태스크 수를 제한하면, "이 정도는 할 수 있겠다"는 자기 효능감이 생기고, 실제 완료율이 올라갑니다.',
  ],
  highlights: ['에너지를 좋음/보통/힘듦 3단계', '과부하 방지', '자기 효능감'],
};

// ─── 섹션 4: 루틴 자동화 (순환 다이어그램) ───
export const ROUTINE_AUTOMATION_DATA = {
  title: '의사결정 피로와 루틴 자동화',
  steps: [
    '뭘 해야 하지?',
    '어디부터?',
    '언제 하지?',
    '의사결정 피로',
    '아무것도 못 함',
  ],
  keyMessage:
    '일상투두은 요일별로 구역을 자동 배정하고, 공간/디지털/물건 3탭으로 분류하여 "오늘 뭘 해야 하지?"라는 의사결정 자체를 제거합니다. 앱을 열면 오늘 해야 할 것이 이미 정해져 있어요.',
  emphasis: '의사결정 자체를 제거',
};

// ─── 섹션 5: 비교표 ───
export const CLEANING_COMPARISON_DATA: ComparisonRow[] = [
  {
    category: '시작하기',
    general: '"해야겠다" → 바로 시작',
    adhd: '"해야겠다" → 30분 후에도 소파에',
  },
  {
    category: '유지하기',
    general: '습관으로 자동화',
    adhd: '매번 의지력 소모',
  },
  {
    category: '정리 기준',
    general: '직관적으로 판단',
    adhd: '"이거 어디에?" 루프',
  },
  {
    category: '완료 인식',
    general: '"끝났다" 확인 가능',
    adhd: '"충분히 한 건가?" 불안',
  },
  {
    category: '중단 후 재개',
    general: '이어서 하면 됨',
    adhd: '처음부터 다시 시작하는 느낌',
  },
];

// ─── 섹션 6: 일상투두 접근법 ───
export const DAYSTEP_APPROACH_DATA: InfoSection = {
  title: '일상투두의 청소 접근법',
  paragraphs: [
    '첫째, 마이크로태스크 분해로 시작 장벽을 극단적으로 낮춥니다. "주방 청소"가 아니라 "싱크대 그릇 3개 세척" 같은 구체적이고 작은 단위로 쪼개어, ADHD 뇌도 "이건 할 수 있겠다"고 느끼게 합니다.',
    '둘째, 에너지 적응형 시스템으로 오늘의 컨디션에 맞는 양만 제안합니다. 힘든 날에도 포기하지 않고, 좋은 날에는 더 많이 할 수 있도록 유연하게 조절됩니다.',
    '셋째, 요일별 구역 자동 순환과 스트릭 시스템으로 의사결정 피로를 제거하고, 작은 성취감이 쌓이는 보상 구조를 만듭니다. 청소는 의지력 싸움이 아니라, ADHD 뇌에 맞는 시스템의 문제입니다.',
  ],
  highlights: [
    '마이크로태스크 분해',
    '에너지 적응형 시스템',
    '청소는 의지력 싸움이 아니라, ADHD 뇌에 맞는 시스템의 문제',
  ],
};

/** 출처 및 참고 문헌 (Apple Guideline 1.4.1 준수) */
export const CLEANING_ADHD_SOURCES = [
  'Barkley, R. A. (2012). Executive Functions: What They Are, How They Work, and Why They Evolved. Guilford Press.',
  'Faraone, S. V. et al. (2021). "The World Federation of ADHD International Consensus Statement." Neuroscience & Biobehavioral Reviews, 128, 789–818.',
  'Safren, S. A. et al. (2010). "Cognitive-behavioral therapy for ADHD in medication-treated adults." JAMA, 304(8), 875–880.',
] as const;

export const CLEANING_ADHD_DISCLAIMER =
  '본 콘텐츠는 교육 목적으로 제공되며, 전문적인 의료 진단이나 치료를 대체하지 않습니다. ADHD 관련 우려가 있다면 전문 의료진과 상담하세요.' as const;
