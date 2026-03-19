/**
 * ScreenTimeToggle — 청소 세션 중 스크린타임 차단 ON/OFF 토글
 */
import React, {useCallback, useState} from 'react';
import {View, Text, Switch, Alert} from 'react-native';
import {Shield} from 'lucide-react-native';
import {useCleaningStore} from '@/stores/cleaningStore';
import {requestAuthorization, isScreenTimeAvailable, getAuthorizationStatus} from '@/lib/screenTimeManager';
import {useTheme} from '@/theme';

export function ScreenTimeToggle() {
  const {primaryColor} = useTheme();
  const {screenTimeLinkEnabled, toggleScreenTimeLink} = useCleaningStore();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleToggle = useCallback(async (value: boolean) => {
    if (!value) {
      toggleScreenTimeLink();
      return;
    }

    // 활성화 시 권한 확인
    if (!isScreenTimeAvailable()) {
      Alert.alert('스크린타임 미지원', '이 기기에서는 스크린타임 기능을 사용할 수 없습니다.');
      return;
    }

    const status = getAuthorizationStatus();
    if (status === 'approved') {
      toggleScreenTimeLink();
      return;
    }

    // 권한 요청
    setIsRequesting(true);
    try {
      await requestAuthorization();
      toggleScreenTimeLink();
    } catch {
      Alert.alert('권한 필요', '스크린타임 차단을 사용하려면 스크린타임 권한을 허용해주세요.');
    } finally {
      setIsRequesting(false);
    }
  }, [toggleScreenTimeLink]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 4,
      }}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1}}>
        <Shield size={18} color={screenTimeLinkEnabled ? primaryColor : '#9CA3AF'} />
        <View style={{flex: 1}}>
          <Text style={{fontSize: 14, fontWeight: '600', color: '#374151'}}>
            앱 차단 (스크린타임)
          </Text>
          <Text style={{fontSize: 12, color: '#9CA3AF', marginTop: 2}}>
            청소 세션 중 다른 앱 사용을 제한합니다
          </Text>
        </View>
      </View>
      <Switch
        value={screenTimeLinkEnabled}
        onValueChange={handleToggle}
        disabled={isRequesting}
        trackColor={{false: '#E5E7EB', true: primaryColor + '80'}}
        thumbColor={screenTimeLinkEnabled ? primaryColor : '#F3F4F6'}
      />
    </View>
  );
}
