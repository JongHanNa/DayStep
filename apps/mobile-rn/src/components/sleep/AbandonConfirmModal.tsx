/**
 * AbandonConfirmModal — 수면 세션 포기 확인 모달
 */
import React from 'react';
import {View, Text, Modal, StyleSheet} from 'react-native';
import {TreePine} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';

interface Props {
  visible: boolean;
  onContinue: () => void;
  onAbandon: () => void;
}

export function AbandonConfirmModal({visible, onContinue, onAbandon}: Props) {
  const {primaryColor} = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <TreePine size={48} color="#9CA3AF" />
          </View>

          <Text style={styles.title}>정말 포기할까요?</Text>
          <Text style={styles.subtitle}>수면 기록이 실패로 저장됩니다</Text>

          <AnimatedPressable
            onPress={onContinue}
            hapticType="medium"
            scaleValue={0.95}
            style={[styles.continueBtn, {backgroundColor: primaryColor}]}>
            <Text style={styles.continueBtnText}>계속 자기</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={onAbandon}
            hapticType="light"
            scaleValue={0.95}
            style={styles.abandonBtn}>
            <Text style={styles.abandonBtnText}>포기하기</Text>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  abandonBtn: {
    paddingVertical: 8,
  },
  abandonBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});
