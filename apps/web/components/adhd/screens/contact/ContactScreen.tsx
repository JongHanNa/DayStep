'use client';

import { ContactView } from './components/ContactView';

interface ContactScreenProps {
  userId: string;
}

/**
 * 연락 돌아보기 화면 (Pro 전용)
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * ContactView를 직접 사용
 */
export function ContactScreen({ userId }: ContactScreenProps) {
  return <ContactView userId={userId} />;
}

export default ContactScreen;
