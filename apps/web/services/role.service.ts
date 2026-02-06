import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
  deleteWithJWT,
} from '@/lib/supabaseWebViewHelper';
import type {
  Role,
  RoleInput,
  PersonRole,
} from '@/types/role';

// ============================================
// 역할(Role) 관리 서비스
// ============================================

/**
 * 역할 관리 서비스
 * 역할 CRUD + 사람-역할 연결
 */
export class RoleService {

  // ============================================
  // 역할 CRUD
  // ============================================

  /**
   * 역할 목록 조회
   */
  static async getRoles(userId: string): Promise<Role[]> {
    try {
      const data = await queryRLSTableWithJWT('roles', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'is_active', operator: 'eq', value: true },
      ], { order: 'order_index.asc,name.asc' });

      console.log('🎭 역할 목록 조회:', data?.length || 0, '개');
      return data || [];
    } catch (error) {
      console.error('❌ 역할 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 단일 역할 조회
   */
  static async getRole(roleId: string, userId: string): Promise<Role | null> {
    try {
      const data = await queryRLSTableWithJWT('roles', [
        { column: 'id', operator: 'eq', value: roleId },
        { column: 'user_id', operator: 'eq', value: userId },
      ]);

      return data?.[0] || null;
    } catch (error) {
      console.error('❌ 역할 조회 오류:', error);
      return null;
    }
  }

  /**
   * 역할 생성
   */
  static async createRole(
    userId: string,
    input: RoleInput
  ): Promise<Role | null> {
    const roleData = {
      user_id: userId,
      name: input.name.trim(),
      icon: input.icon || null,
      color: input.color || '#10B981',
      order_index: input.order_index || 0,
      is_active: true,
    };

    try {
      const data = await createWithJWT('roles', roleData);
      console.log('➕ 역할 생성:', input.name);
      return data;
    } catch (error) {
      console.error('❌ 역할 생성 오류:', error);
      return null;
    }
  }

  /**
   * 역할 수정
   */
  static async updateRole(
    roleId: string,
    userId: string,
    updates: Partial<RoleInput>
  ): Promise<boolean> {
    try {
      await updateWithJWT(
        'roles',
        [
          { column: 'id', operator: 'eq', value: roleId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { ...updates, updated_at: new Date().toISOString() }
      );
      console.log('✏️ 역할 수정:', roleId);
      return true;
    } catch (error) {
      console.error('❌ 역할 수정 오류:', error);
      return false;
    }
  }

  /**
   * 역할 삭제 (soft delete)
   */
  static async deleteRole(roleId: string, userId: string): Promise<boolean> {
    try {
      await updateWithJWT(
        'roles',
        [
          { column: 'id', operator: 'eq', value: roleId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { is_active: false, updated_at: new Date().toISOString() }
      );
      console.log('🗑️ 역할 삭제 (soft):', roleId);
      return true;
    } catch (error) {
      console.error('❌ 역할 삭제 오류:', error);
      return false;
    }
  }

  /**
   * 역할 영구 삭제
   */
  static async hardDeleteRole(roleId: string, userId: string): Promise<boolean> {
    try {
      await deleteWithJWT(
        'roles',
        [
          { column: 'id', operator: 'eq', value: roleId },
          { column: 'user_id', operator: 'eq', value: userId },
        ]
      );
      console.log('🗑️ 역할 영구 삭제:', roleId);
      return true;
    } catch (error) {
      console.error('❌ 역할 영구 삭제 오류:', error);
      return false;
    }
  }

  // ============================================
  // 사람-역할 연결
  // ============================================

  /**
   * 사람을 역할에 연결
   */
  static async linkPersonToRole(
    userId: string,
    personId: string,
    roleId: string
  ): Promise<boolean> {
    const linkData = {
      user_id: userId,
      person_id: personId,
      role_id: roleId,
    };

    try {
      await createWithJWT('person_roles', linkData);
      console.log('🔗 사람-역할 연결:', personId, '→', roleId);
      return true;
    } catch (error) {
      // 이미 연결된 경우 (UNIQUE constraint violation)
      if (String(error).includes('duplicate') || String(error).includes('unique')) {
        console.log('ℹ️ 이미 연결됨:', personId, '→', roleId);
        return true;
      }
      console.error('❌ 사람-역할 연결 오류:', error);
      return false;
    }
  }

  /**
   * 사람-역할 연결 해제
   */
  static async unlinkPersonFromRole(
    userId: string,
    personId: string,
    roleId: string
  ): Promise<boolean> {
    try {
      await deleteWithJWT('person_roles', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'person_id', operator: 'eq', value: personId },
        { column: 'role_id', operator: 'eq', value: roleId },
      ]);
      console.log('🔓 사람-역할 연결 해제:', personId, '←', roleId);
      return true;
    } catch (error) {
      console.error('❌ 사람-역할 연결 해제 오류:', error);
      return false;
    }
  }

  /**
   * 사용자의 전체 person-role 매핑 조회 (필터링용 캐시)
   */
  static async getAllPersonRoles(userId: string): Promise<PersonRole[]> {
    try {
      const data = await queryRLSTableWithJWT('person_roles', [
        { column: 'user_id', operator: 'eq', value: userId },
      ]);

      console.log('🔗 전체 사람-역할 매핑 조회:', data?.length || 0, '개');
      return data || [];
    } catch (error) {
      console.error('❌ 전체 사람-역할 매핑 조회 오류:', error);
      return [];
    }
  }

  /**
   * 사람이 가진 역할 목록 조회
   */
  static async getPersonRoles(userId: string, personId: string): Promise<Role[]> {
    try {
      // 1. person_roles에서 역할 ID들 조회
      const links = await queryRLSTableWithJWT('person_roles', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'person_id', operator: 'eq', value: personId },
      ]);

      if (!links || links.length === 0) {
        return [];
      }

      // 2. 역할 정보 조회
      const roleIds = links.map((link: PersonRole) => link.role_id);
      const roles = await queryRLSTableWithJWT('roles', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'id', operator: 'in', value: roleIds },
        { column: 'is_active', operator: 'eq', value: true },
      ]);

      return roles || [];
    } catch (error) {
      console.error('❌ 사람 역할 조회 오류:', error);
      return [];
    }
  }

  /**
   * 역할에 속한 사람들의 person_id 조회
   */
  static async getRolePersonIds(
    userId: string,
    roleId: string
  ): Promise<string[]> {
    try {
      const data = await queryRLSTableWithJWT('person_roles', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'role_id', operator: 'eq', value: roleId },
      ]);

      return (data || []).map((link: PersonRole) => link.person_id);
    } catch (error) {
      console.error('❌ 역할별 사람 ID 조회 오류:', error);
      return [];
    }
  }

  /**
   * 사람의 모든 역할을 업데이트 (기존 연결 삭제 후 새로 연결)
   */
  static async updatePersonRoles(
    userId: string,
    personId: string,
    roleIds: string[]
  ): Promise<boolean> {
    try {
      // 1. 기존 연결 모두 삭제
      await deleteWithJWT('person_roles', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'person_id', operator: 'eq', value: personId },
      ]);

      // 2. 새 연결 생성
      for (const roleId of roleIds) {
        await this.linkPersonToRole(userId, personId, roleId);
      }

      console.log('✅ 사람 역할 업데이트 완료:', personId, '→', roleIds.length, '개');
      return true;
    } catch (error) {
      console.error('❌ 사람 역할 업데이트 오류:', error);
      return false;
    }
  }
}
