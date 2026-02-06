/**
 * 다음행동상황 한글/영어 변환 유틸리티
 * UI는 한글, DB는 영어 값을 사용
 */

// 한글 → 영어 변환 맵
const NEXT_ACTION_KO_TO_EN: Record<string, string> = {
  '창의성': 'creativity',
  '단순노동': 'simple_work',
  'Low battery': 'low_battery',
  '스마트폰': 'smartphone',
  '컴퓨터': 'computer',
  '집에서': 'home',
  '밖에서': 'outside',
  '어디서나': 'anywhere',
  '사무실': 'office',
  '나중에 보기': 'read_later',
};

// 영어 → 한글 변환 맵
const NEXT_ACTION_EN_TO_KO: Record<string, string> = {
  'creativity': '창의성',
  'simple_work': '단순노동',
  'low_battery': 'Low battery',
  'smartphone': '스마트폰',
  'computer': '컴퓨터',
  'home': '집에서',
  'outside': '밖에서',
  'anywhere': '어디서나',
  'office': '사무실',
  'read_later': '나중에 보기',
};

/**
 * 한글 다음행동상황을 DB용 영어 값으로 변환
 * @param koreanTexts - UI에서 선택된 한글 텍스트 배열
 * @returns DB 저장용 영어 값 배열
 */
export function nextActionToEnglish(koreanTexts: string[]): string[] {
  return koreanTexts.map(text => NEXT_ACTION_KO_TO_EN[text] || text);
}

/**
 * DB 영어 값을 UI 표시용 한글로 변환
 * @param englishTexts - DB에 저장된 영어 값 배열
 * @returns UI 표시용 한글 텍스트 배열
 */
export function nextActionToKorean(englishTexts: string[]): string[] {
  return englishTexts.map(text => NEXT_ACTION_EN_TO_KO[text] || text);
}
