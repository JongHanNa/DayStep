package com.daysteprn.widget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.util.Calendar

object WidgetDataStore {
    private const val PREFS_NAME = "daystep_widget_prefs"
    private const val KEY_CALENDAR_JSON = "daystep_widget_calendar"
    private const val KEY_DISPLAY_YEAR = "widget_display_year"
    private const val KEY_DISPLAY_MONTH = "widget_display_month"

    fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveCalendarJson(context: Context, json: String) {
        prefs(context).edit().putString(KEY_CALENDAR_JSON, json).apply()
    }

    fun loadCalendarJson(context: Context): String? =
        prefs(context).getString(KEY_CALENDAR_JSON, null)

    fun loadPayload(context: Context): WidgetPayload? {
        val raw = loadCalendarJson(context) ?: return null
        return try {
            val obj = JSONObject(raw)
            val year = obj.optInt("year", 0)
            val month = obj.optInt("month", 0)
            val daysArr = obj.optJSONArray("days") ?: return WidgetPayload(year, month, emptyMap())
            val dayMap = HashMap<String, List<WidgetTodo>>(daysArr.length())
            for (i in 0 until daysArr.length()) {
                val d = daysArr.optJSONObject(i) ?: continue
                val date = d.optString("date")
                val todosArr = d.optJSONArray("todos")
                val todos = mutableListOf<WidgetTodo>()
                if (todosArr != null) {
                    for (j in 0 until todosArr.length()) {
                        val t = todosArr.optJSONObject(j) ?: continue
                        todos.add(
                            WidgetTodo(
                                title = t.optString("title", ""),
                                color = t.optString("color", "#3B82F6"),
                            ),
                        )
                    }
                }
                dayMap[date] = todos
            }
            WidgetPayload(year, month, dayMap)
        } catch (_: Exception) {
            null
        }
    }

    fun getDisplayYearMonth(context: Context): Pair<Int, Int> {
        val p = prefs(context)
        val cal = Calendar.getInstance()
        val defaultYear = cal.get(Calendar.YEAR)
        val defaultMonth = cal.get(Calendar.MONTH) + 1
        val y = p.getInt(KEY_DISPLAY_YEAR, 0)
        val m = p.getInt(KEY_DISPLAY_MONTH, 0)
        return Pair(if (y == 0) defaultYear else y, if (m == 0) defaultMonth else m)
    }

    fun setDisplayYearMonth(context: Context, year: Int, month: Int) {
        prefs(context).edit()
            .putInt(KEY_DISPLAY_YEAR, year)
            .putInt(KEY_DISPLAY_MONTH, month)
            .apply()
    }
}

data class WidgetTodo(val title: String, val color: String)

data class WidgetPayload(
    val year: Int,
    val month: Int,
    val dayMap: Map<String, List<WidgetTodo>>,
)
