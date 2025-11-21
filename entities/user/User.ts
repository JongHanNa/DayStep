import { User as DatabaseUser, AuthUser } from '@/types';

/**
 * User Domain Entity
 * 사용자 도메인의 핵심 비즈니스 로직을 담당
 */
export class User {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly hasActiveSubscription: boolean | null = false,
    public readonly subscriptionType: 'free' | 'trial' | 'pro_monthly' | 'pro_yearly' | null = 'free',
    public readonly subscriptionExpiresAt: Date | null = null
  ) {}

  /**
   * 데이터베이스 사용자 데이터로부터 User 엔티티 생성
   */
  static fromDatabase(data: DatabaseUser): User {
    return new User(
      data.id,
      data.email,
      data.name,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.has_active_subscription,
      data.subscription_type,
      data.subscription_expires_at ? new Date(data.subscription_expires_at) : null
    );
  }

  /**
   * 인증 사용자 데이터로부터 User 엔티티 생성
   */
  static fromAuth(authUser: AuthUser): Partial<User> {
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || null,
    };
  }

  /**
   * 사용자 표시명 반환
   * 이름이 없으면 이메일 주소 사용
   */
  get displayName(): string {
    return this.name || this.email.split('@')[0];
  }

  /**
   * 사용자 프로필이 완성되었는지 확인
   */
  get isProfileComplete(): boolean {
    return Boolean(this.name && this.email);
  }

  /**
   * 사용자 계정 생성 후 경과 일수
   */
  get daysSinceJoined(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 사용자 데이터를 데이터베이스 형식으로 변환
   */
  toDatabase(): Omit<DatabaseUser, 'created_at' | 'updated_at'> & {
    created_at?: string;
    updated_at?: string;
  } {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      has_active_subscription: this.hasActiveSubscription,
      subscription_type: this.subscriptionType,
      subscription_expires_at: this.subscriptionExpiresAt?.toISOString() || null,
    };
  }

  /**
   * 사용자 정보 업데이트를 위한 새 인스턴스 생성
   */
  updateProfile(name: string): User {
    return new User(
      this.id,
      this.email,
      name,
      this.createdAt,
      new Date() // 업데이트 시간 갱신
    );
  }
}