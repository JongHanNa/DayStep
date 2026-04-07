/**
 * ADHD 이해하기 — 5개 토픽 콘텐츠 데이터
 * Design C(비주얼 맵)의 바텀시트 + Design A(아코디언) + Design B(카드) 공용
 */
import {
  BookOpen,
  Clock,
  Home,
  BellRing,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

export interface TopicSection {
  title: string;
  text: string;
  highlights: string[];
}

export interface ADHDTopic {
  id: number;
  title: string;
  subtitle: string;
  shortLabel: string;
  icon: LucideIcon;
  sections: TopicSection[];
  /** 노드 배치 각도 (degree, 12시 방향 = 0°) */
  angle: number;
}

export const ADHD_TOPICS: ADHDTopic[] = [
  {
    id: 1,
    title: '대표적인 키워드',
    subtitle: 'ADHD 뇌의 핵심 개념들',
    shortLabel: '대표 키워드',
    icon: BookOpen,
    angle: 0,
    sections: [
      {
        title: '전두엽',
        text: '계획, 감정 조절, 충동 억제를 담당하는 "집행기능"의 중심. ADHD 뇌에서는 활성도가 상대적으로 낮아, "머리로는 알지만 행동으로 옮기기 힘든" 상태가 돼요.',
        highlights: ['집행기능'],
      },
      {
        title: '도파민과 보상회로',
        text: '"하고 싶다"는 마음을 만드는 신경전달물질. ADHD 뇌는 즉각적인 보상에는 민감하지만, 지연된 보상에는 반응이 약해 할 일을 미루게 돼요.',
        highlights: ['하고 싶다'],
      },
      {
        title: '실행기능',
        text: '목표를 세우고 계획을 짜고 우선순위를 정하는 역할. ADHD는 단순히 주의력 부족이 아니라, 뇌의 관리 시스템이 원활하지 않은 상태예요.',
        highlights: ['뇌의 관리 시스템이 원활하지 않은 상태'],
      },
    ],
  },
  {
    id: 2,
    title: '수면이 어려운 이유',
    subtitle: 'ADHD와 수면의 관계',
    shortLabel: '수면',
    icon: Clock,
    angle: 72,
    sections: [
      {
        title: '쉽게 잠들지 못하는 이유',
        text: 'ADHD인의 뇌는 밤에도 과도하게 활성화돼요. 과잉 사고로 걱정이 맴돌고, 감각 예민으로 작은 자극에도 깨요.',
        highlights: ['과잉 사고', '감각 예민'],
      },
      {
        title: '밤과 아침의 악순환',
        text: '밤에 잘 안 잠 → 일어나기 힘듦 → 낮에 피곤 → 밤에 또 못 잠. 멜라토닌 분비 지연이 핵심 원인이에요.',
        highlights: ['멜라토닌 분비 지연'],
      },
      {
        title: '야간 각성 줄이기',
        text: '자기 전 1시간은 전자기기를 멀리하고, 짧은 스트레칭이나 따뜻한 차로 뇌에 "잘 준비"를 알려주세요.',
        highlights: [],
      },
    ],
  },
  {
    id: 3,
    title: '집안일 실행이 어려운 이유',
    subtitle: '실행 기능과 일상의 관계',
    shortLabel: '집안일',
    icon: Home,
    angle: 144,
    sections: [
      {
        title: '실행이 막막해지는 순간',
        text: '어디서부터 시작할지 감이 안 오거나, 할 일이 많아 우선순위를 정리하지 못해 멍해져요. 감정적 압도감에 몸이 굳기도 해요.',
        highlights: ['우선순위를 정리하지 못해'],
      },
      {
        title: '뇌 과학적 이유',
        text: '전두엽 기능 저하로 계획→실행 전환이 어렵고, 도파민 시스템 문제로 재미없는 일의 시작이 특히 힘들어요.',
        highlights: ['전두엽 기능 저하', '도파민 시스템 문제'],
      },
      {
        title: '실행을 돕는 방법',
        text: '아주 작은 일부터 시작하기, 할 일 쪼개기, 5분만 해보기. 작은 성공이 다음 행동의 연료가 돼요.',
        highlights: [],
      },
    ],
  },
  {
    id: 4,
    title: '온전한 휴식이 어려운 이유',
    subtitle: '쉬는 것도 기술이에요',
    shortLabel: '휴식',
    icon: BellRing,
    angle: 216,
    sections: [
      {
        title: '왜 쉬기가 어려울까',
        text: '머릿속에서 할 일이 계속 떠오르고, 가만히 있으면 오히려 불편하고 불안해져요. 쉴 때도 자극을 찾게 되죠.',
        highlights: ['불편하고 불안'],
      },
      {
        title: '편안한 휴식 만들기',
        text: '"잘 쉬어야 한다"는 강박 내려놓기. 활동적 휴식(산책, 스트레칭)도 좋은 방법이에요.',
        highlights: ['활동적 휴식'],
      },
    ],
  },
  {
    id: 5,
    title: '신경 다양성에 대해',
    subtitle: '다름을 존중하는 관점',
    shortLabel: '신경다양성',
    icon: Users,
    angle: 288,
    sections: [
      {
        title: '신경다양성의 의미',
        text: '사람들이 각기 다른 방식으로 생각하고 행동한다는 것을 인정하고 존중하자는 개념이에요.',
        highlights: ['인정하고 존중'],
      },
      {
        title: '신경 다양성의 가치',
        text: 'ADHD인들의 독창적이고 창의적인 능력은 사회 전체의 다양성과 창의성을 넓혀줘요.',
        highlights: ['독창적이고 창의적인 능력'],
      },
      {
        title: '존중과 지원',
        text: '신경다양성이란 "다름을 존중하자"는 외침이에요. 뇌의 차이는 결함이 아니라 사람다움의 또 다른 모습이에요.',
        highlights: ['다름을 존중하자'],
      },
    ],
  },
];

/** 읽기 시간 추정 (Design B에서 사용) */
export const READING_TIMES = ['약 3분', '약 3분', '약 3분', '약 2분', '약 2분'];

/** 출처 및 참고 문헌 (Apple Guideline 1.4.1 준수) */
export const ADHD_UNDERSTANDING_SOURCES = [
  'Barkley, R. A. (2015). Attention-Deficit Hyperactivity Disorder: A Handbook for Diagnosis and Treatment. Guilford Press.',
  'Faraone, S. V. et al. (2021). "The World Federation of ADHD International Consensus Statement." Neuroscience & Biobehavioral Reviews, 128, 789–818.',
  'Brown, T. E. (2013). A New Understanding of ADHD in Children and Adults: Executive Function Impairments. Routledge.',
  'Volkow, N. D. et al. (2009). "Evaluating Dopamine Reward Pathway in ADHD." JAMA, 302(10), 1084–1091.',
] as const;

export const ADHD_UNDERSTANDING_DISCLAIMER =
  '본 콘텐츠는 교육 목적으로 제공되며, 전문적인 의료 진단이나 치료를 대체하지 않습니다. ADHD 관련 우려가 있다면 전문 의료진과 상담하세요.' as const;
