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
  subtasks?: string[];
}

export interface CleaningZone {
  id: string;
  name: string;
  dayOfWeek: number; // 0(일)~6(토)
  icon: string; // Lucide icon name
}

export interface CategorySchedule {
  id: string;
  tab: CleaningTab;
  category: string;
  name: string;
  dayOfWeek: number; // 0(일)~6(토)
}

// ============================================
// 디지털 카테고리 스케줄 (요일별 순환)
// ============================================

export const DEFAULT_DIGITAL_SCHEDULES: CategorySchedule[] = [
  {id: 'cs-email', tab: 'digital', category: '이메일', name: '이메일', dayOfWeek: 1},
  {id: 'cs-file', tab: 'digital', category: '파일', name: '파일', dayOfWeek: 3},
  {id: 'cs-app', tab: 'digital', category: '앱/브라우저', name: '앱/브라우저', dayOfWeek: 5},
  {id: 'cs-note', tab: 'digital', category: '메모/노트', name: '메모/노트', dayOfWeek: 6},
];

// ============================================
// 물건 카테고리 스케줄 (요일별 순환)
// ============================================

export const DEFAULT_BELONGINGS_SCHEDULES: CategorySchedule[] = [
  {id: 'cs-closet', tab: 'belongings', category: '옷장', name: '옷장', dayOfWeek: 1},
  {id: 'cs-supply', tab: 'belongings', category: '소모품', name: '소모품', dayOfWeek: 2},
  {id: 'cs-storage', tab: 'belongings', category: '수납', name: '수납', dayOfWeek: 3},
  {id: 'cs-carry', tab: 'belongings', category: '가방/지갑', name: '가방/지갑', dayOfWeek: 4},
  {id: 'cs-recycle', tab: 'belongings', category: '분리수거', name: '분리수거', dayOfWeek: 5},
];

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
];

// ============================================
// 공간 청소 (space) 태스크
// ============================================

