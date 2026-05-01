/**
 * FeedbackBoardScreen — 버그 신고 & 기능 요청 게시판 (시안 B: 상태 보드)
 *
 * 진입: Settings(더보기 탭) → "지원 & 피드백" → push
 * 데이터: feedbackStore (RLS로 작성자 본인 + admin만 본문 조회)
 * 네이티브: NativeFeedbackSection (iOS SwiftUI DisclosureGroup)
 * 작성: CreateFeedbackSheet (@gorhom/bottom-sheet)
 * SegmentedControl: @react-native-segmented-control (UIKit UISegmentedControl)
 */
import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
// @ts-ignore - 라이브러리 설치 후 타입 해결
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {ScreenContainer} from '@/components/core';
import {useTheme} from '@/theme';
import {useDailyCheckIn} from '@/hooks/useDailyCheckIn';
import {formatDistanceToNow} from 'date-fns';
import {ko} from 'date-fns/locale';
import {
  useFeedbackStore,
  type FeedbackPost,
  type FeedbackStatus,
  type FeedbackFilter,
  selectFilteredPosts,
  selectPostsByStatus,
} from '@/stores/feedbackStore';
import {FeedbackSection} from '@/components/feedback/FeedbackSection';
import {CreateFeedbackSheet} from '@/components/feedback/CreateFeedbackSheet';
import type {CreateFeedbackSheetRef} from '@/components/feedback/CreateFeedbackSheet';
import type {FeedbackItem} from '@/components/native/NativeFeedbackSection';

const STATUS_META: Record<
  FeedbackStatus,
  {title: string; color: string; collapsible: boolean}
> = {
  review: {title: '검토중', color: '#B0B0B5', collapsible: false},
  in_progress: {title: '진행중', color: 'PRIMARY', collapsible: false},
  done: {title: '완료', color: '#22C55E', collapsible: true},
  declined: {title: '보류', color: '#DC2626', collapsible: true},
};

const FILTER_LABELS = ['전체', '버그', '기능 요청'] as const;
const FILTER_VALUES: FeedbackFilter[] = ['all', 'bug', 'feature'];

