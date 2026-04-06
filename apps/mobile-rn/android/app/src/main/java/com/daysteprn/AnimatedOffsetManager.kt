package com.daysteprn

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class AnimatedOffsetManager : SimpleViewManager<AnimatedOffsetView>() {
    override fun getName(): String = "AnimatedOffsetView"

    override fun createViewInstance(context: ThemedReactContext): AnimatedOffsetView {
        return AnimatedOffsetView(context)
    }

    @ReactProp(name = "offsetY", defaultFloat = 0f)
    fun setOffsetY(view: AnimatedOffsetView, offset: Float) {
        view.setOffsetY(offset)
    }
}
