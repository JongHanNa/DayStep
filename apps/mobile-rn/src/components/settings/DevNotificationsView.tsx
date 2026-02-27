/**
 * DevNotificationsView — 개발환경 전용: 스케줄된 알림 목록 조회
 * __DEV__ 빌드에서만 SettingsScreen에서 진입 가능
 */
import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet, ActivityIndicator} from 'react-native';
import notifee, {TriggerNotificationWithId, TriggerType} from '@notifee/react-native';
import {AnimatedPressable} from '@/components/core';
import {ArrowLeft, RefreshCw, BellOff} from 'lucide-react-native';

interface DevNotificationsViewProps {
  onBack: () => void;
}

interface SortedNotification {
  id: string;
  timestamp: number;
  title?: string;
  body?: string;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DevNotificationsView({onBack}: DevNotificationsViewProps) {
  const [notifications, setNotifications] = useState<SortedNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const triggers: TriggerNotificationWithId[] =
        await notifee.getTriggerNotifications();

      const sorted: SortedNotification[] = triggers
        .filter(t => t.trigger.type === TriggerType.TIMESTAMP)
        .map(t => {
          const ts = (t.trigger as {type: TriggerType.TIMESTAMP; timestamp: number}).timestamp;
          return {
            id: t.id ?? '',
            timestamp: ts,
            title: t.notification.title,
            body: t.notification.body,
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      setNotifications(sorted);
    } catch (e) {
      console.error('[DevNotifications] fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <AnimatedPressable onPress={onBack} hapticType="light" scaleValue={0.9}>
          <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
        </AnimatedPressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>알림 스케줄</Text>
          {!loading && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notifications.length}</Text>
            </View>
          )}
        </View>
        <AnimatedPressable
          onPress={fetchNotifications}
          hapticType="light"
          scaleValue={0.9}
          disabled={loading}>
          <RefreshCw size={20} color={loading ? '#D1D5DB' : '#6B7280'} strokeWidth={2} />
        </AnimatedPressable>
      </View>

      {/* 목록 */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <BellOff size={40} color="#D1D5DB" strokeWidth={1.5} />
          <Text style={styles.emptyText}>스케줄된 알림 없음</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {notifications.map((n, index) => (
            <View key={String(index)} style={styles.item}>
              <Text style={styles.itemTime}>{formatTimestamp(n.timestamp)}</Text>
              {n.title ? (
                <Text style={styles.itemTitle}>{n.title}</Text>
              ) : null}
              {n.body ? (
                <Text style={styles.itemBody}>{n.body}</Text>
              ) : null}
              <Text style={styles.itemId}>{n.id}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  badge: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
    gap: 10,
  },
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 4,
  },
  itemTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemTitle: {
    fontSize: 14,
    color: '#374151',
  },
  itemBody: {
    fontSize: 13,
    color: '#6B7280',
  },
  itemId: {
    fontSize: 11,
    color: '#9CA3AF',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});
