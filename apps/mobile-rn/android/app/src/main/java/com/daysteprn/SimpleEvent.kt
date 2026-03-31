package com.daysteprn

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class SimpleEvent(
    surfaceId: Int,
    viewId: Int,
    private val name: String,
    private val payload: WritableMap
) : Event<SimpleEvent>(surfaceId, viewId) {

    override fun getEventName(): String = name

    override fun getEventData(): WritableMap = payload
}
