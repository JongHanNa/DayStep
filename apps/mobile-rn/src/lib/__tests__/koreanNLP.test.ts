/**
 * koreanNLP 테스트
 * 한국어 약속 텍스트 파서 — 날짜/시간/장소/사람 추출
 */
import {parseKoreanAppointment, appointmentToFormData} from '../koreanNLP';

// 고정된 기준 날짜: 2026-04-17 (금요일)
const REF = new Date(2026, 3, 17, 10, 0, 0);

describe('koreanNLP', () => {
  // ============================================
  // 날짜 추출
  // ============================================
  describe('날짜 추출', () => {
    test('오늘', () => {
      const r = parseKoreanAppointment('오늘 저녁 약속', REF);
      expect(r.date).toBe('2026-04-17');
    });

    test('내일', () => {
      const r = parseKoreanAppointment('내일 3시 미팅', REF);
      expect(r.date).toBe('2026-04-18');
    });

    test('모레', () => {
      const r = parseKoreanAppointment('모레 점심', REF);
      expect(r.date).toBe('2026-04-19');
    });

    test('글피', () => {
      const r = parseKoreanAppointment('글피 커피', REF);
      expect(r.date).toBe('2026-04-20');
    });

    test('다음주 수요일', () => {
      const r = parseKoreanAppointment('다음주 수요일 회의', REF);
      // 4/17(금) → 다음주 수 = 4/29
      expect(r.date).toBe('2026-04-29');
    });

    test('이번 주말', () => {
      const r = parseKoreanAppointment('이번 주말 등산', REF);
      // 4/17(금) → 이번 주말 토 = 4/18
      expect(r.date).toBe('2026-04-18');
    });

    test('월요일 (단독 요일)', () => {
      const r = parseKoreanAppointment('월요일 발표', REF);
      // 4/17(금) → 다음 월 = 4/20
      expect(r.date).toBe('2026-04-20');
    });

    test('5월 3일 (절대 날짜)', () => {
      const r = parseKoreanAppointment('5월 3일 여행 출발', REF);
      expect(r.date).toBe('2026-05-03');
    });

    test('4/25 (슬래시 날짜)', () => {
      const r = parseKoreanAppointment('4/25 동창회', REF);
      expect(r.date).toBe('2026-04-25');
    });

    test('이미 지난 M월 D일은 내년', () => {
      const r = parseKoreanAppointment('1월 5일 신년회', REF);
      expect(r.date).toBe('2027-01-05');
    });

    test('다다음주 화요일', () => {
      const r = parseKoreanAppointment('다다음주 화요일 치과', REF);
      // 4/17(금) → 다다음주 화
      expect(r.date).not.toBeNull();
    });
  });

  // ============================================
  // 시간 추출
  // ============================================
  describe('시간 추출', () => {
    test('오후 3시', () => {
      const r = parseKoreanAppointment('오후 3시 미팅', REF);
      expect(r.time).toBe('15:00');
    });

    test('오전 10시', () => {
      const r = parseKoreanAppointment('오전 10시 회의', REF);
      expect(r.time).toBe('10:00');
    });

    test('저녁 7시', () => {
      const r = parseKoreanAppointment('저녁 7시 식사', REF);
      expect(r.time).toBe('19:00');
    });

    test('밤 9시', () => {
      const r = parseKoreanAppointment('밤 9시 영화', REF);
      expect(r.time).toBe('21:00');
    });

    test('새벽 2시', () => {
      const r = parseKoreanAppointment('새벽 2시 비행기', REF);
      expect(r.time).toBe('02:00');
    });

    test('3시 30분', () => {
      const r = parseKoreanAppointment('3시 30분 약속', REF);
      expect(r.time).toBe('15:30');
    });

    test('3시반', () => {
      const r = parseKoreanAppointment('오후 3시반 커피', REF);
      expect(r.time).toBe('15:30');
    });

    test('14:30 (콜론 포맷)', () => {
      const r = parseKoreanAppointment('14:30 회의', REF);
      expect(r.time).toBe('14:30');
    });

    test('시간대 없이 3시는 오후로 추정', () => {
      const r = parseKoreanAppointment('3시 만남', REF);
      expect(r.time).toBe('15:00');
    });

    test('시간대 없이 9시는 그대로', () => {
      const r = parseKoreanAppointment('9시 출근', REF);
      expect(r.time).toBe('09:00');
    });
  });

  // ============================================
  // 장소 추출
  // ============================================
  describe('장소 추출', () => {
    test('강남역에서', () => {
      const r = parseKoreanAppointment('강남역에서 만남', REF);
      expect(r.location).toBe('강남역');
    });

    test('스타벅스카페에서', () => {
      const r = parseKoreanAppointment('스타벅스카페에서 미팅', REF);
      expect(r.location).toBe('스타벅스카페');
    });

    test('을지로3가역 앞에서', () => {
      const r = parseKoreanAppointment('을지로3가역 앞에서 보자', REF);
      expect(r.location).toBe('을지로3가역');
    });

    test('홍대에서', () => {
      const r = parseKoreanAppointment('홍대에서 저녁', REF);
      expect(r.location).toBe('홍대');
    });

    test('장소 힌트가 있는 경우 (XX병원)', () => {
      const r = parseKoreanAppointment('서울대병원에서 검진', REF);
      expect(r.location).toBe('서울대병원');
    });
  });

  // ============================================
  // 사람 추출
  // ============================================
  describe('사람 추출', () => {
    test('민수랑', () => {
      const r = parseKoreanAppointment('민수랑 저녁', REF);
      expect(r.person).toBe('민수');
    });

    test('영희이랑', () => {
      const r = parseKoreanAppointment('영희이랑 카페', REF);
      expect(r.person).toBe('영희');
    });

    test('철수하고', () => {
      const r = parseKoreanAppointment('철수하고 운동', REF);
      expect(r.person).toBe('철수');
    });

    test('지은이와', () => {
      const r = parseKoreanAppointment('지은이와 영화', REF);
      expect(r.person).toBe('지은이');
    });

    test('김대리님', () => {
      const r = parseKoreanAppointment('김대리님 미팅', REF);
      expect(r.person).toBe('김대리님');
    });
  });

  // ============================================
  // 복합 문장
  // ============================================
  describe('복합 문장', () => {
    test('내일 오후 3시 강남역에서 민수랑 만남', () => {
      const r = parseKoreanAppointment('내일 오후 3시 강남역에서 민수랑 만남', REF);
      expect(r.date).toBe('2026-04-18');
      expect(r.time).toBe('15:00');
      expect(r.location).toBe('강남역');
      expect(r.person).toBe('민수');
      expect(r.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('다음주 금요일 저녁 7시 홍대에서 영희이랑 저녁식사', () => {
      const r = parseKoreanAppointment('다음주 금요일 저녁 7시 홍대에서 영희이랑 저녁식사', REF);
      expect(r.date).not.toBeNull();
      expect(r.time).toBe('19:00');
      expect(r.location).toBe('홍대');
      expect(r.person).toBe('영희');
    });

    test('모레 오전 10시 서울대병원에서 검진', () => {
      const r = parseKoreanAppointment('모레 오전 10시 서울대병원에서 검진', REF);
      expect(r.date).toBe('2026-04-19');
      expect(r.time).toBe('10:00');
      expect(r.location).toBe('서울대병원');
    });

    test('5월 3일 철수하고 여행', () => {
      const r = parseKoreanAppointment('5월 3일 철수하고 여행', REF);
      expect(r.date).toBe('2026-05-03');
      expect(r.person).toBe('철수');
      expect(r.title).toContain('여행');
    });
  });

  // ============================================
  // 엣지 케이스
  // ============================================
  describe('엣지 케이스', () => {
    test('빈 문자열', () => {
      const r = parseKoreanAppointment('', REF);
      expect(r.title).toBe('');
      expect(r.confidence).toBe(0);
    });

    test('파싱 불가능한 텍스트', () => {
      const r = parseKoreanAppointment('ㅋㅋㅋ 재밌었어', REF);
      expect(r.title).toBe('ㅋㅋㅋ 재밌었어');
      expect(r.date).toBeNull();
      expect(r.time).toBeNull();
      expect(r.confidence).toBe(0.2);
    });

    test('날짜만 있는 경우', () => {
      const r = parseKoreanAppointment('내일 뭔가 해야함', REF);
      expect(r.date).toBe('2026-04-18');
      expect(r.time).toBeNull();
      expect(r.confidence).toBe(0.4);
    });

    test('시간만 있는 경우', () => {
      const r = parseKoreanAppointment('오후 5시 퇴근', REF);
      expect(r.time).toBe('17:00');
    });

    test('긴 텍스트 제목 50자 제한', () => {
      const longText = '아'.repeat(100);
      const r = parseKoreanAppointment(longText, REF);
      expect(r.title.length).toBeLessThanOrEqual(51); // 50 + '…'
    });
  });

  // ============================================
  // FormData 변환
  // ============================================
  describe('appointmentToFormData', () => {
    test('날짜+시간 → timed schedule', () => {
      const parsed = parseKoreanAppointment('내일 오후 3시 강남역에서 민수랑 저녁', REF);
      const form = appointmentToFormData(parsed);

      expect(form.scheduledDate).toBe('2026-04-18');
      expect(form.scheduleType).toBe('timed');
      expect(form.startTime).toBeInstanceOf(Date);
      expect(form.endTime).toBeInstanceOf(Date);
      expect(form.content).toContain('강남역');
      expect(form.content).toContain('민수');
    });

    test('날짜만 → anytime schedule', () => {
      const parsed = parseKoreanAppointment('내일 뭔가', REF);
      const form = appointmentToFormData(parsed);

      expect(form.scheduledDate).toBe('2026-04-18');
      expect(form.scheduleType).toBe('anytime');
      expect(form.startTime).toBeUndefined();
    });

    test('장소+사람 → content', () => {
      const parsed = parseKoreanAppointment('강남역에서 민수랑 밥', REF);
      const form = appointmentToFormData(parsed);

      expect(form.content).toContain('장소: 강남역');
      expect(form.content).toContain('함께: 민수');
    });
  });
});
