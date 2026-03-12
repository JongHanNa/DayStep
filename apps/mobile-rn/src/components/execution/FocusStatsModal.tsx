/**
 * FocusStatsModal — 포커스 통계 상세 모달
 * pageSheet 스타일, 4개 통계 카드 + 연속 현황 + 최근 기록
 */
import React, {useMemo} from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {X} from 'lucide-react-native';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useTheme} from '@/theme';

interface FocusStatsModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatSessionTime(isoString: string): string {
  const d = new Date(isoString);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatSessionDate(isoString: string): string {
  const d = new Date(isoString);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}

export function FocusStatsModal({visible, onClose}: FocusStatsModalProps) {
  const insets = useSafeAreaInsets();
  const {primaryColor, colors} = useTheme();
  const {stats, sessions} = usePomodoroStore();

  // 오늘 집중 시간 계산 (sessions에서 오늘 POMODORO duration 합산)
  const todayFocusTime = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sessions
      .filter(
        s =>
          s.timerType === 'POMODORO' &&
          s.completedAt.startsWith(today),
      )
      .reduce((sum, s) => sum + s.duration, 0);
  }, [sessions]);

  const todayFocusMinutes = Math.round(todayFocusTime / 60);

  // 최근 10개 세션
  const recentSessions = useMemo(() => {
    return sessions
      .filter(s => s.timerType === 'POMODORO')
      .slice(0, 10);
  }, [sessions]);

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            style={styles.closeBtn}>
            <X size={22} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>포커스 통계</Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + 24},
          ]}
          showsVerticalScrollIndicator={false}>
          {/* 4개 통계 카드 (2x2 그리드) */}
          <View style={styles.grid}>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, {color: primaryColor}]}>
                {stats.todaySessions}
              </Text>
              <Text style={styles.statLabel}>오늘의 포모</Text>
              <Text style={styles.statSublabel}>완료한 세션</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, {color: primaryColor}]}>
                {formatMinutes(todayFocusMinutes)}
              </Text>
              <Text style={styles.statLabel}>오늘의 집중</Text>
              <Text style={styles.statSublabel}>집중 시간</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, {color: primaryColor}]}>
                {stats.completedSessions}
              </Text>
              <Text style={styles.statLabel}>총 포모</Text>
              <Text style={styles.statSublabel}>전체 완료 세션</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, {color: primaryColor}]}>
                {formatMinutes(stats.totalFocusTime)}
              </Text>
              <Text style={styles.statLabel}>총 집중 기간</Text>
              <Text style={styles.statSublabel}>누적 시간</Text>
            </View>
          </View>

          {/* 연속 집중 현황 */}
          <View style={styles.streakCard}>
            <Text style={styles.sectionTitle}>연속 집중 현황</Text>
            <View style={styles.streakRow}>
              <View style={styles.streakItem}>
                <Text style={[styles.streakNumber, {color: primaryColor}]}>
                  {stats.currentStreak}
                </Text>
                <Text style={styles.streakLabel}>현재 연속</Text>
              </View>
              <View style={styles.streakDivider} />
              <View style={styles.streakItem}>
                <Text style={[styles.streakNumber, {color: primaryColor}]}>
                  {stats.longestStreak}
                </Text>
                <Text style={styles.streakLabel}>최고 연속</Text>
              </View>
            </View>
          </View>

          {/* 최근 집중 기록 */}
          {recentSessions.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>최근 집중 기록</Text>
              {recentSessions.map(session => {
                const durationMin = Math.round(session.duration / 60);
                return (
                  <View key={session.id} style={styles.sessionRow}>
                    <View style={styles.sessionLeft}>
                      <Text style={styles.sessionDate}>
                        {formatSessionDate(session.completedAt)}
                      </Text>
                      <Text style={styles.sessionTime}>
                        {formatSessionTime(session.completedAt)}
                      </Text>
                    </View>
                    <View style={styles.sessionRight}>
                      <Text style={styles.sessionDuration}>
                        {durationMin}분
                      </Text>
                      {session.interrupted && (
                        <Text style={[styles.sessionInterrupted, {color: colors.error}]}>중단</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },

  // 2x2 Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statSublabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Streak
  streakCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },

  // Recent sessions
  recentSection: {
    gap: 0,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 40,
  },
  sessionTime: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  sessionInterrupted: {
    fontSize: 12,
    fontWeight: '500',
  },
});
