/**
 * @jest-environment jsdom
 */

import {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  calculateProgress,
  getTimeRemaining,
  isDeadlineApproaching,
  isOverdue,
  getProgressColorClass,
} from '@/lib/time-utils';

describe('time-utils', () => {
  const mockDate = new Date('2024-01-15T10:30:00Z');
  
  beforeAll(() => {
    // Mock Date.now()
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('formatDate', () => {
    it('should format date in Korean locale', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(testDate);
      expect(formatted).toMatch(/2024.*1.*15/);
    });
  });

  describe('formatTime', () => {
    it('should format time in Korean locale with 24-hour format', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      const formatted = formatTime(testDate);
      // 시간대에 따라 다를 수 있으므로 시간 형식만 확인
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time together', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDateTime(testDate);
      expect(formatted).toMatch(/2024.*1.*15.*\d{2}:\d{2}/);
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "방금 전" for very recent dates', () => {
      const recentDate = new Date(mockDate.getTime() - 30000); // 30초 전
      expect(formatRelativeTime(recentDate)).toBe('방금 전');
    });

    it('should return minutes for dates within an hour', () => {
      const minutesAgo = new Date(mockDate.getTime() - 30 * 60 * 1000); // 30분 전
      expect(formatRelativeTime(minutesAgo)).toBe('30분 전');
    });

    it('should return hours for dates within a day', () => {
      const hoursAgo = new Date(mockDate.getTime() - 5 * 60 * 60 * 1000); // 5시간 전
      expect(formatRelativeTime(hoursAgo)).toBe('5시간 전');
    });

    it('should return days for dates within a week', () => {
      const daysAgo = new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3일 전
      expect(formatRelativeTime(daysAgo)).toBe('3일 전');
    });

    it('should return formatted date for older dates', () => {
      const weekAgo = new Date(mockDate.getTime() - 8 * 24 * 60 * 60 * 1000); // 8일 전
      const result = formatRelativeTime(weekAgo);
      expect(result).toMatch(/2024.*1.*7/);
    });
  });

  describe('calculateProgress', () => {
    it('should return 0% when not started', () => {
      const startDate = new Date(mockDate.getTime() + 60 * 60 * 1000); // 1시간 후 시작
      const endDate = new Date(mockDate.getTime() + 3 * 60 * 60 * 1000); // 3시간 후 종료
      expect(calculateProgress(startDate, endDate, mockDate)).toBe(0);
    });

    it('should return 50% when halfway through', () => {
      const startDate = new Date(mockDate.getTime() - 60 * 60 * 1000); // 1시간 전 시작
      const endDate = new Date(mockDate.getTime() + 60 * 60 * 1000); // 1시간 후 종료
      expect(calculateProgress(startDate, endDate, mockDate)).toBe(50);
    });

    it('should return 100% when completed or past due', () => {
      const startDate = new Date(mockDate.getTime() - 2 * 60 * 60 * 1000); // 2시간 전 시작
      const endDate = new Date(mockDate.getTime() - 60 * 60 * 1000); // 1시간 전 종료
      expect(calculateProgress(startDate, endDate, mockDate)).toBe(100);
    });

    it('should return 100% when start and end dates are the same', () => {
      const sameDate = new Date(mockDate.getTime());
      expect(calculateProgress(sameDate, sameDate, mockDate)).toBe(100);
    });
  });

  describe('getTimeRemaining', () => {
    it('should return "마감됨" for past dates', () => {
      const pastDate = new Date(mockDate.getTime() - 60 * 60 * 1000); // 1시간 전
      expect(getTimeRemaining(pastDate, mockDate)).toBe('마감됨');
    });

    it('should return days remaining', () => {
      const futureDate = new Date(mockDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2일 후
      expect(getTimeRemaining(futureDate, mockDate)).toBe('2일 남음');
    });

    it('should return hours remaining', () => {
      const futureDate = new Date(mockDate.getTime() + 5 * 60 * 60 * 1000); // 5시간 후
      expect(getTimeRemaining(futureDate, mockDate)).toBe('5시간 남음');
    });

    it('should return minutes remaining', () => {
      const futureDate = new Date(mockDate.getTime() + 30 * 60 * 1000); // 30분 후
      expect(getTimeRemaining(futureDate, mockDate)).toBe('30분 남음');
    });

    it('should return "곧 마감" for very near future', () => {
      const futureDate = new Date(mockDate.getTime() + 30 * 1000); // 30초 후
      expect(getTimeRemaining(futureDate, mockDate)).toBe('곧 마감');
    });
  });

  describe('isDeadlineApproaching', () => {
    it('should return true when deadline is within threshold', () => {
      const nearDeadline = new Date(mockDate.getTime() + 12 * 60 * 60 * 1000); // 12시간 후
      expect(isDeadlineApproaching(nearDeadline, 24, mockDate)).toBe(true);
    });

    it('should return false when deadline is beyond threshold', () => {
      const farDeadline = new Date(mockDate.getTime() + 48 * 60 * 60 * 1000); // 48시간 후
      expect(isDeadlineApproaching(farDeadline, 24, mockDate)).toBe(false);
    });

    it('should return false when deadline has passed', () => {
      const pastDeadline = new Date(mockDate.getTime() - 60 * 60 * 1000); // 1시간 전
      expect(isDeadlineApproaching(pastDeadline, 24, mockDate)).toBe(false);
    });
  });

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date(mockDate.getTime() - 60 * 60 * 1000); // 1시간 전
      expect(isOverdue(pastDate, mockDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date(mockDate.getTime() + 60 * 60 * 1000); // 1시간 후
      expect(isOverdue(futureDate, mockDate)).toBe(false);
    });
  });

  describe('getProgressColorClass', () => {
    it('should return green for high progress (>=80%)', () => {
      expect(getProgressColorClass(90)).toBe('bg-green-500');
      expect(getProgressColorClass(80)).toBe('bg-green-500');
    });

    it('should return blue for good progress (>=60%)', () => {
      expect(getProgressColorClass(70)).toBe('bg-blue-500');
      expect(getProgressColorClass(60)).toBe('bg-blue-500');
    });

    it('should return yellow for medium progress (>=40%)', () => {
      expect(getProgressColorClass(50)).toBe('bg-yellow-500');
      expect(getProgressColorClass(40)).toBe('bg-yellow-500');
    });

    it('should return orange for low progress (>=20%)', () => {
      expect(getProgressColorClass(30)).toBe('bg-orange-500');
      expect(getProgressColorClass(20)).toBe('bg-orange-500');
    });

    it('should return red for very low progress (<20%)', () => {
      expect(getProgressColorClass(10)).toBe('bg-red-500');
      expect(getProgressColorClass(0)).toBe('bg-red-500');
    });
  });
});