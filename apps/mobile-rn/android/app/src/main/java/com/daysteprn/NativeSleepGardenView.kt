/**
 * NativeSleepGardenView — Android Native (Jetpack Compose)
 * iOS NativeSleepGarden의 Android 동등 구현
 *
 * 4가지 뷰 모드: day, week, month, year
 * 수면 정원 시각화 (나무 아이콘 + 건강 상태 색상)
 */
package com.daysteprn

import android.widget.FrameLayout
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Park
import androidx.compose.material.icons.filled.Nightlight
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.facebook.react.uimanager.ThemedReactContext
import org.json.JSONObject
import java.time.LocalDate
import java.time.YearMonth
import java.time.DayOfWeek
import java.time.format.TextStyle as JavaTextStyle
import java.util.Locale

// ─── 데이터 모델 ────────────────────────────────

data class SleepSession(
    val durationMinutes: Int,
    val outcome: String,
    val isHealthy: Boolean,
)

data class SleepDay(
    val date: String,
    val sessions: List<SleepSession>,
)

// ─── View ────────────────────────────────────────

class NativeSleepGardenView(context: ThemedReactContext) : FrameLayout(context) {

    private var composeView = ComposeView(context)

    // Props
    private var viewModeState = mutableStateOf("month")
    private var selectedDateState = mutableStateOf(LocalDate.now().toString())
    private var primaryColorHex = mutableStateOf("#6366F1")
    private var gardenDays = mutableStateOf<Map<String, List<SleepSession>>>(emptyMap())
    private var goalMinutesState = mutableIntStateOf(480)
    private var streakState = mutableIntStateOf(0)
    private var displayMonth = mutableStateOf(YearMonth.now())

    // Callbacks
    var onDateSelectCallback: ((String) -> Unit)? = null
    var onHeightChangeCallback: ((Double) -> Unit)? = null
    var onViewModeChangeCallback: ((String) -> Unit)? = null
    var onMonthChangeCallback: ((Int, Int) -> Unit)? = null

    private var contentSet = false

