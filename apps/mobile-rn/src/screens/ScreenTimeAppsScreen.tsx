/**
 * ScreenTimeAppsScreen — 허용 앱 선택 화면
 * Apple 네이티브 DeviceActivitySelectionView 사용
 * 선택된 앱 토큰은 네이티브 측에 저장 (opaque Data, JS로 직렬화 불가)
 *
 * 무료 사용자: 앱 + 카테고리 합계 1개까지 (소프트 제한 — 배너 표시)
 * Pro 사용자: 제한 없음
 */
import React, {useState, useCallback} from 'react';
import {View, Text, StyleSheet, Pressable, Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ChevronLeft, Crown} from 'lucide-react-native';
import {ScreenContainer} from '@/components/core';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import type {NativeSyntheticEvent} from 'react-native';

// react-native-device-activity의 DeviceActivitySelectionView 컴포넌트
let DeviceActivitySelectionView: any = null;
try {
  const da = require('react-native-device-activity');
  DeviceActivitySelectionView = da.DeviceActivitySelectionView;
} catch {
  // 패키지 미설치 시 무시
}

const FREE_ALLOWED_TOTAL = 1; // 무료: 앱 + 카테고리 합계 1개

export default function ScreenTimeAppsScreen() {
  const navigation = useNavigation<any>();
  const hasActiveSubscription = useSubscriptionStore(
    s => s.hasActiveSubscription,
  );

  const [appCount, setAppCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);

  const totalSelected = appCount + categoryCount;
  const isOverLimit = !hasActiveSubscription && totalSelected > FREE_ALLOWED_TOTAL;

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<any>) => {
      const {applicationCount, categoryCount: catCount} =
        event.nativeEvent;
      setAppCount(applicationCount ?? 0);
      setCategoryCount(catCount ?? 0);
    },
    [],
  );

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
        <View style={{width: 24}} />
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

            {/* 한도 초과 업그레이드 배너 */}
            {isOverLimit && (
              <Pressable style={styles.upgradeBanner} onPress={handleUpgrade}>
                <Crown size={18} color="#F59E0B" />
                <View style={styles.upgradeBannerTextWrap}>
                  <Text style={styles.upgradeBannerTitle}>
                    무료 한도를 초과했어요
                  </Text>
                  <Text style={styles.upgradeBannerDesc}>
                    Pro로 업그레이드하면 더 많은 앱을 허용할 수 있어요
                  </Text>
                </View>
                <ChevronLeft
                  size={16}
                  color="#9CA3AF"
                  style={{transform: [{rotate: '180deg'}]}}
                />
              </Pressable>
            )}

            <View style={styles.pickerContainer}>
              <DeviceActivitySelectionView
                style={styles.picker}
                headerText={headerText}
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
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  upgradeBannerTextWrap: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  upgradeBannerDesc: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
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
