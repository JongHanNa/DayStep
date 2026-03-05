/**
 * LinkAccountModal — OAuth 계정 연결 확인 모달
 *
 * 같은 이메일로 다른 프로바이더 계정이 존재할 때 연결 여부를 확인합니다.
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {Link2} from 'lucide-react-native';

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
};

interface LinkAccountModalProps {
  visible: boolean;
  existingProvider: string | null;
  newProvider: 'google' | 'apple';
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LinkAccountModal({
  visible,
  existingProvider,
  newProvider,
  loading,
  onConfirm,
  onCancel,
}: LinkAccountModalProps) {
  const existingLabel = PROVIDER_LABEL[existingProvider ?? ''] ?? existingProvider;
  const newLabel = PROVIDER_LABEL[newProvider] ?? newProvider;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.container}>
              {/* 아이콘 */}
              <View style={styles.iconWrap}>
                <Link2 size={32} color="#3B82F6" />
              </View>

              {/* 제목 */}
              <Text style={styles.title}>기존 계정이 있습니다</Text>

              {/* 설명 */}
              <Text style={styles.description}>
                이미{' '}
                <Text style={styles.bold}>{existingLabel}</Text>
                으로 가입된 계정입니다.{'\n'}
                <Text style={styles.bold}>{newLabel}</Text> 계정을
                연결하시겠습니까?
              </Text>

              <Text style={styles.hint}>
                연결하면 두 계정 모두로 로그인할 수 있습니다
              </Text>

              {/* 연결 버튼 */}
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={onConfirm}
                disabled={loading}
                activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Link2 size={16} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>계정 연결하기</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* 취소 버튼 */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={loading}
                activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>취소</Text>
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
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '700',
    color: '#111827',
  },
  hint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButton: {
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
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
});
