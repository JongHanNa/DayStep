import { RepositoryItem as DatabaseRepositoryItem, RepositoryItemType } from '@/types';

/**
 * RepositoryItem Domain Entity
 * 보관함 아이템 도메인의 핵심 비즈니스 로직을 담당
 */
export class RepositoryItem {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: RepositoryItemType,
    public readonly title: string,
    public readonly content: string,
    public readonly category: string | null,
    public readonly sourceId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * 데이터베이스 보관함 아이템 데이터로부터 RepositoryItem 엔티티 생성
   */
  static fromDatabase(data: DatabaseRepositoryItem): RepositoryItem {
    return new RepositoryItem(
      data.id,
      data.user_id,
      data.type as RepositoryItemType,
      data.title,
      data.content,
      data.category,
      data.source_id,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  /**
   * 새로운 보관함 아이템 생성을 위한 데이터 반환
   */
  static create(
    userId: string,
    type: RepositoryItemType,
    title: string,
    content: string,
    category?: string,
    sourceId?: string
  ): {
    userId: string;
    type: RepositoryItemType;
    title: string;
    content: string;
    category: string | null;
    sourceId: string | null;
  } {
    // 비즈니스 규칙 검증
    if (!title.trim()) {
      throw new Error('보관함 아이템 제목은 필수입니다.');
    }

    if (title.length > 100) {
      throw new Error('제목은 100자를 초과할 수 없습니다.');
    }

    if (!content.trim()) {
      throw new Error('보관함 아이템 내용은 필수입니다.');
    }

    if (content.length > 1000) {
      throw new Error('내용은 1000자를 초과할 수 없습니다.');
    }

    if (category && category.length > 50) {
      throw new Error('카테고리는 50자를 초과할 수 없습니다.');
    }

    return {
      userId,
      type,
      title: title.trim(),
      content: content.trim(),
      category: category?.trim() || null,
      sourceId: sourceId || null,
    };
  }


  /**
   * 할일로부터 보관함 아이템 생성
   */
  static fromTodo(
    userId: string,
    todoId: string,
    title: string,
    content: string,
    category?: string
  ): {
    userId: string;
    type: RepositoryItemType;
    title: string;
    content: string;
    category: string | null;
    sourceId: string | null;
  } {
    return this.create(userId, 'todo', title, content, category, todoId);
  }

  /**
   * 아이템 유형별 색상 반환
   */
  get typeColor(): string {
    const colors: Record<RepositoryItemType, string> = {
      todo: '#10B981',       // green
    };
    return colors[this.type];
  }

  /**
   * 아이템 유형별 한글명 반환
   */
  get typeLabel(): string {
    const labels: Record<RepositoryItemType, string> = {
      todo: '할일',
    };
    return labels[this.type];
  }

  /**
   * 아이템 유형별 아이콘 반환
   */
  get typeIcon(): string {
    const icons: Record<RepositoryItemType, string> = {
      todo: '✅',
    };
    return icons[this.type];
  }

  /**
   * 보관함 아이템 생성 후 경과 일수
   */
  get daysSinceCreated(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 카테고리가 있는지 확인
   */
  get hasCategory(): boolean {
    return Boolean(this.category);
  }

  /**
   * 원본 데이터와 연결되어 있는지 확인
   */
  get hasSource(): boolean {
    return Boolean(this.sourceId);
  }

  /**
   * 내용 미리보기 (100자 제한)
   */
  get preview(): string {
    return this.content.length > 100
      ? `${this.content.substring(0, 100)}...`
      : this.content;
  }

  /**
   * 아이템이 오래된지 확인 (30일 이상)
   */
  get isOld(): boolean {
    return this.daysSinceCreated >= 30;
  }

  /**
   * 보관함 아이템 수정
   */
  update(
    title?: string,
    content?: string,
    category?: string | null
  ): RepositoryItem {
    const updatedTitle = title ?? this.title;
    const updatedContent = content ?? this.content;
    const updatedCategory = category !== undefined ? category : this.category;

    // 비즈니스 규칙 재검증
    if (!updatedTitle.trim()) {
      throw new Error('보관함 아이템 제목은 필수입니다.');
    }

    if (updatedTitle.length > 100) {
      throw new Error('제목은 100자를 초과할 수 없습니다.');
    }

    if (!updatedContent.trim()) {
      throw new Error('보관함 아이템 내용은 필수입니다.');
    }

    if (updatedContent.length > 1000) {
      throw new Error('내용은 1000자를 초과할 수 없습니다.');
    }

    if (updatedCategory && updatedCategory.length > 50) {
      throw new Error('카테고리는 50자를 초과할 수 없습니다.');
    }

    return new RepositoryItem(
      this.id,
      this.userId,
      this.type,
      updatedTitle.trim(),
      updatedContent.trim(),
      updatedCategory?.trim() || null,
      this.sourceId,
      this.createdAt,
      new Date() // 업데이트 시간 갱신
    );
  }

  /**
   * 카테고리 설정
   */
  setCategory(category: string | null): RepositoryItem {
    if (category && category.length > 50) {
      throw new Error('카테고리는 50자를 초과할 수 없습니다.');
    }

    return this.update(undefined, undefined, category);
  }

  /**
   * 카테고리 제거
   */
  removeCategory(): RepositoryItem {
    return this.setCategory(null);
  }

  /**
   * 데이터베이스 형식으로 변환
   */
  toDatabase(): Omit<DatabaseRepositoryItem, 'created_at' | 'updated_at'> & {
    created_at?: string;
    updated_at?: string;
  } {
    return {
      id: this.id,
      user_id: this.userId,
      type: this.type,
      title: this.title,
      content: this.content,
      category: this.category,
      source_id: this.sourceId,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }

  /**
   * 할일로 변환하기 위한 데이터 반환
   */
  toTodoData(): {
    content: string;
    order_index: number;
  } {
    return {
      content: this.type === 'todo' ? this.content : this.title,
      order_index: 0, // 새로 생성되는 할일은 맨 위에
    };
  }

}