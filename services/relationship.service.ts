import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
  deleteWithJWT,
} from '@/lib/supabaseWebViewHelper';
import type {
  Relationship,
  RelationshipInput,
  PersonRelationship,
} from '@/types/relationship';

// ============================================
// 관계(Relationship) 관리 서비스
// ============================================

/**
 * 관계 관리 서비스
 * 관계 CRUD + 사람-관계 연결
 */
export class RelationshipService {

  // ============================================
  // 관계 CRUD
  // ============================================

  /**
   * 관계 목록 조회
   */
  static async getRelationships(userId: string): Promise<Relationship[]> {
    try {
      const data = await queryRLSTableWithJWT('relationships', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'is_active', operator: 'eq', value: true },
      ], { order: 'order_index.asc,name.asc' });

      console.log('💞 관계 목록 조회:', data?.length || 0, '개');
      return data || [];
    } catch (error) {
      console.error('❌ 관계 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 단일 관계 조회
   */
  static async getRelationship(relationshipId: string, userId: string): Promise<Relationship | null> {
    try {
      const data = await queryRLSTableWithJWT('relationships', [
        { column: 'id', operator: 'eq', value: relationshipId },
        { column: 'user_id', operator: 'eq', value: userId },
      ]);

      return data?.[0] || null;
    } catch (error) {
      console.error('❌ 관계 조회 오류:', error);
      return null;
    }
  }

  /**
   * 관계 생성
   */
  static async createRelationship(
    userId: string,
    input: RelationshipInput
  ): Promise<Relationship | null> {
    const relationshipData = {
      user_id: userId,
      name: input.name.trim(),
      icon: input.icon || null,
      color: input.color || '#3B82F6',
      order_index: input.order_index || 0,
      is_active: true,
    };

    try {
      const data = await createWithJWT('relationships', relationshipData);
      console.log('➕ 관계 생성:', input.name);
      return data;
    } catch (error) {
      console.error('❌ 관계 생성 오류:', error);
      return null;
    }
  }

  /**
   * 관계 수정
   */
  static async updateRelationship(
    relationshipId: string,
    userId: string,
    updates: Partial<RelationshipInput>
  ): Promise<boolean> {
    try {
      await updateWithJWT(
        'relationships',
        [
          { column: 'id', operator: 'eq', value: relationshipId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { ...updates, updated_at: new Date().toISOString() }
      );
      console.log('✏️ 관계 수정:', relationshipId);
      return true;
    } catch (error) {
      console.error('❌ 관계 수정 오류:', error);
      return false;
    }
  }

  /**
   * 관계 삭제 (soft delete)
   */
  static async deleteRelationship(relationshipId: string, userId: string): Promise<boolean> {
    try {
      await updateWithJWT(
        'relationships',
        [
          { column: 'id', operator: 'eq', value: relationshipId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { is_active: false, updated_at: new Date().toISOString() }
      );
      console.log('🗑️ 관계 삭제 (soft):', relationshipId);
      return true;
    } catch (error) {
      console.error('❌ 관계 삭제 오류:', error);
      return false;
    }
  }

  /**
   * 관계 영구 삭제
   */
  static async hardDeleteRelationship(relationshipId: string, userId: string): Promise<boolean> {
    try {
      await deleteWithJWT(
        'relationships',
        [
          { column: 'id', operator: 'eq', value: relationshipId },
          { column: 'user_id', operator: 'eq', value: userId },
        ]
      );
      console.log('🗑️ 관계 영구 삭제:', relationshipId);
      return true;
    } catch (error) {
      console.error('❌ 관계 영구 삭제 오류:', error);
      return false;
    }
  }

  // ============================================
  // 사람-관계 연결
  // ============================================

  /**
   * 사람을 관계에 연결
   */
  static async linkPersonToRelationship(
    userId: string,
    personId: string,
    relationshipId: string
  ): Promise<boolean> {
    const linkData = {
      user_id: userId,
      person_id: personId,
      relationship_id: relationshipId,
    };

    try {
      await createWithJWT('person_relationships', linkData);
      console.log('🔗 사람-관계 연결:', personId, '→', relationshipId);
      return true;
    } catch (error) {
      // 이미 연결된 경우 (UNIQUE constraint violation)
      if (String(error).includes('duplicate') || String(error).includes('unique')) {
        console.log('ℹ️ 이미 연결됨:', personId, '→', relationshipId);
        return true;
      }
      console.error('❌ 사람-관계 연결 오류:', error);
      return false;
    }
  }

  /**
   * 사람-관계 연결 해제
   */
  static async unlinkPersonFromRelationship(
    userId: string,
    personId: string,
    relationshipId: string
  ): Promise<boolean> {
    try {
      await deleteWithJWT('person_relationships', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'person_id', operator: 'eq', value: personId },
        { column: 'relationship_id', operator: 'eq', value: relationshipId },
      ]);
      console.log('🔓 사람-관계 연결 해제:', personId, '←', relationshipId);
      return true;
    } catch (error) {
      console.error('❌ 사람-관계 연결 해제 오류:', error);
      return false;
    }
  }

  /**
   * 사용자의 전체 person-relationship 매핑 조회 (필터링용 캐시)
   */
  static async getAllPersonRelationships(userId: string): Promise<PersonRelationship[]> {
    try {
      const data = await queryRLSTableWithJWT('person_relationships', [
        { column: 'user_id', operator: 'eq', value: userId },
      ]);

      console.log('🔗 전체 사람-관계 매핑 조회:', data?.length || 0, '개');
      return data || [];
    } catch (error) {
      console.error('❌ 전체 사람-관계 매핑 조회 오류:', error);
      return [];
    }
  }

  /**
   * 사람이 가진 관계 목록 조회
   */
  static async getPersonRelationships(userId: string, personId: string): Promise<Relationship[]> {
    try {
      // 1. person_relationships에서 관계 ID들 조회
      const links = await queryRLSTableWithJWT('person_relationships', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'person_id', operator: 'eq', value: personId },
      ]);

      if (!links || links.length === 0) {
        return [];
      }

      // 2. 관계 정보 조회
      const relationshipIds = links.map((link: PersonRelationship) => link.relationship_id);
      const relationships = await queryRLSTableWithJWT('relationships', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'id', operator: 'in', value: relationshipIds },
        { column: 'is_active', operator: 'eq', value: true },
      ]);

      return relationships || [];
    } catch (error) {
      console.error('❌ 사람 관계 조회 오류:', error);
      return [];
    }
  }

  /**
   * 관계에 속한 사람들의 person_id 조회
   */
  static async getRelationshipPersonIds(
    userId: string,
    relationshipId: string
  ): Promise<string[]> {
    try {
      const data = await queryRLSTableWithJWT('person_relationships', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'relationship_id', operator: 'eq', value: relationshipId },
      ]);

      return (data || []).map((link: PersonRelationship) => link.person_id);
    } catch (error) {
      console.error('❌ 관계별 사람 ID 조회 오류:', error);
      return [];
    }
  }

  /**
   * 사람의 모든 관계를 업데이트 (기존 연결 삭제 후 새로 연결)
   */
  static async updatePersonRelationships(
    userId: string,
    personId: string,
    relationshipIds: string[]
  ): Promise<boolean> {
    try {
      // 1. 기존 연결 모두 삭제
      await deleteWithJWT('person_relationships', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'person_id', operator: 'eq', value: personId },
      ]);

      // 2. 새 연결 생성
      for (const relationshipId of relationshipIds) {
        await this.linkPersonToRelationship(userId, personId, relationshipId);
      }

      console.log('✅ 사람 관계 업데이트 완료:', personId, '→', relationshipIds.length, '개');
      return true;
    } catch (error) {
      console.error('❌ 사람 관계 업데이트 오류:', error);
      return false;
    }
  }
}
