/**
 * SummaryRow
 * 할일 편집 모달의 요약행 컴포넌트
 * [Icon]  라벨텍스트          보조  〉
 */
import React from 'react';
import {View, Text, StyleSheet, Switch} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {ChevronRight} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';
import {useTheme} from '@/theme';

interface SummaryRowProps {
  Icon: LucideIcon;
  iconColor?: string;
  label: string;
  suffix?: string;
  /** 커스텀 trailing 콘텐츠 (suffix 대신 렌더링) */
  suffixContent?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  /** Switch 모드: onPress 대신 Switch 표시 */
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  primaryColor?: string;
}

export function SummaryRow({
  Icon,
  iconColor = '#6B7280',
  label,
  suffix,
  suffixContent,
  onPress,
  showChevron = true,
  switchValue,
  onSwitchChange,
  primaryColor: primaryColorProp,
}: SummaryRowProps) {
  const {primaryColor: themePrimaryColor} = useTheme();
  const primaryColor = primaryColorProp ?? themePrimaryColor;
  const isSwitch = switchValue !== undefined;

  const content = (
    <View style={styles.row}>
      <Icon size={20} color={iconColor} style={styles.icon} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.trailing}>
        {suffixContent ? suffixContent : suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
        {isSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{false: '#E5E7EB', true: primaryColor + '60'}}
            thumbColor={switchValue ? primaryColor : '#F9FAFB'}
          />
        ) : showChevron ? (
          <ChevronRight size={18} color="#9CA3AF" />
        ) : null}
      </View>
    </View>
  );

  if (isSwitch || !onPress) {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      hapticType="selection"
      scaleValue={0.98}
      style={styles.container}>
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  icon: {
    marginRight: 12,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suffix: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
