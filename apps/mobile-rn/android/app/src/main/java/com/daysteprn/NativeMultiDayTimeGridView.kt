/**
 * NativeMultiDayTimeGrid — Android Jetpack Compose 멀티데이 시간 그리드
 * 주간(7일)/3일 뷰를 네이티브 Compose로 구현
 *
 * 구조: 고정 시간 컬럼(좌측) + 스크롤 가능한 날짜 헤더(상단) + 2D 스크롤 콘텐츠
 */
package com.daysteprn

import android.content.Context
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class NativeMultiDayTimeGridView(context: Context) : FrameLayout(context) {

    var onDateSelectCallback: ((String) -> Unit)? = null
    var onTodoPressCb: ((String) -> Unit)? = null
    var onDateRangeChangeCb: ((String, String) -> Unit)? = null
    var onHeightChangeCb: ((Double) -> Unit)? = null

    private val composeView = ComposeView(context)
    private var dayCount = mutableIntStateOf(3)
    private var centerDate = mutableStateOf(todayStr())
    private var primaryColorHex = mutableStateOf("#6366F1")
    private var todoDataJson = mutableStateOf("{}")
    private var eventDataJson = mutableStateOf("{}")

    init {
        addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        composeView.setContent {
            MultiDayTimeGridContent()
        }
        setupLayoutListener()
    }

    private fun setupLayoutListener() {
        viewTreeObserver.addOnGlobalLayoutListener(object : ViewTreeObserver.OnGlobalLayoutListener {
            private var lastH = 0
            override fun onGlobalLayout() {
                val h = measuredHeight
                if (h != lastH && h > 0) {
                    lastH = h
                    onHeightChangeCb?.invoke(h / resources.displayMetrics.density.toDouble())
                }
            }
        })
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
                heightSpec
            )
            layout(left, top, right, top + measuredHeight)
        }
    }

    fun setDayCount(count: Int) { dayCount.intValue = count }
    fun setCenterDate(date: String) { centerDate.value = date }
    fun setPrimaryColor(hex: String) { primaryColorHex.value = hex }
    fun setTodoData(json: String) { todoDataJson.value = json }
    fun setEventData(json: String) { eventDataJson.value = json }

    companion object {
        private val HOUR_HEIGHT = 50.dp
        private val TIME_COLUMN_WIDTH = 40.dp
        private val HEADER_HEIGHT = 52.dp
        private val WEEKDAYS_KR = arrayOf("일", "월", "화", "수", "목", "금", "토")

        private fun todayStr(): String {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            return sdf.format(Date())
        }
    }

    // ─── Data models ───
    data class TimeBlockItem(
        val id: String,
        val title: String,
        val startMinutes: Int, // -1 = all day
        val endMinutes: Int,
        val color: Color,
        val completed: Boolean,
        val type: String // "todo" or "event"
    )

    // ─── Compose UI ───
    @Composable
    private fun MultiDayTimeGridContent() {
        val days = dayCount.intValue
        val center = centerDate.value
        val primary = parseColor(primaryColorHex.value)
        val todoJson = todoDataJson.value
        val eventJson = eventDataJson.value
        val today = todayStr()

        // 날짜 범위 계산
        val dates = remember(center, days) { buildDateRange(center, days) }

        // 데이터 파싱
        val blocksByDate = remember(todoJson, eventJson, dates) {
            parseDateBlocks(todoJson, eventJson, dates, primary)
        }

        val verticalScrollState = rememberScrollState()

        Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
            // ─── Day headers ───
            Row(modifier = Modifier.fillMaxWidth().height(HEADER_HEIGHT)) {
                // 시간 컬럼 코너
                Box(modifier = Modifier.width(TIME_COLUMN_WIDTH).fillMaxHeight())
                // 날짜 헤더들
                dates.forEach { dateStr ->
                    val cal = parseDateCal(dateStr)
                    val dayOfWeek = WEEKDAYS_KR[cal.get(Calendar.DAY_OF_WEEK) - 1]
                    val dayNum = cal.get(Calendar.DAY_OF_MONTH)
                    val isToday = dateStr == today
                    val isSunday = cal.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY
                    val isSaturday = cal.get(Calendar.DAY_OF_WEEK) == Calendar.SATURDAY

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clickable { onDateSelectCallback?.invoke(dateStr) },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = dayOfWeek,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = when {
                                    isToday -> primary
                                    isSunday -> Color(0xFFEF4444)
                                    isSaturday -> Color(0xFF3B82F6)
                                    else -> Color(0xFF9CA3AF)
                                }
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .then(
                                        if (isToday) Modifier.background(primary, CircleShape)
                                        else Modifier
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = dayNum.toString(),
                                    fontSize = if (days <= 3) 15.sp else 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (isToday) Color.White else Color(0xFF1F2937)
                                )
                            }
                        }
                    }
                }
            }

            // ─── 구분선 ───
            Box(modifier = Modifier.fillMaxWidth().height(0.5.dp).background(Color(0xFFE5E7EB)))

            // ─── Time grid ───
            Row(modifier = Modifier.fillMaxSize()) {
                // 시간 라벨 컬럼 (고정, 세로 스크롤 동기화)
                Column(
                    modifier = Modifier
                        .width(TIME_COLUMN_WIDTH)
                        .verticalScroll(verticalScrollState)
                ) {
                    for (h in 0..23) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(HOUR_HEIGHT),
                            contentAlignment = Alignment.TopEnd
                        ) {
                            Text(
                                text = String.format("%02d", h),
                                fontSize = 11.sp,
                                color = Color(0xFF9CA3AF),
                                modifier = Modifier.padding(end = 6.dp)
                            )
                        }
                    }
                }

                // 콘텐츠 그리드 (세로 스크롤)
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(verticalScrollState)
                ) {
                    dates.forEach { dateStr ->
                        val blocks = blocksByDate[dateStr] ?: emptyList()
                        val isToday = dateStr == today

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(HOUR_HEIGHT * 24)
                                .drawBehind {
                                    // 시간 그리드 라인
                                    for (h in 0..24) {
                                        val y = (HOUR_HEIGHT * h).toPx()
                                        drawLine(
                                            color = Color(0xFFF3F4F6),
                                            start = Offset(0f, y),
                                            end = Offset(size.width, y),
                                            strokeWidth = 0.5f
                                        )
                                    }
                                    // 왼쪽 구분선
                                    drawLine(
                                        color = Color(0xFFF3F4F6),
                                        start = Offset(0f, 0f),
                                        end = Offset(0f, size.height),
                                        strokeWidth = 0.5f
                                    )
                                    // 현재 시간 인디케이터
                                    if (isToday) {
                                        val now = Calendar.getInstance()
                                        val min = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
                                        val y = (min.toFloat() / 60f) * HOUR_HEIGHT.toPx()
                                        drawCircle(
                                            color = Color(0xFFEF4444),
                                            radius = 4f,
                                            center = Offset(0f, y)
                                        )
                                        drawLine(
                                            color = Color(0xFFEF4444),
                                            start = Offset(0f, y),
                                            end = Offset(size.width, y),
                                            strokeWidth = 1.5f
                                        )
                                    }
                                }
                        ) {
                            // 이벤트/할일 블록 렌더링
                            blocks.forEach { block ->
                                if (block.startMinutes >= 0) {
                                    val topOffset = (block.startMinutes.toFloat() / 60f) * HOUR_HEIGHT.value
                                    val duration = (block.endMinutes - block.startMinutes).coerceAtLeast(20)
                                    val blockHeight = (duration.toFloat() / 60f) * HOUR_HEIGHT.value

                                    TimeBlock(
                                        block = block,
                                        topOffset = topOffset.dp,
                                        blockHeight = blockHeight.dp,
                                        compact = days > 3
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    @Composable
    private fun TimeBlock(block: TimeBlockItem, topOffset: Dp, blockHeight: Dp, compact: Boolean) {
        Box(
            modifier = Modifier
                .offset(y = topOffset)
                .fillMaxWidth()
                .padding(horizontal = 1.dp)
                .height(blockHeight.coerceAtLeast(18.dp))
                .clip(RoundedCornerShape(3.dp))
                .background(block.color.copy(alpha = 0.15f))
                .clickable {
                    if (block.type == "todo") onTodoPressCb?.invoke(block.id)
                }
        ) {
            // 좌측 색상 바
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .fillMaxHeight()
                    .background(block.color)
            )
            Text(
                text = block.title,
                fontSize = if (compact) 9.sp else 11.sp,
                fontWeight = FontWeight.Medium,
                color = block.color,
                maxLines = if (blockHeight < 30.dp) 1 else 2,
                overflow = TextOverflow.Ellipsis,
                textDecoration = if (block.completed) TextDecoration.LineThrough else TextDecoration.None,
                modifier = Modifier.padding(start = 5.dp, top = 1.dp, end = 2.dp)
            )
        }
    }

    // ─── Helpers ───
    private fun buildDateRange(center: String, count: Int): List<String> {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val cal = Calendar.getInstance()
        try { cal.time = sdf.parse(center)!! } catch (_: Exception) {}
        cal.add(Calendar.DAY_OF_MONTH, -(count / 2))
        return (0 until count).map {
            val d = sdf.format(cal.time)
            cal.add(Calendar.DAY_OF_MONTH, 1)
            d
        }
    }

    private fun parseDateCal(dateStr: String): Calendar {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val cal = Calendar.getInstance()
        try { cal.time = sdf.parse(dateStr)!! } catch (_: Exception) {}
        return cal
    }

    private fun parseDateBlocks(
        todoJson: String,
        eventJson: String,
        dates: List<String>,
        primary: Color
    ): Map<String, List<TimeBlockItem>> {
        val result = mutableMapOf<String, MutableList<TimeBlockItem>>()
        dates.forEach { result[it] = mutableListOf() }

        // Parse todos (Record<string, array>)
        try {
            val obj = JSONObject(todoJson)
            for (dateStr in dates) {
                if (!obj.has(dateStr)) continue
                val arr = obj.getJSONArray(dateStr)
                for (i in 0 until arr.length()) {
                    val t = arr.getJSONObject(i)
                    val startTime = t.optString("start_time", "")
                    val endTime = t.optString("end_time", "")
                    val startMin = parseTimeToMinutes(startTime)
                    val endMin = if (endTime.isNotEmpty()) parseTimeToMinutes(endTime) else (startMin + 30).coerceAtMost(1440)

                    result[dateStr]?.add(
                        TimeBlockItem(
                            id = t.optString("id"),
                            title = t.optString("title"),
                            startMinutes = startMin,
                            endMinutes = endMin,
                            color = parseColor(t.optString("project_color", "").ifEmpty { "#6366F1" }),
                            completed = t.optBoolean("completed", false),
                            type = "todo"
                        )
                    )
                }
            }
        } catch (_: Exception) {}

        // Parse events (Record<string, array>)
        try {
            val obj = JSONObject(eventJson)
            for (dateStr in dates) {
                if (!obj.has(dateStr)) continue
                val arr = obj.getJSONArray(dateStr)
                for (i in 0 until arr.length()) {
                    val e = arr.getJSONObject(i)
                    val isAllDay = e.optBoolean("isAllDay", false)
                    val startStr = e.optString("start", "")
                    val endStr = e.optString("end", "")

                    val startMin = if (isAllDay) -1 else parseIsoToMinutes(startStr)
                    val endMin = if (isAllDay) -1 else {
                        val em = parseIsoToMinutes(endStr)
                        if (em > startMin) em else (startMin + 60).coerceAtMost(1440)
                    }

                    result[dateStr]?.add(
                        TimeBlockItem(
                            id = e.optString("id"),
                            title = e.optString("title"),
                            startMinutes = startMin,
                            endMinutes = endMin,
                            color = parseColor(e.optString("color", "#4285F4")),
                            completed = false,
                            type = "event"
                        )
                    )
                }
            }
        } catch (_: Exception) {}

        return result
    }

    private fun parseTimeToMinutes(time: String): Int {
        if (time.isEmpty()) return -1
        return try {
            // ISO 8601: "2026-04-03T14:30:00+09:00" → extract "HH:mm" after 'T'
            val tIdx = time.indexOf('T')
            if (tIdx >= 0) {
                val timePart = time.substring(tIdx + 1).take(5) // "HH:mm"
                val parts = timePart.split(":")
                parts[0].toInt() * 60 + parts[1].toInt()
            } else {
                // Plain "HH:mm" format
                val parts = time.split(":")
                parts[0].toInt() * 60 + parts.getOrElse(1) { "0" }.toInt()
            }
        } catch (_: Exception) { -1 }
    }

    private fun parseIsoToMinutes(iso: String): Int {
        if (iso.isEmpty()) return 0
        return try {
            // Try ISO 8601: "2026-04-02T14:30:00+09:00" or "2026-04-02T14:30:00Z"
            val tIdx = iso.indexOf('T')
            if (tIdx >= 0) {
                val timePart = iso.substring(tIdx + 1).take(5) // "HH:mm"
                val parts = timePart.split(":")
                parts[0].toInt() * 60 + parts[1].toInt()
            } else {
                0
            }
        } catch (_: Exception) { 0 }
    }

    private fun parseColor(hex: String): Color {
        return try {
            Color(android.graphics.Color.parseColor(hex))
        } catch (_: Exception) {
            Color(0xFF6366F1)
        }
    }
}
