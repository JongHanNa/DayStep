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
  // 첫 번째 행 - 따뜻한 톤
  {
    id: 'lavender',
    name: '라벤더',
    hex: '#B794C4',
    description: '우아한 라벤더 퍼플'
  },
  {
    id: 'yellow',
    name: '옐로우',
    hex: '#F5D567',
    description: '밝은 파스텔 옐로우'
  },
  {
    id: 'golden',
    name: '골든',
    hex: '#DBAC6C',
    description: '따뜻한 골든 베이지'
  },
  { 
    id: 'charcoal', 
    name: '차콜', 
    hex: '#2C2C2C', 
    description: '세련된 차콜 그레이' 
  },
  { 
    id: 'pink', 
    name: '핑크', 
    hex: '#F4A7B0', 
    description: '부드러운 파스텔 핑크' 
  },

  // 두 번째 행 - 자연 톤
  { 
    id: 'amber', 
    name: '앰버', 
    hex: '#E1B564', 
    description: '따뜻한 앰버 골드' 
  },
  { 
    id: 'sage', 
    name: '세이지', 
    hex: '#8FBC8F', 
    description: '차분한 세이지 그린' 
  },
  { 
    id: 'slate', 
    name: '슬레이트', 
    hex: '#708090', 
    description: '모던한 슬레이트 블루' 
  },
  { 
    id: 'forest', 
    name: '포레스트', 
    hex: '#50A569', 
    description: '자연스러운 포레스트 그린' 
  },

  // 세 번째 행 - 시원한 톤
  { 
    id: 'navy', 
    name: '네이비', 
    hex: '#4B6584', 
    description: '깊이 있는 네이비 블루' 
  },
  { 
    id: 'sky', 
    name: '스카이', 
    hex: '#87CEEB', 
    description: '맑은 스카이 블루' 
  },
  { 
    id: 'violet', 
    name: '바이올렛', 
    hex: '#DA70D6', 
    description: '생기 있는 바이올렛' 
  },
  { 
    id: 'coral', 
    name: '코랄', 
    hex: '#FA8072', 
    description: '활기찬 코랄 레드' 
  },
];

/**
 * 기본 색상 (신규 할일 생성시 사용)
 */
export const DEFAULT_COLOR = PASTEL_COLORS[0]; // 라벤더

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
  if (!rgb) return false;
  
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
  if (!rgb) return hex;
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}