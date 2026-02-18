/**
 * SettingsRow — 재사용 가능한 설정 행
 * 아이콘, 제목, 부제, 우측 액세서리(chevron/toggle/값)
 */
import React from 'react';
import {View, Text, Switch, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {ChevronRight} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';

interface SettingsRowProps {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  // Toggle mode
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  // Navigation mode
  onPress?: () => void;
  // Style
  showChevron?: boolean;
  primaryColor?: string;
}

export function SettingsRow({
  icon: Icon,
  iconColor = '#6B7280',
  title,
  subtitle,
  value,
  isToggle,
  toggleValue,
  onToggle,
  onPress,
  showChevron = false,
  primaryColor = '#3B82F6',
}: SettingsRowProps) {
  const content = (
    <View style={styles.container}>
      {Icon && (
        <View style={styles.iconWrap}>
          <Icon size={20} color={iconColor} strokeWidth={1.8} />
        </View>
      )}
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {isToggle && onToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{false: '#E5E7EB', true: primaryColor + '80'}}
          thumbColor={toggleValue ? primaryColor : '#F3F4F6'}
        />
      ) : value ? (
        <Text style={styles.value}>{value}</Text>
      ) : null}
      {showChevron && !isToggle && (
        <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
      )}
    </View>
  );

  if (onPress && !isToggle) {
    return (
      <AnimatedPressable onPress={onPress} hapticType="light" scaleValue={0.98}>
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  value: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
});
