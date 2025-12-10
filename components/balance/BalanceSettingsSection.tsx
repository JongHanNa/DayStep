'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Scale, Bell, BookOpen, Heart, Users, ChevronRight } from 'lucide-react';
import { useBalanceStore } from '@/state/stores/balanceStore';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';
import type { BalanceSettings } from '@/services/balance-journal.service';
import { CherishedPeopleList } from '@/components/cherished';

// 설정 필드 키 타입
type SettingsKey = 'morning_prompt_enabled' | 'evening_prompt_enabled' | 'balance_check_enabled' | 'journal_reminder_frequency';

/**
 * 균형 설정 섹션 컴포넌트
 * 설정 페이지에서 관계 균형 기능 설정을 관리
 */
export default function BalanceSettingsSection() {
  const { user } = useAuth();
  const userId = user?.id;
  const {
    settings,
    journals,
    loadSettings,
    updateSettings,
    loadJournals,
  } = useBalanceStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showPeopleList, setShowPeopleList] = useState(false);

  // 소중한 사람 스토어
  const { people, loadPeople } = useCherishedPeopleStore();

  // 설정 및 저널 로드
  useEffect(() => {
    if (userId) {
      loadSettings(userId);
      loadJournals(userId);
      loadPeople(userId);
    }
  }, [userId, loadSettings, loadJournals, loadPeople]);

  // 설정 토글 핸들러
  const handleToggle = async (key: SettingsKey, value: boolean) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      await updateSettings(userId, { [key]: value });
      toast.success('설정이 저장되었습니다');
    } catch (error) {
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 저널 상기 주기 변경 핸들러
  const handleFrequencyChange = async (frequency: number) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      await updateSettings(userId, { journal_reminder_frequency: frequency });
      toast.success('설정이 저장되었습니다');
    } catch (error) {
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const frequencyOptions = [
    { value: 1, label: '매일' },
    { value: 3, label: '3일마다' },
    { value: 7, label: '일주일마다' },
  ];

  // 기본값 (설정이 아직 로드되지 않은 경우)
  const morningEnabled = settings?.morning_prompt_enabled ?? true;
  const eveningEnabled = settings?.evening_prompt_enabled ?? true;
  const balanceEnabled = settings?.balance_check_enabled ?? true;
  const frequency = settings?.journal_reminder_frequency ?? 3;

  return (
    <div className="space-y-6">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
          <Heart className="w-5 h-5 text-white" fill="currentColor" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">관계 균형</h3>
          <p className="text-sm text-base-content/60">
            일과 관계의 균형을 유지하도록 도와드려요
          </p>
        </div>
      </div>

      {/* 소중한 사람 관리 버튼 */}
      <button
        onClick={() => setShowPeopleList(true)}
        className="w-full p-4 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 hover:from-pink-100 hover:to-purple-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-500" />
            </div>
            <div className="text-left">
              <h4 className="font-medium">소중한 사람 관리</h4>
              <p className="text-sm text-base-content/60">
                {people.length > 0
                  ? `${people.length}명의 소중한 사람`
                  : '마음을 전하고 싶은 분을 등록하세요'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-base-content/40" />
        </div>
      </button>

      {/* 설정 목록 */}
      <div className="space-y-4">
        {/* 하루 시작 질문 */}
        <SettingItem
          icon={<Sun className="w-5 h-5 text-amber-500" />}
          title="하루 시작 질문"
          description="실행 모드 진입 시 오늘의 관계 목표를 물어봐요"
          checked={morningEnabled}
          onChange={(value) => handleToggle('morning_prompt_enabled', value)}
          disabled={isLoading}
        />

        {/* 하루 마무리 리뷰 */}
        <SettingItem
          icon={<Moon className="w-5 h-5 text-indigo-500" />}
          title="하루 마무리 리뷰"
          description="모든 할일 완료 후 관계 리뷰를 진행해요"
          checked={eveningEnabled}
          onChange={(value) => handleToggle('evening_prompt_enabled', value)}
          disabled={isLoading}
        />

        {/* 균형 체크 */}
        <SettingItem
          icon={<Scale className="w-5 h-5 text-emerald-500" />}
          title="균형 체크"
          description="완료한 할일 중 관계 할일 비율을 체크해요"
          checked={balanceEnabled}
          onChange={(value) => handleToggle('balance_check_enabled', value)}
          disabled={isLoading}
        />

        {/* 저널 상기 주기 */}
        <div className="p-4 rounded-xl bg-base-200">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Bell className="w-5 h-5 text-pink-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">저널 상기 주기</h4>
              <p className="text-sm text-base-content/60 mt-1">
                작성한 저널을 다시 보여주는 주기
              </p>

              <div className="flex gap-2 mt-3">
                {frequencyOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFrequencyChange(option.value)}
                    disabled={isLoading}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-all
                      ${frequency === option.value
                        ? 'bg-pink-500 text-white'
                        : 'bg-base-300 text-base-content/70 hover:bg-base-100'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 저널 목록 미리보기 */}
      {journals.length > 0 && (
        <div className="p-4 rounded-xl bg-pink-50 border border-pink-200">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-medium text-pink-700">
              작성한 저널 {journals.length}개
            </span>
          </div>
          <div className="space-y-2">
            {journals.slice(0, 3).map((journal) => (
              <div
                key={journal.id}
                className="p-3 rounded-lg bg-white/80 text-sm text-base-content/80 line-clamp-2"
              >
                {journal.content}
              </div>
            ))}
            {journals.length > 3 && (
              <p className="text-xs text-pink-600 text-center mt-2">
                +{journals.length - 3}개 더
              </p>
            )}
          </div>
        </div>
      )}

      {/* 소중한 사람 목록 시트 */}
      {userId && (
        <CherishedPeopleList
          userId={userId}
          isOpen={showPeopleList}
          onClose={() => setShowPeopleList(false)}
        />
      )}
    </div>
  );
}

// 개별 설정 아이템 컴포넌트
interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingItem({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}: SettingItemProps) {
  return (
    <div className="p-4 rounded-xl bg-base-200">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-base-content/60 mt-1">{description}</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="peer sr-only"
          />
          <div className={`
            h-6 w-11 rounded-full bg-base-300
            peer-checked:bg-pink-500
            after:content-[''] after:absolute after:top-0.5 after:left-0.5
            after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow
            after:transition-transform after:duration-200
            peer-checked:after:translate-x-5
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `} />
        </label>
      </div>
    </div>
  );
}
