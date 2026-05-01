/**
 * AnimatedOffsetView — translationY를 네이티브에서 직접 적용하는 래퍼 뷰
 * Reanimated/Fabric의 ShadowTree를 우회하여 60fps 보장
 */
package com.daysteprn

import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext

class AnimatedOffsetView(context: ThemedReactContext) : FrameLayout(context) {
    fun setOffsetY(offset: Float) {
        val density = resources.displayMetrics.density
        translationY = offset * density
    }
}
