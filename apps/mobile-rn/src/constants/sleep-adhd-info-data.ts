/**
 * 수면과 ADHD 교육 정보 — 섹션별 콘텐츠 데이터
 */

export interface InfoSection {
  title: string;
  paragraphs: string[];
  highlights?: string[];
}

export interface ComparisonRow {
  category: string;
  general: string;
  adhd: string;
}

// ─── 히어로 ───
export const HERO_DATA = {
  badge: '수면과 ADHD',
  title: '왜 ADHD인에게\n수면이 특별히 중요할까요',
  intro:
    'ADHD 뇌는 일반적인 뇌와 다른 방식으로 작동합니다. 그래서 수면 부족의 영향도 훨씬 크고, 회복도 더 오래 걸려요. 이 글에서는 그 이유를 과학적으로 살펴봅니다.',
};

// ─── 섹션 1: 도파민 빚 ───
export const DOPAMINE_DEBT_DATA: InfoSection = {
  title: '도파민 빚 메커니즘',
  paragraphs: [
    'ADHD 뇌는 도파민 기저치가 일반인보다 낮습니다. 낮 동안 뇌는 부족한 도파민을 채우기 위해 자극을 끊임없이 찾게 되고, 밤이 되면 이 과자극 상태가 쉽게 가라앉지 않아요.',
    '밤늦게까지 SNS, 게임, 영상 등에 빠지는 건 의지 부족이 아니라, 뇌가 도파민 보충을 위해 자극을 붙잡고 있는 것입니다.',
    '수면 중에는 도파민 수용체가 리셋되고 민감도가 회복됩니다. 하지만 수면이 부족하면 이 회복 과정이 불완전해져, 다음 날 도파민 기저치가 더 떨어지는 악순환이 시작돼요.',
  ],
  highlights: ['도파민 기저치가 일반인보다 낮습니다', '도파민 수용체가 리셋'],
};

// ─── 섹션 2: 전두엽 이중 타격 ───
export const PREFRONTAL_IMPACT_DATA: InfoSection = {
  title: '전두엽에 대한 이중 타격',
  paragraphs: [
    '전두엽은 계획, 감정 조절, 충동 억제 등 "실행기능"의 중심입니다. 수면이 부족하면 누구나 전두엽 기능이 저하되지만, ADHD인은 이미 전두엽 활성도가 낮은 상태예요.',
    '즉, 일반인은 100에서 80으로 떨어지는 거라면, ADHD인은 70에서 50으로 떨어지는 셈입니다. 같은 수면 부족이라도 체감하는 기능 저하가 훨씬 크죠.',
    '이것이 "이중 타격"입니다. ADHD라는 기본 취약점 + 수면 부족이라는 추가 타격이 겹치면, 전두엽은 거의 작동을 멈추는 수준까지 떨어질 수 있어요.',
  ],
  highlights: ['100에서 80으로', '70에서 50으로'],
};

// ─── 섹션 3: 비교표 ───
export const COMPARISON_TABLE_DATA: ComparisonRow[] = [
  {
    category: '전두엽 기능',
    general: '수면 부족 시 약간 저하',
    adhd: '이미 약한 곳에 추가 타격',
  },
  {
    category: '도파민 수준',
    general: '하루 수면으로 대부분 회복',
    adhd: '기저치 자체가 낮아 회복 부족',
  },
  {
    category: '실행기능',
    general: '"좀 귀찮지만 할 수 있음"',
    adhd: '"해야 하는 걸 알지만 몸이 안 움직임"',
  },
  {
    category: '감정 조절',
    general: '짜증이 늘지만 통제 가능',
    adhd: '감정 폭발 or 무감각 상태',
  },
  {
    category: '회복 시간',
    general: '1~2일이면 정상화',
    adhd: '3~5일 이상 소요',
  },
];

// ─── 섹션 4: 악순환 구조 ───
export const VICIOUS_CYCLE_DATA = {
  title: '끊기지 않는 악순환',
  steps: [
    '수면 부족',
    '전두엽 기능 저하',
    '충동 조절 실패',
    '밤늦게 자극 추구',
    '다시 수면 부족',
  ],
  keyMessage:
    '일반인은 피곤하면 자연스럽게 일찍 자게 됩니다. 하지만 ADHD 뇌는 피곤할수록 오히려 더 자극을 찾게 되어, 이 악순환이 스스로 끊기지 않아요.',
  emphasis: '스스로 끊기지 않아요',
};

// ─── 섹션 5: 실행 마비 vs 귀찮음 ───
export const EXECUTION_PARALYSIS_DATA: InfoSection = {
  title: '실행 마비는 귀찮음이 아닙니다',
  paragraphs: [
    '"하면 되잖아"라는 말을 ADHD인은 수없이 들어왔습니다. 하지만 수면이 부족한 ADHD 뇌에서 일어나는 건 "귀찮음"이 아니라 "실행 마비"예요.',
    '신경전달물질(도파민, 노르에피네프린)이 부족하면, 뇌가 의도를 행동으로 전환하는 경로 자체가 차단됩니다. 이건 의지력의 문제가 아니라, 신경회로의 물리적 한계예요.',
    '수면은 ADHD 뇌의 전두엽을 충전하는 가장 기본적인 방법입니다. 약물, 운동, 명상도 중요하지만, 수면 없이는 어떤 전략도 제 효과를 발휘하기 어려워요.',
  ],
  highlights: [
    '실행 마비',
    '신경회로의 물리적 한계',
    '수면은 ADHD 뇌의 전두엽을 충전하는 가장 기본적인 방법',
  ],
};
