/**
 * NativeMultiDayTimeGrid — Android Jetpack Compose 멀티데이 시간 그리드
 * 주간(7일)/3일 뷰를 네이티브 Compose로 구현
 *
 * 구조: 고정 시간 컬럼(좌측) + 가로 LazyRow(연속 스크롤)
 *  - LazyRow의 각 아이템은 1일 컬럼이며 [헤더(44dp) + 24h 그리드]를 모두 포함
 *  - 모든 컬럼이 동일한 verticalScrollState를 공유 → 세로 스크롤 동기화
 *  - 가로 스크롤 정착 시 onDateRangeChange 발화
 *  - TimeBlock long-press + drag → 시각 변경 → onTodoEdit 발화
 */
package com.daysteprn.calendar

import android.content.Context
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class NativeMultiDayTimeGridView(context: Context) : FrameLayout(context) {

    var onDateSelectCallback: ((String) -> Unit)? = null
    var onTodoPressCb: ((String) -> Unit)? = null
    var onDateRangeChangeCb: ((String, String) -> Unit)? = null
    var onHeightChangeCb: ((Double) -> Unit)? = null
    var onTodoEditCb: ((String, String, String, String?) -> Unit)? = null

    private var composeView = ComposeView(context)
    private var contentSet = false
    private var dayCount = mutableIntStateOf(3)
    private var centerDate = mutableStateOf(todayStr())
    private var primaryColorHex = mutableStateOf("#6366F1")
    private var todoDataJson = mutableStateOf("{}")
    private var eventDataJson = mutableStateOf("{}")

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!contentSet) {
            contentSet = true
            composeView = ComposeView(context)
            addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
            composeView.setContent {
                MultiDayTimeGridContent()
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

    fun setDayCount(count: Int) { dayCount.intValue = count }
    fun setCenterDate(date: String) { centerDate.value = date }
    fun setPrimaryColor(hex: String) { primaryColorHex.value = hex }
    fun setTodoData(json: String) { todoDataJson.value = json }
    fun setEventData(json: String) { eventDataJson.value = json }

    companion object {
        private val HOUR_HEIGHT = 50.dp
        private val TIME_COLUMN_WIDTH = 40.dp
        private val HEADER_HEIGHT = 44.dp                  // V1: iOS와 동일 44dp
        private val GRID_LINE_COLOR = Color(0xFFE5E7EB)    // V4: iOS와 동일
        private const val TOTAL_DAYS = 731                 // ±1년
        private const val CENTER_INDEX = TOTAL_DAYS / 2
        private val WEEKDAYS_KR = arrayOf("일", "월", "화", "수", "목", "금", "토")
        private val DATE_FMT = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        private val ISO_OUT_FMT = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("Asia/Seoul")
        }

        private fun todayStr(): String = DATE_FMT.format(Date())

        private fun parseDateOrToday(s: String): Date = try {
            DATE_FMT.parse(s) ?: Date()
        } catch (_: Exception) { Date() }

        private fun daysBetween(from: Date, to: Date): Int {
            val msPerDay = 24L * 60 * 60 * 1000
            val diff = to.time - from.time
            return Math.round(diff.toFloat() / msPerDay.toFloat())
        }

        private fun addDays(from: Date, n: Int): Date {
            val cal = Calendar.getInstance(); cal.time = from; cal.add(Calendar.DAY_OF_MONTH, n)
            return cal.time
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

        // 모든 LazyRow 아이템에서 공유할 세로 스크롤 상태
        val verticalScrollState = rememberScrollState()

        // 기준일: 컴포지션 진입 시점의 centerDate를 기준으로 ±TOTAL_DAYS/2 범위
        val baseDate = remember { addDays(parseDateOrToday(center), -CENTER_INDEX) }

        // centerDate prop → 인덱스 변환 (창의 첫 컬럼이 보이게 하려면 dayCount/2만큼 빼야 함)
        fun firstIndexFor(centerStr: String): Int {
            val centerD = parseDateOrToday(centerStr)
            val centerIdx = daysBetween(baseDate, centerD)
            return (centerIdx - days / 2).coerceIn(0, TOTAL_DAYS - days)
        }

        val initialFirst = remember(days) { firstIndexFor(center) }
        val horizontalState = rememberLazyListState(initialFirstVisibleItemIndex = initialFirst)

        // 외부 centerDate 변경 → 내부 스크롤 동기화 (사용자가 만들어낸 내부 상태와 일치하면 무시)
        var lastEmittedFirstIdx by remember { mutableIntStateOf(-1) }
        LaunchedEffect(center, days) {
            val target = firstIndexFor(center)
            if (target != horizontalState.firstVisibleItemIndex) {
                horizontalState.scrollToItem(target)
            }
        }

        // 가로 스크롤 정착 시 onDateRangeChange 발화
        LaunchedEffect(horizontalState, days) {
            snapshotFlow { horizontalState.isScrollInProgress to horizontalState.firstVisibleItemIndex }
                .distinctUntilChanged()
                .drop(1)
                .collect { (scrolling, firstIdx) ->
                    if (!scrolling && firstIdx != lastEmittedFirstIdx) {
                        lastEmittedFirstIdx = firstIdx
                        val startD = addDays(baseDate, firstIdx)
                        val endD = addDays(baseDate, firstIdx + days - 1)
                        onDateRangeChangeCb?.invoke(DATE_FMT.format(startD), DATE_FMT.format(endD))
                    }
                }
        }

        // 데이터 파싱은 가시 범위만 처리하면 좋지만, JSON이 이미 dateStr 키로 분리되어 있어 lazy 파싱
        Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
            BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
                val totalWidth = maxWidth
                val gridWidth = totalWidth - TIME_COLUMN_WIDTH
                val columnWidth = gridWidth / days

                // ─── 본체: 시간 컬럼 + 가로 LazyRow ───
                Row(modifier = Modifier.fillMaxSize()) {

                    // 좌측 시간 컬럼 (헤더 영역만큼 빈 공간 + 시간 라벨, 세로 스크롤 동기화)
                    Column(
                        modifier = Modifier
                            .width(TIME_COLUMN_WIDTH)
                            .fillMaxHeight()
                    ) {
                        Spacer(modifier = Modifier.height(HEADER_HEIGHT))
                        Box(modifier = Modifier.fillMaxWidth().height(0.5.dp).background(GRID_LINE_COLOR))
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
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
                                        text = String.format("%02d:00", h),  // V2: HH:mm
                                        fontSize = 10.sp,
                                        color = Color(0xFF9CA3AF),
                                        modifier = Modifier.padding(end = 4.dp)
                                    )
                                }
                            }
                        }
                    }

                    // 우측 LazyRow — 각 아이템이 [날짜 헤더 + 24h 그리드]를 모두 포함
                    LazyRow(
                        state = horizontalState,
                        modifier = Modifier.fillMaxHeight()
                    ) {
                        items(
                            count = TOTAL_DAYS,
                            key = { idx -> idx }
                        ) { idx ->
                            DayColumn(
                                dateStr = DATE_FMT.format(addDays(baseDate, idx)),
                                today = today,
                                primary = primary,
                                days = days,
                                columnWidth = columnWidth,
                                todoJson = todoJson,
                                eventJson = eventJson,
                                verticalScrollState = verticalScrollState
                            )
                        }
                    }
                }
            }
        }
    }

    @Composable
    private fun DayColumn(
        dateStr: String,
        today: String,
        primary: Color,
        days: Int,
        columnWidth: Dp,
        todoJson: String,
        eventJson: String,
        verticalScrollState: ScrollState
    ) {
        val cal = parseDateCal(dateStr)
        val dayOfWeek = WEEKDAYS_KR[cal.get(Calendar.DAY_OF_WEEK) - 1]
        val dayNum = cal.get(Calendar.DAY_OF_MONTH)
        val isToday = dateStr == today
        val isSunday = cal.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY
        val isSaturday = cal.get(Calendar.DAY_OF_WEEK) == Calendar.SATURDAY

        val blocks = remember(todoJson, eventJson, dateStr, primary) {
            parseDateBlocks(todoJson, eventJson, dateStr, primary)
        }

        Column(modifier = Modifier.width(columnWidth)) {
            // ─── 날짜 헤더 ───
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(HEADER_HEIGHT)
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
                    Spacer(modifier = Modifier.height(1.dp))
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .then(
                                if (isToday) Modifier.background(primary, CircleShape)
                                else Modifier
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = dayNum.toString(),
                            fontSize = if (days <= 3) 14.sp else 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isToday) Color.White else Color(0xFF1F2937)
                        )
                    }
                }
            }
            Box(modifier = Modifier.fillMaxWidth().height(0.5.dp).background(GRID_LINE_COLOR))

            // ─── 그리드 본문 (세로 스크롤은 시간 컬럼과 공유) ───
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(verticalScrollState)
                    .height(HOUR_HEIGHT * 24)
                    .drawBehind {
                        for (h in 0..24) {
                            val y = (HOUR_HEIGHT * h).toPx()
                            drawLine(
                                color = GRID_LINE_COLOR,
                                start = Offset(0f, y),
                                end = Offset(size.width, y),
                                strokeWidth = 0.5f
                            )
                        }
                        drawLine(
                            color = GRID_LINE_COLOR,
                            start = Offset(0f, 0f),
                            end = Offset(0f, size.height),
                            strokeWidth = 0.5f
                        )
                        if (isToday) {
                            val now = Calendar.getInstance()
                            val min = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
                            val y = (min.toFloat() / 60f) * HOUR_HEIGHT.toPx()
                            drawCircle(
                                color = Color(0xFFEF4444),
                                radius = 6f,
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
                blocks.forEach { block ->
                    if (block.startMinutes >= 0) {
                        TimeBlock(
                            block = block,
                            dateStr = dateStr,
                            compact = days > 3
                        )
                    }
                }
            }
        }
    }

    @Composable
    private fun TimeBlock(
        block: TimeBlockItem,
        dateStr: String,
        compact: Boolean
    ) {
        // F2: long-press + drag → 시간 변경 → onTodoEdit 발화 (todo 전용)
        var dragDeltaMinutes by remember(block.id, dateStr) { mutableIntStateOf(0) }
        var rawDragPx by remember(block.id, dateStr) { mutableFloatStateOf(0f) }
        val pxPerMin = with(LocalDensity.current) { HOUR_HEIGHT.toPx() / 60f }

        val baseTopMin = block.startMinutes
        val durationMin = (block.endMinutes - block.startMinutes).coerceAtLeast(20)

        val displayedStart = (baseTopMin + dragDeltaMinutes).coerceIn(0, 24 * 60 - durationMin)
        val topOffset = (displayedStart.toFloat() / 60f) * HOUR_HEIGHT.value
        val blockHeight = (durationMin.toFloat() / 60f) * HOUR_HEIGHT.value

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
                            onTodoEditCb?.invoke(block.id, startIso, endIso, dateStr)
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
                        // 15분 단위 스냅
                        dragDeltaMinutes = (rawMin / 15) * 15
                    }
                )
            }
        } else Modifier

        Box(
            modifier = Modifier
                .offset(y = topOffset.dp)
                .fillMaxWidth()
                .padding(horizontal = 1.dp)
                .height(blockHeight.dp.coerceAtLeast(24.dp))   // V5: 최소 24dp
                .clip(RoundedCornerShape(3.dp))
                .background(block.color.copy(alpha = if (dragDeltaMinutes != 0) 0.30f else 0.15f))
                .then(dragModifier)
                .clickable(enabled = block.type == "todo") {
                    onTodoPressCb?.invoke(block.id)
                }
        ) {
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
                maxLines = if (blockHeight < 30) 1 else 2,
                overflow = TextOverflow.Ellipsis,
                textDecoration = if (block.completed) TextDecoration.LineThrough else TextDecoration.None,
                modifier = Modifier.padding(start = 5.dp, top = 1.dp, end = 2.dp)
            )
        }
    }

    // ─── Helpers ───
    private fun parseDateCal(dateStr: String): Calendar {
        val cal = Calendar.getInstance()
        try { cal.time = DATE_FMT.parse(dateStr)!! } catch (_: Exception) {}
        return cal
    }

    /** 단일 날짜의 todo + event 블록 파싱 (lazy: 보이는 컬럼에서만 호출) */
    private fun parseDateBlocks(
        todoJson: String,
        eventJson: String,
        dateStr: String,
        primary: Color
    ): List<TimeBlockItem> {
        val out = mutableListOf<TimeBlockItem>()

        try {
            val obj = JSONObject(todoJson)
            if (obj.has(dateStr)) {
                val arr = obj.getJSONArray(dateStr)
                for (i in 0 until arr.length()) {
                    val t = arr.getJSONObject(i)
                    val startTime = t.optString("start_time", "")
                    val endTime = t.optString("end_time", "")
                    val startMin = parseTimeToMinutes(startTime)
                    val endMin = if (endTime.isNotEmpty()) parseTimeToMinutes(endTime) else (startMin + 30).coerceAtMost(1440)
                    out.add(
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

        try {
            val obj = JSONObject(eventJson)
            if (obj.has(dateStr)) {
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
                    out.add(
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

        return out
    }

    /** ISO8601 또는 "HH:mm" 입력 → KST 기준 0..1439 분(없으면 -1) */
    private fun parseTimeToMinutes(time: String): Int {
        if (time.isEmpty()) return -1
        // "HH:mm" 단순 형태 (시간대 없음 — 이미 KST 가정)
        if (time.length <= 5 && !time.contains('T')) {
            return try {
                val parts = time.split(":")
                parts[0].toInt() * 60 + parts.getOrElse(1) { "0" }.toInt()
            } catch (_: Exception) { -1 }
        }
        return parseIsoToKstMinutes(time, defaultIfFail = -1)
    }

    /** ISO8601 → KST 기준 0..1439 분. 실패 시 0 (이벤트 종일 폴백 등). */
    private fun parseIsoToMinutes(iso: String): Int {
        if (iso.isEmpty()) return 0
        return parseIsoToKstMinutes(iso, defaultIfFail = 0)
    }

    private fun parseIsoToKstMinutes(iso: String, defaultIfFail: Int): Int {
        val patterns = listOf(
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
        )
        for (pat in patterns) {
            try {
                val fmt = SimpleDateFormat(pat, Locale.US)
                if (pat.endsWith("'Z'")) fmt.timeZone = TimeZone.getTimeZone("UTC")
                val parsed = fmt.parse(iso) ?: continue
                val kstCal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Seoul"))
                kstCal.time = parsed
                return kstCal.get(Calendar.HOUR_OF_DAY) * 60 + kstCal.get(Calendar.MINUTE)
            } catch (_: Exception) {}
        }
        return defaultIfFail
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

    private fun parseColor(hex: String): Color {
        return try {
            Color(android.graphics.Color.parseColor(hex))
        } catch (_: Exception) {
            Color(0xFF6366F1)
        }
    }
}
