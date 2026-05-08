/**
 * MarketingToolkitScreen — 마케팅 자료 툴킷 (관리자 전용)
 *
 * APP_FEATURES_MARKETING.md 기반 일상투두 앱 마케팅 레퍼런스
 * - 한줄 소개, 핵심 가치 제안, ADHD 어려움×솔루션, 가성비, 경쟁 차별점,
 *   타겟 페르소나, 핵심 메시지, 상황별 소개 스크립트
 * - 스크립트/텍스트는 복사 버튼으로 클립보드에 바로 복사
 * - 설정 → 관리자 섹션에서만 진입
 */
import React, {useCallback, useState} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import {ArrowLeft, Check, Copy} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {useHaptic} from '@/hooks/useHaptic';

interface Props {
  onBack: () => void;
}

// ==========================================================================
// 데이터 — APP_FEATURES_MARKETING.md 기준
// ==========================================================================

const TAGLINE = '일상투두 — ADHD 친화적 일상 케어 시스템';
const ONE_LINER =
  '성인 ADHD의 실제 어려움(과제 시작, 동기 유지, 시간 감각, 작업 기억)을 과학적으로 이해하고, 할일·수면·청소·관계까지 일상 전체를 하나의 앱에서 돌볼 수 있는 올인원 시스템.';

interface KeyValue {
  title: string;
  desc: string;
}

const KEY_VALUES: KeyValue[] = [
  {
    title: 'ADHD 맞춤 설계',
    desc: '뇌과학 기반 기능 매핑 (전두엽, 도파민 보상회로, 실행기능)',
  },
  {
    title: '올인원 일상 관리',
    desc: '할일 + 포모도로 + 수면 + 청소 + 관계 + AI 계획을 하나의 앱에서',
  },
  {
    title: '즉시 실행 가능',
    desc: '낮은 진입장벽, "지금 할 수 있는 가장 작은 것" 추천',
  },
];

interface WeaknessRow {
  title: string;
  cause: string;
  pain: string;
}

const ADHD_WEAKNESSES: WeaknessRow[] = [
  {
    title: '전두엽 기능 저하',
    cause: '실행기능(계획, 감정조절, 충동억제)의 중심 전두엽의 활성도 낮음',
    pain: '"머리로는 알지만 몸이 안 움직인다", 계획→실행 전환 불가',
  },
  {
    title: '도파민 기저치 부족',
    cause: '즉각적 보상에만 반응, 지연 보상에 둔감',
    pain: '재미없는 일 시작 불가, 밤늦게 자극 추구, 할일 미루기',
  },
  {
    title: '작업 기억 결함',
    cause: '전두엽의 작업 기억 용량 제한',
    pain: '"다음에 뭘 해야 하지?" 루프, 의사결정 피로, 멍해짐',
  },
];

interface ProblemSolution {
  problem: string;
  subtitle: string;
  features: {name: string; how: string}[];
}

