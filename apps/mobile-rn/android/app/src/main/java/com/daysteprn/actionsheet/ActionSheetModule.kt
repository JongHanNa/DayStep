/**
 * ActionSheetModule — iOS ActionSheetIOS 동등 Android 네이티브 시트
 *
 * Material BottomSheetDialog로 하단에서 슬라이드되는 시트를 띄우고
 * 선택된 인덱스를 Promise로 반환. 외부 영역 탭 / 시스템 뒤로가기 →
 * cancelButtonIndex로 resolve.
 *
 * JS 사용:
 *   NativeModules.ActionSheet.show({title, message, options, cancelButtonIndex})
 *     → Promise<number>
 */
package com.daysteprn.actionsheet

import android.graphics.Color as AColor
import android.graphics.Typeface
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.google.android.material.bottomsheet.BottomSheetDialog
import java.util.concurrent.atomic.AtomicBoolean

class ActionSheetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ActionSheet"

    @ReactMethod
    fun show(config: ReadableMap, promise: Promise) {
        val activity: android.app.Activity = reactApplicationContext.currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "No current activity to attach BottomSheetDialog")
            return
        }

        val title = if (config.hasKey("title")) config.getString("title") else null
        val message = if (config.hasKey("message")) config.getString("message") else null
        val optionsArr = config.getArray("options")
        if (optionsArr == null || optionsArr.size() == 0) {
            promise.reject("NO_OPTIONS", "options array is empty")
            return
        }
        val cancelIdx = if (config.hasKey("cancelButtonIndex")) config.getInt("cancelButtonIndex") else -1

        UiThreadUtil.runOnUiThread {
            val resolved = AtomicBoolean(false)
            fun resolveOnce(idx: Int) {
                if (resolved.compareAndSet(false, true)) promise.resolve(idx)
            }

            val density = activity.resources.displayMetrics.density
            fun dp(v: Int) = (v * density).toInt()

            val dialog = BottomSheetDialog(activity)

            val container = LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                setBackgroundColor(AColor.TRANSPARENT)
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
            }

            // ─── 옵션 카드 (제목/메시지/옵션 항목들) ───
            val optionsCard = LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                setBackgroundColor(AColor.WHITE)
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(dp(8), 0, dp(8), 0)
                }
                layoutParams = lp
                background = roundedDrawable(AColor.WHITE, dp(14).toFloat())
            }

            // 제목
            if (!title.isNullOrEmpty()) {
                optionsCard.addView(TextView(activity).apply {
                    text = title
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                    setTextColor(AColor.parseColor("#1F2937"))
                    setTypeface(typeface, Typeface.BOLD)
                    gravity = Gravity.CENTER
                    setPadding(dp(16), dp(14), dp(16), if (message.isNullOrEmpty()) dp(12) else dp(4))
                })
            }
            // 메시지
            if (!message.isNullOrEmpty()) {
                optionsCard.addView(TextView(activity).apply {
                    text = message
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                    setTextColor(AColor.parseColor("#6B7280"))
                    gravity = Gravity.CENTER
                    setPadding(dp(16), 0, dp(16), dp(12))
                })
            }

            // 옵션 항목
            for (i in 0 until optionsArr.size()) {
                if (i == cancelIdx) continue
                // 위쪽 hairline 구분선 (제목/메시지 또는 직전 옵션 아래)
                optionsCard.addView(View(activity).apply {
                    setBackgroundColor(AColor.parseColor("#E5E7EB"))
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        1
                    )
                })
                val label = optionsArr.getString(i) ?: ""
                optionsCard.addView(TextView(activity).apply {
                    text = label
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
                    setTextColor(AColor.parseColor("#2563EB"))
                    gravity = Gravity.CENTER
                    setPadding(dp(16), dp(18), dp(16), dp(18))
                    isClickable = true
                    isFocusable = true
                    background = ripple(activity)
                    setOnClickListener {
                        dialog.dismiss()
                        resolveOnce(i)
                    }
                })
            }
            container.addView(optionsCard)

            // ─── 취소 버튼 (별도 카드) ───
            if (cancelIdx in 0 until optionsArr.size()) {
                val cancelLabel = optionsArr.getString(cancelIdx) ?: "취소"
                container.addView(View(activity).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        dp(8)
                    )
                })
                val cancelCard = TextView(activity).apply {
                    text = cancelLabel
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
                    setTextColor(AColor.parseColor("#1F2937"))
                    setTypeface(typeface, Typeface.BOLD)
                    gravity = Gravity.CENTER
                    setPadding(dp(16), dp(18), dp(16), dp(18))
                    isClickable = true
                    isFocusable = true
                    background = roundedDrawable(AColor.WHITE, dp(14).toFloat())
                    setOnClickListener {
                        dialog.dismiss()
                        resolveOnce(cancelIdx)
                    }
                }
                val cancelLp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(dp(8), 0, dp(8), dp(8))
                }
                cancelCard.layoutParams = cancelLp
                container.addView(cancelCard)
            }

            dialog.setContentView(container)
            dialog.setOnCancelListener {
                resolveOnce(cancelIdx)
            }
            dialog.setOnDismissListener {
                // 사용자가 옵션 또는 취소를 누르지 않고 dismiss된 경우 cancel로 간주
                resolveOnce(cancelIdx)
            }
            dialog.show()
        }
    }

    private fun roundedDrawable(color: Int, cornerRadiusPx: Float): android.graphics.drawable.GradientDrawable {
        return android.graphics.drawable.GradientDrawable().apply {
            shape = android.graphics.drawable.GradientDrawable.RECTANGLE
            setColor(color)
            this.cornerRadius = cornerRadiusPx
        }
    }

    private fun ripple(activity: android.app.Activity): android.graphics.drawable.Drawable? {
        val outValue = TypedValue()
        activity.theme.resolveAttribute(android.R.attr.selectableItemBackground, outValue, true)
        return activity.resources.getDrawable(outValue.resourceId, activity.theme)
    }
}
