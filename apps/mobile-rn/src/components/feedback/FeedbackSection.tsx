/**
 * FeedbackSection — 네이티브 iOS DisclosureGroup + Android/iOS<15 폴백
 *
 * iOS: SwiftUI DisclosureGroup 네이티브 (NativeFeedbackSection 브리지)
 * Android: Reanimated LinearTransition.springify 폴백
 *
 * 네이티브 뷰 높이 애니메이션: FuelCard/CleanupScreen 패턴 (useSharedValue + withSpring)
 */
import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {springs} from '@/theme/animations';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {
  NativeFeedbackSectionNative,
  isNativeFeedbackSectionAvailable,
  type FeedbackItem,
} from '@/components/native/NativeFeedbackSection';
import type {FeedbackStatus} from '@/stores/feedbackStore';

interface FeedbackSectionProps {
  sectionKey: FeedbackStatus;
  title: string;
  statusColor: string;
  myCount: number;
  privateCount: number;
  items: FeedbackItem[];
  collapsible: boolean;
  initiallyExpanded?: boolean;
  onItemPress: (id: string) => void;
}

export function FeedbackSection(props: FeedbackSectionProps) {
  const {primaryColor} = useTheme();

  if (isNativeFeedbackSectionAvailable) {
    return <FeedbackSectionNativeHost {...props} primaryColor={primaryColor} />;
  }
  return <FeedbackSectionFallback {...props} primaryColor={primaryColor} />;
}

// ============================================
// iOS 네이티브 호스트 — 높이 애니메이션 포함
// ============================================

function FeedbackSectionNativeHost({
  primaryColor,
  items,
  onItemPress,
  ...rest
}: FeedbackSectionProps & {primaryColor: string}) {
  const animatedHeight = useSharedValue(0);
  const heightStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value > 0 ? animatedHeight.value : undefined,
    overflow: 'hidden' as const,
  }));

  const itemsJson = useMemo(() => JSON.stringify(items), [items]);

  const handleItemPress = useCallback(
    (e: {nativeEvent: {id: string}}) => onItemPress(e.nativeEvent.id),
    [onItemPress],
  );

  return (
    <Animated.View style={heightStyle}>
      <NativeFeedbackSectionNative
        sectionKey={rest.sectionKey}
        title={rest.title}
        statusColor={rest.statusColor}
        primaryColor={primaryColor}
        myCount={rest.myCount}
        privateCount={rest.privateCount}
        items={itemsJson}
        collapsible={rest.collapsible}
        initiallyExpanded={rest.initiallyExpanded ?? !rest.collapsible}
        onItemPress={handleItemPress}
        onHeightChange={e => {
          animatedHeight.value = withSpring(
            e.nativeEvent.height,
            springs.nativeGlass,
          );
        }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// ============================================
// Android / iOS<15 폴백 — JS 구현 + Reanimated
// ============================================

function FeedbackSectionFallback({
  primaryColor,
  items,
  onItemPress,
  sectionKey,
  title,
  statusColor,
  myCount,
  privateCount,
  collapsible,
  initiallyExpanded,
}: FeedbackSectionProps & {primaryColor: string}) {
  const [expanded, setExpanded] = useState(initiallyExpanded ?? !collapsible);

  if (collapsible) {
    return (
      <Animated.View
        layout={LinearTransition.springify()
          .damping(25)
          .stiffness(247)
          .mass(1)}
        style={styles.disclosureCard}>
        <Pressable
          style={styles.disclosureHeader}
          onPress={() => setExpanded(v => !v)}>
          <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
          <Text style={styles.disclosureTitle}>{title}</Text>
          <Text style={styles.disclosureCount}>
            {privateCount > 0
              ? `${myCount} · 비공개 ${privateCount}건`
              : `${myCount}`}
          </Text>
          <Text
            style={[
              styles.chevron,
              expanded && styles.chevronOpen,
            ]}>
            ›
          </Text>
        </Pressable>
        {expanded && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <FeedbackItemsList
              items={items}
              privateCount={privateCount}
              primaryColor={primaryColor}
              onItemPress={onItemPress}
            />
          </Animated.View>
        )}
      </Animated.View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{myCount}</Text>
      </View>
      <View style={styles.listCard}>
        <FeedbackItemsList
          items={items}
          privateCount={privateCount}
          primaryColor={primaryColor}
          onItemPress={onItemPress}
        />
      </View>
    </View>
  );
}

function FeedbackItemsList({
  items,
  privateCount,
  primaryColor,
  onItemPress,
}: {
  items: FeedbackItem[];
  privateCount: number;
  primaryColor: string;
  onItemPress: (id: string) => void;
}) {
  if (items.length === 0 && privateCount === 0) {
    return (
      <View style={styles.emptyRow}>
        <Text style={styles.emptyText}>아직 제보가 없어요</Text>
      </View>
    );
  }

  return (
    <>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <Pressable
            style={({pressed}) => [
              styles.itemRow,
              pressed && styles.itemRowPressed,
            ]}
            onPress={() => onItemPress(item.id)}>
            <View style={styles.itemMain}>
              <View style={styles.itemTopRow}>
                <View
                  style={[
                    styles.itemTag,
                    item.type === 'bug'
                      ? styles.itemTagBug
                      : {backgroundColor: hexWithOpacity(primaryColor, 0.1)},
                  ]}>
                  <Text
                    style={[
                      styles.itemTagText,
                      item.type === 'bug'
                        ? styles.itemTagBugText
                        : {color: primaryColor},
                    ]}>
                    {item.type === 'bug' ? '버그' : '기능'}
                  </Text>
                </View>
                <Text style={styles.itemStatusBadge}>{item.statusBadge}</Text>
              </View>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            {item.hasUnread && (
              <View
                style={[styles.unreadDot, {backgroundColor: primaryColor}]}
              />
            )}
          </Pressable>
          {index < items.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
      {privateCount > 0 && (
        <>
          {items.length > 0 && <View style={styles.divider} />}
          <View style={styles.privateRow}>
            <View style={styles.lockIcon}>
              <Text style={styles.lockIconText}>🔒</Text>
            </View>
            <Text style={styles.privateText}>
              비공개 · <Text style={styles.privateCountText}>{privateCount}건</Text>
            </Text>
            <Text style={styles.privateNote}>작성자+관리자만 열람</Text>
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {marginBottom: 0},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  statusDot: {width: 8, height: 8, borderRadius: 4},
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A3A3C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: 12,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  listCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  disclosureCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  disclosureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  disclosureTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0A0A0A',
  },
  disclosureCount: {
    fontSize: 12,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 18,
    color: '#AEAEB2',
    fontWeight: '400',
    marginLeft: 6,
  },
  chevronOpen: {transform: [{rotate: '90deg'}]},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  itemRowPressed: {backgroundColor: '#F2F2F7'},
  itemMain: {flex: 1},
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemTagBug: {backgroundColor: 'rgba(220,38,38,0.1)'},
  itemTagText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  itemTagBugText: {color: '#DC2626'},
  itemStatusBadge: {
    marginLeft: 'auto',
    fontSize: 13,
    color: '#8E8E93',
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#0A0A0A',
    lineHeight: 22,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(60,60,67,0.12)',
    marginLeft: 16,
  },
  emptyRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#AEAEB2',
  },
  privateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(142,142,147,0.04)',
    gap: 10,
  },
  lockIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(142,142,147,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconText: {fontSize: 10},
  privateText: {fontSize: 13, color: '#8E8E93'},
  privateCountText: {fontWeight: '500', color: '#8E8E93'},
  privateNote: {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#AEAEB2',
  },
});
