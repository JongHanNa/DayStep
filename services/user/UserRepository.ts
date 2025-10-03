/**
 * 사용자 서비스 인터페이스 정의
 */

import { User } from '@/entities/user/User';
import { UserInsert, UserUpdate } from '@/types';

/**
 * 사용자 기본 저장소 인터페이스
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(userData: UserInsert): Promise<User>;
  update(id: string, userData: UserUpdate): Promise<User>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

/**
 * 사용자 도메인 서비스 인터페이스
 */
export interface UserService {
  checkProfileCompleteness(user: User): {
    isComplete: boolean;
    missingFields: string[];
    completionPercentage: number;
  };
  
  getUserActivityStats(userId: string): Promise<{
    totalTodos: number;
    completedTodos: number;
    repositoryItems: number;
    joinDate: Date;
    lastActivity: Date | null;
  }>;
  
  createDataBackup(userId: string): Promise<{
    user: User;
    todos: any[];
    repositoryItems: any[];
    createdAt: Date;
  }>;
  
  resetUserData(userId: string): Promise<void>;
  
  searchUsers(query: string, options?: {
    page?: number;
    limit?: number;
  }): Promise<{
    users: User[];
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>;
  
  getUsers(options?: {
    page?: number;
    limit?: number;
    orderBy?: 'created_at' | 'updated_at' | 'email' | 'name';
    ascending?: boolean;
  }): Promise<{
    users: User[];
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>;
}