const PROBLEM_SOLUTIONS: ProblemSolution[] = [
  {
    problem: '1. 실행 마비 (Execution Paralysis)',
    subtitle:
      '"하면 되잖아"는 귀찮음이 아니라 도파민·노르에피네프린 부족으로 의도→행동 전환 경로가 물리적으로 차단된 것',
    features: [
      {
        name: '마이크로태스크 분해 (청소)',
        how: '"방 청소"가 아닌 "싱크대 그릇 3개 세척" — 시작 장벽을 극단적으로 낮춤',
      },
      {
        name: '"첫 단계" 안내',
        how: '"먼저: 새 시트 꺼내서 침대 위에 놓기" — 가장 작은 첫 행동 제시',
      },
      {
        name: '포모도로 타이머',
        how: '"20분만 집중" — 무한한 과제를 유한한 시간 블록으로 전환',
      },
      {
        name: '빠른 집중 모드',
        how: '할일을 정하지 않고 바로 타이머 시작 — 계획 단계 자체를 스킵',
      },
    ],
  },
  {
    problem: '2. 동기 유지 불가 (Motivation Deficit)',
    subtitle:
      'ADHD 뇌는 도파민 기저치가 낮아 "깨끗해진 방"이라는 미래 보상보다 "지금 재미있는 것"에 끌린다',
    features: [
      {
        name: '2~5분 단위 완료 체크',
        how: 'ADHD 뇌는 도파민 보상 주기가 짧아야 동기 유지 — 매 완료마다 작은 도파민 히트',
      },
      {
        name: '체크보드 시각화',
        how: '칸을 채워가는 시각적 성취감 — 즉각적 보상 메커니즘',
      },
      {
        name: '연속 성공 스트릭 (수면 정원)',
        how: '"N일 연속 성공" — 즉각 보상 부재 보완',
      },
      {
        name: '원동력 새기기 (연료 탭)',
        how: '"왜 해야 하는지" 감정과 함께 기록 → 동기 약해질 때 상기',
      },
    ],
  },
  {
    problem: '3. 시간 감각 왜곡 (Time Blindness)',
    subtitle:
      'ADHD인은 시간 흐름을 체감하기 어렵다. "조금만 더"가 2시간, "내일 하자"가 한 달이 된다',
    features: [
      {
        name: '타임블록킹 뷰 (플래너 주/3일/일)',
        how: '할일을 시간 그리드에 배치 — 하루를 시각적으로 구조화',
      },
      {
        name: '예상 소요시간 표시 (청소)',
        how: '"예상 10분" — 각 태스크에 시간 감각 제공',
      },
      {
        name: '현재 기간 상기',
        how: '"지금 어떤 기간?" — 거시적 시간 인식 보조',
      },
    ],
  },
  {
    problem: '4. 의사결정 피로 (Decision Fatigue)',
    subtitle:
      '"뭘 해야 하지?" → "어디부터?" → "언제 하지?" → 피로 → 아무것도 못 함',
    features: [
      {
        name: '요일별 구역 자동 배정 (청소)',
        how: '"오늘 뭘 해야 하지?"라는 의사결정 자체를 제거',
      },
      {
        name: '아이젠하워 매트릭스 (플래너)',
        how: '중요/긴급 4분면 — 우선순위 시각화로 판단 부담 감소',
      },
      {
        name: 'AI 계획하기',
        how: '"큰 목표를 실행 가능 단위로 분해" — AI가 분해 작업을 대행',
      },
    ],
  },
  {
    problem: '5. 에너지 변동성 (Energy Variability)',
    subtitle:
      'ADHD인의 에너지는 매일 크게 변동. 고정된 루틴은 "나쁜 날"에 실패 경험만 쌓는다',
    features: [
      {
        name: '3단계 에너지 레벨 (청소)',
        how: '😊 괜찮음 / 📦 보통 / 😰 힘듦 — 오늘 컨디션에 맞는 태스크 양 자동 조절',
      },
      {
        name: '과부하 방지',
        how: '힘든 날에는 2~3개만, 좋은 날에는 더 많이',
      },
      {
        name: '"하기 싫어도 해야 할 일" (플래너)',
        how: '별도 섹션으로 분리 — "작은 용기가 큰 성장을 만들어요"',
      },
    ],
  },
  {
    problem: '6. 수면 악순환 (Sleep Vicious Cycle)',
    subtitle:
      'ADHD 뇌는 밤에 더 활성화. 수면 부족 → 전두엽 저하 → 충동 조절 실패 → 자극 추구 → 다시 수면 부족',
    features: [
      {
        name: '수면 정원',
        how: '수면 추적 + 나무 키우기 게이미피케이션',
      },
      {
        name: '스크린타임 연동',
        how: '수면 중 앱 사용 제한 — 자극 추구 경로 자체를 차단',
      },
      {
        name: '수면과 ADHD 교육',
        how: '도파민 빚 메커니즘, 전두엽 이중 타격 등 과학적 설명',
      },
    ],
  },
];

interface PriceRow {
  label: string;
  sub?: string;
  value: string;
  highlight?: boolean;
}

const PRICE_ROWS: PriceRow[] = [
  {label: '할일 관리 + 플래너', sub: 'TickTick Premium 대체', value: '월 4,900원'},
  {label: '포모도로 타이머', sub: 'Focus Keeper Pro 대체', value: '월 3,900원'},
  {label: '앱 차단 (수면 중)', sub: '스테이프리/포레스트 대체', value: '월 3,900원'},
  {label: '수면 추적', sub: 'Sleep Cycle 대체', value: '월 4,900원'},
  {label: 'AI 계획', sub: 'ChatGPT Plus 일부 대체', value: '월 28,000원'},
  {label: '청소 루틴 관리', sub: 'Tody / Sweepy 대체', value: '월 3,900원'},
  {label: '합산 구독료', value: '월 49,500원+', highlight: true},
];

