/**
 * MarketingToolkitScreen — 마케팅 자료 툴킷 (관리자 전용)
 *
 * DayStep 앱 마케팅 시 사용하는 가격 비교, 소개 스크립트 모음
 * - 각 스크립트는 복사 버튼으로 바로 클립보드에 복사 가능
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
// 콘텐츠 데이터 — APP_FEATURES_MARKETING.md 기준
// ==========================================================================

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
    body: `DayStep은 성인 ADHD를 위한 일상 돌봄 앱이에요.
할일 관리, 포모도로 타이머, 수면 관리, 앱 차단, 청소 루틴까지
ADHD 뇌에 맞게 설계된 기능이 하나의 앱에 다 들어있어요.
다른 앱 6개 따로 구독할 필요 없이, DayStep 하나면 충분합니다.`,
  },
  {
    id: 'community',
    title: 'ADHD 커뮤니티용',
    subtitle: '에이앱 · 네이버 카페 · 커뮤니티 게시글',
    body: `안녕하세요, 성인 ADHD 진단 후 일상 관리 앱을 직접 만든 개발자입니다.

"하면 되잖아"라는 말, 수없이 들어왔죠?
하지만 이건 의지력 부족이 아니라, 도파민·노르에피네프린 부족으로
의도→행동 전환 경로 자체가 차단되는 '실행 마비'입니다.

DayStep은 이 ADHD 뇌의 실제 작동 방식을 이해하고,
그 뇌에 맞는 방식으로 일상을 돌보는 앱이에요.

✅ 실행 마비 → 포모도로 타이머 ("20분만 시작해볼까요?")
✅ 시간 감각 왜곡 → 타임블록킹 뷰 (하루를 시각적으로 구조화)
✅ 의사결정 피로 → AI가 큰 목표를 작은 할일로 분해
✅ 수면 악순환 → 수면 정원 + 앱 차단 (자극 경로 차단)
✅ 청소 실행 마비 → 에너지 맞춤 마이크로태스크 (2~5분 단위)
✅ 동기 유지 불가 → 원동력 노트 (감정과 함께 "왜"를 저장)

💡 가성비도 좋아요:
앱 차단 앱 + 스케줄러 + 포모도로 + 수면 앱 따로 구독하면 월 5만원+
DayStep 하나면 전부 포함. 연 결제 시 월 3,667원 — 하루 커피 한 잔 값도 안 돼요.

현재 안드로이드 비공개 테스트 중이며, iOS도 곧 출시 예정입니다.
🔗 https://play.google.com/store/apps/details?id=com.daystep.app`,
  },
  {
    id: 'sns',
    title: 'SNS 짧은 버전',
    subtitle: '인스타 · Threads · 트위터',
    body: `앱 차단 + 스케줄러 + 포모도로 + 수면관리 + 청소루틴 + AI계획
= 각각 구독하면 월 5만원+

ADHD 뇌에 맞게 설계된 DayStep 하나면?
= 연 결제 시 월 3,667원. 하루 120원.

성인 ADHD를 위한 올인원 일상 돌봄 앱 🧠
#성인ADHD #ADHD앱 #실행마비 #집중력 #DayStep`,
  },
  {
    id: 'friend',
    title: '지인 소개 (캐주얼)',
    subtitle: '카톡 · 대면 대화',
    body: `나 성인 ADHD 일상관리 앱 만들었어.
할일 관리, 포모도로, 수면 관리, 앱 차단, 청소 루틴까지
다 들어있는 올인원 앱인데, ADHD 뇌과학 기반으로 설계했어.

앱 차단 앱 따로, 스케줄러 따로 구독 안 해도 되고,
DayStep 하나면 다 돼. 연 결제하면 월 3천원대야. 한번 써봐!`,
  },
  {
    id: 'influencer',
    title: '인플루언서 협업 제안',
    subtitle: '블로거 · 유튜버 · 인플루언서 DM/이메일',
    body: `안녕하세요, 성인 ADHD 일상 관리 앱 DayStep 개발자입니다.

DayStep은 ADHD 뇌과학을 기반으로, 할일 관리·포모도로·수면 관리·
앱 차단·청소 루틴·AI 계획까지 하나의 앱에서 제공하는
올인원 ADHD 케어 시스템입니다.

혹시 앱 리뷰나 협업에 관심 있으시면,
Pro 버전 무료 이용권을 제공해드리겠습니다.

감사합니다!`,
  },
];

// ==========================================================================
// 복사 버튼 (카드별 독립 상태)
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
        {/* 가격 비교 섹션 */}
        <Text style={styles.sectionTitle}>가성비 비교</Text>
        <Text style={styles.sectionDesc}>
          앱 6개 따로 구독 vs DayStep 하나로 해결
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

        {/* DayStep 가격 하이라이트 */}
        <View
          style={[
            styles.dayStepPriceCard,
            {backgroundColor: hexWithOpacity(primaryColor, 0.08)},
          ]}>
          <Text style={styles.dayStepPriceLabel}>DayStep Pro</Text>
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

        {/* 핵심 메시지 */}
        <Text style={[styles.sectionTitle, {marginTop: 28}]}>핵심 메시지</Text>
        <View style={styles.card}>
          <View style={styles.messageItem}>
            <View style={[styles.dot, {backgroundColor: primaryColor}]} />
            <Text style={styles.messageText}>
              앱 6개 구독료 = 월 5만원 → DayStep 하나로 월 3,667원 (연 결제)
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.messageItem}>
            <View style={[styles.dot, {backgroundColor: primaryColor}]} />
            <Text style={styles.messageText}>
              앱 차단 앱 따로, 스케줄러 따로 구독하지 않아도 됩니다
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.messageItem}>
            <View style={[styles.dot, {backgroundColor: primaryColor}]} />
            <Text style={styles.messageText}>
              ADHD 뇌과학 기반 올인원 — 일반 앱 6개를 합쳐도 이 경험은 못 줍니다
            </Text>
          </View>
        </View>

        {/* 소개 스크립트 */}
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
  // DayStep 가격 카드
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