const SPACE_TASKS: CleaningTask[] = [
  // 주방
  {id: 's-kitchen-01', tab: 'space', category: '주방', title: '싱크대 주변 닦기', frequency: 'daily', energyCost: 1, estimatedMinutes: 3, zoneId: 'kitchen', isCustom: false, subtasks: ['행주 적시기', '싱크대 주변 닦기', '행주 헹궈서 걸기']},
  {id: 's-kitchen-02', tab: 'space', category: '주방', title: '설거지하기', frequency: 'daily', energyCost: 2, estimatedMinutes: 10, zoneId: 'kitchen', isCustom: false, subtasks: ['싱크대에 물 받기', '큰 그릇부터 씻기', '작은 그릇과 컵 씻기', '수저/젓가락 씻기', '싱크대 물 빼기']},
  {id: 's-kitchen-03', tab: 'space', category: '주방', title: '가스레인지 닦기', frequency: 'weekly', energyCost: 2, estimatedMinutes: 5, zoneId: 'kitchen', isCustom: false, subtasks: ['행주와 세제 가져오기', '받침대 분리하기', '세제 뿌리고 불린 채로 두기', '행주로 닦기']},
  {id: 's-kitchen-04', tab: 'space', category: '주방', title: '냉장고 유통기한 확인', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, zoneId: 'kitchen', isCustom: false, subtasks: ['냉장실 문 열고 한 칸씩 보기', '유통기한 지난 것 꺼내기', '냉동실도 한 칸씩 확인하기', '꺼낸 것 버리기']},
  {id: 's-kitchen-05', tab: 'space', category: '주방', title: '주방 바닥 닦기', frequency: 'weekly', energyCost: 2, estimatedMinutes: 5, zoneId: 'kitchen', isCustom: false, subtasks: ['밀대와 걸레 준비하기', '큰 쓰레기 먼저 줍기', '밀대로 바닥 쓸기', '젖은 걸레로 닦기']},
  {id: 's-kitchen-06', tab: 'space', category: '주방', title: '전자레인지 내부 닦기', frequency: 'monthly', energyCost: 2, estimatedMinutes: 5, zoneId: 'kitchen', isCustom: false, subtasks: ['물 한 컵에 식초 넣고 2분 돌리기', '문 열고 수증기 확인하기', '행주로 내부 닦기', '회전판 꺼내서 씻기']},

  // 욕실
  {id: 's-bath-01', tab: 'space', category: '욕실', title: '세면대 닦기', frequency: 'daily', energyCost: 1, estimatedMinutes: 2, zoneId: 'bathroom', isCustom: false, subtasks: ['수건/행주 적시기', '세면대 닦기', '수전 닦기']},
  {id: 's-bath-02', tab: 'space', category: '욕실', title: '변기 청소', frequency: 'weekly', energyCost: 2, estimatedMinutes: 5, zoneId: 'bathroom', isCustom: false, subtasks: ['세제와 솔 가져오기', '변기 안쪽에 세제 뿌리기', '솔로 문지르기', '물 내리기']},
  {id: 's-bath-03', tab: 'space', category: '욕실', title: '거울 닦기', frequency: 'weekly', energyCost: 1, estimatedMinutes: 2, zoneId: 'bathroom', isCustom: false, subtasks: ['마른 수건 가져오기', '위에서 아래로 닦기']},
  {id: 's-bath-04', tab: 'space', category: '욕실', title: '배수구 머리카락 제거', frequency: 'weekly', energyCost: 1, estimatedMinutes: 2, zoneId: 'bathroom', isCustom: false, subtasks: ['휴지 한 장 뽑기', '머리카락 집어서 버리기']},
  {id: 's-bath-05', tab: 'space', category: '욕실', title: '수건 교체', frequency: 'weekly', energyCost: 1, estimatedMinutes: 2, zoneId: 'bathroom', isCustom: false, subtasks: ['새 수건 꺼내기', '쓴 수건 빼서 빨래통에 넣기', '새 수건 걸기']},
  {id: 's-bath-06', tab: 'space', category: '욕실', title: '욕조/샤워부스 스케일 제거', frequency: 'monthly', energyCost: 3, estimatedMinutes: 15, zoneId: 'bathroom', isCustom: false, subtasks: ['세제와 스펀지 가져다 놓기', '물로 표면 적시기', '세제 뿌리고 5분 두기', '스펀지로 문지르기', '물로 헹구기']},

  // 침실
  {id: 's-bed-01', tab: 'space', category: '침실', title: '이불 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 2, zoneId: 'bedroom', isCustom: false, subtasks: ['이불 위 물건 치우기', '이불 펴서 정리하기', '베개 놓기']},
  {id: 's-bed-02', tab: 'space', category: '침실', title: '바닥 옷 수거', frequency: 'daily', energyCost: 1, estimatedMinutes: 3, zoneId: 'bedroom', isCustom: false, subtasks: ['바닥에 있는 옷 모으기', '빨래통에 넣기']},
  {id: 's-bed-03', tab: 'space', category: '침실', title: '침대 시트 교체', frequency: 'weekly', energyCost: 3, estimatedMinutes: 10, zoneId: 'bedroom', isCustom: false, subtasks: ['새 시트 꺼내서 침대 위에 놓기', '베개 치우기', '기존 시트 벗기기', '새 시트 씌우기', '베개 커버 교체하기']},
  {id: 's-bed-04', tab: 'space', category: '침실', title: '먼지 제거', frequency: 'weekly', energyCost: 2, estimatedMinutes: 5, zoneId: 'bedroom', isCustom: false, subtasks: ['먼지 닦이 가져오기', '높은 곳부터 닦기', '선반/서랍장 위 닦기', '바닥 쪽 마무리']},
  {id: 's-bed-05', tab: 'space', category: '침실', title: '옷장 앞 정리', frequency: 'weekly', energyCost: 2, estimatedMinutes: 5, zoneId: 'bedroom', isCustom: false, subtasks: ['바닥에 놓인 옷 모으기', '옷걸이에 걸 것 분리하기', '서랍에 넣을 것 분리하기', '빨래통에 넣을 것 분리하기']},

  // 거실
  {id: 's-living-01', tab: 'space', category: '거실', title: '쿠션/소파 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 2, zoneId: 'living', isCustom: false, subtasks: ['쿠션 제자리에 놓기', '소파 위 물건 치우기']},
  {id: 's-living-02', tab: 'space', category: '거실', title: '테이블 위 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 3, zoneId: 'living', isCustom: false, subtasks: ['쓰레기 먼저 버리기', '물건 제자리에 놓기', '테이블 닦기']},
  {id: 's-living-03', tab: 'space', category: '거실', title: '바닥 청소기 돌리기', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, zoneId: 'living', isCustom: false, subtasks: ['청소기 가져오기', '큰 물건 치우기', '가장자리부터 돌리기', '가운데 쪽으로 마무리']},
  {id: 's-living-04', tab: 'space', category: '거실', title: 'TV/리모컨 먼지 닦기', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, zoneId: 'living', isCustom: false, subtasks: ['마른 천 가져오기', 'TV 화면 닦기', '리모컨 닦기']},
  {id: 's-living-05', tab: 'space', category: '거실', title: '창문 닦기', frequency: 'monthly', energyCost: 3, estimatedMinutes: 15, zoneId: 'living', isCustom: false, subtasks: ['걸레와 세제 준비해서 창문 앞에 놓기', '마른 걸레로 먼지 먼저 닦기', '세제 뿌리기', '젖은 걸레로 위에서 아래로 닦기', '마른 걸레로 마무리']},

  // 현관/베란다
  {id: 's-ent-01', tab: 'space', category: '현관/베란다', title: '신발 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 2, zoneId: 'entrance', isCustom: false, subtasks: ['흩어진 신발 모으기', '짝 맞춰 가지런히 놓기']},
  {id: 's-ent-02', tab: 'space', category: '현관/베란다', title: '현관 바닥 쓸기', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, zoneId: 'entrance', isCustom: false, subtasks: ['빗자루 가져오기', '한쪽 방향으로 쓸기', '쓰레받기에 담기']},
  {id: 's-ent-03', tab: 'space', category: '현관/베란다', title: '베란다 정리', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, zoneId: 'entrance', isCustom: false, subtasks: ['베란다 문 열기', '바닥에 놓인 물건 한쪽으로 모으기', '빗자루로 먼지 쓸기', '물건 제자리에 놓기']},
  {id: 's-ent-04', tab: 'space', category: '현관/베란다', title: '우편물/택배 박스 처리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 5, zoneId: 'entrance', isCustom: false, subtasks: ['박스 모으기', '테이프 뜯고 접기', '재활용에 놓기']},

  // 책상/작업공간
  {id: 's-desk-01', tab: 'space', category: '책상/작업공간', title: '책상 위 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 3, zoneId: 'desk', isCustom: false, subtasks: ['쓰레기 먼저 버리기', '안 쓰는 것 치우기', '쓰는 것 정리하기']},
  {id: 's-desk-02', tab: 'space', category: '책상/작업공간', title: '키보드/마우스 닦기', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, zoneId: 'desk', isCustom: false, subtasks: ['물티슈 한 장 꺼내기', '키보드 표면 닦기', '마우스 닦기']},
  {id: 's-desk-03', tab: 'space', category: '책상/작업공간', title: '케이블 정리', frequency: 'monthly', energyCost: 2, estimatedMinutes: 10, zoneId: 'desk', isCustom: false, subtasks: ['케이블 타이/클립 준비하기', '사용 중인 케이블 확인하기', '안 쓰는 케이블 뽑기', '남은 케이블 묶어서 정리하기']},
  {id: 's-desk-04', tab: 'space', category: '책상/작업공간', title: '모니터 화면 닦기', frequency: 'weekly', energyCost: 1, estimatedMinutes: 2, zoneId: 'desk', isCustom: false, subtasks: ['화면 닦이 가져오기', '화면 위에서 아래로 닦기']},
];

// ============================================
// 디지털 정리 (digital) 태스크
// ============================================

const DIGITAL_TASKS: CleaningTask[] = [
  // 이메일
  {id: 'd-email-01', tab: 'digital', category: '이메일', title: '받은편지함 읽지 않은 메일 처리', frequency: 'daily', energyCost: 1, estimatedMinutes: 5, isCustom: false, subtasks: ['메일앱 열기', '안 읽은 메일 훑어보기', '필요 없는 것 삭제하기']},
  {id: 'd-email-02', tab: 'digital', category: '이메일', title: '스팸/광고 메일 일괄 삭제', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, isCustom: false, subtasks: ['메일앱 열기', '스팸함 들어가기', '전체 선택 후 삭제하기']},
  {id: 'd-email-03', tab: 'digital', category: '이메일', title: '불필요한 구독 해지', frequency: 'monthly', energyCost: 2, estimatedMinutes: 10, isCustom: false, subtasks: ['받은편지함에서 구독 메일 찾기', '안 읽는 뉴스레터 하나 골라 해지하기', '다음 것도 해지하기', '스팸함 비우기']},

  // 파일
  {id: 'd-file-01', tab: 'digital', category: '파일', title: '다운로드 폴더 정리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 5, isCustom: false, subtasks: ['다운로드 폴더 열기', '오래된 파일 선택하기', '삭제하기']},
  {id: 'd-file-02', tab: 'digital', category: '파일', title: '바탕화면 파일 정리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 5, isCustom: false, subtasks: ['바탕화면 보기', '필요 없는 파일 선택하기', '삭제 또는 폴더에 넣기']},
  {id: 'd-file-03', tab: 'digital', category: '파일', title: '스크린샷/사진 정리', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, isCustom: false, subtasks: ['사진앱 열기', '최근 스크린샷 훑어보기', '필요 없는 것 선택해서 삭제하기', '최근 삭제된 항목 비우기']},
  {id: 'd-file-04', tab: 'digital', category: '파일', title: '클라우드 스토리지 정리', frequency: 'monthly', energyCost: 3, estimatedMinutes: 15, isCustom: false, subtasks: ['클라우드 앱 열기', '용량 큰 파일부터 확인하기', '안 쓰는 파일 삭제하기', '중복 파일 확인하기', '휴지통 비우기']},

  // 앱/브라우저
  {id: 'd-app-01', tab: 'digital', category: '앱/브라우저', title: '브라우저 탭 정리', frequency: 'daily', energyCost: 1, estimatedMinutes: 2, isCustom: false, subtasks: ['브라우저 열기', '안 쓰는 탭 닫기']},
  {id: 'd-app-02', tab: 'digital', category: '앱/브라우저', title: '미사용 앱 삭제', frequency: 'monthly', energyCost: 2, estimatedMinutes: 10, isCustom: false, subtasks: ['설정 > 저장공간 열기', '오래 안 쓴 앱 확인하기', '하나씩 삭제 여부 결정하기', '삭제하기']},
  {id: 'd-app-03', tab: 'digital', category: '앱/브라우저', title: '알림 설정 정리', frequency: 'monthly', energyCost: 2, estimatedMinutes: 5, isCustom: false, subtasks: ['설정 > 알림 열기', '앱 목록 위에서부터 훑기', '불필요한 알림 끄기']},
  {id: 'd-app-04', tab: 'digital', category: '앱/브라우저', title: '북마크 정리', frequency: 'monthly', energyCost: 2, estimatedMinutes: 10, isCustom: false, subtasks: ['브라우저 북마크 열기', '폴더별로 훑어보기', '안 쓰는 북마크 삭제하기', '자주 쓰는 것 폴더로 분류하기']},

  // 메모/노트
  {id: 'd-note-01', tab: 'digital', category: '메모/노트', title: '메모앱 임시 메모 정리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 5, isCustom: false, subtasks: ['메모앱 열기', '오래된 메모 훑어보기', '필요 없는 것 삭제하기']},
  {id: 'd-note-02', tab: 'digital', category: '메모/노트', title: '캘린더 지난 일정 정리', frequency: 'monthly', energyCost: 2, estimatedMinutes: 5, isCustom: false, subtasks: ['캘린더 앱 열기', '지난달 일정 훑어보기', '반복 안 할 일정 삭제하기']},
];

// ============================================
// 물건 관리 (belongings) 태스크
// ============================================

const BELONGINGS_TASKS: CleaningTask[] = [
  // 옷장
  {id: 'b-closet-01', tab: 'belongings', category: '옷장', title: '빨래 넣기/꺼내기', frequency: 'daily', energyCost: 1, estimatedMinutes: 5, isCustom: false, subtasks: ['세탁기 열기', '빨래 넣기 또는 꺼내기', '건조대에 널기']},
  {id: 'b-closet-02', tab: 'belongings', category: '옷장', title: '옷 개어서 넣기', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, isCustom: false, subtasks: ['깨끗한 옷 한곳에 모으기', '종류별로 나누기', '하나씩 개기', '서랍/선반에 넣기']},
  {id: 'b-closet-03', tab: 'belongings', category: '옷장', title: '안 입는 옷 분리', frequency: 'seasonal', energyCost: 3, estimatedMinutes: 20, isCustom: false, subtasks: ['큰 봉투 하나 준비하기', '옷장 한 칸 열기', '1년 안 입은 옷 꺼내기', '봉투에 넣기', '다음 칸으로 넘어가기']},
  {id: 'b-closet-04', tab: 'belongings', category: '옷장', title: '계절 옷 교체', frequency: 'seasonal', energyCost: 3, estimatedMinutes: 30, isCustom: false, subtasks: ['수납 박스 꺼내기', '지난 계절 옷 빼기', '다음 계절 옷 꺼내기', '지난 옷 박스에 넣기', '박스 다시 수납하기']},

  // 소모품
  {id: 'b-supply-01', tab: 'belongings', category: '소모품', title: '화장실 휴지/세제 재고 확인', frequency: 'weekly', energyCost: 1, estimatedMinutes: 2, isCustom: false, subtasks: ['화장실 가서 확인하기', '부족한 것 메모하기']},
  {id: 'b-supply-02', tab: 'belongings', category: '소모품', title: '칫솔/수건 교체 시기 확인', frequency: 'monthly', energyCost: 1, estimatedMinutes: 2, isCustom: false, subtasks: ['칫솔 상태 확인하기', '수건 상태 확인하기']},
  {id: 'b-supply-03', tab: 'belongings', category: '소모품', title: '정수기 필터 확인', frequency: 'monthly', energyCost: 1, estimatedMinutes: 2, isCustom: false, subtasks: ['정수기 표시등 확인하기', '교체 필요 시 메모하기']},

  // 수납
  {id: 'b-storage-01', tab: 'belongings', category: '수납', title: '서랍 하나 정리', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, isCustom: false, subtasks: ['서랍 하나 골라서 열기', '안에 있는 것 다 꺼내기', '필요 없는 것 버리기', '남은 것 다시 넣기']},
  {id: 'b-storage-02', tab: 'belongings', category: '수납', title: '신발장 정리', frequency: 'monthly', energyCost: 2, estimatedMinutes: 10, isCustom: false, subtasks: ['신발장 문 열기', '안 신는 신발 한쪽에 모으기', '남은 신발 가지런히 놓기', '안 신는 것 봉투에 넣기']},
  {id: 'b-storage-03', tab: 'belongings', category: '수납', title: '창고/다용도실 정리', frequency: 'seasonal', energyCost: 3, estimatedMinutes: 30, isCustom: false, subtasks: ['문 열고 전체 훑어보기', '바닥에 놓인 것 한쪽으로 모으기', '안 쓰는 것 분리하기', '남은 것 카테고리별로 놓기', '바닥 쓸기']},

  // 가방/지갑
  {id: 'b-carry-01', tab: 'belongings', category: '가방/지갑', title: '가방 속 정리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, isCustom: false, subtasks: ['가방 뒤집어서 전부 꺼내기', '쓰레기 버리기', '필요한 것만 다시 넣기']},
  {id: 'b-carry-02', tab: 'belongings', category: '가방/지갑', title: '지갑 영수증/카드 정리', frequency: 'weekly', energyCost: 1, estimatedMinutes: 3, isCustom: false, subtasks: ['지갑 열기', '영수증 빼서 버리기', '안 쓰는 카드 빼기']},

  // 분리수거
  {id: 'b-recycle-01', tab: 'belongings', category: '분리수거', title: '재활용 분리수거', frequency: 'weekly', energyCost: 2, estimatedMinutes: 10, isCustom: false, subtasks: ['분리수거 봉투 준비하기', '종이류 모으기', '플라스틱/캔 모으기', '유리 모으기', '수거장에 내놓기']},
  {id: 'b-recycle-02', tab: 'belongings', category: '분리수거', title: '음식물 쓰레기 배출', frequency: 'daily', energyCost: 1, estimatedMinutes: 3, isCustom: false, subtasks: ['음식물 봉투 묶기', '수거함에 버리기', '새 봉투 씌우기']},
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
  good: {label: '괜찮음', maxTasks: {daily: 99, today: 99}, icon: 'BatteryFull'},
  moderate: {label: '보통', maxTasks: {daily: 5, today: 5}, icon: 'BatteryMedium'},
  low: {label: '힘듦', maxTasks: {daily: 3, today: 2}, icon: 'BatteryLow'},
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

// ============================================
// 탭 라벨 / 색상
// ============================================

export const TAB_LABELS: Record<CleaningTab, string> = {
  space: '공간',
  digital: '디지털',
  belongings: '물건',
};

export const TAB_COLORS: Record<CleaningTab, string> = {
  space: '#059669',
  digital: '#0EA5E9',
  belongings: '#8B5CF6',
};

export const ENERGY_COLORS: Record<1 | 2 | 3, string> = {
  1: '#10B981',  // 초록 (쉬움)
  2: '#F59E0B',  // 주황 (보통)
  3: '#EF4444',  // 빨강 (힘듦)
};
