/**
 * 청소/정리 기본 데이터
 * 3탭: 공간 청소(space), 디지털 정리(digital), 물건 관리(belongings)
 * PDF 행동설계 기반 마이크로태스크
 */

// ============================================
// Types
// ============================================

export type EnergyLevel = 'good' | 'moderate' | 'low';
export type CleaningFrequency = 'daily' | 'weekly' | 'monthly' | 'seasonal';
export type CleaningTab = 'space' | 'digital' | 'belongings';

export interface CleaningTask {
  id: string;
  tab: CleaningTab;
  category: string;
  title: string;
  frequency: CleaningFrequency;
  energyCost: 1 | 2 | 3;
  estimatedMinutes: number;
  zoneId?: string;
  isCustom: boolean;
}

export interface CleaningZone {
  id: string;
  name: string;
  dayOfWeek: number; // 0(일)~6(토)
  icon: string; // Lucide icon name
}

// ============================================
// 기본 구역 (요일별 순환)
// ============================================

export const DEFAULT_ZONES: CleaningZone[] = [
  {id: 'kitchen', name: '주방', dayOfWeek: 1, icon: 'CookingPot'},
  {id: 'bathroom', name: '욕실', dayOfWeek: 2, icon: 'Bath'},
  {id: 'bedroom', name: '침실', dayOfWeek: 3, icon: 'Bed'},
  {id: 'living', name: '거실', dayOfWeek: 4, icon: 'Sofa'},
  {id: 'entrance', name: '현관/베란다', dayOfWeek: 5, icon: 'DoorOpen'},
  {id: 'desk', name: '책상/작업공간', dayOfWeek: 6, icon: 'Monitor'},
  {id: 'whole', name: '전체 간단 정리', dayOfWeek: 0, icon: 'Home'},
];

// ============================================
// 공간 청소 (space) 태스크
// ============================================

