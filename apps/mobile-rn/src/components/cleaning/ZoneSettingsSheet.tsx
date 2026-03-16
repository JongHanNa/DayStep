/**
 * ZoneSettingsSheet — 구역-요일 매핑 설정
 * @gorhom/bottom-sheet 패턴
 */
import React, {forwardRef, useCallback, useImperativeHandle, useMemo, useRef} from 'react';
import {View, Text} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {useCleaningStore} from '@/stores/cleaningStore';
import {useHaptic} from '@/hooks/useHaptic';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export interface ZoneSettingsSheetRef {
  open: () => void;
  close: () => void;
}

export const ZoneSettingsSheet = forwardRef<ZoneSettingsSheetRef>((_props, ref) => {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['65%'], []);
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const {zones, updateZoneDayOfWeek} = useCleaningStore();

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.snapToIndex(0),
    close: () => sheetRef.current?.close(),
  }));

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />
    ),
    [],
  );

  const handleDayChange = (zoneId: string, dayOfWeek: number) => {
    haptic.selection();
    updateZoneDayOfWeek(zoneId, dayOfWeek);
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}>
      <BottomSheetScrollView contentContainerStyle={{padding: 20}}>
        <Text style={{fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4}}>
          구역 설정
        </Text>
        <Text style={{fontSize: 13, color: '#9CA3AF', marginBottom: 20}}>
          각 구역이 어떤 요일에 표시될지 설정하세요
        </Text>

        {zones.map(zone => (
          <View key={zone.id} style={{marginBottom: 20}}>
            <Text style={{fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8}}>
              {zone.name}
            </Text>
            <View style={{flexDirection: 'row', gap: 6}}>
              {DAY_LABELS.map((label, index) => {
                const isActive = zone.dayOfWeek === index;
                return (
                  <AnimatedPressable
                    key={index}
                    hapticType="selection"
                    onPress={() => handleDayChange(zone.id, index)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: isActive ? primaryColor + '15' : '#F3F4F6',
                      borderWidth: isActive ? 1.5 : 0,
                      borderColor: isActive ? primaryColor : 'transparent',
                    }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isActive ? '700' : '400',
                        color: isActive ? primaryColor : '#6B7280',
                      }}>
                      {label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
});
