export interface ThemeBridgePlugin {
  /**
   * WebView의 scrollView 배경색을 설정합니다.
   * iOS에서 overscroll(고무줄 효과) 영역의 배경색을 테마와 동기화합니다.
   *
   * @param options.color - HEX 색상 코드 (예: "#121212", "#FFFFFF")
   * @returns 성공 여부와 적용된 색상
   */
  setScrollViewBackgroundColor(options: { color: string }): Promise<{ success: boolean; color: string }>;
}