const SPACE_TASKS: CleaningTask[] = [
  // 주방
  {id: 's-kitchen-01', tab: 'space', category: '주방', title: '싱크대 주변 닦기', frequency: 'daily', energyCost: 1, estimatedMinutes: 3, zoneId: 'kitchen', isCustom: false},
  {id: 's-kitchen-02', tab: 'space', category: '주방', title: '설거지하기', frequency: 'daily', energyCost: 2, estimatedMinutes: 10, zoneId: 'kitchen', isCustom: false},
  {id: 's-kitchen-03', tab: 'space', category: '주방', title: '가스레인지 닦기', frequency: 'weekly', energyCost: 2, estimatedMinutes: 5, zoneId: 'kitchen', isCustom: false},
  {id: 's-kitchen-04', tab: 'space', category: '주방', title: '냉장고 유통기한 확인', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, zoneId: 'kitchen', isCustom: false},
  {id: 's-kitchen-05', tab: 'space', category: '주방', title: '주방 바닥 닦기', frequency: 'weekly', energyCost: 2, estimatedMinutes: 5, zoneId: 'kitchen', isCustom: false},
  {id: 's-kitchen-06', tab: 'space', category: '주방', title: '전자레인지 내부 닦기', frequency: 'monthly', energyCost: 2, estimatedMinutes: 5, zoneId: 'kitchen', isCustom: false},

  // 욕실
  {id: 's-bath-01', tab: 'space', category: '욕실', title: '세면대 닦기', frequency: 'daily', energyCost: 1, estimatedMinutes: 2, zoneId: 'bathroom', isCustom: false},
  {id: 's-bath-02', tab: 'space', category: '욕실', title: '변기 청소', frequency: 'weekly', energyCost: 2, estimatedMinutes: 5, zoneId: 'bathroom', isCustom: false},
  {id: 's-bath-03', tab: 'space', category: '욕실', title: '거울 닦기', frequency: 'weekly', energyCost: 1, estimatedMinutes: 2, zoneId: 'bathroom', isCustom: false},
  {id: 's-bath-04', tab: 'space', category: '욕실', title: '배수구 머리카락 제거', frequency: 'weekly', energyCost: 1, estimatedMinutes: 2, zoneId: 'bathroom', isCustom: false},
  {id: 's-bath-05', tab: 'space', category: '욕실', title: '수건 교체', frequency: 'weekly', energyCost: 1, estimatedMinutes: 2, zoneId: 'bathroom', isCustom: false},
  {id: 's-bath-06', tab: 'space', category: '욕실', title: '욕조/샤워부스 스케일 제거', frequency: 'monthly', energyCost: 3, estimatedMinutes: 15, zoneId: 'bathroom', isCustom: false},

  // 침실
  {id: 's-bed-01', tab: 'space', category: '침실', title: '이불 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 2, zoneId: 'bedroom', isCustom: false},
  {id: 's-bed-02', tab: 'space', category: '침실', title: '바닥 옷 수거', frequency: 'daily', energyCost: 1, estimatedMinutes: 3, zoneId: 'bedroom', isCustom: false},
  {id: 's-bed-03', tab: 'space', category: '침실', title: '침대 시트 교체', frequency: 'weekly', energyCost: 3, estimatedMinutes: 10, zoneId: 'bedroom', isCustom: false},
  {id: 's-bed-04', tab: 'space', category: '침실', title: '먼지 제거', frequency: 'weekly', energyCost: 2, estimatedMinutes: 5, zoneId: 'bedroom', isCustom: false},
  {id: 's-bed-05', tab: 'space', category: '침실', title: '옷장 앞 정리', frequency: 'weekly', energyCost: 2, estimatedMinutes: 5, zoneId: 'bedroom', isCustom: false},

  // 거실
  {id: 's-living-01', tab: 'space', category: '거실', title: '쿠션/소파 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 2, zoneId: 'living', isCustom: false},
  {id: 's-living-02', tab: 'space', category: '거실', title: '테이블 위 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 3, zoneId: 'living', isCustom: false},
  {id: 's-living-03', tab: 'space', category: '거실', title: '바닥 청소기 돌리기', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, zoneId: 'living', isCustom: false},
  {id: 's-living-04', tab: 'space', category: '거실', title: 'TV/리모컨 먼지 닦기', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, zoneId: 'living', isCustom: false},
  {id: 's-living-05', tab: 'space', category: '거실', title: '창문 닦기', frequency: 'monthly', energyCost: 3, estimatedMinutes: 15, zoneId: 'living', isCustom: false},

  // 현관/베란다
  {id: 's-ent-01', tab: 'space', category: '현관/베란다', title: '신발 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 2, zoneId: 'entrance', isCustom: false},
  {id: 's-ent-02', tab: 'space', category: '현관/베란다', title: '현관 바닥 쓸기', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, zoneId: 'entrance', isCustom: false},
  {id: 's-ent-03', tab: 'space', category: '현관/베란다', title: '베란다 정리', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, zoneId: 'entrance', isCustom: false},
  {id: 's-ent-04', tab: 'space', category: '현관/베란다', title: '우편물/택배 박스 처리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 5, zoneId: 'entrance', isCustom: false},

  // 책상/작업공간
  {id: 's-desk-01', tab: 'space', category: '책상/작업공간', title: '책상 위 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 3, zoneId: 'desk', isCustom: false},
  {id: 's-desk-02', tab: 'space', category: '책상/작업공간', title: '키보드/마우스 닦기', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, zoneId: 'desk', isCustom: false},
  {id: 's-desk-03', tab: 'space', category: '책상/작업공간', title: '케이블 정리', frequency: 'monthly', energyCost: 2, estimatedMinutes: 10, zoneId: 'desk', isCustom: false},
  {id: 's-desk-04', tab: 'space', category: '책상/작업공간', title: '모니터 화면 닦기', frequency: 'weekly', energyCost: 1, estimatedMinutes: 2, zoneId: 'desk', isCustom: false},
];

// ============================================
// 디지털 정리 (digital) 태스크
// ============================================

const DIGITAL_TASKS: CleaningTask[] = [
  // 이메일
  {id: 'd-email-01', tab: 'digital', category: '이메일', title: '받은편지함 읽지 않은 메일 처리', frequency: 'daily', energyCost: 1, estimatedMinutes: 5, isCustom: false},
  {id: 'd-email-02', tab: 'digital', category: '이메일', title: '스팸/광고 메일 일괄 삭제', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, isCustom: false},
  {id: 'd-email-03', tab: 'digital', category: '이메일', title: '불필요한 구독 해지', frequency: 'monthly', energyCost: 2, estimatedMinutes: 10, isCustom: false},

  // 파일
  {id: 'd-file-01', tab: 'digital', category: '파일', title: '다운로드 폴더 정리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 5, isCustom: false},
  {id: 'd-file-02', tab: 'digital', category: '파일', title: '바탕화면 파일 정리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 5, isCustom: false},
  {id: 'd-file-03', tab: 'digital', category: '파일', title: '스크린샷/사진 정리', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, isCustom: false},
  {id: 'd-file-04', tab: 'digital', category: '파일', title: '클라우드 스토리지 정리', frequency: 'monthly', energyCost: 3, estimatedMinutes: 15, isCustom: false},

  // 앱/브라우저
  {id: 'd-app-01', tab: 'digital', category: '앱/브라우저', title: '브라우저 탭 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 2, isCustom: false},
  {id: 'd-app-02', tab: 'digital', category: '앱/브라우저', title: '미사용 앱 삭제', frequency: 'monthly', energyCost: 2, estimatedMinutes: 10, isCustom: false},
  {id: 'd-app-03', tab: 'digital', category: '앱/브라우저', title: '알림 설정 정리', frequency: 'monthly', energyCost: 2, estimatedMinutes: 5, isCustom: false},
  {id: 'd-app-04', tab: 'digital', category: '앱/브라우저', title: '북마크 정리', frequency: 'monthly', energyCost: 2, estimatedMinutes: 10, isCustom: false},

  // 메모/노트
  {id: 'd-note-01', tab: 'digital', category: '메모/노트', title: '메모앱 임시 메모 정리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 5, isCustom: false},
  {id: 'd-note-02', tab: 'digital', category: '메모/노트', title: '캘린더 지난 일정 정리', frequency: 'monthly', energyCost: 2, estimatedMinutes: 5, isCustom: false},
];

// ============================================
// 물건 관리 (belongings) 태스크
// ============================================

const BELONGINGS_TASKS: CleaningTask[] = [
  // 옷장
  {id: 'b-closet-01', tab: 'belongings', category: '옷장', title: '빨래 넣기/꺼내기', frequency: 'daily', energyCost: 1, estimatedMinutes: 5, isCustom: false},
  {id: 'b-closet-02', tab: 'belongings', category: '옷장', title: '옷 개어서 넣기', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, isCustom: false},
  {id: 'b-closet-03', tab: 'belongings', category: '옷장', title: '안 입는 옷 분리', frequency: 'seasonal', energyCost: 3, estimatedMinutes: 20, isCustom: false},
  {id: 'b-closet-04', tab: 'belongings', category: '옷장', title: '계절 옷 교체', frequency: 'seasonal', energyCost: 3, estimatedMinutes: 30, isCustom: false},

  // 소모품
  {id: 'b-supply-01', tab: 'belongings', category: '소모품', title: '화장실 휴지/세제 재고 확인', frequency: 'weekly', energyCost: 1, estimatedMinutes: 2, isCustom: false},
  {id: 'b-supply-02', tab: 'belongings', category: '소모품', title: '칫솔/수건 교체 시기 확인', frequency: 'monthly', energyCost: 1, estimatedMinutes: 2, isCustom: false},
  {id: 'b-supply-03', tab: 'belongings', category: '소모품', title: '정수기 필터 확인', frequency: 'monthly', energyCost: 1, estimatedMinutes: 2, isCustom: false},

  // 수납
  {id: 'b-storage-01', tab: 'belongings', category: '수납', title: '서랍 하나 정리', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, isCustom: false},
  {id: 'b-storage-02', tab: 'belongings', category: '수납', title: '신발장 정리', frequency: 'monthly', energyCost: 2, estimatedMinutes: 10, isCustom: false},
  {id: 'b-storage-03', tab: 'belongings', category: '수납', title: '창고/다용도실 정리', frequency: 'seasonal', energyCost: 3, estimatedMinutes: 30, isCustom: false},

  // 가방/지갑
  {id: 'b-carry-01', tab: 'belongings', category: '가방/지갑', title: '가방 속 정리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, isCustom: false},
  {id: 'b-carry-02', tab: 'belongings', category: '가방/지갑', title: '지갑 영수증/카드 정리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, isCustom: false},

  // 분리수거
  {id: 'b-recycle-01', tab: 'belongings', category: '분리수거', title: '재활용 분리수거', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, isCustom: false},
  {id: 'b-recycle-02', tab: 'belongings', category: '분리수거', title: '음식물 쓰레기 배출', frequency: 'daily', energyCost: 1, estimatedMinutes: 3, isCustom: false},
];

// ============================================
// 전체 태스크 목록
// ============================================

export const ALL_DEFAULT_TASKS: CleaningTask[] = [
  ...SPACE_TASKS,
  ...DIGITAL_TASKS,
  ...BELONGINGS_TASKS,
];

// ============================================
// 에너지 레벨 설정
// ============================================

export const ENERGY_CONFIG = {
  good: {label: '괜찮음', maxTasks: 99, maxEnergyCost: 3 as const, icon: 'BatteryFull'},
  moderate: {label: '보통', maxTasks: 4, maxEnergyCost: 2 as const, icon: 'BatteryMedium'},
  low: {label: '힘듦', maxTasks: 2, maxEnergyCost: 1 as const, icon: 'BatteryLow'},
} as const;

// ============================================
// 주기 라벨
// ============================================

export const FREQUENCY_LABELS: Record<CleaningFrequency, string> = {
  daily: '매일',
  weekly: '주간',
  monthly: '월간',
  seasonal: '계절',
};

export const FREQUENCY_COLORS: Record<CleaningFrequency, string> = {
  daily: '#10B981',
  weekly: '#3B82F6',
  monthly: '#8B5CF6',
  seasonal: '#F59E0B',
};
