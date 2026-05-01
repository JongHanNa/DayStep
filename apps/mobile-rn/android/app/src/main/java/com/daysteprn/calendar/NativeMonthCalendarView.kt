/**
 * NativeMonthCalendar — Android Jetpack Compose 월간 캘린더
 * iOS SwiftUI NativeMonthCalendar.swift와 동일 기능:
 * - 월 네비게이션 (좌/우 화살표, 오늘 버튼)
 * - 날짜별 할일/이벤트 칩 표시
 * - 날짜 선택 시 인라인 상세 패널
 */
package com.daysteprn

import android.content.Context
import android.widget.FrameLayout
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class NativeMonthCalendarView(context: Context) : FrameLayout(context) {

    var onDateSelectCb: ((String) -> Unit)? = null
    var onHeightChangeCb: ((Double) -> Unit)? = null
    var onMonthChangeCb: ((Int, Int) -> Unit)? = null
    var onNavigateToPlannerCb: ((String) -> Unit)? = null

    private var composeView = ComposeView(context)
    private var contentSet = false
    private var selectedDateState = mutableStateOf(todayStr())
    private var primaryColorHex = mutableStateOf("#6366F1")
    private var monthDataJson = mutableStateOf("{}")
    private var eventDataJson = mutableStateOf("{}")

    init {
        // ComposeView는 onAttachedToWindow에서 추가 (window recomposer 필요)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!contentSet) {
            contentSet = true
            composeView = ComposeView(context)
            addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
            composeView.setContent {
                MonthCalendarContent()
            }
        }
        requestLayout()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        if (contentSet) {
            removeAllViews()
            contentSet = false
        }
    }

    override fun requestLayout() {
        super.requestLayout()
        post {
            if (!isAttachedToWindow || width <= 0) return@post
            val parentHeight = (parent as? android.view.View)?.height ?: height
            val heightSpec = if (parentHeight > 0) {
                MeasureSpec.makeMeasureSpec(parentHeight, MeasureSpec.AT_MOST)
            } else {
                MeasureSpec.makeMeasureSpec(height.coerceAtLeast(1), MeasureSpec.EXACTLY)
            }
            measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                heightSpec,
            )
            layout(left, top, right, top + measuredHeight)
        }
    }

    fun setSelectedDate(date: String) { selectedDateState.value = date }
    fun setPrimaryColor(color: String) { primaryColorHex.value = color }
    fun setMonthData(json: String) { monthDataJson.value = json }
    fun setEventData(json: String) { eventDataJson.value = json }

    companion object {
        private val WEEKDAYS_KR = arrayOf("일", "월", "화", "수", "목", "금", "토")
        private val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        private fun todayStr(): String = sdf.format(Date())
    }

    // ─── Data Models ───
    data class TodoChip(val id: String, val title: String, val color: String, val startTime: String?, val endTime: String?, val scheduleType: String?)
    data class EventChip(val id: String, val title: String, val color: String, val isAllDay: Boolean, val start: String?, val end: String?)

    data class DayCellInfo(
        val dateStr: String,
        val day: Int,
        val isCurrentMonth: Boolean,
        val weekdayIndex: Int // 0=일, 6=토
    )

    // ─── Compose UI ───
    @Composable
    private fun MonthCalendarContent() {
        val selectedDate = selectedDateState.value
        val primary = parseColor(primaryColorHex.value)
        val todoJson = monthDataJson.value
        val eventJson = eventDataJson.value
        val today = todayStr()

        // 현재 표시 월
        var displayedMonth by remember { mutableStateOf(parseYearMonth(selectedDate)) }

        // 월 데이터 파싱
        val todoMap = remember(todoJson) { parseTodoMap(todoJson) }
        val eventMap = remember(eventJson) { parseEventMap(eventJson) }

        // 주 행 생성
        val weekRows = remember(displayedMonth) { generateWeekRows(displayedMonth) }

        // 월 표시 텍스트
        val displayText = remember(displayedMonth) {
            "${displayedMonth.first}년 ${displayedMonth.second}월"
        }

        val scrollState = rememberScrollState()

        Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
            // ─── Header: 월 네비게이션 ───
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 이전 월
                Box(
                    modifier = Modifier.size(32.dp).clickable {
                        displayedMonth = navigateMonth(displayedMonth, -1)
                        onMonthChangeCb?.invoke(displayedMonth.first, displayedMonth.second)
                    },
                    contentAlignment = Alignment.Center
                ) {
                    Text("◀", fontSize = 14.sp, color = Color(0xFF6B7280))
                }

                Text(
                    text = displayText,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1F2937),
                    modifier = Modifier.padding(horizontal = 8.dp)
                )

                // 다음 월
                Box(
                    modifier = Modifier.size(32.dp).clickable {
                        displayedMonth = navigateMonth(displayedMonth, 1)
                        onMonthChangeCb?.invoke(displayedMonth.first, displayedMonth.second)
                    },
                    contentAlignment = Alignment.Center
                ) {
                    Text("▶", fontSize = 14.sp, color = Color(0xFF6B7280))
                }

                Spacer(modifier = Modifier.weight(1f))

                // 오늘 버튼
                Text(
                    text = "오늘",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = primary,
                    modifier = Modifier.clickable {
                        val todayYM = parseYearMonth(today)
                        displayedMonth = todayYM
                        selectedDateState.value = today
                        onDateSelectCb?.invoke(today)
                        onMonthChangeCb?.invoke(todayYM.first, todayYM.second)
                    }
                )
            }

            // ─── Weekday Header ───
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp)) {
                WEEKDAYS_KR.forEachIndexed { index, label ->
                    Text(
                        text = label,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = when (index) {
                            0 -> Color(0xFFEF4444) // 일: 빨강
                            6 -> Color(0xFF3B82F6) // 토: 파랑
                            else -> Color(0xFF9CA3AF)
                        },
                        modifier = Modifier.weight(1f).wrapContentWidth(Alignment.CenterHorizontally)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // ─── Calendar Grid ───
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
            ) {
                val hasSelection = selectedDate.isNotEmpty() &&
                    weekRows.any { row -> row.any { it.dateStr == selectedDate } }
                val rowHeight = if (hasSelection) 68 else 80 // dp

                weekRows.forEach { weekCells ->
                    // 주 행
                    Row(
                        modifier = Modifier.fillMaxWidth().height(rowHeight.dp).padding(horizontal = 4.dp)
                    ) {
                        weekCells.forEach { cell ->
                            val isToday = cell.dateStr == today
                            val isSelected = cell.dateStr == selectedDate
                            val todos = todoMap[cell.dateStr] ?: emptyList()
                            val events = eventMap[cell.dateStr] ?: emptyList()
                            val allCount = todos.size + events.size

                            // 동적 칩 슬롯 계산
                            val chipHeight = 14
                            val availableForChips = rowHeight - 36
                            val maxChips = (availableForChips / chipHeight).coerceAtLeast(2)
                            val eventSlots = events.size.coerceAtMost(maxChips)
                            val todoSlots = todos.size.coerceAtMost(maxChips - eventSlots)
                            val shown = eventSlots + todoSlots

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                                    .clickable {
                                        if (selectedDateState.value == cell.dateStr) {
                                            selectedDateState.value = ""
                                        } else {
                                            selectedDateState.value = cell.dateStr
                                        }
                                        onDateSelectCb?.invoke(cell.dateStr)
                                    },
                                contentAlignment = Alignment.TopCenter
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.padding(vertical = 2.dp)
                                ) {
                                    // 날짜 숫자
                                    Box(
                                        modifier = Modifier
                                            .size(28.dp)
                                            .then(
                                                when {
                                                    isToday -> Modifier.background(primary, CircleShape)
                                                    isSelected -> Modifier.background(primary.copy(alpha = 0.15f), CircleShape)
                                                    else -> Modifier
                                                }
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = cell.day.toString(),
                                            fontSize = 14.sp,
                                            fontWeight = if (isToday || isSelected) FontWeight.Bold else FontWeight.Normal,
                                            color = when {
                                                isToday -> Color.White
                                                !cell.isCurrentMonth -> Color(0xFFD1D5DB)
                                                isSelected -> primary
                                                cell.weekdayIndex == 0 -> Color(0xFFEF4444)
                                                cell.weekdayIndex == 6 -> Color(0xFF3B82F6)
                                                else -> Color(0xFF1F2937)
                                            }
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(2.dp))

                                    // 이벤트 칩
                                    events.take(eventSlots).forEach { event ->
                                        ChipView(title = event.title, color = parseColor(event.color))
                                    }

                                    // 할일 칩
                                    todos.take(todoSlots).forEach { todo ->
                                        ChipView(title = todo.title, color = parseColor(todo.color.ifEmpty { "#6366F1" }))
                                    }

                                    // overflow
                                    if (allCount > shown && shown > 0) {
                                        Text(
                                            text = "+${allCount - shown}",
                                            fontSize = 8.sp,
                                            color = Color(0xFF9CA3AF)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 인라인 상세 패널
                    val selectedInThisWeek = weekCells.find { it.dateStr == selectedDate }
                    if (selectedInThisWeek != null) {
                        DetailPanel(
                            dateStr = selectedDate,
                            todos = todoMap[selectedDate] ?: emptyList(),
                            events = eventMap[selectedDate] ?: emptyList(),
                            primary = primary
                        )
                    }
                }
            }
        }
    }

    @Composable
    private fun ChipView(title: String, color: Color) {
        Text(
            text = title,
            fontSize = 9.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            color = Color.White,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 1.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(color.copy(alpha = 0.8f))
                .padding(horizontal = 3.dp, vertical = 1.dp)
        )
    }

    @Composable
    private fun DetailPanel(dateStr: String, todos: List<TodoChip>, events: List<EventChip>, primary: Color) {
        // 날짜 포맷
        val cal = parseDateCal(dateStr)
        val month = cal.get(Calendar.MONTH) + 1
        val day = cal.get(Calendar.DAY_OF_MONTH)
        val dayOfWeek = WEEKDAYS_KR[cal.get(Calendar.DAY_OF_WEEK) - 1]
        val dateLabel = "${month}월 ${day}일 (${dayOfWeek})"

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Color.White)
        ) {
            Text(
                text = dateLabel,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF374151),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )

            if (todos.isEmpty() && events.isEmpty()) {
                Text(
                    text = "일정이 없습니다",
                    fontSize = 13.sp,
                    color = Color(0xFF9CA3AF),
                    modifier = Modifier.fillMaxWidth().padding(16.dp).wrapContentWidth(Alignment.CenterHorizontally)
                )
            } else {
                // 이벤트
                events.forEach { event ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(parseColor(event.color), CircleShape)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = event.title,
                            fontSize = 14.sp,
                            color = Color(0xFF374151),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = if (event.isAllDay) "종일" else formatEventTimeRange(event.start, event.end),
                            fontSize = 12.sp,
                            color = Color(0xFF9CA3AF)
                        )
                    }
                }

                // 할일
                todos.forEach { todo ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onNavigateToPlannerCb?.invoke(dateStr) }
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(parseColor(todo.color.ifEmpty { "#6366F1" }), CircleShape)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = todo.title,
                            fontSize = 14.sp,
                            color = Color(0xFF374151),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = formatTodoTime(todo),
                            fontSize = 12.sp,
                            color = Color(0xFF9CA3AF)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("›", fontSize = 14.sp, color = Color(0xFFCBD5E1))
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }

    // ─── Helpers ───

    private fun parseYearMonth(dateStr: String): Pair<Int, Int> {
        return try {
            val parts = dateStr.split("-")
            Pair(parts[0].toInt(), parts[1].toInt())
        } catch (_: Exception) {
            val cal = Calendar.getInstance()
            Pair(cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1)
        }
    }

    private fun navigateMonth(ym: Pair<Int, Int>, offset: Int): Pair<Int, Int> {
        val cal = Calendar.getInstance()
        cal.set(Calendar.YEAR, ym.first)
        cal.set(Calendar.MONTH, ym.second - 1)
        cal.add(Calendar.MONTH, offset)
        return Pair(cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1)
    }

    private fun generateWeekRows(ym: Pair<Int, Int>): List<List<DayCellInfo>> {
        val cal = Calendar.getInstance()
        cal.set(Calendar.YEAR, ym.first)
        cal.set(Calendar.MONTH, ym.second - 1)
        cal.set(Calendar.DAY_OF_MONTH, 1)

        // 월 시작 요일 (1=일, 7=토)
        val firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) // 1=SUN
        val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)

        // 이전 달 채우기
        cal.add(Calendar.DAY_OF_MONTH, -(firstDayOfWeek - 1))

        val rows = mutableListOf<List<DayCellInfo>>()
        var done = false
        while (!done) {
            val week = mutableListOf<DayCellInfo>()
            for (i in 0..6) {
                val dateStr = sdf.format(cal.time)
                val dayOfMonth = cal.get(Calendar.DAY_OF_MONTH)
                val month = cal.get(Calendar.MONTH) + 1
                val isCurrent = month == ym.second
                val weekdayIdx = cal.get(Calendar.DAY_OF_WEEK) - 1 // 0=SUN

                week.add(DayCellInfo(dateStr, dayOfMonth, isCurrent, weekdayIdx))
                cal.add(Calendar.DAY_OF_MONTH, 1)
            }
            rows.add(week)

            // 다음 행이 다음 달에만 속하면 종료
            val nextMonth = cal.get(Calendar.MONTH) + 1
            if (nextMonth != ym.second && rows.size >= 4) done = true
        }

        return rows
    }

    private fun parseDateCal(dateStr: String): Calendar {
        val cal = Calendar.getInstance()
        try { cal.time = sdf.parse(dateStr)!! } catch (_: Exception) {}
        return cal
    }

    private fun parseTodoMap(json: String): Map<String, List<TodoChip>> {
        val result = mutableMapOf<String, MutableList<TodoChip>>()
        try {
            val obj = JSONObject(json)
            val keys = obj.keys()
            while (keys.hasNext()) {
                val dateStr = keys.next()
                val arr = obj.getJSONArray(dateStr)
                val list = mutableListOf<TodoChip>()
                for (i in 0 until arr.length()) {
                    val t = arr.getJSONObject(i)
                    list.add(TodoChip(
                        id = t.optString("id"),
                        title = t.optString("title"),
                        color = t.optString("color", "#6366F1"),
                        startTime = t.optString("start_time", "").ifEmpty { null },
                        endTime = t.optString("end_time", "").ifEmpty { null },
                        scheduleType = t.optString("schedule_type", "").ifEmpty { null }
                    ))
                }
                result[dateStr] = list
            }
        } catch (_: Exception) {}
        return result
    }

    private fun parseEventMap(json: String): Map<String, List<EventChip>> {
        val result = mutableMapOf<String, MutableList<EventChip>>()
        try {
            val obj = JSONObject(json)
            val keys = obj.keys()
            while (keys.hasNext()) {
                val dateStr = keys.next()
                val arr = obj.getJSONArray(dateStr)
                val list = mutableListOf<EventChip>()
                for (i in 0 until arr.length()) {
                    val e = arr.getJSONObject(i)
                    list.add(EventChip(
                        id = e.optString("id"),
                        title = e.optString("title"),
                        color = e.optString("color", "#4285F4"),
                        isAllDay = e.optBoolean("isAllDay", false),
                        start = e.optString("start", "").ifEmpty { null },
                        end = e.optString("end", "").ifEmpty { null }
                    ))
                }
                result[dateStr] = list
            }
        } catch (_: Exception) {}
        return result
    }

    private fun formatEventTimeRange(start: String?, end: String?): String {
        val s = formatIsoTime(start)
        val e = formatIsoTime(end)
        return if (s != null && e != null) "$s - $e"
        else s ?: e ?: ""
    }

    private fun formatTodoTime(todo: TodoChip): String {
        if (todo.scheduleType == "anytime") return "언제든지"
        val s = formatIsoTime(todo.startTime)
        val e = formatIsoTime(todo.endTime)
        return when {
            s != null && e != null -> "$s - $e"
            s != null -> s
            else -> ""
        }
    }

    private fun formatIsoTime(iso: String?): String? {
        if (iso.isNullOrEmpty()) return null
        return try {
            val tIdx = iso.indexOf('T')
            if (tIdx >= 0) iso.substring(tIdx + 1).take(5) // "HH:mm"
            else null
        } catch (_: Exception) { null }
    }

    private fun parseColor(hex: String): Color {
        return try {
            Color(android.graphics.Color.parseColor(hex))
        } catch (_: Exception) {
            Color(0xFF6366F1)
        }
    }
}
