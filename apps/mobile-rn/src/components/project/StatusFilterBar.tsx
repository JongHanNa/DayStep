/**
 * StatusFilterBar — 프로젝트 상태 필터 pill 바
 */
import React from 'react';
import {Text, ScrollView, TouchableOpacity} from 'react-native';
import {useTheme} from '@/theme';
import {STATUS_FILTERS} from './constants';
import type {ProjectStatus} from '@/types/project';

interface StatusFilterBarProps {
  selected: ProjectStatus | 'all';
  onSelect: (status: ProjectStatus | 'all') => void;
}

export function StatusFilterBar({selected, onSelect}: StatusFilterBarProps) {
  const {primaryColor} = useTheme();
  return (
    <ScrollView
      style={{flexGrow: 0}}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 8}}>
      {STATUS_FILTERS.map(({key, label}) => (
        <TouchableOpacity
          key={key}
          onPress={() => onSelect(key)}
          className="mr-2 px-4 py-2 rounded-full"
          style={{backgroundColor: selected === key ? primaryColor : '#F3F4F6'}}>
          <Text
            className={`text-sm font-medium ${
              selected === key ? 'text-white' : 'text-gray-600'
            }`}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
