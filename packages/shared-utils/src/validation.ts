/**
 * Domain Validation Utilities
 * 도메인별 유효성 검증 규칙을 중앙화
 */

// 공통 검증 규칙
export const ValidationRules = {
  // 사용자 관련
  USER: {
    EMAIL_MAX_LENGTH: 254,
    NAME_MAX_LENGTH: 100,
    NAME_MIN_LENGTH: 1,
  },
  
  
  // 할일 관련
  TODO: {
    CONTENT_MAX_LENGTH: 200,
    CONTENT_MIN_LENGTH: 1,
    ORDER_MIN_VALUE: 0,
  },
} as const;

/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= ValidationRules.USER.EMAIL_MAX_LENGTH;
}

/**
 * 사용자 이름 검증
 */
export function isValidUserName(name: string): { valid: boolean; error?: string } {
  const trimmedName = name.trim();
  
  if (trimmedName.length < ValidationRules.USER.NAME_MIN_LENGTH) {
    return { valid: false, error: '이름은 필수입니다.' };
  }
  
  if (trimmedName.length > ValidationRules.USER.NAME_MAX_LENGTH) {
    return { valid: false, error: `이름은 ${ValidationRules.USER.NAME_MAX_LENGTH}자를 초과할 수 없습니다.` };
  }
  
  return { valid: true };
}


/**
 * 할일 내용 검증
 */
export function isValidTodoContent(content: string): { valid: boolean; error?: string } {
  const trimmedContent = content.trim();
  
  if (trimmedContent.length < ValidationRules.TODO.CONTENT_MIN_LENGTH) {
    return { valid: false, error: '할일 내용은 필수입니다.' };
  }
  
  if (trimmedContent.length > ValidationRules.TODO.CONTENT_MAX_LENGTH) {
    return { valid: false, error: `할일 내용은 ${ValidationRules.TODO.CONTENT_MAX_LENGTH}자를 초과할 수 없습니다.` };
  }
  
  return { valid: true };
}

/**
 * 할일 순서 검증
 */
export function isValidTodoOrder(orderIndex: number): { valid: boolean; error?: string } {
  if (orderIndex < ValidationRules.TODO.ORDER_MIN_VALUE) {
    return { valid: false, error: '순서는 0 이상이어야 합니다.' };
  }
  
  if (!Number.isInteger(orderIndex)) {
    return { valid: false, error: '순서는 정수여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * UUID 형식 검증
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 날짜 문자열 검증 (ISO 8601 형식)
 */
export function isValidDateString(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString() === dateString;
}

/**
 * 여러 유효성 검증 결과를 하나로 결합
 */
export function combineValidationResults(...results: Array<{ valid: boolean; error?: string }>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const result of results) {
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}