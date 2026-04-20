package com.daysteprn.widget

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.daysteprn.R
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class CalendarRemoteViewsFactory(
    private val context: Context,
) : RemoteViewsService.RemoteViewsFactory {

    private var cells: List<CellData> = emptyList()

    data class CellData(
        val dayNumber: Int?,      // null = 빈 셀
        val col: Int,             // 0=일 ... 6=토
        val isToday: Boolean,
        val todos: List<WidgetTodo>,
        val maxChips: Int,
        val dateStr: String?,
    )

    override fun onCreate() {
        loadCells()
    }

    override fun onDataSetChanged() {
        loadCells()
    }

    override fun onDestroy() {
        cells = emptyList()
    }

    override fun getCount(): Int = 42 // 6 rows × 7 cols

    override fun getLoadingView(): RemoteViews? = null
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true
    override fun getViewTypeCount(): Int = 1

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_day_cell)
        if (position < 0 || position >= cells.size) {
            hideAll(views)
            return views
        }
        val cell = cells[position]

        if (cell.dayNumber == null) {
            hideAll(views)
            views.setViewVisibility(R.id.cell_root, View.INVISIBLE)
            return views
        }

        views.setViewVisibility(R.id.cell_root, View.VISIBLE)
        views.setViewVisibility(R.id.cell_day, View.VISIBLE)
        views.setTextViewText(R.id.cell_day, cell.dayNumber.toString())

        val dayColor = when {
            cell.isToday -> Color.WHITE
            cell.col == 0 -> Color.parseColor("#DC2626")
            cell.col == 6 -> Color.parseColor("#2563EB")
            else -> Color.parseColor("#111827")
        }
        views.setTextColor(R.id.cell_day, dayColor)
        views.setViewVisibility(R.id.cell_today_bg, if (cell.isToday) View.VISIBLE else View.INVISIBLE)

        val chipIds = intArrayOf(R.id.cell_chip0, R.id.cell_chip1, R.id.cell_chip2)
        val shown = minOf(cell.todos.size, cell.maxChips)
        for (i in chipIds.indices) {
            val cid = chipIds[i]
            if (i < shown) {
                val t = cell.todos[i]
                views.setViewVisibility(cid, View.VISIBLE)
                views.setTextViewText(cid, t.title)
                val c = parseColorSafe(t.color)
                views.setTextColor(cid, c)
                views.setInt(cid, "setBackgroundColor", withAlpha(c, 0.15f))
            } else {
                views.setViewVisibility(cid, View.GONE)
            }
        }

        if (cell.todos.size > cell.maxChips) {
            views.setViewVisibility(R.id.cell_overflow, View.VISIBLE)
            views.setTextViewText(R.id.cell_overflow, "+${cell.todos.size - cell.maxChips}")
        } else {
            views.setViewVisibility(R.id.cell_overflow, View.GONE)
        }

        // 셀 탭 → 딥링크 (템플릿은 Provider에서 설정, fillIn으로 활성화)
        val fillIn = Intent().apply {
            data = Uri.parse("daystep://monthly?date=${cell.dateStr ?: ""}")
        }
        views.setOnClickFillInIntent(R.id.cell_root, fillIn)

        return views
    }

    private fun hideAll(views: RemoteViews) {
        views.setViewVisibility(R.id.cell_day, View.INVISIBLE)
        views.setViewVisibility(R.id.cell_today_bg, View.INVISIBLE)
        views.setViewVisibility(R.id.cell_chip0, View.GONE)
        views.setViewVisibility(R.id.cell_chip1, View.GONE)
        views.setViewVisibility(R.id.cell_chip2, View.GONE)
        views.setViewVisibility(R.id.cell_overflow, View.GONE)
    }

    private fun loadCells() {
        val (year, month) = WidgetDataStore.getDisplayYearMonth(context)
        val payload = WidgetDataStore.loadPayload(context)
        val dayMap = payload?.dayMap ?: emptyMap()
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

        val cal = Calendar.getInstance().apply {
            firstDayOfWeek = Calendar.SUNDAY
            set(Calendar.YEAR, year)
            set(Calendar.MONTH, month - 1)
            set(Calendar.DAY_OF_MONTH, 1)
        }
        val firstWeekday = cal.get(Calendar.DAY_OF_WEEK) - 1 // 0=Sun
        val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        val totalCells = firstWeekday + daysInMonth
        val rows = (totalCells + 6) / 7
        val maxChips = when {
            rows <= 4 -> 3
            rows <= 5 -> 2
            else -> 1
        }

        val df = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val list = ArrayList<CellData>(42)

        for (i in 0 until 42) {
            val dayOfMonth = i - firstWeekday + 1
            val col = i % 7
            if (dayOfMonth < 1 || dayOfMonth > daysInMonth) {
                list.add(CellData(null, col, false, emptyList(), maxChips, null))
                continue
            }
            cal.set(Calendar.DAY_OF_MONTH, dayOfMonth)
            val dateStr = df.format(cal.time)
            list.add(
                CellData(
                    dayNumber = dayOfMonth,
                    col = col,
                    isToday = dateStr == todayStr,
                    todos = dayMap[dateStr] ?: emptyList(),
                    maxChips = maxChips,
                    dateStr = dateStr,
                ),
            )
        }
        cells = list
    }

    private fun parseColorSafe(hex: String): Int = try {
        Color.parseColor(hex)
    } catch (_: Exception) {
        Color.parseColor("#3B82F6")
    }

    private fun withAlpha(color: Int, alpha: Float): Int {
        val a = (alpha * 255).toInt().coerceIn(0, 255)
        return (a shl 24) or (color and 0x00FFFFFF)
    }
}
