/**
 * ScreenTimeAppsScreen — 허용 앱 선택 화면
 * Apple 네이티브 FamilyActivityPicker 뷰 사용
 * 선택된 앱 토큰은 네이티브 측에 저장 (opaque Data, JS로 직렬화 불가)
 */
import React from 'react';
import {View, Text, StyleSheet, Pressable, Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ChevronLeft} from 'lucide-react-native';
import {ScreenContainer} from '@/components/core';

// react-native-device-activity의 FamilyActivityPicker 컴포넌트
let FamilyActivityPicker: any = null;
try {
  const da = require('react-native-device-activity');
  FamilyActivityPicker = da.FamilyActivityPicker;
} catch {
  // 패키지 미설치 시 무시
}

export default function ScreenTimeAppsScreen() {
  const navigation = useNavigation<any>();

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
        {Platform.OS === 'ios' && FamilyActivityPicker ? (
          <>
            <Text style={styles.description}>
              수면 중 사용할 수 있는 앱을 선택하세요.{'\n'}
              선택하지 않은 앱은 수면 시간 동안 차단됩니다.
            </Text>
            <View style={styles.pickerContainer}>
              <FamilyActivityPicker
                style={styles.picker}
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
    marginBottom: 16,
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
