// Shared mock data for all three feedback board concepts.
// Same 8 posts so each variant can be compared fairly.

window.USERS = {
  u1: { name: '나종한',   handle: '@jonghan',    role: 'user'  },
  u2: { name: '이서연',   handle: '@seoyeon',    role: 'user'  },
  u3: { name: '박민준',   handle: '@minjun',     role: 'user'  },
  u4: { name: '김하윤',   handle: '@hayoon',     role: 'user'  },
  u5: { name: '정도윤',   handle: '@doyoon',     role: 'user'  },
  u6: { name: '최지우',   handle: '@jiwoo',      role: 'user'  },
  u7: { name: '한수아',   handle: '@suah',       role: 'user'  },
  admin1: { name: 'DayStep Team', handle: '@team', role: 'admin' },
};

// The person "using" the app in this demo. index.html overrides role live.
window.CURRENT_USER = { id: 'u1', role: 'user' };

// 8 posts, chronological newest-first. u1 owns #1 and #4 (visible to self).
window.POSTS = [
  {
    id: 1,
    authorId: 'u1',
    type: 'bug',
    status: 'triaged',
    priority: 'medium',
    title: '플래너에서 주간 스트립 스크롤이 끊깁니다',
    body: '주간 뷰에서 좌우로 넘길 때 가끔 두 프레임 정도 끊기는 느낌이 있어요. iPhone 13, iOS 17.4. 재현율은 30% 정도.',
    createdAt: '2시간 전',
    votes: 3,
    comments: 1,
    hasAdminReply: true,
  },
  {
    id: 2,
    authorId: 'u7',
    type: 'feature',
    status: 'open',
    priority: 'high',
    title: '잠자리 모드에서 흑백 화면 자동 적용',
    body: '자기 전에 앱을 열면 자동으로 컬러를 빼주는 모드가 있으면 좋겠어요. 눈 피로도 줄고 수면도 도움될 것 같아요.',
    createdAt: '5시간 전',
    votes: 12,
    comments: 4,
    hasAdminReply: false,
  },
  {
    id: 3,
    authorId: 'u3',
    type: 'bug',
    status: 'shipped',
    priority: 'low',
    title: '반복 할일 생성 시 요일 선택이 초기화됨',
    body: '매주 반복으로 할일 만들 때 요일 체크가 저장 후 풀리는 문제. 1.9.2에서 수정 확인했습니다. 감사!',
    createdAt: '어제',
    votes: 1,
    comments: 2,
    hasAdminReply: true,
  },
  {
    id: 4,
    authorId: 'u1',
    type: 'feature',
    status: 'under-review',
    priority: 'high',
    title: '포커스 모드에서 알림 음소거 강도 단계 조절',
    body: '포커스 중에도 가족/긴급 연락은 받고 싶어요. 3단계 정도로 나눠서 — 전부차단 / 즐겨찾기만 / 전부허용 — 선택할 수 있으면 좋겠습니다.',
    createdAt: '3일 전',
    votes: 7,
    comments: 0,
    hasAdminReply: false,
  },
  {
    id: 5,
    authorId: 'u2',
    type: 'bug',
    status: 'open',
    priority: 'high',
    title: '위젯이 데이터 갱신되지 않습니다',
    body: '홈 위젯이 할일 완료해도 계속 이전 상태로 남아있어요. 앱을 열어야만 반영됩니다. iOS 17.4 기준.',
    createdAt: '4일 전',
    votes: 9,
    comments: 3,
    hasAdminReply: false,
  },
  {
    id: 6,
    authorId: 'u5',
    type: 'feature',
    status: 'wont-fix',
    priority: 'low',
    title: '애니메이션 완전히 끄는 옵션',
    body: '접근성 설정과 별도로 앱 안에서 모션 완전 제거 스위치가 있었으면 해요. 시스템 접근성 옵션으로 충분하다는 답변 받음.',
    createdAt: '지난주',
    votes: 2,
    comments: 5,
    hasAdminReply: true,
  },
  {
    id: 7,
    authorId: 'u4',
    type: 'feature',
    status: 'under-review',
    priority: 'medium',
    title: '구글 캘린더 양방향 동기화',
    body: 'DayStep에서 만든 일정이 구글 캘린더로 가지 않아서 이중 입력 중이에요. 양방향 싱크 꼭 필요합니다.',
    createdAt: '지난주',
    votes: 18,
    comments: 6,
    hasAdminReply: true,
  },
  {
    id: 8,
    authorId: 'u6',
    type: 'bug',
    status: 'triaged',
    priority: 'medium',
    title: '다크모드 전환 시 일부 텍스트 색상 반전 안됨',
    body: '설정에서 다크로 바꿔도 노트 상세 화면의 메타 텍스트가 연한 회색 그대로 남아서 잘 안보여요.',
    createdAt: '2주 전',
    votes: 4,
    comments: 1,
    hasAdminReply: false,
  },
];

window.isVisible = function (post, currentUser) {
  const user = currentUser || window.CURRENT_USER;
  return post.authorId === user.id || user.role === 'admin';
};

// index.html posts a message to each iframe when the role toggle flips.
// Each variant listens and re-renders.
window.addEventListener('message', (ev) => {
  if (ev.data && ev.data.type === 'set-role' && typeof ev.data.role === 'string') {
    window.CURRENT_USER = { ...window.CURRENT_USER, role: ev.data.role };
    if (typeof window.__renderBoard === 'function') {
      window.__renderBoard();
    }
  }
});
