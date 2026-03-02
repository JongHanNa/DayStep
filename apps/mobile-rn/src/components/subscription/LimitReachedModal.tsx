/**
 * LimitReachedModal — Free 플랜 한도 초과 모달
 *
 * 생성 시도 시 Free 한도에 도달하면 표시됩니다.
 * Props: visible, onClose, entityType, currentCount, maxCount
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import {Crown, Lock} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {ENTITY_DISPLAY_NAME, type UsageEntityType} from '@/lib/featureFlags';

interface LimitReachedModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: UsageEntityType | null;
  currentCount: number;
  maxCount: number;
}

export function LimitReachedModal({
  visible,
  onClose,
  entityType,
  currentCount,
  maxCount,
}: LimitReachedModalProps) {
  const navigation = useNavigation();

  const entityLabel = entityType ? ENTITY_DISPLAY_NAME[entityType] : '항목';

  const handleUpgrade = () => {
    onClose();
    navigation.navigate('Settings' as never);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.container}>
              {/* 아이콘 */}
              <View style={styles.iconWrap}>
                <Lock size={32} color="#9CA3AF" />
              </View>

              {/* 제목 */}
              <Text style={styles.title}>
                {entityLabel} 한도에 도달했어요
              </Text>

              {/* 사용량 표시 */}
              <Text style={styles.usage}>
                {currentCount} / {maxCount}개 사용 중
              </Text>

              {/* 설명 */}
              <Text style={styles.description}>
                무료 플랜에서는 {entityLabel}을(를){'\n'}
                최대 {maxCount}개까지 만들 수 있어요.{'\n'}
                Pro로 업그레이드하면 훨씬 더 많이 사용할 수 있어요.
              </Text>

              {/* 버튼 영역 */}
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
                activeOpacity={0.85}
              >
                <Crown size={16} color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>Pro로 업그레이드</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  usage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 10,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
});
