/**
🎨 색상 팔레트의 통일감 분석

  이 색상 팔레트가 통일감을 주는 핵심 요소는 4가지입니다:

  1️⃣ 중간 명도 (Middle Lightness)

  | 특징    | 설명                                      |
  |-------|-----------------------------------------|
  | 밝기 범위 | 대부분 100180 (0255 중)                     |
  | 효과    | 너무 밝거나 어둡지 않아 눈에 편안함                    |
  | 예시    | 스카이블루(197), 네이비(81), 피치(176) - 모두 중간 범위 |

  2️⃣ 억제된 채도 (Muted Saturation) ⭐ 가장 중요

  | 특징    | 설명                              |
  |-------|---------------------------------|
  | 채도 범위 | 대부분 60~76 (중간 채도)               |
  | 톤     | 순색이 아닌 "회색기가 섞인" 느낌             |
  | 스타일   | "Dusty Tone" 또는 "Muted Palette" |
  | 예외    | 옐로우 계열(선샤인, 골든)만 채도 높음 → 액센트 역할 |

  쉽게 말하면:
  물감에 회색을 살짝 섞은 것처럼, 순수한 빨강/파랑이 아니라 "회색빛 빨강", "회색빛 파랑"
  느낌입니다. 마치 빈티지 사진이나 먼지 쌓인 느낌이라서 "Dusty Tone"이라고 부릅니다.

  3️⃣ 온도 균형 (Temperature Balance)

  | 분류    | 색상 수 | 색상 예시                  |
  |-------|------|------------------------|
  | 따뜻한 색 | 5개   | 선샤인, 골든, 피치, 핑크, 로즈퍼플  |
  | 차가운 색 | 4개   | 스카이블루, 퍼플, 네이비, 슬레이트블루 |
  | 중성 색  | 3개   | 세이지, 메도우, 블랙           |

  → 한쪽으로 치우치지 않고 균형 잡힌 구성

  4️⃣ 파스텔도, 비비드도 아닌 중간 톤

  파스텔 ←━━━━━━ [이 팔레트] ━━━━━━→ 비비드
  (연하고 밝음)    (회색 섞인 중간)    (선명하고 강렬)
 */

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  description?: string;
}