    init {
        // ComposeView는 onAttachedToWindow에서 추가 (window recomposer 필요)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!contentSet) {
            contentSet = true
            composeView = ComposeView(context)
            addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
            composeView.setContent {
                SleepGardenContent()
            }
            composeView.viewTreeObserver.addOnGlobalLayoutListener {
                post { requestLayout() }
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
            // UNSPECIFIED로 측정하여 ComposeView가 자연 높이를 사용하도록 허용
            measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED),
            )
            layout(left, top, right, top + measuredHeight)
        }
    }

    // ─── Setters ───

    fun setViewMode(mode: String) { viewModeState.value = mode }
    fun setSelectedDate(date: String) { selectedDateState.value = date }
    fun setPrimaryColor(color: String) { primaryColorHex.value = color }
    fun setGoalMinutes(mins: Int) { goalMinutesState.intValue = mins }
    fun setStreak(s: Int) { streakState.intValue = s }

    fun setGardenData(json: String) {
        try {
            val obj = JSONObject(json)
            val daysArr = obj.getJSONArray("days")
            val map = mutableMapOf<String, List<SleepSession>>()
            for (i in 0 until daysArr.length()) {
                val dayObj = daysArr.getJSONObject(i)
                val date = dayObj.getString("date")
                val sessionsArr = dayObj.getJSONArray("sessions")
                val sessions = mutableListOf<SleepSession>()
                for (j in 0 until sessionsArr.length()) {
                    val s = sessionsArr.getJSONObject(j)
                    sessions.add(SleepSession(
                        durationMinutes = s.optInt("durationMinutes", 0),
                        outcome = s.optString("outcome", "completed"),
                        isHealthy = s.optBoolean("isHealthy", false),
                    ))
                }
                map[date] = sessions
            }
            gardenDays.value = map
        } catch (_: Exception) { }
    }

    // ─── 나무 성장 단계 (iOS TreeCanvasView 동등) ───
    // 0 = seed, 1 = sprout, 2 = small tree, 3 = big tree, -1 = wilted

    private fun growthLevel(sessions: List<SleepSession>): Int {
        if (sessions.isEmpty()) return -2 // no data
        val completed = sessions.filter { it.outcome == "completed" }
        if (completed.isEmpty()) return -1 // wilted (abandoned only)
        val totalMins = completed.sumOf { it.durationMinutes }
        val hours = totalMins / 60.0
        return when {
            hours >= 7 -> 3  // big tree
            hours >= 5 -> 2  // small tree
            hours >= 2 -> 1  // sprout
            else -> 0        // seed
        }
    }

    private fun treeColor(level: Int): Color = when (level) {
        3 -> Color(0xFF22C55E)   // big tree - bright green
        2 -> Color(0xFF16A34A)   // small tree - dark green
        1 -> Color(0xFF84CC16)   // sprout - lime
        0 -> Color(0xFFFCD34D)   // seed - yellow
        -1 -> Color(0xFF9CA3AF)  // wilted - gray
        else -> Color(0xFFF3F4F6) // no data
    }

    // ─── Compose UI ───

    @Composable
    private fun SleepGardenContent() {
        val primaryColor = parseColor(primaryColorHex.value)
        val density = LocalDensity.current
        val viewMode = viewModeState.value
        val selectedDate = selectedDateState.value
        val days = gardenDays.value
        val goalMins = goalMinutesState.intValue
        val streak = streakState.intValue
        val month = displayMonth.value

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color.White)
                .onGloballyPositioned { coords ->
                    val heightDp = with(density) { coords.size.height.toDp().value.toDouble() }
                    onHeightChangeCallback?.invoke(heightDp)
                }
                .padding(vertical = 12.dp)
        ) {
            // 뷰 모드 선택 탭
            ViewModeTabs(viewMode, primaryColor)

            Spacer(modifier = Modifier.height(12.dp))

            when (viewMode) {
                "day" -> DayView(selectedDate, days, goalMins, primaryColor)
                "week" -> WeekView(selectedDate, days, goalMins, primaryColor)
                "month" -> MonthView(month, days, goalMins, primaryColor, selectedDate)
                "year" -> YearView(days, goalMins, primaryColor)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 레전드 (iOS와 동일)
            LegendView()

            Spacer(modifier = Modifier.height(8.dp))
        }
    }

    @Composable
    private fun ViewModeTabs(current: String, primaryColor: Color) {
        val modes = listOf("day" to "일", "week" to "주", "month" to "월", "year" to "년")

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Color(0xFFF3F4F6)),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            modes.forEach { (mode, label) ->
                val isSelected = mode == current
                val bg by animateColorAsState(
                    if (isSelected) primaryColor else Color.Transparent,
                    animationSpec = tween(200), label = "tabBg"
                )
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .padding(3.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(bg)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { onViewModeChangeCallback?.invoke(mode) }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = label,
                        fontSize = 14.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) Color.White else Color(0xFF6B7280),
                    )
                }
            }
        }
    }

    // ─── 레전드 ───

    @Composable
    private fun LegendView() {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            LegendItem(Color(0xFF22C55E), "7h+")
            LegendItem(Color(0xFF16A34A), "5-7h")
            LegendItem(Color(0xFF84CC16), "2-5h")
            LegendItem(Color(0xFFFCD34D), "~2h")
            LegendItem(Color(0xFF9CA3AF), "포기")
            LegendItem(Color(0xFFF3F4F6), "없음")
        }
    }

    @Composable
    private fun LegendItem(color: Color, label: String) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            MiniTreeIcon(color = color, size = 10f)
            Spacer(modifier = Modifier.width(3.dp))
            Text(text = label, fontSize = 10.sp, color = Color(0xFF9CA3AF))
        }
    }

    @Composable
    private fun MiniTreeIcon(color: Color, size: Float) {
        Canvas(modifier = Modifier.size(size.dp)) {
            // 나무 줄기
            drawRect(
                color = Color(0xFF92400E),
                topLeft = Offset(this.size.width * 0.4f, this.size.height * 0.6f),
                size = Size(this.size.width * 0.2f, this.size.height * 0.4f),
            )
            // 나무 크라운 (원)
            drawCircle(
                color = color,
                radius = this.size.width * 0.4f,
                center = Offset(this.size.width * 0.5f, this.size.height * 0.4f),
            )
        }
    }

    // ─── Day View ───

    @Composable
    private fun DayView(
        selectedDate: String,
        days: Map<String, List<SleepSession>>,
        goalMins: Int,
        primaryColor: Color,
    ) {
        val date = try { LocalDate.parse(selectedDate) } catch (_: Exception) { LocalDate.now() }
        val sessions = days[selectedDate] ?: emptyList()
        val completed = sessions.filter { it.outcome == "completed" }
        val totalMins = completed.sumOf { it.durationMinutes }

        // 날짜 헤더
        val dayOfWeek = date.dayOfWeek.getDisplayName(JavaTextStyle.FULL, Locale.KOREAN)
        val dateLabel = "${date.monthValue}월 ${date.dayOfMonth}일 $dayOfWeek"

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = dateLabel,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1F2937),
            )

            Spacer(modifier = Modifier.height(20.dp))

            if (sessions.isEmpty()) {
                // 빈 상태
                Icon(
                    imageVector = Icons.Default.Nightlight,
                    contentDescription = "no data",
                    tint = Color(0xFFD1D5DB),
                    modifier = Modifier.size(48.dp),
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "아직 수면 기록이 없습니다",
                    fontSize = 14.sp,
                    color = Color(0xFF9CA3AF),
                )
            } else {
                // 나무 아이콘 행
                Row(
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    sessions.forEach { session ->
                        val level = if (session.outcome == "completed") {
                            when {
                                session.durationMinutes >= 420 -> 3
                                session.durationMinutes >= 300 -> 2
                                session.durationMinutes >= 120 -> 1
                                else -> 0
                            }
                        } else -1

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(horizontal = 8.dp),
                        ) {
                            TreeCanvas(level = level, size = 48f)
                            Spacer(modifier = Modifier.height(4.dp))
                            val h = session.durationMinutes / 60
                            val m = session.durationMinutes % 60
                            Text(
                                text = if (h > 0) "${h}h ${m}m" else "${m}m",
                                fontSize = 11.sp,
                                color = Color(0xFF6B7280),
                            )
                            if (session.outcome != "completed") {
                                Text(
                                    text = "포기",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFFEF4444),
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // 총 수면 시간
                if (totalMins > 0) {
                    Text(
                        text = "총 ${totalMins / 60}시간 ${totalMins % 60}분",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF374151),
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    // ─── 나무 Canvas (iOS TreeCanvasView 동등) ───

    @Composable
    private fun TreeCanvas(level: Int, size: Float) {
        val crownColor = treeColor(level)
        val trunkColor = if (level <= 1) Color(0xFFD97706) else Color(0xFF92400E)

        Canvas(modifier = Modifier.size(size.dp)) {
            val w = this.size.width
            val h = this.size.height

            when (level) {
                -1 -> drawWiltedTree(w, h, crownColor, trunkColor)
                0 -> drawSeed(w, h, crownColor)
                1 -> drawSprout(w, h, crownColor, trunkColor)
                2 -> drawSmallTree(w, h, crownColor, trunkColor)
                3 -> drawBigTree(w, h, crownColor, trunkColor)
                else -> {
                    // no data: gray circle
                    drawCircle(Color(0xFFF3F4F6), radius = w * 0.3f, center = Offset(w / 2, h / 2))
                }
            }
        }
    }

    private fun DrawScope.drawSeed(w: Float, h: Float, color: Color) {
        // 작은 씨앗 타원
        drawOval(color, topLeft = Offset(w * 0.3f, h * 0.65f), size = Size(w * 0.4f, h * 0.25f))
        // 작은 싹
        drawLine(Color(0xFF84CC16), Offset(w * 0.5f, h * 0.65f), Offset(w * 0.5f, h * 0.5f), strokeWidth = 2f)
    }

    private fun DrawScope.drawSprout(w: Float, h: Float, color: Color, trunk: Color) {
        // 줄기
        drawLine(trunk, Offset(w * 0.5f, h * 0.9f), Offset(w * 0.5f, h * 0.45f), strokeWidth = 3f)
        // 잎 3개
        drawCircle(color, radius = w * 0.12f, center = Offset(w * 0.35f, h * 0.45f))
        drawCircle(color, radius = w * 0.14f, center = Offset(w * 0.5f, h * 0.35f))
        drawCircle(color, radius = w * 0.12f, center = Offset(w * 0.65f, h * 0.45f))
    }

    private fun DrawScope.drawSmallTree(w: Float, h: Float, color: Color, trunk: Color) {
        // 줄기
        drawRect(trunk, topLeft = Offset(w * 0.42f, h * 0.55f), size = Size(w * 0.16f, h * 0.4f))
        // 크라운 (원)
        drawCircle(color, radius = w * 0.3f, center = Offset(w * 0.5f, h * 0.38f))
        // 하이라이트
        drawCircle(Color.White.copy(alpha = 0.3f), radius = w * 0.12f, center = Offset(w * 0.42f, h * 0.3f))
    }

    private fun DrawScope.drawBigTree(w: Float, h: Float, color: Color, trunk: Color) {
        // 줄기
        drawRect(trunk, topLeft = Offset(w * 0.4f, h * 0.5f), size = Size(w * 0.2f, h * 0.45f))
        // 가지 (좌/우)
        drawLine(trunk, Offset(w * 0.45f, h * 0.6f), Offset(w * 0.25f, h * 0.5f), strokeWidth = 3f)
        drawLine(trunk, Offset(w * 0.55f, h * 0.6f), Offset(w * 0.75f, h * 0.5f), strokeWidth = 3f)
        // 크라운 3중
        drawCircle(color, radius = w * 0.28f, center = Offset(w * 0.3f, h * 0.35f))
        drawCircle(color, radius = w * 0.32f, center = Offset(w * 0.5f, h * 0.25f))
        drawCircle(color, radius = w * 0.28f, center = Offset(w * 0.7f, h * 0.35f))
        // 하이라이트
        drawCircle(Color.White.copy(alpha = 0.3f), radius = w * 0.1f, center = Offset(w * 0.4f, h * 0.2f))
    }

    private fun DrawScope.drawWiltedTree(w: Float, h: Float, color: Color, trunk: Color) {
        // 기울어진 줄기
        drawLine(color = Color(0xFF9CA3AF), start = Offset(w * 0.5f, h * 0.9f), end = Offset(w * 0.45f, h * 0.45f), strokeWidth = 3f)
        // 시든 크라운
        drawCircle(color, radius = w * 0.25f, center = Offset(w * 0.42f, h * 0.38f))
        // 떨어진 잎
        drawCircle(Color(0xFFD1D5DB), radius = w * 0.06f, center = Offset(w * 0.7f, h * 0.8f))
    }

    // ─── Week View ───

    @Composable
    private fun WeekView(
        selectedDate: String,
        days: Map<String, List<SleepSession>>,
        goalMins: Int,
        primaryColor: Color,
    ) {
        val date = try { LocalDate.parse(selectedDate) } catch (_: Exception) { LocalDate.now() }
        // 일요일 시작 주
        val dayOfWeekVal = date.dayOfWeek.value % 7 // 0=Sun, 1=Mon, ..., 6=Sat
        val weekStart = date.minusDays(dayOfWeekVal.toLong())
        val dayLabels = listOf("일", "월", "화", "수", "목", "금", "토")
        val today = LocalDate.now()

        // 주 범위 텍스트
        val weekEnd = weekStart.plusDays(6)
        val rangeText = "${weekStart.monthValue}/${weekStart.dayOfMonth} - ${weekEnd.monthValue}/${weekEnd.dayOfMonth}"

        Column(modifier = Modifier.fillMaxWidth()) {
            // 주 네비게이션
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Icon(
                    imageVector = Icons.Default.ChevronLeft,
                    contentDescription = "이전 주",
                    tint = Color(0xFF6B7280),
                    modifier = Modifier.size(28.dp).clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) {
                        val prev = date.minusDays(7)
                        onDateSelectCallback?.invoke(prev.toString())
                    },
                )
                Text(
                    text = rangeText,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1F2937),
                )
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = "다음 주",
                    tint = Color(0xFF6B7280),
                    modifier = Modifier.size(28.dp).clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) {
                        val next = date.plusDays(7)
                        onDateSelectCallback?.invoke(next.toString())
                    },
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                for (i in 0..6) {
                    val d = weekStart.plusDays(i.toLong())
                    val dateStr = d.toString()
                    val sessions = days[dateStr] ?: emptyList()
                    val level = growthLevel(sessions)
                    val isToday = d == today
                    val isSelected = dateStr == selectedDate
                    val totalMins = sessions.filter { it.outcome == "completed" }.sumOf { it.durationMinutes }
                    val totalH = if (totalMins > 0) "${totalMins / 60}h" else "-"

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                when {
                                    isSelected -> primaryColor.copy(alpha = 0.1f)
                                    isToday -> Color(0xFFF0F9FF)
                                    else -> Color.Transparent
                                }
                            )
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                            ) { onDateSelectCallback?.invoke(dateStr) }
                            .padding(vertical = 6.dp, horizontal = 2.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            text = dayLabels[i],
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = when (i) {
                                0 -> Color(0xFFEF4444) // 일: 빨강
                                6 -> Color(0xFF3B82F6) // 토: 파랑
                                else -> Color(0xFF9CA3AF)
                            },
                        )
                        Spacer(modifier = Modifier.height(4.dp))

                        // 날짜 원
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .then(
                                    if (isToday) Modifier.background(primaryColor, CircleShape)
                                    else Modifier
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "${d.dayOfMonth}",
                                fontSize = 11.sp,
                                fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal,
                                color = if (isToday) Color.White else Color(0xFF6B7280),
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // 나무 아이콘
                        TreeCanvas(level = level, size = 24f)

                        Spacer(modifier = Modifier.height(2.dp))

                        Text(
                            text = totalH,
                            fontSize = 10.sp,
                            color = Color(0xFF9CA3AF),
                        )
                    }
                }
            }
        }
    }

    // ─── Month View (Grid) ───

    @Composable
    private fun MonthView(
        month: YearMonth,
        days: Map<String, List<SleepSession>>,
        goalMins: Int,
        primaryColor: Color,
        selectedDate: String,
    ) {
        val dayLabels = listOf("일", "월", "화", "수", "목", "금", "토")
        val firstDay = month.atDay(1)
        val firstDayOfWeek = firstDay.dayOfWeek.value % 7 // 0=Sun
        val daysInMonth = month.lengthOfMonth()
        val today = LocalDate.now()

        Column(modifier = Modifier.fillMaxWidth()) {
            // 월 네비게이션
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Default.ChevronLeft,
                    contentDescription = "이전 월",
                    tint = Color(0xFF6B7280),
                    modifier = Modifier
                        .size(28.dp)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) {
                            val prev = month.minusMonths(1)
                            displayMonth.value = prev
                            onMonthChangeCallback?.invoke(prev.year, prev.monthValue)
                        },
                )
                Text(
                    text = "${month.year}년 ${month.monthValue}월",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1F2937),
                )
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = "다음 월",
                    tint = Color(0xFF6B7280),
                    modifier = Modifier
                        .size(28.dp)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) {
                            val next = month.plusMonths(1)
                            displayMonth.value = next
                            onMonthChangeCallback?.invoke(next.year, next.monthValue)
                        },
                )

                Spacer(modifier = Modifier.weight(1f))

                // "오늘" 버튼 (iOS 동등)
                Text(
                    text = "오늘",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = primaryColor,
                    modifier = Modifier
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) {
                            val todayYM = YearMonth.from(today)
                            displayMonth.value = todayYM
                            onDateSelectCallback?.invoke(today.toString())
                            onMonthChangeCallback?.invoke(todayYM.year, todayYM.monthValue)
                        }
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 요일 헤더
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                dayLabels.forEachIndexed { index, label ->
                    Text(
                        text = label,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = when (index) {
                            0 -> Color(0xFFEF4444)
                            6 -> Color(0xFF3B82F6)
                            else -> Color(0xFF9CA3AF)
                        },
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 월 그리드
            val totalCells = firstDayOfWeek + daysInMonth
            val rows = (totalCells + 6) / 7

            for (row in 0 until rows) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    for (col in 0..6) {
                        val cellIndex = row * 7 + col
                        val dayNum = cellIndex - firstDayOfWeek + 1
                        if (dayNum in 1..daysInMonth) {
                            val d = month.atDay(dayNum)
                            val dateStr = d.toString()
                            val sessions = days[dateStr] ?: emptyList()
                            val level = growthLevel(sessions)
                            val isToday = d == today
                            val isSelected = dateStr == selectedDate

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(0.85f)
                                    .padding(1.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(
                                        when {
                                            isSelected -> primaryColor.copy(alpha = 0.1f)
                                            else -> Color.Transparent
                                        }
                                    )
                                    .clickable(
                                        interactionSource = remember { MutableInteractionSource() },
                                        indication = null,
                                    ) {
                                        onDateSelectCallback?.invoke(dateStr)
                                        onViewModeChangeCallback?.invoke("day")
                                    },
                                contentAlignment = Alignment.Center,
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    // 나무 아이콘
                                    TreeCanvas(level = level, size = 14f)

                                    Spacer(modifier = Modifier.height(1.dp))

                                    // 날짜 숫자
                                    Box(
                                        modifier = Modifier
                                            .size(20.dp)
                                            .then(
                                                if (isToday) Modifier.background(primaryColor, CircleShape)
                                                else Modifier
                                            ),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            text = "$dayNum",
                                            fontSize = 10.sp,
                                            fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal,
                                            color = when {
                                                isToday -> Color.White
                                                isSelected -> primaryColor
                                                else -> Color(0xFF6B7280)
                                            },
                                        )
                                    }
                                }
                            }
                        } else {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }

    // ─── Year View (12 months mini heatmap) ───

    @Composable
    private fun YearView(
        days: Map<String, List<SleepSession>>,
        goalMins: Int,
        primaryColor: Color,
    ) {
        val year = LocalDate.now().year
        val today = LocalDate.now()

        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
        ) {
            Text(
                text = "${year}년",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1F2937),
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            )
            Spacer(modifier = Modifier.height(8.dp))

            // 4×3 그리드
            for (row in 0..3) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    for (col in 0..2) {
                        val m = row * 3 + col + 1
                        val ym = YearMonth.of(year, m)
                        val daysInMonth = ym.lengthOfMonth()

                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .padding(4.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFFF9FAFB))
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null,
                                ) {
                                    displayMonth.value = ym
                                    onViewModeChangeCallback?.invoke("month")
                                    onMonthChangeCallback?.invoke(ym.year, ym.monthValue)
                                }
                                .padding(8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                text = "${m}월",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF374151),
                            )
                            Spacer(modifier = Modifier.height(4.dp))

                            // 미니 히트맵 (7열 격자)
                            MiniHeatmap(ym, days, primaryColor, today)
                        }
                    }
                }
            }
        }
    }

    @Composable
    private fun MiniHeatmap(
        ym: YearMonth,
        days: Map<String, List<SleepSession>>,
        primaryColor: Color,
        today: LocalDate,
    ) {
        val daysInMonth = ym.lengthOfMonth()
        val firstDayOfWeek = ym.atDay(1).dayOfWeek.value % 7 // 0=Sun
        val totalCells = firstDayOfWeek + daysInMonth
        val rows = (totalCells + 6) / 7

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height((rows * 8).dp)
        ) {
            val cellW = size.width / 7f
            val cellH = size.height / rows.toFloat()
            val dotSize = minOf(cellW, cellH) * 0.7f

            for (dayNum in 1..daysInMonth) {
                val cellIndex = firstDayOfWeek + dayNum - 1
                val col = cellIndex % 7
                val row = cellIndex / 7
                val cx = col * cellW + cellW / 2
                val cy = row * cellH + cellH / 2

                val d = ym.atDay(dayNum)
                val dateStr = d.toString()
                val sessions = days[dateStr] ?: emptyList()
                val isToday = d == today

                val color = when {
                    isToday -> primaryColor
                    sessions.any { it.isHealthy } -> Color(0xFF22C55E)
                    sessions.isNotEmpty() -> Color(0xFFD1D5DB)
                    else -> Color(0xFFF3F4F6)
                }

                drawCircle(color = color, radius = dotSize / 2, center = Offset(cx, cy))
            }
        }
    }

    // ─── Helpers ───

    private fun parseColor(hex: String): Color {
        return try {
            val clean = hex.removePrefix("#")
            Color(android.graphics.Color.parseColor("#$clean"))
        } catch (_: Exception) {
            Color(0xFF6366F1)
        }
    }
}
