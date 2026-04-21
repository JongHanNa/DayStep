import React from 'react';
import {View, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {CATEGORY_COLOR_PRESETS} from '@/lib/categoryColors';

interface ColorPalettePickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
  size?: number;
}

export function ColorPalettePicker({
  selectedColor,
  onSelect,
  size = 28,
}: ColorPalettePickerProps) {
  return (
    <View style={styles.row}>
      {CATEGORY_COLOR_PRESETS.map(color => {
        const isSelected = color.toLowerCase() === selectedColor.toLowerCase();
        return (
          <AnimatedPressable
            key={color}
            onPress={() => onSelect(color)}
            hapticType="light"
            scaleValue={0.9}
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                borderWidth: isSelected ? 2 : 0,
                borderColor: '#FFFFFF',
              },
              isSelected && {
                shadowColor: color,
                shadowOffset: {width: 0, height: 0},
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 4,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 8,
  },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
