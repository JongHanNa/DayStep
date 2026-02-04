import {
  Flag,
  Users,
  BarChart3,
  Sparkles,
  MessageSquare,
  BookOpen,
  Clock,
  Target,
  Lightbulb,
  Inbox,
  PenLine,
  MessageCircle,
  Heart,
  type LucideIcon,
} from 'lucide-react';

/**
 * 서브뷰 ID → 아이콘/레이블 매핑
 * ADHDSidebar와 ADHDBottomTabBar에서 공통 사용
 */
export const SUBVIEW_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  // 대시보드
  banner: { icon: Flag, label: '배너' },
  contact: { icon: Users, label: '연락' },
  activity: { icon: BarChart3, label: '활동' },
  // 미룸방지
  'ai-plan': { icon: Sparkles, label: 'AI 계획' },
  'ai-chat': { icon: MessageSquare, label: 'AI 채팅' },
  guide: { icon: BookOpen, label: '가이드' },
  // 머릿속정리
  timeline: { icon: Clock, label: '타임라인' },
  execute: { icon: Target, label: '실행' },
  motivation: { icon: Lightbulb, label: '원동력' },
  organize: { icon: Inbox, label: '정리' },
  // 관계기록
  record: { icon: PenLine, label: '기록' },
  news: { icon: MessageCircle, label: '소식' },
  gratitude: { icon: Heart, label: '감사' },
};
