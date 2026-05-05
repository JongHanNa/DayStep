/**
 * EnergySelector — 에너지 3단계 선택기
 * AnimatedPressable + Battery 아이콘
 */
import React from 'react';
import {View, Text} from 'react-native';
import {BatteryFull, BatteryMedium, BatteryLow} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import type {EnergyLevel} from '@/constants/cleaning-data';

const LEVELS: {key: EnergyLevel; label: string; Icon: React.FC<any>}[] = [
  {key: 'good', label: '괜찮음', Icon: BatteryFull},
  {key: 'moderate', label: '보통', Icon: BatteryMedium},
  {key: 'low', label: '힘듦', Icon: BatteryLow},
];

interface EnergySelectorProps {
  value: EnergyLevel;
  onChange: (level: EnergyLevel) => void;
}

export function EnergySelector({value, onChange}: EnergySelectorProps) {
  const {primaryColor} = useTheme();

  return (
    <View className="flex-row justify-center" style={{gap: 8}}>
      {LEVELS.map(({key, label, Icon}) => {
        const isActive = value === key;
        return (
          <AnimatedPressable
            key={key}
            hapticType="selection"
            onPress={() => onChange(key)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: isActive ? primaryColor + '15' : '#F3F4F6',
              borderWidth: isActive ? 1.5 : 1,
              borderColor: isActive ? primaryColor : '#E5E7EB',
              gap: 6,
            }}>
            <Icon size={16} color={isActive ? primaryColor : '#9CA3AF'} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: isActive ? '600' : '400',
                color: isActive ? primaryColor : '#6B7280',
              }}>
              {label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