export const PASTEL_COLORS: ColorOption[] = [
  // 첫 번째 행
  {
    id: 'sky-blue',
    name: '스카이블루',
    hex: '#A7C5E4',
    description: '맑은 파스텔 블루'
  },
  {
    id: 'purple',
    name: '퍼플',
    hex: '#9061C5',
    description: '우아한 퍼플'
  },
  {
    id: 'sunshine',
    name: '선샤인',
    hex: '#F0CC49',
    description: '밝은 골든 옐로우'
  },
  {
    id: 'black',
    name: '블랙',
    hex: '#000000',
    description: '클래식 블랙'
  },

  // 두 번째 행
  {
    id: 'navy',
    name: '네이비',
    hex: '#344F70',
    description: '깊이 있는 네이비 블루'
  },
  {
    id: 'rose-purple',
    name: '로즈퍼플',
    hex: '#8D4B66',
    description: '세련된 로즈 퍼플'
  },
  {
    id: 'sage',
    name: '세이지',
    hex: '#428366',
    description: '차분한 세이지 그린'
  },
  {
    id: 'slate-blue',
    name: '슬레이트블루',
    hex: '#6984A5',
    description: '모던한 슬레이트 블루'
  },

  // 세 번째 행
  {
    id: 'meadow',
    name: '메도우',
    hex: '#9ABE75',
    description: '자연스러운 라이트 그린'
  },
  {
    id: 'golden',
    name: '골든',
    hex: '#E0AD3B',
    description: '따뜻한 골든'
  },
  {
    id: 'peach',
    name: '피치',
    hex: '#F1A37C',
    description: '부드러운 피치 코랄'
  },
  {
    id: 'pink',
    name: '핑크',
    hex: '#E8A39C',
    description: '부드러운 로즈 핑크'
  },

  // 네 번째 행 - 차별화된 색상 추가
  {
    id: 'charcoal',
    name: '차콜',
    hex: '#4A4A4A',
    description: '깊이 있는 차콜 그레이'
  },
  {
    id: 'ivory',
    name: '아이보리',
    hex: '#E8E4D9',
    description: '따뜻한 아이보리 화이트'
  },
  {
    id: 'emerald',
    name: '에메랄드',
    hex: '#4D8B74',
    description: '선명한 에메랄드 그린'
  },
  {
    id: 'amber',
    name: '앰버',
    hex: '#D99A4F',
    description: '따뜻한 앰버 골드'
  },

  // 다섯 번째 행
  {
    id: 'crimson',
    name: '크림슨',
    hex: '#A64D5A',
    description: '진한 크림슨 레드'
  },
  {
    id: 'azure',
    name: '애저',
    hex: '#4A7A9E',
    description: '맑은 애저 블루'
  },
  {
    id: 'lilac',
    name: '라일락',
    hex: '#9E7FA8',
    description: '우아한 라일락 퍼플'
  },
  {
    id: 'sand',
    name: '샌드',
    hex: '#C4B29F',
    description: '부드러운 샌드 베이지'
  },

  // 여섯 번째 행 - 통일감 유지 차별화
  {
    id: 'teal',
    name: '틸',
    hex: '#5E9B9B',
    description: '차분한 틸 블루'
  },
  {
    id: 'coral',
    name: '코랄',
    hex: '#D88B7C',
    description: '따뜻한 코랄 오렌지'
  },
  {
    id: 'lavender',
    name: '라벤더',
    hex: '#B5A4C7',
    description: '우아한 라벤더 퍼플'
  },
  {
    id: 'olive',
    name: '올리브',
    hex: '#8B9168',
    description: '자연스러운 올리브 그린'
  },

  // 일곱 번째 행
  {
    id: 'burgundy',
    name: '버건디',
    hex: '#8B5A5F',
    description: '깊이 있는 버건디 레드'
  },
  {
    id: 'mint',
    name: '민트',
    hex: '#7DB4A8',
    description: '상쾌한 민트 그린'
  },
  {
    id: 'copper',
    name: '코퍼',
    hex: '#C89B7B',
    description: '따뜻한 코퍼 브라운'
  },
  {
    id: 'steel',
    name: '스틸',
    hex: '#7A8B99',
    description: '세련된 스틸 그레이'
  },

  // 여덟 번째 행
  {
    id: 'mauve',
    name: '모브',
    hex: '#B88BAC',
    description: '부드러운 모브 퍼플'
  },
  {
    id: 'moss',
    name: '모스',
    hex: '#7A9A72',
    description: '자연스러운 모스 그린'
  },
  {
    id: 'taupe',
    name: '토프',
    hex: '#A89084',
    description: '모던한 토프 베이지'
  },
  {
    id: 'slate-gray',
    name: '슬레이트그레이',
    hex: '#7C8487',
    description: '중성적인 슬레이트 그레이'
  },
];

/**
 * 기본 색상 (신규 할일 생성시 사용)
 */
export const DEFAULT_COLOR = PASTEL_COLORS[0]; // 스카이블루

/**
 * 색상 ID로 색상 정보를 찾는 헬퍼 함수
 */
export function getColorById(colorId: string): ColorOption {
  return PASTEL_COLORS.find(color => color.id === colorId) || DEFAULT_COLOR;
}

/**
 * 색상 hex 값으로 색상 정보를 찾는 헬퍼 함수
 */
export function getColorByHex(hex: string): ColorOption {
  return PASTEL_COLORS.find(color => color.hex.toLowerCase() === hex.toLowerCase()) || DEFAULT_COLOR;
}

/**
 * 색상이 어두운 색인지 판단하는 함수 (텍스트 색상 결정용)
 */
export function isColorDark(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return false;
  }

  // 밝기 계산 (0-255)
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness < 128;
}

/**
 * Hex 색상을 RGB로 변환
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * 색상에 투명도를 적용한 RGBA 문자열 반환
 */
export function getColorWithOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}