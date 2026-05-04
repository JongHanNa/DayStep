/**
 * NativeDayTimeGrid — Android Jetpack Compose 단일 일 시간 그리드
 * 24시간 세로 스크롤 뷰 + 할일/이벤트 블록 렌더링
 *
 * 구조: 종일 섹션(상단) + 시간 그리드(스크롤)
 */
package com.daysteprn.calendar

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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

class NativeDayTimeGridView(context: Context) : FrameLayout(context) {

    var onDateSelectCb: ((String) -> Unit)? = null
    var onTodoPressCb: ((String) -> Unit)? = null
    var onHeightChangeCb: ((Double) -> Unit)? = null
    var onTodoEditCb: ((String, String, String) -> Unit)? = null

    private var composeView = ComposeView(context)
    private var contentSet = false
    private var selectedDate = mutableStateOf(todayStr())
    private var primaryColorHex = mutableStateOf("#6366F1")
    private var todoDataJson = mutableStateOf("[]")
    private var eventDataJson = mutableStateOf("[]")

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
                DayTimeGridContent()
            }
            setupLayoutListener()
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

    fun setSelectedDate(date: String) { selectedDate.value = date }
    fun setPrimaryColor(hex: String) { primaryColorHex.value = hex }
    fun setTodoData(json: String) { todoDataJson.value = json }
    fun setEventData(json: String) { eventDataJson.value = json }

    companion object {
        private val HOUR_HEIGHT = 60.dp
        private val TIME_COLUMN_WIDTH = 50.dp
        private val DATE_FMT = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        private val ISO_OUT_FMT = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("Asia/Seoul")
        }

        private fun todayStr(): String = DATE_FMT.format(Date())
    }

    data class TimeBlock(
        val id: String,
        val title: String,
        val startMinutes: Int,   // -1 = all day
        val endMinutes: Int,
        val color: Color,
        val completed: Boolean,
        val type: String
    )

    @Composable
    private fun DayTimeGridContent() {
        val date = selectedDate.value
        val primary = parseColor(primaryColorHex.value)
        val todoJson = todoDataJson.value
        val eventJson = eventDataJson.value
        val today = todayStr()
        val isToday = date == today

        // Parse data
        val (allDayBlocks, timedBlocks) = remember(todoJson, eventJson, primary) {
            parseBlocks(todoJson, eventJson, primary)
        }

        val scrollState = rememberScrollState()

        // 초기 스크롤: 현재 시간 - 2시간 위치로
        LaunchedEffect(Unit) {
            val now = Calendar.getInstance()
            val scrollHour = (now.get(Calendar.HOUR_OF_DAY) - 2).coerceAtLeast(0)
            scrollState.scrollTo((scrollHour * HOUR_HEIGHT.value * resources.displayMetrics.density).toInt())
        }

        Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
            // ─── 언제든지 섹션 (상단 전체 너비 바) ───
            if (allDayBlocks.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    allDayBlocks.forEach { block ->
                        AllDayChip(block)
                    }
                }
                Box(modifier = Modifier.fillMaxWidth().height(0.5.dp).background(Color(0xFFE5E7EB)))
            }

            // ─── 시간 그리드 ───
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
            ) {
                // 시간 라벨 컬럼
                Column(modifier = Modifier.width(TIME_COLUMN_WIDTH)) {
                    for (h in 0..23) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(HOUR_HEIGHT),
                            contentAlignment = Alignment.TopEnd
                        ) {
                            Text(
                                text = String.format("%02d:00", h),
                                fontSize = 11.sp,
                                color = Color(0xFF9CA3AF),
                                modifier = Modifier.padding(end = 6.dp, top = 0.dp)
                            )
                        }
                    }
                }

                // 콘텐츠 영역
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(HOUR_HEIGHT * 24)
                        .drawBehind {
                            // 시간 그리드 라인
                            for (h in 0..24) {
                                val y = (HOUR_HEIGHT * h).toPx()
                                drawLine(
                                    color = Color(0xFFE5E7EB),
                                    start = Offset(0f, y),
                                    end = Offset(size.width, y),
                                    strokeWidth = 0.5f
                                )
                            }
                            // 현재 시간 인디케이터 — V3: iOS와 동일하게 8pt 원
                            if (isToday) {
                                val now = Calendar.getInstance()
                                val min = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
                                val y = (min.toFloat() / 60f) * HOUR_HEIGHT.toPx()
                                drawCircle(
                                    color = Color(0xFFEF4444),
                                    radius = 8f,
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
                    // 할일 블록 (좌측, long-press drag로 시간 변경 가능)
                    timedBlocks.filter { it.type == "todo" }.forEach { block ->
                        TimedBlockItem(
                            block = block,
                            dateStr = date,
                            isLeftAligned = true
                        )
                    }
                    // 이벤트 블록 (우측 오프셋, drag 불가)
                    timedBlocks.filter { it.type == "event" }.forEach { block ->
                        TimedBlockItem(
                            block = block,
                            dateStr = date,
                            isLeftAligned = false
                        )
                    }
                }
            }
        }
    }

    @Composable
    private fun AllDayChip(block: TimeBlock) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(6.dp))
                .background(block.color.copy(alpha = if (block.type == "event") 0.7f else 0.08f))
                .clickable {
                    if (block.type == "todo") onTodoPressCb?.invoke(block.id)
                }
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (block.type == "todo") {
                Text(
                    text = "언제든지",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = block.color.copy(alpha = 0.6f),
                )
                Spacer(modifier = Modifier.width(6.dp))
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .background(
                            if (block.completed) Color(0xFF9CA3AF) else block.color,
                            CircleShape
                        )
                )
                Spacer(modifier = Modifier.width(6.dp))
            }
            Text(
                text = block.title,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = if (block.type == "event") Color.White
                       else if (block.completed) Color(0xFF9CA3AF)
                       else Color(0xFF374151),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textDecoration = if (block.completed) TextDecoration.LineThrough else TextDecoration.None,
                modifier = Modifier.weight(1f)
            )
        }
    }

    @Composable
    private fun TimedBlockItem(
        block: TimeBlock,
        dateStr: String,
        isLeftAligned: Boolean
    ) {
        // F2: long-press + drag → 시간 변경 → onTodoEdit 발화 (todo 전용)
        var dragDeltaMinutes by remember(block.id, dateStr) { mutableIntStateOf(0) }
        var rawDragPx by remember(block.id, dateStr) { mutableFloatStateOf(0f) }
        val pxPerMin = with(LocalDensity.current) { HOUR_HEIGHT.toPx() / 60f }

        val baseTopMin = block.startMinutes
        val durationMin = (block.endMinutes - block.startMinutes).coerceAtLeast(20)

        val displayedStart = (baseTopMin + dragDeltaMinutes).coerceIn(0, 24 * 60 - durationMin)
        val topOffset = ((displayedStart.toFloat() / 60f) * HOUR_HEIGHT.value).dp
        val blockHeight = ((durationMin.toFloat() / 60f) * HOUR_HEIGHT.value).dp

        val horizontalPadding = if (isLeftAligned) {
            PaddingValues(start = 2.dp, end = 48.dp)
        } else {
            PaddingValues(start = 48.dp, end = 2.dp)
        }

        val dragModifier = if (block.type == "todo") {
            Modifier.pointerInput(block.id, dateStr, baseTopMin, durationMin) {
                detectDragGesturesAfterLongPress(
                    onDragStart = { rawDragPx = 0f; dragDeltaMinutes = 0 },
                    onDragEnd = {
                        val finalDelta = dragDeltaMinutes
                        if (finalDelta != 0) {
                            val newStart = (baseTopMin + finalDelta).coerceIn(0, 24 * 60 - durationMin)
                            val newEnd = (newStart + durationMin).coerceAtMost(24 * 60)
                            val startIso = minutesToIso(dateStr, newStart)
                            val endIso = minutesToIso(dateStr, newEnd)
                            onTodoEditCb?.invoke(block.id, startIso, endIso)
                        }
                        rawDragPx = 0f
                        dragDeltaMinutes = 0
                    },
                    onDragCancel = {
                        rawDragPx = 0f
                        dragDeltaMinutes = 0
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        rawDragPx += dragAmount.y
                        val rawMin = (rawDragPx / pxPerMin).toInt()
                        dragDeltaMinutes = (rawMin / 15) * 15
                    }
                )
            }
        } else Modifier

        Box(
            modifier = Modifier
                .offset(y = topOffset)
                .fillMaxWidth()
                .padding(horizontalPadding)
                .height(blockHeight.coerceAtLeast(24.dp))
                .clip(RoundedCornerShape(4.dp))
                .background(block.color.copy(alpha = if (dragDeltaMinutes != 0) 0.30f else 0.12f))
                .border(0.5.dp, block.color.copy(alpha = 0.25f), RoundedCornerShape(4.dp))
                .then(dragModifier)
                .clickable {
                    if (block.type == "todo") onTodoPressCb?.invoke(block.id)
                }
        ) {
            Row(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
                        .width(3.dp)
                        .fillMaxHeight()
                        .background(block.color)
                )
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(start = 6.dp, top = 3.dp, end = 4.dp)
                ) {
                    Text(
                        text = block.title,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = block.color,
                        maxLines = if (blockHeight < 40.dp) 1 else 3,
                        overflow = TextOverflow.Ellipsis,
                        textDecoration = if (block.completed) TextDecoration.LineThrough else TextDecoration.None
                    )
                }
            }
        }
    }

    /** "yyyy-MM-dd" + minutes → ISO8601 with KST offset (+09:00) */
    private fun minutesToIso(dateStr: String, minutes: Int): String {
        val safe = minutes.coerceIn(0, 24 * 60)
        val cal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Seoul"))
        try { cal.time = DATE_FMT.parse(dateStr)!! } catch (_: Exception) {}
        cal.set(Calendar.HOUR_OF_DAY, safe / 60)
        cal.set(Calendar.MINUTE, safe % 60)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return ISO_OUT_FMT.format(cal.time)
    }

    // ─── Helpers ───
    private fun parseBlocks(
        todoJson: String,
        eventJson: String,
        primary: Color
    ): Pair<List<TimeBlock>, List<TimeBlock>> {
        val allDay = mutableListOf<TimeBlock>()
        val timed = mutableListOf<TimeBlock>()

        // Todos (JSON array)
        try {
            val arr = JSONArray(todoJson)
            for (i in 0 until arr.length()) {
                val t = arr.getJSONObject(i)
                val startTime = t.optString("start_time", "")
                val endTime = t.optString("end_time", "")
                val startMin = parseTimeToMinutes(startTime)
                val endMin = if (endTime.isNotEmpty()) parseTimeToMinutes(endTime) else (startMin + 30).coerceAtMost(1440)
                val color = parseColor(t.optString("project_color", "").ifEmpty { "#6366F1" })

                val block = TimeBlock(
                    id = t.optString("id"),
                    title = t.optString("title"),
                    startMinutes = startMin,
                    endMinutes = endMin,
                    color = color,
                    completed = t.optBoolean("completed", false),
                    type = "todo"
                )

                if (startMin < 0) allDay.add(block) else timed.add(block)
            }
        } catch (_: Exception) {}

        // Events (JSON array)
        try {
            val arr = JSONArray(eventJson)
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
                val color = parseColor(e.optString("color", "#4285F4"))

                val block = TimeBlock(
                    id = e.optString("id"),
                    title = e.optString("title"),
                    startMinutes = startMin,
                    endMinutes = endMin,
                    color = color,
                    completed = false,
                    type = "event"
                )

                if (isAllDay || startMin < 0) allDay.add(block) else timed.add(block)
            }
        } catch (_: Exception) {}

        return Pair(allDay, timed)
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
            val tIdx = iso.indexOf('T')
            if (tIdx >= 0) {
                val timePart = iso.substring(tIdx + 1).take(5)
                val parts = timePart.split(":")
                parts[0].toInt() * 60 + parts[1].toInt()
            } else { 0 }
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
