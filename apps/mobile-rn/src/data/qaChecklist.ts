/**
 * QA 테스트 체크리스트 데이터
 * docs/QA_CHECKLIST.md 기반 구조화
 */

export interface QAItem {
  id: string;
  label: string;
  /** 스모크 테스트 항목 (매 릴리즈 필수) */
  isSmoke: boolean;
}

export interface QASection {
  id: string;
  title: string;
  items: QAItem[];
}

export const QA_SECTIONS: QASection[] = [
  {
    id: 'install',
    title: '0. 앱 설치 및 시작',
    items: [
      {id: 'install-1', label: '앱 신규 설치 → 크래시 없이 로그인 화면 진입', isSmoke: true},
      {id: 'install-2', label: '앱 업데이트 설치 (덮어쓰기) → 데이터 유지 확인', isSmoke: true},
      {id: 'install-3', label: '앱 아이콘, 이름 정상 표시', isSmoke: false},
      {id: 'install-4', label: '스플래시 화면 정상 표시 후 전환', isSmoke: false},
    ],
  },
  {
    id: 'auth',
    title: '1. 인증',
    items: [
      {id: 'auth-1', label: 'Google 로그인 → 홈 화면 진입', isSmoke: true},
      {id: 'auth-2', label: 'Apple 로그인 → 홈 화면 진입 (iOS)', isSmoke: true},
      {id: 'auth-3', label: 'Kakao 로그인 → 홈 화면 진입', isSmoke: false},
      {id: 'auth-4', label: '이메일 로그인 → 홈 화면 진입', isSmoke: false},
      {id: 'auth-5', label: '로그인 중 네트워크 끊김 → 에러 메시지, 크래시 없음', isSmoke: false},
      {id: 'auth-6', label: '로그인 중 앱 백그라운드 전환 → 복귀 시 정상', isSmoke: false},
      {id: 'auth-7', label: '설정 → 로그아웃 → 로그인 화면 복귀', isSmoke: true},
      {id: 'auth-8', label: '로그아웃 후 재로그인 → 기존 데이터 정상 로드', isSmoke: false},
      {id: 'auth-9', label: '회원 탈퇴 플로우 → 확인 다이얼로그 → 처리 완료', isSmoke: false},
    ],
  },
  {
    id: 'home',
    title: '2. 홈 화면',
    items: [
      {id: 'home-1', label: '인사말 + 날짜 정상 표시', isSmoke: true},
      {id: 'home-2', label: '진행률 링 오늘 할일 반영', isSmoke: true},
      {id: 'home-3', label: '미션 카드 표시 및 탭 반응', isSmoke: false},
      {id: 'home-4', label: '3개 기능 그룹 각각 탭 → 해당 화면 이동', isSmoke: false},
      {id: 'home-5', label: '좌우 스와이프 → 영감 페이지 전환', isSmoke: false},
      {id: 'home-6', label: '동기부여 문구 표시', isSmoke: false},
      {id: 'home-7', label: '연락 추천 표시', isSmoke: false},
      {id: 'home-8', label: '오늘의 명언 표시', isSmoke: false},
      {id: 'home-9', label: '프로젝트 → ProjectsScreen 진입 + 뒤로가기', isSmoke: true},
      {id: 'home-10', label: 'AI 채팅 → AIChatScreen 진입 + 뒤로가기', isSmoke: false},
      {id: 'home-11', label: '가이드 → GuideScreen 진입 + 뒤로가기', isSmoke: false},
      {id: 'home-12', label: '관심 키우기 → CareScreen 진입 + 뒤로가기', isSmoke: false},
      {id: 'home-13', label: '정리 도구 → CleanupScreen 진입 + 뒤로가기', isSmoke: false},
      {id: 'home-14', label: '수면 정원 → SleepGardenScreen 진입 + 뒤로가기', isSmoke: false},
      {id: 'home-15', label: 'ADHD 이해 → ADHDUnderstandingScreen 진입 + 뒤로가기', isSmoke: false},
      {id: 'home-16', label: '청소 → CleaningScreen 진입 + 뒤로가기', isSmoke: false},
      {id: 'home-17', label: '스크린타임 → ScreenTimeAppsScreen 진입 + 뒤로가기', isSmoke: false},
    ],
  },
  {
    id: 'projects',
    title: '3. 프로젝트',
    items: [
      {id: 'proj-1', label: '프로젝트 목록 로드', isSmoke: true},
      {id: 'proj-2', label: '새 프로젝트 생성 → 목록 반영', isSmoke: false},
      {id: 'proj-3', label: '프로젝트 수정 → 변경사항 저장', isSmoke: false},
      {id: 'proj-4', label: '프로젝트 삭제 → 확인 → 목록에서 제거', isSmoke: false},
      {id: 'proj-5', label: '프로젝트 내 할일 연결 확인', isSmoke: false},
      {id: 'proj-6', label: '빈 상태 UI 표시 (프로젝트 없을 때)', isSmoke: false},
    ],
  },
  {
    id: 'sleep',
    title: '4. 수면 관리',
    items: [
      {id: 'sleep-1', label: '나무 성장 시각화 정상 렌더링', isSmoke: false},
      {id: 'sleep-2', label: '수면 기록 히스토리 표시', isSmoke: false},
      {id: 'sleep-3', label: '수면 세션 시작 버튼 → SleepSessionScreen 이동', isSmoke: false},
      {id: 'sleep-4', label: '수면 목표 설정 → SleepGoalScreen 이동', isSmoke: false},
      {id: 'sleep-5', label: '수면 타이머 시작 → 카운트 동작', isSmoke: true},
      {id: 'sleep-6', label: '타이머 실행 중 백그라운드 → 복귀 시 시간 정확', isSmoke: false},
      {id: 'sleep-7', label: '수면 완료 → 기록 저장 + 정원 반영', isSmoke: false},
      {id: 'sleep-8', label: '세션 중 취소 → 확인 다이얼로그', isSmoke: false},
      {id: 'sleep-9', label: '취침/기상 시간 설정', isSmoke: false},
      {id: 'sleep-10', label: '알림 설정 토글', isSmoke: false},
      {id: 'sleep-11', label: '수면-ADHD 정보 콘텐츠 스크롤 정상', isSmoke: false},
    ],
  },
  {
    id: 'cleaning',
    title: '5. 청소 관리',
    items: [
      {id: 'clean-1', label: '에너지 셀렉터 동작', isSmoke: false},
      {id: 'clean-2', label: '카테고리 아코디언 펼침/접힘', isSmoke: false},
      {id: 'clean-3', label: '청소 태스크 선택/해제', isSmoke: false},
      {id: 'clean-4', label: '청소 세션 시작 → CleaningSessionScreen 이동', isSmoke: false},
      {id: 'clean-5', label: '타이머 시작/일시정지/완료', isSmoke: false},
      {id: 'clean-6', label: '태스크 큐 순서대로 표시', isSmoke: false},
      {id: 'clean-7', label: '완료 → 스트릭 반영', isSmoke: false},
      {id: 'clean-8', label: '세션 중 앱 백그라운드 → 복귀 시 정상', isSmoke: false},
      {id: 'clean-9', label: '청소-ADHD 정보 콘텐츠 표시 정상', isSmoke: false},
    ],
  },
  {
    id: 'planner',
    title: '6. 플래너',
    items: [
      {id: 'plan-1', label: '리스트 뷰 (dailyPlanner) 표시', isSmoke: true},
      {id: 'plan-2', label: '월간 뷰 전환', isSmoke: true},
      {id: 'plan-3', label: '주간 뷰 전환', isSmoke: false},
      {id: 'plan-4', label: '3일 뷰 전환', isSmoke: false},
      {id: 'plan-5', label: '일간 뷰 전환', isSmoke: false},
      {id: 'plan-6', label: '각 뷰 간 전환 시 크래시 없음', isSmoke: false},
      {id: 'plan-7', label: '새 할일 생성 (BottomSheet → 입력 → 저장)', isSmoke: true},
      {id: 'plan-8', label: '할일 체크/해제 → 상태 반영', isSmoke: true},
      {id: 'plan-9', label: '할일 탭 → 상세 편집 → 저장', isSmoke: false},
      {id: 'plan-10', label: '할일 삭제 → 확인 → 목록에서 제거', isSmoke: false},
      {id: 'plan-11', label: '할일 드래그로 시간/순서 변경', isSmoke: false},
      {id: 'plan-12', label: '날짜 선택 → 해당 날짜 할일 표시', isSmoke: true},
      {id: 'plan-13', label: '좌우 스와이프로 날짜 이동', isSmoke: false},
      {id: 'plan-14', label: '"오늘" 버튼 → 오늘 날짜로 복귀', isSmoke: false},
      {id: 'plan-15', label: '반복 할일 생성 (매일/매주/매월)', isSmoke: false},
      {id: 'plan-16', label: '반복 할일 단일 건 수정 vs 전체 수정 분기', isSmoke: false},
      {id: 'plan-17', label: '반복 할일 삭제 → 단일/전체 옵션', isSmoke: false},
      {id: 'plan-18', label: '풀투리프레시 → 서버 데이터 갱신', isSmoke: false},
      {id: 'plan-19', label: '다른 기기에서 변경 → 이 기기에서 반영 확인', isSmoke: false},
    ],
  },
  {
    id: 'execution',
    title: '7. 실행/집중',
    items: [
      {id: 'exec-1', label: '타이머 링 표시', isSmoke: true},
      {id: 'exec-2', label: '집중 대상 선택 (FocusPickerModal)', isSmoke: false},
      {id: 'exec-3', label: '시작 버튼 탭 → 타이머 시작', isSmoke: false},
      {id: 'exec-4', label: '호흡 애니메이션 정상 동작', isSmoke: true},
      {id: 'exec-5', label: '일시정지 / 재개 버튼', isSmoke: false},
      {id: 'exec-6', label: '완료 버튼 → 축하 오버레이 표시', isSmoke: false},
      {id: 'exec-7', label: '탭바 숨김 → 집중 모드 UI', isSmoke: false},
      {id: 'exec-8', label: '메모 추가 기능', isSmoke: false},
      {id: 'exec-9', label: '통계 확인 (FocusStatsModal)', isSmoke: false},
      {id: 'exec-10', label: '백그라운드 전환 → 복귀 시 시간 정확 (±2초)', isSmoke: true},
      {id: 'exec-11', label: '전화 수신 → 복귀 시 시간 정확', isSmoke: false},
      {id: 'exec-12', label: '화면 잠금 → 해제 시 시간 정확', isSmoke: false},
    ],
  },
  {
    id: 'notes',
    title: '8. 노트/동기부여',
    items: [
      {id: 'note-1', label: '타임라인 날짜별 정렬 표시', isSmoke: true},
      {id: 'note-2', label: '고정(pin)된 동기부여 배너 표시', isSmoke: false},
      {id: 'note-3', label: 'FAB 버튼 → BottomSheet 열림', isSmoke: true},
      {id: 'note-4', label: '새 동기부여 작성 → 저장 → 타임라인에 표시', isSmoke: false},
      {id: 'note-5', label: '감정 태깅 기능', isSmoke: false},
      {id: 'note-6', label: '동기부여 수정 → 저장', isSmoke: false},
      {id: 'note-7', label: '동기부여 삭제 → 확인 → 제거', isSmoke: false},
      {id: 'note-8', label: '동기부여 고정/해제', isSmoke: false},
      {id: 'note-9', label: '스크롤 시 부드러운 로딩 (끊김 없음)', isSmoke: false},
    ],
  },
  {
    id: 'settings',
    title: '9. 더보기/설정',
    items: [
      {id: 'set-1', label: '설정 메뉴 항목 전체 표시', isSmoke: true},
      {id: 'set-2', label: '각 메뉴 항목 탭 → 해당 뷰 전환', isSmoke: false},
      {id: 'set-3', label: '라이트/다크 모드 전환 → 즉시 반영', isSmoke: false},
      {id: 'set-4', label: '시스템 설정 따르기 옵션', isSmoke: false},
      {id: 'set-5', label: '현재 구독 상태 표시 (Free/Pro)', isSmoke: true},
      {id: 'set-6', label: '구독 구매 플로우 (인앱결제)', isSmoke: false},
      {id: 'set-7', label: '구독 복원 버튼 → 이전 구독 복원', isSmoke: false},
      {id: 'set-8', label: 'Pro 기능 접근 제한 (비구독 시) 정상 동작', isSmoke: false},
      {id: 'set-9', label: '계정 정보 표시', isSmoke: false},
      {id: 'set-10', label: '알림 권한 요청 (최초)', isSmoke: false},
      {id: 'set-11', label: '알림 ON/OFF 토글', isSmoke: false},
    ],
  },
  {
    id: 'aichat',
    title: '10. AI 채팅',
    items: [
      {id: 'ai-1', label: '채팅 화면 진입', isSmoke: false},
      {id: 'ai-2', label: '메시지 입력 → 전송 → AI 응답 수신', isSmoke: false},
      {id: 'ai-3', label: '응답 대기 중 로딩 표시', isSmoke: false},
      {id: 'ai-4', label: '이전 대화 히스토리 로드', isSmoke: false},
      {id: 'ai-5', label: '긴 메시지 스크롤 정상', isSmoke: false},
      {id: 'ai-6', label: '네트워크 오류 시 에러 처리', isSmoke: false},
    ],
  },
  {
    id: 'record',
    title: '11. 관심 키우기',
    items: [
      {id: 'rec-1', label: '인물 목록 표시', isSmoke: false},
      {id: 'rec-2', label: '새 인물 추가', isSmoke: false},
      {id: 'rec-3', label: '상호작용 기록 추가', isSmoke: false},
      {id: 'rec-4', label: '기록 수정/삭제', isSmoke: false},
      {id: 'rec-5', label: '연락 추천 알고리즘 동작 확인', isSmoke: false},
    ],
  },
  {
    id: 'adhd',
    title: '12. ADHD 이해',
    items: [
      {id: 'adhd-1', label: '3가지 뷰 모드 전환 (비주얼 맵/아코디언/카드 리더)', isSmoke: false},
      {id: 'adhd-2', label: '각 모드에서 콘텐츠 정상 표시', isSmoke: false},
      {id: 'adhd-3', label: '스크롤/스와이프 정상 동작', isSmoke: false},
    ],
  },
  {
    id: 'cleanup',
    title: '13. 데이터 정리',
    items: [
      {id: 'cleanup-1', label: '할일 정리 기능', isSmoke: false},
      {id: 'cleanup-2', label: '동기부여 정리 기능', isSmoke: false},
      {id: 'cleanup-3', label: '프로젝트 정리 기능', isSmoke: false},
      {id: 'cleanup-4', label: '삭제 전 확인 다이얼로그', isSmoke: false},
      {id: 'cleanup-5', label: '정리 완료 → 반영 확인', isSmoke: false},
    ],
  },
  {
    id: 'common',
    title: '14. 크로스 플랫폼 공통',
    items: [
      {id: 'com-1', label: '오프라인 → 적절한 안내 메시지 (크래시 없음)', isSmoke: true},
      {id: 'com-2', label: '약한 네트워크 (3G) → 타임아웃 처리 정상', isSmoke: false},
      {id: 'com-3', label: '오프라인 → 온라인 복귀 → 데이터 동기화', isSmoke: false},
      {id: 'com-4', label: '백그라운드 → 포그라운드 복귀 → 크래시 없음', isSmoke: true},
      {id: 'com-5', label: '앱 강제 종료 → 재시작 → 정상 동작', isSmoke: false},
      {id: 'com-6', label: '메모리 부족 → 앱 종료 → 재시작 시 데이터 유지', isSmoke: false},
      {id: 'com-7', label: '전화 수신 중 → 앱 복귀 정상', isSmoke: false},
      {id: 'com-8', label: '알림 배너 표시 중 → 앱 동작 정상', isSmoke: false},
      {id: 'com-9', label: '텍스트 입력 시 키보드 → 입력 필드 가려지지 않음', isSmoke: true},
      {id: 'com-10', label: '키보드 외부 탭 → 키보드 닫힘', isSmoke: false},
      {id: 'com-11', label: '이모지 입력 정상', isSmoke: false},
      {id: 'com-12', label: '앱 시작 → 홈 화면 표시 3초 이내', isSmoke: true},
      {id: 'com-13', label: '탭 전환 → 0.5초 이내 화면 전환', isSmoke: false},
      {id: 'com-14', label: '스크롤 → 끊김 없이 60fps 유지', isSmoke: false},
      {id: 'com-15', label: '애니메이션 → 부드러운 동작', isSmoke: false},
      {id: 'com-16', label: '목록 100개+ 항목 → 버벅임 없음', isSmoke: false},
      {id: 'com-17', label: 'VoiceOver/TalkBack → 주요 요소 읽힘', isSmoke: false},
      {id: 'com-18', label: '텍스트 크기 확대 → 레이아웃 깨지지 않음', isSmoke: false},
      {id: 'com-19', label: '푸시 알림 탭 → 해당 화면 진입', isSmoke: false},
      {id: 'com-20', label: '알림 권한 거부 → 앱 정상 동작', isSmoke: false},
    ],
  },
  {
    id: 'iap',
    title: '15. 인앱 구매',
    items: [
      {id: 'iap-1', label: '구독 상품 목록 표시 (가격 정상)', isSmoke: true},
      {id: 'iap-2', label: '구매 플로우 → 결제 완료 → Pro 전환 확인', isSmoke: false},
      {id: 'iap-3', label: '구독 복원 → 이전 구독 복원 확인', isSmoke: false},
      {id: 'iap-4', label: 'Pro 전용 기능 → 비구독자 접근 시 업셀 UI 표시', isSmoke: false},
      {id: 'iap-5', label: '구독 만료 → Free 전환 + 기능 제한 정상', isSmoke: false},
    ],
  },
];

/** 전체 항목 수 */
export const TOTAL_ITEMS = QA_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

/** 스모크 테스트 항목 수 */
export const SMOKE_ITEMS = QA_SECTIONS.reduce(
  (sum, s) => sum + s.items.filter(i => i.isSmoke).length,
  0,
);
