/**
 * nativeActionSheet — Android 네이티브 BottomSheetDialog 래퍼
 *
 * iOS의 ActionSheetIOS와 동등한 기능을 Android에서 시스템 룩으로 제공.
 * iOS에서는 사용 금지 — Platform.OS === 'android' 분기에서만 호출할 것.
 */
import {NativeModules, Platform} from 'react-native';

interface ActionSheetConfig {
  title?: string;
  message?: string;
  options: string[];
  /** -1이면 취소 버튼 없음 */
  cancelButtonIndex: number;
}

interface ActionSheetNativeModule {
  show(config: ActionSheetConfig): Promise<number>;
}

const native: ActionSheetNativeModule | undefined = NativeModules.ActionSheet;

export const nativeActionSheet = {
  /** 시트를 띄우고 선택된 인덱스를 resolve. 외부 탭/뒤로가기 → cancelButtonIndex */
  async show(config: ActionSheetConfig): Promise<number> {
    if (Platform.OS !== 'android' || !native) {
      throw new Error(
        'nativeActionSheet.show는 Android에서만 사용 가능합니다. iOS는 ActionSheetIOS를 직접 호출하세요.',
      );
    }
    return native.show(config);
  },
};
