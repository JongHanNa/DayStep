/**
 * 사용자 서비스 구현체
 * 사용자 관련 비즈니스 로직과 데이터베이스 연동
 */

import { User } from '@/entities/user/User';
import { UserInsert, UserUpdate } from '@/types';
import { BaseService, ServiceError } from '../base/BaseService';
import { UserRepository, UserService as IUserService } from './UserRepository';

/**
 * 사용자 서비스 구현
 */
export class UserService extends BaseService implements UserRepository, IUserService {
  constructor() {
    super('UserService');
  }

  /**
   * ID로 사용자 조회
   */
  async findById(id: string): Promise<User | null> {
    return this.executeWithPerformanceTracking(
      'findById',
      async () => {
        this.validateRequiredFields({ id }, ['id'], 'findById');

        const data = await this.executeSingleQuery(
          this.client
            .from('users')
            .select('*')
            .eq('id', id),
          { userId: id }
        );

        return data ? User.fromDatabase(data as any) : null;
      },
      { userId: id }
    );
  }

  /**
   * 이메일로 사용자 조회
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.executeWithPerformanceTracking(
      'findByEmail',
      async () => {
        this.validateRequiredFields({ email }, ['email'], 'findByEmail');

        const data = await this.executeSingleQuery(
          this.client
            .from('users')
            .select('*')
            .eq('email', email),
          { email }
        );

        return data ? User.fromDatabase(data as any) : null;
      },
      { email }
    );
  }

  /**
   * 새 사용자 생성
   */
  async create(userData: UserInsert): Promise<User> {
    return this.executeWithPerformanceTracking(
      'create',
      async () => {
        this.validateRequiredFields(userData, ['id', 'email'], 'create');

        // 이메일 중복 확인
        const existingUser = await this.findByEmail(userData.email);
        if (existingUser) {
          throw new ServiceError(
            '이미 등록된 이메일입니다.',
            'EMAIL_ALREADY_EXISTS',
            undefined,
            { email: userData.email }
          );
        }

        const data = await this.executeQuery(
          this.client
            .from('users')
            .insert([userData])
            .select()
            .single(),
          { userData }
        );

        return User.fromDatabase(data as any);
      },
      { email: userData.email }
    );
  }

  /**
   * 사용자 정보 업데이트
   */
  async update(id: string, userData: UserUpdate): Promise<User> {
    return this.executeWithPerformanceTracking(
      'update',
      async () => {
        this.validateRequiredFields({ id }, ['id'], 'update');

        // 사용자 존재 확인
        const existingUser = await this.findById(id);
        if (!existingUser) {
          throw new ServiceError(
            '사용자를 찾을 수 없습니다.',
            'USER_NOT_FOUND',
            undefined,
            { userId: id }
          );
        }

        // 이메일 변경 시 중복 확인
        if (userData.email && userData.email !== existingUser.email) {
          const emailExists = await this.findByEmail(userData.email);
          if (emailExists) {
            throw new ServiceError(
              '이미 사용 중인 이메일입니다.',
              'EMAIL_ALREADY_EXISTS',
              undefined,
              { email: userData.email }
            );
          }
        }

        const updateData = {
          ...userData,
          updated_at: new Date().toISOString(),
        };

        const data = await this.executeQuery(
          this.client
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          { userId: id, updateData }
        );

        return User.fromDatabase(data as any);
      },
      { userId: id }
    );
  }

  /**
   * 사용자 삭제
   */
  async delete(id: string): Promise<void> {
    return this.executeWithPerformanceTracking(
      'delete',
      async () => {
        this.validateRequiredFields({ id }, ['id'], 'delete');

        // 사용자 존재 확인
        const user = await this.findById(id);
        if (!user) {
          throw new ServiceError(
            '사용자를 찾을 수 없습니다.',
            'USER_NOT_FOUND',
            undefined,
            { userId: id }
          );
        }

        // 관련 데이터도 함께 삭제하는 트랜잭션 실행
        await this.executeTransaction([
          { name: 'delete_todos', params: { user_id: id } },
          { name: 'delete_user', params: { user_id: id } },
        ], 'delete_user_cascade');
      },
      { userId: id }
    );
  }

  /**
   * 사용자 존재 여부 확인
   */
  async exists(id: string): Promise<boolean> {
    return this.executeWithPerformanceTracking(
      'exists',
      async () => {
        this.validateRequiredFields({ id }, ['id'], 'exists');

        const { count } = (await this.executeQuery(
          this.client
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('id', id),
          { userId: id }
        )) as any;

        return (count || 0) > 0;
      },
      { userId: id }
    );
  }

