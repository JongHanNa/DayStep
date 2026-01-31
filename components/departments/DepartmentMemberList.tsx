'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Users, X, Edit2, Check } from 'lucide-react';
import { useDepartmentStore } from '@/state/stores/departmentStore';
import { useAuth } from '@/app/context/AuthContext';
import { CherishedPeopleService } from '@/services/cherished-people.service';
import type { PersonDepartment } from '@/types/department';
import type { CherishedPerson } from '@/types/cherished-people';

interface DepartmentMemberListProps {
  departmentId: string;
  members: PersonDepartment[];
}

/**
 * 부서 멤버 목록 컴포넌트
 */
export default function DepartmentMemberList({
  departmentId,
  members,
}: DepartmentMemberListProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    linkPersonToDepartment,
    unlinkPersonFromDepartment,
    updateMemberRole,
    fetchDepartmentMembers,
  } = useDepartmentStore();

  // 사람 목록 (연결 가능한)
  const [availablePeople, setAvailablePeople] = useState<CherishedPerson[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

  // 추가 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<CherishedPerson | null>(
    null
  );
  const [role, setRole] = useState('');

  // 역할 편집 상태
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState('');

  // 사람 정보 매핑 (member에는 person_id만 있으므로)
  const [peopleMap, setPeopleMap] = useState<Map<string, CherishedPerson>>(
    new Map()
  );

  // 사람 목록 로드
  useEffect(() => {
    const loadPeople = async () => {
      if (!userId) return;
      setLoadingPeople(true);
      try {
        const people = await CherishedPeopleService.getPeople(userId);
        setAvailablePeople(people);

        // 멤버 매핑
        const map = new Map<string, CherishedPerson>();
        people.forEach((p) => map.set(p.id, p));
        setPeopleMap(map);
      } catch (error) {
        console.error('사람 목록 로드 오류:', error);
      } finally {
        setLoadingPeople(false);
      }
    };
    loadPeople();
  }, [userId]);

  // 이미 멤버인 사람 ID 집합
  const memberPersonIds = new Set(members.map((m) => m.person_id));

  // 추가 가능한 사람 목록
  const addablePeople = availablePeople.filter(
    (p) => !memberPersonIds.has(p.id)
  );

  // 멤버 추가
  const handleAddMember = async () => {
    if (!userId || !selectedPerson) return;

    await linkPersonToDepartment(
      userId,
      selectedPerson.id,
      departmentId,
      role.trim() || undefined
    );
    await fetchDepartmentMembers(userId, departmentId);

    setShowAddModal(false);
    setSelectedPerson(null);
    setRole('');
  };

  // 멤버 제거
  const handleRemoveMember = async (personId: string) => {
    if (!userId) return;
    if (!confirm('이 멤버를 부서에서 제거하시겠습니까?')) return;

    await unlinkPersonFromDepartment(userId, personId, departmentId);
    await fetchDepartmentMembers(userId, departmentId);
  };

  // 역할 편집 시작
  const handleEditRole = (member: PersonDepartment) => {
    setEditingMemberId(member.id);
    setEditingRole(member.role_in_department || '');
  };

  // 역할 저장
  const handleSaveRole = async (personId: string) => {
    if (!userId) return;

    await updateMemberRole(
      userId,
      personId,
      departmentId,
      editingRole.trim() || null
    );
    await fetchDepartmentMembers(userId, departmentId);

    setEditingMemberId(null);
    setEditingRole('');
  };

  if (members.length === 0 && !showAddModal) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 mx-auto mb-2 text-base-content/30" />
        <p className="text-base-content/50 mb-4">등록된 멤버가 없습니다</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-sm btn-primary rounded-full gap-1"
        >
          <UserPlus className="w-4 h-4" />
          멤버 추가
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-base-content/60">
          {members.length}명의 멤버
        </span>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-xs btn-ghost gap-1"
        >
          <UserPlus className="w-3 h-3" />
          추가
        </button>
      </div>

      {/* 멤버 목록 */}
      <div className="space-y-2">
        {members.map((member) => {
          const person = peopleMap.get(member.person_id);
          const isEditing = editingMemberId === member.id;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
            >
              {/* 아바타 */}
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                {person?.name?.charAt(0) || '?'}
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {person?.name || '알 수 없음'}
                </p>
                {isEditing ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="text"
                      value={editingRole}
                      onChange={(e) => setEditingRole(e.target.value)}
                      placeholder="역할 입력"
                      className="input input-xs input-bordered flex-1"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveRole(member.person_id)}
                      className="btn btn-xs btn-ghost btn-circle"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setEditingMemberId(null)}
                      className="btn btn-xs btn-ghost btn-circle"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-base-content/50">
                      {member.role_in_department || '역할 없음'}
                    </span>
                    <button
                      onClick={() => handleEditRole(member)}
                      className="btn btn-xs btn-ghost btn-circle opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* 제거 버튼 */}
              <button
                onClick={() => handleRemoveMember(member.person_id)}
                className="btn btn-ghost btn-xs btn-circle text-error/50 hover:text-error"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* 멤버 추가 모달 */}
      {showAddModal && (
        <dialog open className="modal z-[110]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-box max-w-sm"
          >
            <h3 className="font-bold text-lg mb-4">멤버 추가</h3>

            {loadingPeople ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : addablePeople.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p>추가할 수 있는 사람이 없습니다</p>
                <p className="text-xs mt-1">
                  먼저 소중한 사람을 등록해주세요
                </p>
              </div>
            ) : (
              <>
                {/* 사람 선택 */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">사람 선택</span>
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {addablePeople.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => setSelectedPerson(person)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                          selectedPerson?.id === person.id
                            ? 'bg-primary text-primary-content'
                            : 'bg-base-200 hover:bg-base-300'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                            selectedPerson?.id === person.id
                              ? 'bg-primary-content/20 text-primary-content'
                              : 'bg-primary/20 text-primary'
                          }`}
                        >
                          {person.name.charAt(0)}
                        </div>
                        <span className="truncate">{person.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 역할 입력 */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">역할 (선택)</span>
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="예: 팀장, 총무, 회원..."
                    className="input input-bordered"
                  />
                </div>

                {/* 버튼 */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedPerson(null);
                      setRole('');
                    }}
                    className="btn btn-ghost rounded-full"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={!selectedPerson}
                    className="btn btn-primary rounded-full"
                  >
                    추가
                  </button>
                </div>
              </>
            )}
          </motion.div>
          <form method="dialog" className="modal-backdrop">
            <button
              onClick={() => {
                setShowAddModal(false);
                setSelectedPerson(null);
                setRole('');
              }}
            >
              close
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
