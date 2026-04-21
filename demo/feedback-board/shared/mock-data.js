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
    title: '',
    body: '',
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
    title: '',
    body: '',
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
    title: '',
    body: '',
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
    title: '',
    body: '',
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
    title: '',
    body: '',
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
    title: '',
    body: '',
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
