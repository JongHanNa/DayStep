/**
 * BedtimeModal — 자동 취침 안내 모달
 * 다크 테마, SleepSessionScreen 비주얼과 일관
 */
import React from 'react';
import {Modal, View, Text, StyleSheet, Pressable} from 'react-native';
import {Moon} from 'lucide-react-native';

interface BedtimeModalProps {
  visible: boolean;
  onStartSleep: () => void;
  onSnooze: () => void;
  onSkipTonight: () => void;
}

export function BedtimeModal({visible, onStartSleep, onSnooze, onSkipTonight}: BedtimeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Moon size={32} color="#A78BFA" />
          </View>
          <Text style={styles.title}>취침 시간이에요</Text>
          <Text style={styles.subtitle}>
            수면 정원에서 잠들기를 시작해볼까요?
          </Text>

          {/* Primary: 잠들기 시작 */}
          <Pressable style={styles.primaryBtn} onPress={onStartSleep}>
            <Text style={styles.primaryBtnText}>잠들기 시작</Text>
          </Pressable>

          {/* Secondary: 10분 후 */}
          <Pressable style={styles.secondaryBtn} onPress={onSnooze}>
            <Text style={styles.secondaryBtnText}>10분 후에 알려주세요</Text>
          </Pressable>

          {/* Tertiary: 건너뛰기 */}
          <Pressable style={styles.skipBtn} onPress={onSkipTonight}>
            <Text style={styles.skipBtnText}>오늘은 건너뛰기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#C4B5FD',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#C4B5FD',
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
