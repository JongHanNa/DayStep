/**
 * AdminPlanLimitsScreen — 플랜 한도 관리 (관리자 전용)
 * Supabase plan_limits 테이블을 직접 upsert (RLS admin 정책으로 보호)
 */
import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ArrowLeft, Save} from 'lucide-react-native';
import {supabase} from '@/lib/supabase';
import {useTheme} from '@/theme';

interface PlanLimitRow {
  id: string;
  entity_type: string;
  tier: 'free' | 'pro';
  max_count: number;
  display_text: string;
  display_label: string;
}

type EditMap = Record<string, {max_count?: number; display_text?: string}>;

const ENTITY_LABELS: Record<string, string> = {
  todo:             '할일',
  habit:            '습관',
  project:          '프로젝트',
  note:             '원동력',
  cherished_people: '소중한 사람',
  care_interaction: '관심 기록',
};

const ENTITY_ORDER = ['todo', 'habit', 'project', 'note', 'cherished_people', 'care_interaction'];

interface Props {
  onBack: () => void;
}

export function AdminPlanLimitsScreen({onBack}: Props) {
  const {primaryColor} = useTheme();
  const [rows, setRows] = useState<PlanLimitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<EditMap>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const {data, error} = await supabase
        .from('plan_limits')
        .select('*')
        .order('entity_type')
        .order('tier');
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      Alert.alert('오류', `불러오기 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const getRow = (entity: string, tier: 'free' | 'pro') =>
    rows.find(r => r.entity_type === entity && r.tier === tier);

  const editKey = (entity: string, tier: 'free' | 'pro') => `${entity}:${tier}`;

  const getValue = (entity: string, tier: 'free' | 'pro', field: 'max_count' | 'display_text') => {
    const key = editKey(entity, tier);
    const edit = edits[key];
    if (edit && field in edit) return String(edit[field]);
    const row = getRow(entity, tier);
    return row ? String(row[field]) : '';
  };

  const getUnit = (entity: string, tier: 'free' | 'pro'): string => {
    const base = getRow(entity, tier);
    if (!base) return '개';
    return base.display_text.replace(/[\d,]/g, '') || '개';
  };

  const handleChange = (
    entity: string,
    tier: 'free' | 'pro',
    field: 'max_count' | 'display_text',
    value: string,
  ) => {
    const key = editKey(entity, tier);
    setEdits(prev => {
      const updates: {max_count?: number; display_text?: string} = {
        ...prev[key],
        [field]: field === 'max_count' ? Number(value) : value,
      };
      if (field === 'max_count') {
        const unit = getUnit(entity, tier);
        const num = Number(value);
        updates.display_text = `${num.toLocaleString('ko-KR')}${unit}`;
      }
      return {...prev, [key]: updates};
    });
  };

  const handleSave = async (entity: string, tier: 'free' | 'pro') => {
    const key = editKey(entity, tier);
    const base = getRow(entity, tier);
    if (!base) return;
    const edit = edits[key] ?? {};
    const payload = {
      entity_type:   entity,
      tier,
      max_count:     edit.max_count     ?? base.max_count,
      display_text:  edit.display_text  ?? base.display_text,
      display_label: base.display_label,
      updated_at:    new Date().toISOString(),
    };

    setSaving(key);
    try {
      const {error} = await supabase
        .from('plan_limits')
        .upsert(payload, {onConflict: 'entity_type,tier'});
      if (error) throw error;

      setRows(prev =>
        prev.map(r =>
          r.entity_type === entity && r.tier === tier
            ? {...r, ...payload}
            : r,
        ),
      );
      setEdits(prev => {
        const next = {...prev};
        delete next[key];
        return next;
      });
      Alert.alert('저장됨', `${ENTITY_LABELS[entity] ?? entity} ${tier} 한도가 업데이트되었습니다.`);
    } catch (e: any) {
      Alert.alert('오류', `저장 실패: ${e.message}`);
    } finally {
      setSaving(null);
    }
  };

  const isDirty = (entity: string, tier: 'free' | 'pro') =>
    Object.keys(edits[editKey(entity, tier)] ?? {}).length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <ArrowLeft size={22} color="#374151" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>플랜 한도 관리</Text>
        <View style={{width: 38}} />
      </View>

      <Text style={styles.subtitle}>
        저장하면 Realtime으로 웹·앱 전 클라이언트에 즉시 반영됩니다.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {ENTITY_ORDER.map(entity => (
            <View key={entity} style={styles.card}>
              <Text style={styles.cardTitle}>{ENTITY_LABELS[entity] ?? entity}</Text>

              {(['free', 'pro'] as const).map(tier => (
                <View key={tier} style={styles.tierRow}>
                  <View style={[styles.tierBadge, tier === 'pro' && styles.tierBadgePro]}>
                    <Text style={[styles.tierBadgeText, tier === 'pro' && styles.tierBadgeTextPro, tier === 'pro' && {color: primaryColor}]}>
                      {tier === 'free' ? 'Free' : 'Pro'}
                    </Text>
                  </View>

                  <View style={styles.inputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>최대 수</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={getValue(entity, tier, 'max_count')}
                        onChangeText={v => handleChange(entity, tier, 'max_count', v)}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>표시 텍스트</Text>
                      <TextInput
                        style={styles.input}
                        value={getValue(entity, tier, 'display_text')}
                        onChangeText={v => handleChange(entity, tier, 'display_text', v)}
                      />
                    </View>
                  </View>

                  {isDirty(entity, tier) && (
                    <TouchableOpacity
                      style={[styles.saveBtn, {backgroundColor: primaryColor}]}
                      disabled={saving === editKey(entity, tier)}
                      onPress={() => handleSave(entity, tier)}>
                      {saving === editKey(entity, tier) ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Save size={16} color="#fff" strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F9FAFB'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {padding: 8},
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#111827'},
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  scrollContent: {padding: 16, paddingBottom: 60},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 10},
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tierBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  tierBadgePro: {backgroundColor: '#FEF3C7'},
  tierBadgeText: {fontSize: 11, fontWeight: '700', color: '#6B7280'},
  tierBadgeTextPro: {color: '#D97706'},
  inputs: {flex: 1, flexDirection: 'row', gap: 8},
  inputGroup: {flex: 1},
  inputLabel: {fontSize: 10, color: '#9CA3AF', marginBottom: 2},
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  saveBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
