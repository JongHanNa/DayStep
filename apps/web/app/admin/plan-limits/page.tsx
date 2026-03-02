'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';

interface PlanLimitRow {
  id: string;
  entity_type: string;
  tier: 'free' | 'pro';
  max_count: number;
  display_text: string;
  display_label: string;
}

const ENTITY_LABELS: Record<string, string> = {
  todo:             '할일',
  habit:            '습관',
  project:          '프로젝트',
  note:             '원동력',
  cherished_people: '소중한 사람',
  care_interaction: '관심 기록',
};

const ENTITY_ORDER = ['todo', 'habit', 'project', 'note', 'cherished_people', 'care_interaction'];

type EditMap = Record<string, Partial<PlanLimitRow>>;

export default function PlanLimitsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<PlanLimitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<EditMap>({});
  const [saving, setSaving] = useState<boolean>(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  };

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plan-limits', { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Fetch failed');
      setRows(json.data ?? []);
    } catch (e: any) {
      toast.error(`불러오기 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const getRow = (entity: string, tier: 'free' | 'pro') =>
    rows.find(r => r.entity_type === entity && r.tier === tier);

  const getEditKey = (entity: string, tier: 'free' | 'pro') => `${entity}:${tier}`;

  const getValue = (entity: string, tier: 'free' | 'pro', field: keyof PlanLimitRow) => {
    const key = getEditKey(entity, tier);
    const edit = edits[key];
    if (edit && field in edit) return String(edit[field as keyof EditMap[string]]);
    return String(getRow(entity, tier)?.[field] ?? '');
  };

  // display_text에서 숫자/쉼표를 제거해 단위 문자열만 추출
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
    const key = getEditKey(entity, tier);
    setEdits(prev => {
      const updates: Partial<PlanLimitRow> = {
        ...prev[key],
        [field]: field === 'max_count' ? Number(value) : value,
      };
      if (field === 'max_count') {
        const unit = getUnit(entity, tier);
        const num = Number(value);
        updates.display_text = `${num.toLocaleString('ko-KR')}${unit}`;
      }
      return { ...prev, [key]: updates };
    });
  };

  const isDirty = (entity: string, tier: 'free' | 'pro') => {
    const key = getEditKey(entity, tier);
    return Object.keys(edits[key] ?? {}).length > 0;
  };

  const isDirtyRow = (entity: string) =>
    isDirty(entity, 'free') || isDirty(entity, 'pro');

  const isDirtyAny = () => Object.keys(edits).length > 0;

  const saveOne = async (entity: string, tier: 'free' | 'pro') => {
    const key = getEditKey(entity, tier);
    const base = getRow(entity, tier);
    if (!base) return;
    const edit = edits[key] ?? {};
    const payload = {
      entity_type:   entity,
      tier,
      max_count:     edit.max_count     ?? base.max_count,
      display_text:  edit.display_text  ?? base.display_text,
      display_label: base.display_label,
    };
    const res = await fetch('/api/admin/plan-limits', {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Save failed');
    setRows(prev => prev.map(r =>
      r.entity_type === entity && r.tier === tier ? { ...r, ...payload, id: r.id } : r,
    ));
    setEdits(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  const handleSaveAll = async () => {
    const dirtyEntities = ENTITY_ORDER.filter(isDirtyRow);
    setSaving(true);
    try {
      await Promise.all(
        dirtyEntities.flatMap(entity => [
          saveOne(entity, 'free'),
          saveOne(entity, 'pro'),
        ])
      );
      toast.success('저장됨');
    } catch (e: any) {
      toast.error(`저장 실패: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">플랜 한도 관리</h1>
      <p className="text-sm text-base-content/60 mb-6">
        저장하면 Supabase Realtime을 통해 웹·모바일 전 클라이언트에 즉시 반영됩니다.
      </p>

      <div className="overflow-x-auto rounded-xl border border-base-300">
        <table className="table table-zebra w-full">
          <thead>
            <tr className="bg-base-200">
              <th className="w-32">항목</th>
              <th>Free 한도 수</th>
              <th>Free 표시 텍스트</th>
              <th>Pro 한도 수</th>
              <th>Pro 표시 텍스트</th>
            </tr>
          </thead>
          <tbody>
            {ENTITY_ORDER.map(entity => (
              <tr key={entity}>
                <td className="font-semibold text-sm">
                  {ENTITY_LABELS[entity] ?? entity}
                </td>

                {/* Free */}
                <td>
                  <input
                    type="number"
                    className="input input-sm input-bordered w-28"
                    value={getValue(entity, 'free', 'max_count')}
                    onChange={e => handleChange(entity, 'free', 'max_count', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28"
                    value={getValue(entity, 'free', 'display_text')}
                    onChange={e => handleChange(entity, 'free', 'display_text', e.target.value)}
                  />
                </td>

                {/* Pro */}
                <td>
                  <input
                    type="number"
                    className="input input-sm input-bordered w-28"
                    value={getValue(entity, 'pro', 'max_count')}
                    onChange={e => handleChange(entity, 'pro', 'max_count', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="input input-sm input-bordered w-28"
                    value={getValue(entity, 'pro', 'display_text')}
                    onChange={e => handleChange(entity, 'pro', 'display_text', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          className={`btn btn-md whitespace-nowrap ${
            isDirtyAny() ? 'btn-primary' : 'btn-ghost cursor-not-allowed'
          }`}
          disabled={!isDirtyAny() || saving}
          onClick={handleSaveAll}
        >
          {saving
            ? <><span className="loading loading-spinner loading-xs mr-1" />저장 중...</>
            : '전체 저장'}
        </button>
      </div>
    </div>
  );
}
