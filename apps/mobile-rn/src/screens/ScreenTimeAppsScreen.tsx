/**
 * ScreenTimeAppsScreen — 허용 앱 선택 화면
 * Apple 네이티브 DeviceActivitySelectionView 사용
 * 선택된 앱 토큰은 네이티브 측에 저장 (opaque Data, JS로 직렬화 불가)
 *
 * 무료 사용자: 앱 + 카테고리 합계 1개까지 (소프트 제한 — 배너 표시)
 * Pro 사용자: 제한 없음
 */
import React, {useState, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, Pressable, Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ChevronLeft, Crown} from 'lucide-react-native';
import {useTheme} from '@/theme';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer} from '@/components/core';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import type {NativeSyntheticEvent} from 'react-native';

// react-native-device-activity의 DeviceActivitySelectionView 컴포넌트
let DeviceActivitySelectionView: any = null;
let nativeDA: any = null;
try {
  nativeDA = require('react-native-device-activity');
  DeviceActivitySelectionView = nativeDA.DeviceActivitySelectionView;
} catch {
  // 패키지 미설치 시 무시
}

// Shared.swift의 CURRENT_WHITELIST_KEY
const CURRENT_WHITELIST_KEY = 'currentUnblockedSelection';

const FREE_ALLOWED_TOTAL = 1; // 무료: 앱 + 카테고리 합계 1개

export default function ScreenTimeAppsScreen() {
  const navigation = useNavigation<any>();
  const {primaryColor} = useTheme();
  const hasActiveSubscription = useSubscriptionStore(
    s => s.hasActiveSubscription,
  );
  const [appCount, setAppCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);

  // picker가 emit하는 최신 직렬화 토큰 (base64)
  const latestSelectionRef = useRef<string | null>(null);
  const hasChangesRef = useRef(false);

  // 마운트 시 직전 whitelist를 읽어 picker 초기값으로 사용 (다음 방문 시 복원)
  const [initialSelection] = useState<string | null>(() => {
    if (Platform.OS !== 'ios' || !nativeDA) return null;
    try {
      const stored = nativeDA.userDefaultsGet?.(CURRENT_WHITELIST_KEY);
      return typeof stored === 'string' && stored.length > 0 ? stored : null;
    } catch {
      return null;
    }
  });

  const totalSelected = appCount + categoryCount;
  const isOverLimit = !hasActiveSubscription && totalSelected > FREE_ALLOWED_TOTAL;

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<any>) => {
      const {applicationCount, categoryCount: catCount, familyActivitySelection} =
        event.nativeEvent;
      setAppCount(applicationCount ?? 0);
      setCategoryCount(catCount ?? 0);
      latestSelectionRef.current =
        typeof familyActivitySelection === 'string' ? familyActivitySelection : null;
      hasChangesRef.current = true;
    },
    [],
  );

  const handleDone = useCallback(() => {
    if (hasChangesRef.current && Platform.OS === 'ios' && nativeDA) {
      try {
        // picker는 체크 해제도 포함한 전체 상태를 emit하므로,
        // UNION 의미인 add 전에 clear로 기존 whitelist를 초기화해야 제거가 반영된다.
        nativeDA.clearWhitelistAndUpdateBlock?.('sleep-allowed-apps-update');
        const token = latestSelectionRef.current;
        if (token) {
          nativeDA.addSelectionToWhitelistAndUpdateBlock?.(
            {activitySelectionToken: token},
            'sleep-allowed-apps-update',
          );
        }
      } catch (error) {
        console.error('[ScreenTimeApps] whitelist update error:', error);
      }
    }
    navigation.goBack();
  }, [navigation]);

  const handleUpgrade = () => {
    navigation.navigate('Settings' as never);
  };

  const headerText = hasActiveSubscription
    ? undefined
    : `무료 플랜: 앱 또는 카테고리 ${FREE_ALLOWED_TOTAL}개까지`;

  return (
    <ScreenContainer>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>허용 앱 선택</Text>
        <Pressable onPress={handleDone} hitSlop={12}>
          <Text style={[styles.doneText, {color: primaryColor}]}>완료</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {Platform.OS === 'ios' && DeviceActivitySelectionView ? (
          <>
            <Text style={styles.description}>
              수면 중 사용할 수 있는 앱을 선택하세요.{'\n'}
              선택하지 않은 앱은 수면 시간 동안 차단됩니다.
            </Text>

            {/* 선택 현황 */}
            {totalSelected > 0 && (
              <View style={styles.selectionInfo}>
                <Text style={styles.selectionText}>
                  선택: 앱 {appCount}개, 카테고리 {categoryCount}개
                </Text>
              </View>
            )}

            {/* 무료 사용자 업그레이드 배너 */}
            {isOverLimit && (
              <Pressable onPress={handleUpgrade}>
                <LinearGradient
                  colors={['#34D399', '#3B82F6']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.gradientBanner}>
                  <Crown size={20} color="#FFFFFF" />
                  <Text style={styles.gradientBannerText}>
                    Pro로 업그레이드하면 앱 제한 없이 사용 가능
                  </Text>
                  <ChevronLeft
                    size={16}
                    color="rgba(255,255,255,0.7)"
                    style={{transform: [{rotate: '180deg'}]}}
                  />
                </LinearGradient>
              </Pressable>
            )}

            <View style={styles.pickerContainer}>
              <DeviceActivitySelectionView
                style={styles.picker}
                headerText={headerText}
                familyActivitySelection={initialSelection ?? undefined}
                onSelectionChange={handleSelectionChange}
              />
            </View>
          </>
        ) : (
          <View style={styles.unavailableContainer}>
            <Text style={styles.unavailableText}>
              이 기능은 iOS에서만 사용 가능합니다.
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  selectionInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  selectionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  gradientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  gradientBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  pickerContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    flex: 1,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