export default function FeedbackBoardScreen() {
  useDailyCheckIn('feedback-board');
  const navigation = useNavigation();
  const {primaryColor} = useTheme();
  const sheetRef = useRef<CreateFeedbackSheetRef>(null);

  const posts = useFeedbackStore(s => s.posts);
  const counts = useFeedbackStore(s => s.counts);
  const filter = useFeedbackStore(s => s.filter);
  const loading = useFeedbackStore(s => s.loading);
  const setFilter = useFeedbackStore(s => s.setFilter);
  const refresh = useFeedbackStore(s => s.refresh);

  // 화면 포커스 시 최신화
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filteredPosts = useMemo(
    () => selectFilteredPosts({posts, filter} as any),
    [posts, filter],
  );

  const selectedFilterIndex = FILTER_VALUES.indexOf(filter);

  // 상태별 내 게시물 집합
  const byStatus = useMemo(() => {
    const map: Record<FeedbackStatus, FeedbackItem[]> = {
      review: [],
      in_progress: [],
      done: [],
      declined: [],
    };
    for (const post of filteredPosts) {
      map[post.status].push(toFeedbackItem(post));
    }
    return map;
  }, [filteredPosts]);

  const handleItemPress = useCallback((id: string) => {
    const post = useFeedbackStore.getState().posts.find(p => p.id === id);
    if (!post) return;
    Alert.alert(
      post.title,
      `${post.content}${
        post.admin_reply ? `\n\n[개발팀 답변]\n${post.admin_reply}` : ''
      }${post.version_tag ? `\n\n릴리즈: ${post.version_tag}` : ''}`,
      [{text: '확인', style: 'default'}],
    );
  }, []);

  return (
    <BottomSheetModalProvider>
      <ScreenContainer edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            hitSlop={10}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.headerButtonText, {color: primaryColor}]}>
              ‹ 설정
            </Text>
          </Pressable>
          <Text style={styles.headerTitle}>제보 현황</Text>
          <Pressable
            style={styles.headerButton}
            hitSlop={10}
            onPress={() => sheetRef.current?.open()}>
            <Text style={[styles.headerPlus, {color: primaryColor}]}>＋</Text>
          </Pressable>
        </View>

        {/* Sticky Segmented */}
        <View style={styles.segmentedWrap}>
          <SegmentedControl
            values={[...FILTER_LABELS]}
            selectedIndex={selectedFilterIndex >= 0 ? selectedFilterIndex : 0}
            onChange={event => {
              const idx = event.nativeEvent.selectedSegmentIndex;
              setFilter(FILTER_VALUES[idx] ?? 'all');
            }}
            appearance="light"
            tintColor="#FFFFFF"
            fontStyle={{fontSize: 13, fontWeight: '500', color: '#000000'}}
            activeFontStyle={{fontSize: 13, fontWeight: '600', color: '#000000'}}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={primaryColor}
            />
          }>
          {(['review', 'in_progress', 'done', 'declined'] as FeedbackStatus[]).map(
            status => {
              const meta = STATUS_META[status];
              const items = byStatus[status];
              const countData = counts[status];
              const color =
                meta.color === 'PRIMARY' ? primaryColor : meta.color;

              // 필터 적용 시 타인 비공개 카운트도 필터링 불가 (RLS + RPC 한계)
              // → 전체 필터일 때만 표시
              const privateCount =
                filter === 'all' ? countData.othersPrivate : 0;

              return (
                <View key={status} style={styles.sectionSpacing}>
                  <FeedbackSection
                    sectionKey={status}
                    title={meta.title}
                    statusColor={color}
                    myCount={items.length}
                    privateCount={privateCount}
                    items={items}
                    collapsible={meta.collapsible}
                    initiallyExpanded={!meta.collapsible}
                    onItemPress={handleItemPress}
                  />
                </View>
              );
            },
          )}

          {/* 비어있을 때 안내 */}
          {posts.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>아직 제보한 내용이 없어요</Text>
              <Text style={styles.emptySubtitle}>
                우상단 ＋ 버튼으로 버그나 기능 요청을 남겨주세요.{'\n'}
                개발팀이 직접 읽고 답변을 드릴게요.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Create sheet */}
        <CreateFeedbackSheet ref={sheetRef} />
      </ScreenContainer>
    </BottomSheetModalProvider>
  );
}

// ============================================
// Helpers
// ============================================

function toFeedbackItem(post: FeedbackPost): FeedbackItem {
  return {
    id: post.id,
    type: post.type,
    title: post.title,
    statusBadge: buildStatusBadge(post),
    hasUnread: !!post.admin_reply && isRecentlyUpdated(post.updated_at),
    versionTag: post.version_tag,
  };
}

function buildStatusBadge(post: FeedbackPost): string {
  if (post.status === 'done' && post.version_tag) {
    return `${post.version_tag} 반영`;
  }
  if (post.status === 'in_progress' && post.version_tag) {
    return `${post.version_tag} 예정`;
  }
  try {
    return formatDistanceToNow(new Date(post.created_at), {
      addSuffix: true,
      locale: ko,
    });
  } catch {
    return '';
  }
}

function isRecentlyUpdated(updatedAt: string): boolean {
  try {
    const diff = Date.now() - new Date(updatedAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // 7일 이내
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    minHeight: 44,
  },
  headerButton: {
    minWidth: 64,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  headerPlus: {
    fontSize: 28,
    fontWeight: '300',
    textAlign: 'right',
    lineHeight: 30,
  },
  segmentedWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(242,242,247,0.92)',
  },
  scroll: {flex: 1},
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  sectionSpacing: {
    marginBottom: 18,
  },
  emptyState: {
    marginTop: 48,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3A3A3C',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 21,
  },
});
