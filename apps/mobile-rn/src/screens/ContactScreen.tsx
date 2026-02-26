/**
 * Contact Screen — 연락 돌아보기 [Pro]
 * 통계 대시보드: 총 인원, 이번 달 기록, 유형별 통계, Top 연락처
 */
import React, {useEffect, useState} from 'react';
import {Text, View, ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ScreenContainer, AnimatedCard} from '@/components/core';
import {Users, Lock, TrendingUp} from 'lucide-react-native';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import {INTERACTION_TYPE_LABELS} from '@/types/cherished-people';
import type {DetailedStats, RelationshipStats, InteractionType} from '@/types/cherished-people';
import {resolveTodoIcon} from '@/lib/iconMap';

function StatCard({
  label,
  value,
  color = '#3B82F6',
  delay = 0,
}: {
  label: string;
  value: number | string;
  color?: string;
  delay?: number;
}) {
  return (
    <AnimatedCard enterDelay={delay}>
      <Text className="text-3xl font-bold" style={{color}}>
        {value}
      </Text>
      <Text className="text-xs text-gray-500 mt-1">{label}</Text>
    </AnimatedCard>
  );
}

export default function ContactScreen() {
  const navigation = useNavigation();
  const user = useAuthStore(s => s.user);
  const {getDetailedStats, getRelationshipStats, loadPeople} =
    useCherishedPeopleStore();
  const {hasActiveSubscription} = useSubscriptionStore();
  const [detailed, setDetailed] = useState<DetailedStats | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
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
  }, [user?.id]);

  // Pro 가드
  if (!hasActiveSubscription) {
    return (
      <ScreenContainer gradient="warmBackground">
        <View className="flex-1 items-center justify-center px-8">
          <Lock size={48} color="#9CA3AF" />
          <Text className="text-lg font-bold text-gray-700 mt-4">
            Pro 기능입니다
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-2 leading-5">
            연락 통계와 관계 분석은{'\n'}Pro 구독에서 이용할 수 있어요.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as never)}
            className="bg-blue-500 rounded-xl py-3 px-6 mt-6">
            <Text className="text-white font-semibold">구독 알아보기</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="items-center py-20">
            <Text className="text-gray-400">로딩 중...</Text>
          </View>
        ) : (
          <>
            {/* 요약 카드들 */}
            <View className="px-4 flex-row mb-4">
              <View className="flex-1 mr-2">
                <StatCard
                  label="소중한 사람"
                  value={relationship?.totalPeople ?? 0}
                  color="#8B5CF6"
                  delay={100}
                />
              </View>
              <View className="flex-1 ml-2">
                <StatCard
                  label="이번 달 기록"
                  value={detailed?.thisMonthCount ?? 0}
                  color="#3B82F6"
                  delay={150}
                />
              </View>
            </View>

            <View className="px-4 flex-row mb-4">
              <View className="flex-1 mr-2">
                <StatCard
                  label="이번 주 활동"
                  value={relationship?.activeThisWeek ?? 0}
                  color="#22C55E"
                  delay={200}
                />
              </View>
              <View className="flex-1 ml-2">
                <StatCard
                  label="관심 필요"
                  value={relationship?.needsAttention ?? 0}
                  color="#F59E0B"
                  delay={250}
                />
              </View>
            </View>

            {/* 관심 표현 유형별 통계 */}
            <View className="px-4 mb-4">
              <AnimatedCard enterDelay={300}>
                <Text className="text-base font-semibold text-gray-800 mb-3">
                  관심 표현 유형
                </Text>
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
                      <View key={type} className="flex-row items-center mb-2">
                        <View className="w-20 flex-row items-center">
                          {IconComp && <IconComp size={14} color="#8B5CF6" />}
                          <Text className="text-xs text-gray-600 ml-1">
                            {label?.label}
                          </Text>
                        </View>
                        <View className="flex-1 h-5 bg-gray-100 rounded-full mx-2">
                          <View
                            className="h-full bg-violet-400 rounded-full"
                            style={{width: `${width}%`}}
                          />
                        </View>
                        <Text className="text-xs text-gray-500 w-8 text-right">
                          {count as number}
                        </Text>
                      </View>
                    );
                  })}
              </AnimatedCard>
            </View>

            {/* Top 연락처 */}
            {(detailed?.topContacts?.length ?? 0) > 0 && (
              <View className="px-4 mb-4">
                <AnimatedCard enterDelay={400}>
                  <View className="flex-row items-center mb-3">
                    <TrendingUp size={18} color="#3B82F6" />
                    <Text className="text-base font-semibold text-gray-800 ml-2">
                      자주 연락하는 분
                    </Text>
                  </View>
                  {detailed?.topContacts.map((contact, i) => (
                    <View
                      key={contact.person_id}
                      className="flex-row items-center justify-between py-2 border-b border-gray-50">
                      <View className="flex-row items-center">
                        <View className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center mr-3">
                          <Text className="text-xs text-blue-600 font-bold">
                            {i + 1}
                          </Text>
                        </View>
                        <Text className="text-sm text-gray-700">{contact.name}</Text>
                      </View>
                      <Text className="text-sm text-gray-500">{contact.count}회</Text>
                    </View>
                  ))}
                </AnimatedCard>
              </View>
            )}

            {/* 월별 트렌드 */}
            {(detailed?.monthlyTrend?.length ?? 0) > 0 && (
              <View className="px-4 mb-4">
                <AnimatedCard enterDelay={500}>
                  <Text className="text-base font-semibold text-gray-800 mb-3">
                    월별 추이
                  </Text>
                  <View className="flex-row items-end justify-between h-24">
                    {detailed?.monthlyTrend.map((m, i) => {
                      const max = Math.max(
                        ...(detailed?.monthlyTrend.map(t => t.count) ?? [1]),
                      );
                      const height = max > 0 ? (m.count / max) * 100 : 0;
                      return (
                        <View key={m.month} className="items-center flex-1 mx-0.5">
                          <Text className="text-[10px] text-gray-500 mb-1">
                            {m.count}
                          </Text>
                          <View
                            className="w-full rounded-t-md bg-violet-300"
                            style={{height: `${Math.max(height, 4)}%`}}
                          />
                          <Text className="text-[10px] text-gray-400 mt-1">
                            {m.month.split('-')[1]}월
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </AnimatedCard>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