interface Competitor {
  item: string;
  generic: string;
  dayStep: string;
}

const COMPETITORS: Competitor[] = [
  {item: 'ADHD 맞춤 설계', generic: '없음', dayStep: '뇌과학 기반 기능 매핑'},
  {item: '에너지 레벨 기반 추천', generic: '없음', dayStep: '오늘 컨디션에 맞는 태스크'},
  {item: '청소 마이크로 태스크', generic: '없음', dayStep: '장소별 2~10분 단위 분해'},
  {item: '수면 관리', generic: '없음', dayStep: '수면 정원 + 스크린타임 연동'},
  {item: '원동력 기록', generic: '없음', dayStep: '"왜 해야 하는지" 감정 태깅'},
  {item: '아이젠하워 매트릭스', generic: '일부', dayStep: '플래너에 내장'},
  {item: 'AI 계획 + Claude 연동', generic: '없음', dayStep: 'AI 대화형 할일 계획'},
  {item: '일일 리플렉션', generic: '없음', dayStep: '다짐/결단/회고/교훈'},
  {item: '관심 키우기', generic: '없음', dayStep: '소중한 사람 연락 리마인더'},
  {item: 'ADHD 교육 콘텐츠', generic: '없음', dayStep: '3가지 학습 모드 (비주얼맵/아코디언/카드)'},
];

interface Persona {
  name: string;
  need: string;
  value: string;
}

const PERSONAS: Persona[] = [
  {
    name: '성인 ADHD 진단자',
    need: '일상 구조화, 실행력 보조',
    value: '에너지 맞춤 추천, 마이크로 태스크, 포모도로',
  },
  {
    name: 'ADHD 의심 자가관리자',
    need: '자기 이해, 습관 형성',
    value: 'ADHD 교육, 수면/청소 루틴, 원동력 기록',
  },
  {
    name: '일상 관리 어려운 직장인',
    need: '할일 관리, 시간 관리',
    value: '아이젠하워 매트릭스, 타임블록킹, AI 계획',
  },
  {
    name: '미루기 습관 개선 희망자',
    need: '동기부여, 시작의 어려움 극복',
    value: '"하기 싫어도 해야 할 일" 섹션, 원동력 노트',
  },
];

interface ScriptItem {
  id: string;
  title: string;
  subtitle: string;
  body: string;
}

