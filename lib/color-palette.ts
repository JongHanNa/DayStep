/**
 * DayStep 앱에서 사용할 파스텔 톤 색상 팔레트
 * 스크린샷 이미지 기반으로 설계된 부드러운 파스텔 색상들
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