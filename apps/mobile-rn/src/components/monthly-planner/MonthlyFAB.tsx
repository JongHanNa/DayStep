import React from 'react';
import {TouchableOpacity, StyleSheet} from 'react-native';
import {Plus} from 'lucide-react-native';

interface MonthlyFABProps {
  onPress: () => void;
}

export function MonthlyFAB({onPress}: MonthlyFABProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.fab}>
      <Plus size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