  /**
   * 사용자 프로필 완성도 체크
   */
  checkProfileCompleteness(user: User): {
    isComplete: boolean;
    missingFields: string[];
    completionPercentage: number;
  } {
    const requiredFields = [
      { key: 'email', label: '이메일', value: user.email },
      { key: 'name', label: '이름', value: user.name },
    ];

    const missingFields: string[] = [];
    let completedFields = 0;

    requiredFields.forEach(field => {
      if (field.value && field.value.trim() !== '') {
        completedFields++;
      } else {
        missingFields.push(field.label);
      }
    });

    const completionPercentage = Math.round((completedFields / requiredFields.length) * 100);
    const isComplete = missingFields.length === 0;

    return {
      isComplete,
      missingFields,
      completionPercentage,
    };
  }

  /**
   * 사용자 활동 통계 조회
   */
  async getUserActivityStats(userId: string): Promise<{
    totalTodos: number;
    completedTodos: number;
    joinDate: Date;
    lastActivity: Date | null;
  }> {
    return this.executeWithPerformanceTracking(
      'getUserActivityStats',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'getUserActivityStats');

        // 사용자 정보 조회
        const user = await this.findById(userId);
        if (!user) {
          throw new ServiceError(
            '사용자를 찾을 수 없습니다.',
            'USER_NOT_FOUND',
            undefined,
            { userId }
          );
        }

        // 할일 통계 조회 (전체/완료)
        const todosStats = await Promise.all([
          this.executeQuery(
            this.client
              .from('todos')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
          ),
          this.executeQuery(
            this.client
              .from('todos')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('completed', true)
          ),
        ]);

        // 최근 활동 조회 (가장 최근 업데이트된 항목)
        const lastActivity = await this.executeSingleQuery(
          this.client
            .from('todos')
            .select('updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(1)
        );

        return {
          totalTodos: (todosStats[0] as any).count || 0,
          completedTodos: (todosStats[1] as any).count || 0,
          joinDate: user.createdAt,
          lastActivity: lastActivity ? new Date((lastActivity as any).updated_at) : null,
        };
      },
      { userId }
    );
  }

  /**
   * 사용자 데이터 백업 생성
   */
  async createDataBackup(userId: string): Promise<{
    user: User;
    todos: any[];
    createdAt: Date;
  }> {
    return this.executeWithPerformanceTracking(
      'createDataBackup',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'createDataBackup');

        const user = await this.findById(userId);
        if (!user) {
          throw new ServiceError(
            '사용자를 찾을 수 없습니다.',
            'USER_NOT_FOUND',
            undefined,
            { userId }
          );
        }

        // 모든 사용자 데이터 조회
        const todos = await this.executeQuery(
          this.client
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .order('order_index', { ascending: true })
        );

        return {
          user,
          todos: todos as any[],
          createdAt: new Date(),
        };
      },
      { userId }
    );
  }

  /**
   * 사용자 계정 초기화 (개발/테스트용)
   */
  async resetUserData(userId: string): Promise<void> {
    return this.executeWithPerformanceTracking(
      'resetUserData',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'resetUserData');

        // 프로덕션 환경에서는 실행 방지
        if (process.env.NODE_ENV === 'production') {
          throw new ServiceError(
            '프로덕션 환경에서는 데이터 초기화를 실행할 수 없습니다.',
            'OPERATION_NOT_ALLOWED',
            undefined,
            { userId, environment: process.env.NODE_ENV }
          );
        }

        const user = await this.findById(userId);
        if (!user) {
          throw new ServiceError(
            '사용자를 찾을 수 없습니다.',
            'USER_NOT_FOUND',
            undefined,
            { userId }
          );
        }

        // 관련 데이터만 삭제 (사용자 계정은 유지)
        await this.executeTransaction([
          { name: 'delete_todos', params: { user_id: userId } },
        ], 'reset_user_data');
      },
      { userId }
    );
  }

  /**
   * 사용자 검색 (관리자용)
   */
  async searchUsers(
    query: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    users: User[];
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    return this.executeWithPerformanceTracking(
      'searchUsers',
      async () => {
        this.validateRequiredFields({ query }, ['query'], 'searchUsers');

        const baseQuery = this.client
          .from('users')
          .select('*')
          .or(`email.ilike.%${query}%,name.ilike.%${query}%`);

        const result = await this.executePaginatedQuery(baseQuery, {
          ...options,
          orderBy: 'created_at',
          ascending: false,
        });

        return {
          ...result,
          users: (result as any).data.map((userData: any) => User.fromDatabase(userData)),
        };
      },
      { query, options }
    );
  }

  /**
   * 사용자 목록 조회 (페이지네이션)
   */
  async getUsers(options: {
    page?: number;
    limit?: number;
    orderBy?: 'created_at' | 'updated_at' | 'email' | 'name';
    ascending?: boolean;
  } = {}): Promise<{
    users: User[];
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    return this.executeWithPerformanceTracking(
      'getUsers',
      async () => {
        const baseQuery = this.client.from('users').select('*');

        const result = await this.executePaginatedQuery(baseQuery, {
          orderBy: 'created_at',
          ascending: false,
          ...options,
        });

        return {
          ...result,
          users: (result as any).data.map((userData: any) => User.fromDatabase(userData)),
        };
      },
      { options }
    );
  }
}