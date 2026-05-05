package com.daysteprn.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews
import com.daysteprn.R

class DayStepCalendarWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_CHANGE_MONTH = "com.daysteprn.widget.CHANGE_MONTH"
        const val EXTRA_DELTA = "delta"
        private const val DEEP_LINK_URI = "daystep://monthly"

        private val WEEKDAY_LABELS = arrayOf("일", "월", "화", "수", "목", "금", "토")

        fun reloadAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(
                ComponentName(context, DayStepCalendarWidgetProvider::class.java),
            )
            if (ids.isEmpty()) return
            // 데이터 변경 알림 → 팩토리가 getViewAt 재호출
            mgr.notifyAppWidgetViewDataChanged(ids, R.id.widget_calendar_grid)
            // 헤더/요일 레이블 갱신
            val intent = Intent(context, DayStepCalendarWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(intent)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_CHANGE_MONTH) {
            val delta = intent.getIntExtra(EXTRA_DELTA, 0)
            val (curY, curM) = WidgetDataStore.getDisplayYearMonth(context)
            val cal = java.util.Calendar.getInstance().apply {
                set(java.util.Calendar.YEAR, curY)
                set(java.util.Calendar.MONTH, curM - 1)
                set(java.util.Calendar.DAY_OF_MONTH, 1)
                add(java.util.Calendar.MONTH, delta)
            }
            WidgetDataStore.setDisplayYearMonth(
                context,
                cal.get(java.util.Calendar.YEAR),
                cal.get(java.util.Calendar.MONTH) + 1,
            )
            reloadAll(context)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle,
    ) {
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    private fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_calendar_large)

        val (displayYear, displayMonth) = WidgetDataStore.getDisplayYearMonth(context)
        views.setTextViewText(R.id.widget_header_title, "${displayYear}년 ${displayMonth}월")

        setWeekdayLabels(views)

        views.setOnClickPendingIntent(R.id.widget_btn_prev, monthChangeIntent(context, -1))
        views.setOnClickPendingIntent(R.id.widget_btn_next, monthChangeIntent(context, +1))
        views.setOnClickPendingIntent(R.id.widget_open_app, deepLinkIntent(context))

        // 달력 그리드 어댑터 연결 (위젯 ID별 고유 data URI로 팩토리 인스턴스 분리)
        val serviceIntent = Intent(context, CalendarRemoteViewsService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }
        views.setRemoteAdapter(R.id.widget_calendar_grid, serviceIntent)
        views.setEmptyView(R.id.widget_calendar_grid, R.id.widget_calendar_empty)

        // 셀 탭 → 딥링크 템플릿
        views.setPendingIntentTemplate(R.id.widget_calendar_grid, deepLinkIntent(context))

        mgr.updateAppWidget(widgetId, views)
        mgr.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_calendar_grid)
    }

    private fun setWeekdayLabels(views: RemoteViews) {
        val ids = intArrayOf(
            R.id.weekday_sun, R.id.weekday_mon, R.id.weekday_tue,
            R.id.weekday_wed, R.id.weekday_thu, R.id.weekday_fri, R.id.weekday_sat,
        )
        for (i in ids.indices) {
            views.setTextViewText(ids[i], WEEKDAY_LABELS[i])
            val color = when (i) {
                0 -> Color.parseColor("#DC2626")
                6 -> Color.parseColor("#2563EB")
                else -> Color.parseColor("#6B7280")
            }
            views.setTextColor(ids[i], color)
        }
    }

    private fun monthChangeIntent(context: Context, delta: Int): PendingIntent {
        val intent = Intent(context, DayStepCalendarWidgetProvider::class.java).apply {
            action = ACTION_CHANGE_MONTH
            putExtra(EXTRA_DELTA, delta)
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getBroadcast(context, delta, intent, flags)
    }

    private fun deepLinkIntent(context: Context): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(DEEP_LINK_URI)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getActivity(context, 0, intent, flags)
    }
}
