import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
  deleteWithJWT,
  type QueryCondition,
} from '@/lib/supabaseWebViewHelper';
import type {
  Department,
  DepartmentInput,
  DepartmentAnnouncement,
  DepartmentAnnouncementInput,
  PersonDepartment,
  PersonDepartmentInput,
} from '@/types/department';
import type { Todo } from '@/types';

// ============================================
// 부서(Department) 관리 서비스
// ============================================

/**
 * 부서 관리 서비스
 * 부서 CRUD + 소식 + 사람-부서 연결 + 일정 연동
 */
export class DepartmentService {

  // ============================================
  // 부서 CRUD
  // ============================================

  /**
   * 부서 목록 조회
   */
  static async getDepartments(userId: string): Promise<Department[]> {
    try {
      const data = await queryRLSTableWithJWT('departments', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'is_active', operator: 'eq', value: true },
      ], { order: 'order_index.asc,name.asc' });

      console.log('🏢 부서 목록 조회:', data?.length || 0, '개');
      return data || [];
    } catch (error) {
      console.error('❌ 부서 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 단일 부서 조회
   */
  static async getDepartment(departmentId: string, userId: string): Promise<Department | null> {
    try {
      const data = await queryRLSTableWithJWT('departments', [
        { column: 'id', operator: 'eq', value: departmentId },
        { column: 'user_id', operator: 'eq', value: userId },
      ]);

      return data?.[0] || null;
    } catch (error) {
      console.error('❌ 부서 조회 오류:', error);
      return null;
    }
  }

  /**
   * 부서 생성
   */
  static async createDepartment(
    userId: string,
    input: DepartmentInput
  ): Promise<Department | null> {
    const departmentData = {
      user_id: userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      icon: input.icon || null,
      color: input.color || '#6366F1',
      image_url: input.image_url || null,
      category: input.category || 'other',
      contact_info: input.contact_info || {},
      meeting_day: input.meeting_day ?? null,
      meeting_time: input.meeting_time || null,
      meeting_location: input.meeting_location?.trim() || null,
      is_active: true,
      is_favorite: input.is_favorite || false,
      order_index: input.order_index || 0,
    };

    try {
      const data = await createWithJWT('departments', departmentData);
      console.log('➕ 부서 생성:', input.name);
      return data;
    } catch (error) {
      console.error('❌ 부서 생성 오류:', error);
      return null;
    }
  }

  /**
   * 부서 수정
   */
  static async updateDepartment(
    departmentId: string,
    userId: string,
    updates: Partial<DepartmentInput>
  ): Promise<boolean> {
    try {
      await updateWithJWT(
        'departments',
        [
          { column: 'id', operator: 'eq', value: departmentId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { ...updates, updated_at: new Date().toISOString() }
      );
      console.log('✏️ 부서 수정:', departmentId);
      return true;
    } catch (error) {
      console.error('❌ 부서 수정 오류:', error);
      return false;
    }
  }

  /**
   * 부서 삭제 (soft delete)
   */
  static async deleteDepartment(departmentId: string, userId: string): Promise<boolean> {
    try {
      await updateWithJWT(
        'departments',
        [
          { column: 'id', operator: 'eq', value: departmentId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { is_active: false, updated_at: new Date().toISOString() }
      );
      console.log('🗑️ 부서 삭제 (soft):', departmentId);
      return true;
    } catch (error) {
      console.error('❌ 부서 삭제 오류:', error);
      return false;
    }
  }

  /**
   * 부서 영구 삭제
   */
  static async hardDeleteDepartment(departmentId: string, userId: string): Promise<boolean> {
    try {
      await deleteWithJWT(
        'departments',
        [
          { column: 'id', operator: 'eq', value: departmentId },
          { column: 'user_id', operator: 'eq', value: userId },
        ]
      );
      console.log('🗑️ 부서 영구 삭제:', departmentId);
      return true;
    } catch (error) {
      console.error('❌ 부서 영구 삭제 오류:', error);
      return false;
    }
  }

  /**
   * 즐겨찾기 토글
   */
  static async toggleFavorite(departmentId: string, userId: string, isFavorite: boolean): Promise<boolean> {
    return this.updateDepartment(departmentId, userId, { is_favorite: isFavorite });
  }

  // ============================================
  // 부서 소식 CRUD
  // ============================================

  /**
   * 소식 목록 조회 (부서별 또는 전체)
   */
  static async getAnnouncements(
    userId: string,
    departmentId?: string
  ): Promise<DepartmentAnnouncement[]> {
    try {
      const filters: QueryCondition[] = [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'is_active', operator: 'eq', value: true },
      ];

      if (departmentId) {
        filters.push({ column: 'department_id', operator: 'eq', value: departmentId });
      }

      const data = await queryRLSTableWithJWT('department_announcements', filters, {
        order: 'is_pinned.desc,created_at.desc',
      });

      console.log('📢 소식 목록 조회:', data?.length || 0, '개');
      return data || [];
    } catch (error) {
      console.error('❌ 소식 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 소식 생성
   */
  static async createAnnouncement(
    userId: string,
    input: DepartmentAnnouncementInput
  ): Promise<DepartmentAnnouncement | null> {
    const announcementData = {
      user_id: userId,
      department_id: input.department_id,
      title: input.title.trim(),
      content: input.content?.trim() || null,
      announcement_type: input.announcement_type || 'notice',
      event_date: input.event_date || null,
      event_time: input.event_time || null,
      event_location: input.event_location?.trim() || null,
      is_pinned: input.is_pinned || false,
      is_active: true,
    };

    try {
      const data = await createWithJWT('department_announcements', announcementData);
      console.log('➕ 소식 생성:', input.title);
      return data;
    } catch (error) {
      console.error('❌ 소식 생성 오류:', error);
      return null;
    }
  }

  /**
   * 소식 수정
   */
  static async updateAnnouncement(
    announcementId: string,
    userId: string,
    updates: Partial<DepartmentAnnouncementInput>
  ): Promise<boolean> {
    try {
      await updateWithJWT(
        'department_announcements',
        [
          { column: 'id', operator: 'eq', value: announcementId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { ...updates, updated_at: new Date().toISOString() }
      );
      console.log('✏️ 소식 수정:', announcementId);
      return true;
    } catch (error) {
      console.error('❌ 소식 수정 오류:', error);
      return false;
    }
  }

  /**
   * 소식 삭제 (soft delete)
   */
  static async deleteAnnouncement(announcementId: string, userId: string): Promise<boolean> {
    try {
      await updateWithJWT(
        'department_announcements',
        [
          { column: 'id', operator: 'eq', value: announcementId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { is_active: false, updated_at: new Date().toISOString() }
      );
      console.log('🗑️ 소식 삭제:', announcementId);
      return true;
    } catch (error) {
      console.error('❌ 소식 삭제 오류:', error);
      return false;
    }
  }

  // ============================================
  // 사람-부서 연결
  // ============================================

  /**
   * 사람을 부서에 연결
   */
  static async linkPersonToDepartment(
    userId: string,
    personId: string,
    departmentId: string,
    roleInDepartment?: string
  ): Promise<boolean> {
    const linkData: PersonDepartmentInput & { user_id: string } = {
      user_id: userId,
      person_id: personId,
      department_id: departmentId,
      role_in_department: roleInDepartment?.trim() || null,
    };

    try {
      await createWithJWT('person_departments', linkData);
      console.log('🔗 사람-부서 연결:', personId, '→', departmentId);
      return true;
    } catch (error) {
      // 이미 연결된 경우 (UNIQUE constraint violation)
      if (String(error).includes('duplicate') || String(error).includes('unique')) {
        console.log('ℹ️ 이미 연결됨:', personId, '→', departmentId);
        return true;
      }
      console.error('❌ 사람-부서 연결 오류:', error);
      return false;
    }
  }

  /**
   * 사람-부서 연결 해제
   */
  static async unlinkPersonFromDepartment(
    userId: string,
    personId: string,
    departmentId: string
  ): Promise<boolean> {
    try {
      await deleteWithJWT('person_departments', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'person_id', operator: 'eq', value: personId },
        { column: 'department_id', operator: 'eq', value: departmentId },
      ]);
      console.log('🔓 사람-부서 연결 해제:', personId, '←', departmentId);
      return true;
    } catch (error) {
      console.error('❌ 사람-부서 연결 해제 오류:', error);
      return false;
    }
  }

  /**
   * 부서의 멤버 목록 조회
   */
  static async getDepartmentMembers(
    userId: string,
    departmentId: string
  ): Promise<PersonDepartment[]> {
    try {
      const data = await queryRLSTableWithJWT('person_departments', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'department_id', operator: 'eq', value: departmentId },
      ]);

      console.log('👥 부서 멤버 조회:', data?.length || 0, '명');
      return data || [];
    } catch (error) {
      console.error('❌ 부서 멤버 조회 오류:', error);
      return [];
    }
  }

  /**
   * 사용자의 전체 person-department 매핑 조회 (필터링용 캐시)
   */
  static async getAllPersonDepartments(userId: string): Promise<PersonDepartment[]> {
    try {
      const data = await queryRLSTableWithJWT('person_departments', [
        { column: 'user_id', operator: 'eq', value: userId },
      ]);

      console.log('🔗 전체 사람-부서 매핑 조회:', data?.length || 0, '개');
      return data || [];
    } catch (error) {
      console.error('❌ 전체 사람-부서 매핑 조회 오류:', error);
      return [];
    }
  }

  /**
   * 사람이 속한 부서 목록 조회
   */
  static async getPersonDepartments(userId: string, personId: string): Promise<Department[]> {
    try {
      // 1. person_departments에서 부서 ID들 조회
      const links = await queryRLSTableWithJWT('person_departments', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'person_id', operator: 'eq', value: personId },
      ]);

      if (!links || links.length === 0) {
        return [];
      }

      // 2. 부서 정보 조회
      const departmentIds = links.map((link: PersonDepartment) => link.department_id);
      const departments = await queryRLSTableWithJWT('departments', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'id', operator: 'in', value: departmentIds },
        { column: 'is_active', operator: 'eq', value: true },
      ]);

      return departments || [];
    } catch (error) {
      console.error('❌ 사람 소속 부서 조회 오류:', error);
      return [];
    }
  }

  /**
   * 멤버 역할 수정
   */
  static async updateMemberRole(
    userId: string,
    personId: string,
    departmentId: string,
    roleInDepartment: string | null
  ): Promise<boolean> {
    try {
      await updateWithJWT(
        'person_departments',
        [
          { column: 'user_id', operator: 'eq', value: userId },
          { column: 'person_id', operator: 'eq', value: personId },
          { column: 'department_id', operator: 'eq', value: departmentId },
        ],
        { role_in_department: roleInDepartment }
      );
      console.log('✏️ 멤버 역할 수정:', personId, '→', roleInDepartment);
      return true;
    } catch (error) {
      console.error('❌ 멤버 역할 수정 오류:', error);
      return false;
    }
  }

  // ============================================
  // 부서 일정 (todos 연동)
  // ============================================

  /**
   * 부서 일정 목록 조회
   */
  static async getDepartmentTodos(userId: string, departmentId: string): Promise<Todo[]> {
    try {
      const data = await queryRLSTableWithJWT('todos', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'department_id', operator: 'eq', value: departmentId },
      ], { order: 'start_time.asc' });

      console.log('📅 부서 일정 조회:', data?.length || 0, '개');
      return data || [];
    } catch (error) {
      console.error('❌ 부서 일정 조회 오류:', error);
      return [];
    }
  }

  /**
   * 할일에 부서 연결
   */
  static async linkTodoToDepartment(
    userId: string,
    todoId: string,
    departmentId: string | null
  ): Promise<boolean> {
    try {
      await updateWithJWT(
        'todos',
        [
          { column: 'id', operator: 'eq', value: todoId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { department_id: departmentId }
      );
      console.log('🔗 할일-부서 연결:', todoId, '→', departmentId || '해제');
      return true;
    } catch (error) {
      console.error('❌ 할일-부서 연결 오류:', error);
      return false;
    }
  }

  // ============================================
  // 통계
  // ============================================

  /**
   * 부서 통계 조회
   */
  static async getDepartmentStats(userId: string, departmentId: string): Promise<{
    memberCount: number;
    todoCount: number;
    announcementCount: number;
  }> {
    try {
      const [members, todos, announcements] = await Promise.all([
        this.getDepartmentMembers(userId, departmentId),
        this.getDepartmentTodos(userId, departmentId),
        this.getAnnouncements(userId, departmentId),
      ]);

      return {
        memberCount: members.length,
        todoCount: todos.length,
        announcementCount: announcements.length,
      };
    } catch (error) {
      console.error('❌ 부서 통계 조회 오류:', error);
      return {
        memberCount: 0,
        todoCount: 0,
        announcementCount: 0,
      };
    }
  }
}
