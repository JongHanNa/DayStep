/**
 * RelationshipStatsModal — 관계 통계 모달 [Pro]
 * pageSheet 스타일, ContactScreen 통계 UI를 모달로 이전
 */
import React, {useEffect, useState} from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {X, TrendingUp} from 'lucide-react-native';
import {AnimatedCard} from '@/components/core';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {ProScreenGuard} from '@/components/subscription/ProScreenGuard';
import {INTERACTION_TYPE_LABELS} from '@/types/cherished-people';
import type {DetailedStats, RelationshipStats, InteractionType} from '@/types/cherished-people';
import {resolveTodoIcon} from '@/lib/iconMap';
import {useTheme} from '@/theme';

interface RelationshipStatsModalProps {
  visible: boolean;
  onClose: () => void;
}

function StatCard({
  label,
  value,
  color = '#3B82F6',
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, {color}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function RelationshipStatsModal({visible, onClose}: RelationshipStatsModalProps) {
  const insets = useSafeAreaInsets();
  const {primaryColor} = useTheme();
  const user = useAuthStore(s => s.user);
  const {getDetailedStats, getRelationshipStats, loadPeople} =
    useCherishedPeopleStore();
  const [detailed, setDetailed] = useState<DetailedStats | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && user?.id) {
      setLoading(true);
      loadPeople(user.id).then(() => {
        Promise.all([
          getDetailedStats(user.id),
          getRelationshipStats(user.id),
        ]).then(([d, r]) => {
          setDetailed(d);
          setRelationship(r);
          setLoading(false);
        });
      });
    }
  }, [visible, user?.id]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <ProScreenGuard screenId="contact">
        <View style={[styles.container, {paddingTop: insets.top || 16}]}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>관계 통계</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{paddingBottom: 40}}
            showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>로딩 중...</Text>
              </View>
            ) : (
              <>
                {/* 요약 카드들 */}
                <View style={styles.statsRow}>
                  <View style={styles.statsHalf}>
                    <StatCard
                      label="소중한 사람"
                      value={relationship?.totalPeople ?? 0}
                      color={primaryColor}
                    />
                  </View>
                  <View style={styles.statsHalf}>
                    <StatCard
                      label="이번 달 기록"
                      value={detailed?.thisMonthCount ?? 0}
                      color="#3B82F6"
                    />
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statsHalf}>
                    <StatCard
                      label="이번 주 활동"
                      value={relationship?.activeThisWeek ?? 0}
                      color="#22C55E"
                    />
                  </View>
                  <View style={styles.statsHalf}>
                    <StatCard
                      label="관심 필요"
                      value={relationship?.needsAttention ?? 0}
                      color="#F59E0B"
                    />
                  </View>
                </View>

                {/* 관심 표현 유형별 통계 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>관심 표현 유형</Text>
                  {Object.entries(detailed?.interactionTypeStats ?? {})
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([type, count]) => {
                      const label = INTERACTION_TYPE_LABELS[type as InteractionType];
                      const maxCount = Math.max(
                        ...Object.values(detailed?.interactionTypeStats ?? {}),
                      );
                      const width = maxCount > 0 ? ((count as number) / maxCount) * 100 : 0;
                      const IconComp = resolveTodoIcon(label?.icon);

                      return (
                        <View key={type} style={styles.barRow}>
                          <View style={styles.barLabel}>
                            {IconComp && <IconComp size={14} color={primaryColor} />}
                            <Text style={styles.barLabelText}>{label?.label}</Text>
                          </View>
                          <View style={styles.barTrack}>
                            <View
                              style={[styles.barFill, {width: `${width}%`}]}
                            />
                          </View>
                          <Text style={styles.barCount}>{count as number}</Text>
                        </View>
                      );
                    })}
                </View>

                {/* Top 연락처 */}
                {(detailed?.topContacts?.length ?? 0) > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                      <TrendingUp size={18} color="#3B82F6" />
                      <Text style={[styles.sectionTitle, {marginLeft: 8}]}>
                        자주 연락하는 분
                      </Text>
                    </View>
                    {detailed?.topContacts.map((contact, i) => (
                      <View key={contact.person_id} style={styles.contactRow}>
                        <View style={styles.contactLeft}>
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankText}>{i + 1}</Text>
                          </View>
                          <Text style={styles.contactName}>{contact.name}</Text>
                        </View>
                        <Text style={styles.contactCount}>{contact.count}회</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 월별 트렌드 */}
                {(detailed?.monthlyTrend?.length ?? 0) > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>월별 추이</Text>
                    <View style={styles.trendContainer}>
                      {detailed?.monthlyTrend.map((m) => {
                        const max = Math.max(
                          ...(detailed?.monthlyTrend.map(t => t.count) ?? [1]),
                        );
                        const height = max > 0 ? (m.count / max) * 100 : 0;
                        return (
                          <View key={m.month} style={styles.trendBar}>
                            <Text style={styles.trendCount}>{m.count}</Text>
                            <View
                              style={[
                                styles.trendFill,
                                {height: `${Math.max(height, 4)}%`},
                              ]}
                            />
                            <Text style={styles.trendMonth}>
                              {m.month.split('-')[1]}월
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </ProScreenGuard>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statsHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  barLabelText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 4,
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#A78BFA',
    borderRadius: 10,
  },
  barCount: {
    fontSize: 12,
    color: '#6B7280',
    width: 32,
    textAlign: 'right',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  contactName: {
    fontSize: 14,
    color: '#374151',
  },
  contactCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 96,
  },
  trendBar: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  trendCount: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  trendFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: '#C4B5FD',
  },
  trendMonth: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