const SCRIPTS: ScriptItem[] = [
  {
    id: 'pitch',
    title: '30초 엘리베이터 피치',
    subtitle: '누구에게든 빠르게 소개 · 모든 상황',
    body: `일상투두은 성인 ADHD를 위한 일상 돌봄 앱이에요.
할일 관리, 포모도로 타이머, 수면 관리, 앱 차단, 청소 루틴까지
ADHD 뇌에 맞게 설계된 기능이 하나의 앱에 다 들어있어요.
다른 앱 6개 따로 구독할 필요 없이, 일상투두 하나면 충분합니다.`,
  },
  {
    id: 'community',
    title: 'ADHD 커뮤니티용 (긴 버전)',
    subtitle: '에이앱 · 네이버 카페 · 커뮤니티 게시글',
    body: `안녕하세요, 성인 ADHD 진단 후 일상 관리 앱을 직접 만든 개발자입니다.

"하면 되잖아"라는 말, 수없이 들어왔죠?
하지만 이건 의지력 부족이 아니라, 도파민·노르에피네프린 부족으로
의도→행동 전환 경로 자체가 차단되는 '실행 마비'입니다.

일상투두은 이 ADHD 뇌의 실제 작동 방식을 이해하고,
그 뇌에 맞는 방식으로 일상을 돌보는 앱이에요.

✅ 실행 마비 → 포모도로 타이머 ("20분만 시작해볼까요?")
✅ 시간 감각 왜곡 → 타임블록킹 뷰 (하루를 시각적으로 구조화)
✅ 의사결정 피로 → AI가 큰 목표를 작은 할일로 분해
✅ 수면 악순환 → 수면 정원 + 앱 차단 (자극 경로 차단)
✅ 청소 실행 마비 → 에너지 맞춤 마이크로태스크 (2~5분 단위)
✅ 동기 유지 불가 → 원동력 노트 (감정과 함께 "왜"를 저장)

💡 가성비도 좋아요:
앱 차단 앱 + 스케줄러 + 포모도로 + 수면 앱 따로 구독하면 월 5만원+
일상투두 하나면 전부 포함. 연 결제 시 월 3,667원 — 하루 커피 한 잔 값도 안 돼요.

현재 안드로이드 비공개 테스트 중이며, iOS도 곧 출시 예정입니다.
🔗 https://play.google.com/store/apps/details?id=com.daystep.app`,
  },
  {
    id: 'sns',
    title: 'SNS 짧은 버전',
    subtitle: '인스타 · Threads · 트위터',
    body: `앱 차단 + 스케줄러 + 포모도로 + 수면관리 + 청소루틴 + AI계획
= 각각 구독하면 월 5만원+

ADHD 뇌에 맞게 설계된 일상투두 하나면?
= 연 결제 시 월 3,667원. 하루 120원.

성인 ADHD를 위한 올인원 일상 돌봄 앱 🧠
#성인ADHD #ADHD앱 #실행마비 #집중력 #일상투두`,
  },
  {
    id: 'friend',
    title: '지인 소개 (캐주얼)',
    subtitle: '카톡 · 대면 대화',
    body: `나 성인 ADHD 일상관리 앱 만들었어.
할일 관리, 포모도로, 수면 관리, 앱 차단, 청소 루틴까지
다 들어있는 올인원 앱인데, ADHD 뇌과학 기반으로 설계했어.

앱 차단 앱 따로, 스케줄러 따로 구독 안 해도 되고,
일상투두 하나면 다 돼. 연 결제하면 월 3천원대야. 한번 써봐!`,
  },
  {
    id: 'influencer',
    title: '인플루언서 협업 제안',
    subtitle: '블로거 · 유튜버 · 인플루언서 DM/이메일',
    body: `안녕하세요, 성인 ADHD 일상 관리 앱 일상투두 개발자입니다.

일상투두은 ADHD 뇌과학을 기반으로, 할일 관리·포모도로·수면 관리·
앱 차단·청소 루틴·AI 계획까지 하나의 앱에서 제공하는
올인원 ADHD 케어 시스템입니다.

혹시 앱 리뷰나 협업에 관심 있으시면,
Pro 버전 무료 이용권을 제공해드리겠습니다.

감사합니다!`,
  },
];

const CORE_DIFFERENTIATION = `일반 할일 앱: "할 일을 관리하세요" (what)
일상투두: "당신의 뇌가 왜 이렇게 작동하는지 이해하고,
그 뇌에 맞는 방식으로 일상을 돌보세요" (why + how)

ADHD 교육 콘텐츠가 기능 화면과 직접 연결되어,
"이해 → 자기 지각 → 자기 연민 + 경각심 → 행동 변화"
사이클을 만드는 것이 일상투두의 핵심 전략.`;

// ==========================================================================
// 복사 버튼
// ==========================================================================

function CopyButton({text, primaryColor}: {text: string; primaryColor: string}) {
  const [copied, setCopied] = useState(false);
  const haptic = useHaptic();

  const handleCopy = useCallback(() => {
    Clipboard.setString(text);
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [text, haptic]);

  return (
    <AnimatedPressable
      onPress={handleCopy}
      hapticType="light"
      style={[
        styles.copyBtn,
        {
          backgroundColor: copied
            ? hexWithOpacity(primaryColor, 0.15)
            : hexWithOpacity(primaryColor, 0.08),
        },
      ]}>
      {copied ? (
        <>
          <Check size={14} color={primaryColor} strokeWidth={2.5} />
          <Text style={[styles.copyBtnText, {color: primaryColor}]}>복사됨</Text>
        </>
      ) : (
        <>
          <Copy size={14} color={primaryColor} strokeWidth={2} />
          <Text style={[styles.copyBtnText, {color: primaryColor}]}>복사</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

// ==========================================================================
// 메인 컴포넌트
// ==========================================================================

export function MarketingToolkitScreen({onBack}: Props) {
  const {primaryColor} = useTheme();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={onBack}
          hapticType="light"
          style={styles.backBtn}>
          <ArrowLeft size={20} color="#374151" />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>마케팅 자료</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* =========================================================== */}
        {/* 1. 한줄 소개 / 태그라인 */}
        {/* =========================================================== */}
        <Text style={styles.sectionTitle}>한줄 소개</Text>

        <View style={[styles.heroCard, {backgroundColor: hexWithOpacity(primaryColor, 0.08)}]}>
          <View style={styles.heroHeader}>
            <Text style={[styles.heroTagline, {color: primaryColor}]}>{TAGLINE}</Text>
            <CopyButton text={`${TAGLINE}\n\n${ONE_LINER}`} primaryColor={primaryColor} />
          </View>
          <Text style={styles.heroOneLiner}>{ONE_LINER}</Text>
        </View>

        {/* =========================================================== */}
        {/* 2. 핵심 가치 제안 (Key Messages) */}
        {/* =========================================================== */}
        <Text style={[styles.sectionTitle, {marginTop: 28}]}>핵심 가치 제안</Text>
        <Text style={styles.sectionDesc}>Key Messages — 3가지</Text>

        <View style={styles.card}>
          {KEY_VALUES.map((kv, idx) => (
            <View key={kv.title}>
              <View style={styles.keyValueRow}>
                <Text style={[styles.keyValueIndex, {color: primaryColor}]}>
                  {String(idx + 1).padStart(2, '0')}
                </Text>
                <View style={{flex: 1}}>
                  <Text style={styles.keyValueTitle}>{kv.title}</Text>
                  <Text style={styles.keyValueDesc}>{kv.desc}</Text>
                </View>
              </View>
              {idx < KEY_VALUES.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* =========================================================== */}
        {/* 3. ADHD 뇌의 3가지 핵심 취약점 */}
        {/* =========================================================== */}
        <Text style={[styles.sectionTitle, {marginTop: 28}]}>
          ADHD 뇌의 3가지 핵심 취약점
        </Text>
        <Text style={styles.sectionDesc}>
          과학적 원인 → 일상에서 겪는 고통
        </Text>

        <View style={styles.card}>
          {ADHD_WEAKNESSES.map((w, idx) => (
            <View key={w.title}>
              <View style={styles.weaknessRow}>
                <Text style={styles.weaknessTitle}>{w.title}</Text>
                <View style={styles.weaknessMeta}>
                  <Text style={styles.weaknessLabel}>원인</Text>
                  <Text style={styles.weaknessText}>{w.cause}</Text>
                </View>
                <View style={styles.weaknessMeta}>
                  <Text style={styles.weaknessLabel}>고통</Text>
                  <Text style={styles.weaknessText}>{w.pain}</Text>
                </View>
              </View>
              {idx < ADHD_WEAKNESSES.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* =========================================================== */}
        {/* 4. 6가지 어려움 × 일상투두 솔루션 */}
        {/* =========================================================== */}
        <Text style={[styles.sectionTitle, {marginTop: 28}]}>
          6가지 어려움 × 일상투두 솔루션
        </Text>
        <Text style={styles.sectionDesc}>
          각 문제에 대응하는 기능과 해결 원리
        </Text>

        {PROBLEM_SOLUTIONS.map(ps => (
          <View key={ps.problem} style={styles.problemCard}>
            <Text style={styles.problemTitle}>{ps.problem}</Text>
            <Text style={styles.problemSubtitle}>{ps.subtitle}</Text>

            <View style={styles.featureList}>
              {ps.features.map((f, i) => (
                <View key={f.name} style={styles.featureRow}>
                  <View
                    style={[
                      styles.featureMarker,
                      {backgroundColor: hexWithOpacity(primaryColor, 0.15)},
                    ]}>
                    <Text style={[styles.featureMarkerText, {color: primaryColor}]}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.featureName}>{f.name}</Text>
                    <Text style={styles.featureHow}>{f.how}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* =========================================================== */}
        {/* 5. 핵심 차별화 */}
        {/* =========================================================== */}
        <Text style={[styles.sectionTitle, {marginTop: 28}]}>
          핵심 차별화
        </Text>
        <Text style={styles.sectionDesc}>
          "자기 지각" 기반 행동 변화
        </Text>

        <View style={styles.card}>
          <View style={styles.diffBlock}>
            <Text style={styles.diffText}>{CORE_DIFFERENTIATION}</Text>
            <View style={{marginTop: 12, alignItems: 'flex-start'}}>
              <CopyButton text={CORE_DIFFERENTIATION} primaryColor={primaryColor} />
            </View>
          </View>
        </View>

        {/* =========================================================== */}
        {/* 6. 가격 비교 */}
        {/* =========================================================== */}
        <Text style={[styles.sectionTitle, {marginTop: 28}]}>가성비 비교</Text>
        <Text style={styles.sectionDesc}>
          앱 6개 따로 구독 vs 일상투두 하나로 해결
        </Text>

        <View style={styles.card}>
          {PRICE_ROWS.map((row, idx) => (
            <View key={row.label}>
              <View style={styles.priceRow}>
                <View style={{flex: 1}}>
                  <Text
                    style={[
                      styles.priceLabel,
                      row.highlight && styles.priceLabelHighlight,
                    ]}>
                    {row.label}
                  </Text>
                  {row.sub && <Text style={styles.priceSub}>{row.sub}</Text>}
                </View>
                <Text
                  style={[
                    styles.priceValue,
                    row.highlight && {color: primaryColor},
                  ]}>
                  {row.value}
                </Text>
              </View>
              {idx < PRICE_ROWS.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* 일상투두 가격 하이라이트 */}
        <View
          style={[
            styles.dayStepPriceCard,
            {backgroundColor: hexWithOpacity(primaryColor, 0.08)},
          ]}>
          <Text style={styles.dayStepPriceLabel}>일상투두 Pro</Text>
          <Text style={[styles.dayStepPriceValue, {color: primaryColor}]}>
            월 5,500원
          </Text>
          <Text style={styles.dayStepPriceSub}>
            연 결제 시 월 3,667원 · 하루 120원
          </Text>
          <Text style={[styles.dayStepPriceTag, {color: primaryColor}]}>
            하루 커피 한 잔 값도 안 됨 ☕
          </Text>
        </View>

        {/* =========================================================== */}
        {/* 7. 핵심 메시지 */}
        {/* =========================================================== */}
        <Text style={[styles.sectionTitle, {marginTop: 28}]}>핵심 메시지</Text>

        <View style={styles.card}>
          <View style={styles.messageItem}>
            <View style={[styles.dot, {backgroundColor: primaryColor}]} />
            <Text style={styles.messageText}>
              앱 6개 구독료 = 월 5만원 → 일상투두 하나로 월 3,667원 (연 결제)
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.messageItem}>
            <View style={[styles.dot, {backgroundColor: primaryColor}]} />
            <Text style={styles.messageText}>
              하루 커피 한 잔 값도 안 되는 월 3천원대로, 6개 앱을 대체
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.messageItem}>
            <View style={[styles.dot, {backgroundColor: primaryColor}]} />
            <Text style={styles.messageText}>
              앱 차단 앱 따로, 스케줄러 따로 구독하지 않아도 됨
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.messageItem}>
            <View style={[styles.dot, {backgroundColor: primaryColor}]} />
            <Text style={styles.messageText}>
              ADHD 뇌과학 기반 올인원 — 일반 앱 6개를 합쳐도 이 경험은 못 줌
            </Text>
          </View>
        </View>

        {/* =========================================================== */}
        {/* 8. 경쟁 차별점 */}
        {/* =========================================================== */}
        <Text style={[styles.sectionTitle, {marginTop: 28}]}>경쟁 차별점</Text>
        <Text style={styles.sectionDesc}>
          일반 할일앱 vs 일상투두
        </Text>

        <View style={styles.card}>
          <View style={styles.competitorHeader}>
            <Text style={styles.competitorHeaderItem}>항목</Text>
            <Text style={styles.competitorHeaderGeneric}>일반</Text>
            <Text
              style={[styles.competitorHeaderDayStep, {color: primaryColor}]}>
              일상투두
            </Text>
          </View>
          {COMPETITORS.map((c, idx) => (
            <View key={c.item}>
              <View style={styles.rowDivider} />
              <View style={styles.competitorRow}>
                <Text style={styles.competitorItem}>{c.item}</Text>
                <Text style={styles.competitorGeneric}>{c.generic}</Text>
                <Text
                  style={[styles.competitorDayStep, {color: primaryColor}]}>
                  {c.dayStep}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* =========================================================== */}
        {/* 9. 타겟 유저 페르소나 */}
        {/* =========================================================== */}
        <Text style={[styles.sectionTitle, {marginTop: 28}]}>타겟 유저 페르소나</Text>
        <Text style={styles.sectionDesc}>4가지 핵심 세그먼트</Text>

        <View style={styles.card}>
          {PERSONAS.map((p, idx) => (
            <View key={p.name}>
              <View style={styles.personaRow}>
                <Text style={styles.personaName}>{p.name}</Text>
                <View style={styles.personaMeta}>
                  <Text style={styles.personaLabel}>니즈</Text>
                  <Text style={styles.personaText}>{p.need}</Text>
                </View>
                <View style={styles.personaMeta}>
                  <Text style={styles.personaLabel}>가치</Text>
                  <Text style={styles.personaText}>{p.value}</Text>
                </View>
              </View>
              {idx < PERSONAS.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* =========================================================== */}
        {/* 10. 소개 스크립트 */}
        {/* =========================================================== */}
        <Text style={[styles.sectionTitle, {marginTop: 28}]}>소개 스크립트</Text>
        <Text style={styles.sectionDesc}>
          상황별 복사 후 바로 사용
        </Text>

        {SCRIPTS.map(script => (
          <View key={script.id} style={styles.scriptCard}>
            <View style={styles.scriptHeader}>
              <View style={{flex: 1}}>
                <Text style={styles.scriptTitle}>{script.title}</Text>
                <Text style={styles.scriptSubtitle}>{script.subtitle}</Text>
              </View>
              <CopyButton text={script.body} primaryColor={primaryColor} />
            </View>
            <Text style={styles.scriptBody}>{script.body}</Text>
          </View>
        ))}

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================================================
// 스타일
// ==========================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  // 스크롤
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  // 섹션 타이틀
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 20,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 20,
    marginBottom: 10,
  },
  // 카드
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  // 히어로 (한줄 소개)
  heroCard: {
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  heroTagline: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  heroOneLiner: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  // 핵심 가치 제안 (Key Values)
  keyValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  keyValueIndex: {
    fontSize: 14,
    fontWeight: '800',
    width: 28,
    marginTop: 1,
  },
  keyValueTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  keyValueDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
    lineHeight: 19,
  },
  // ADHD 취약점
  weaknessRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  weaknessTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  weaknessMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  weaknessLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    width: 36,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  weaknessText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
  },
  // 문제-솔루션 카드
  problemCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  problemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  problemSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 19,
  },
  featureList: {
    marginTop: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  featureMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  featureMarkerText: {
    fontSize: 11,
    fontWeight: '800',
  },
  featureName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  featureHow: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  // 핵심 차별화
  diffBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  diffText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  // 가격 행
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  priceLabelHighlight: {
    fontWeight: '700',
  },
  priceSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  priceValue: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 12,
  },
  // 일상투두 가격 카드
  dayStepPriceCard: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  dayStepPriceLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayStepPriceValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  dayStepPriceSub: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 6,
    fontWeight: '500',
  },
  dayStepPriceTag: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  // 메시지
  messageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
    marginRight: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  // 경쟁 차별점 테이블
  competitorHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  competitorHeaderItem: {
    flex: 1.2,
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  competitorHeaderGeneric: {
    width: 50,
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  competitorHeaderDayStep: {
    flex: 1.6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  competitorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  competitorItem: {
    flex: 1.2,
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  competitorGeneric: {
    width: 50,
    fontSize: 12,
    color: '#9CA3AF',
  },
  competitorDayStep: {
    flex: 1.6,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  // 페르소나
  personaRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  personaName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  personaMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  personaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    width: 36,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  personaText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
  },
  // 스크립트 카드
  scriptCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  scriptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scriptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  scriptSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  scriptBody: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  // 복사 버튼
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
