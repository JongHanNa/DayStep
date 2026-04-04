/**
 * NativeSleepGardenView — Android Native (Jetpack Compose)
 * iOS NativeSleepGarden의 Android 동등 구현
 *
 * 4가지 뷰 모드: day, week, month, year
 * 수면 정원 시각화 (나무 아이콘 + 건강 상태 색상)
 */
package com.daysteprn

import android.view.View
import android.widget.FrameLayout
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Park
import androidx.compose.material.icons.filled.Nightlight
import androidx.compose.material.icons.filled.LocalFireDepartment
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
import androidx.compose.ui.graphics.Color
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
import java.time.format.DateTimeFormatter
import java.time.DayOfWeek
import java.time.temporal.WeekFields

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

    private val composeView = ComposeView(context)

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

    init {
        composeView.setContent {
            SleepGardenContent()
        }
        addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))

        composeView.viewTreeObserver.addOnGlobalLayoutListener {
            post { requestLayout() }
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        requestLayout()
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
                .onGloballyPositioned { coords ->
                    val heightDp = with(density) { coords.size.height.toDp().value.toDouble() }
                    onHeightChangeCallback?.invoke(heightDp)
                }
        ) {
            // 뷰 모드 선택 탭
            ViewModeTabs(viewMode, primaryColor)

            Spacer(modifier = Modifier.height(12.dp))

            // 스트릭 표시
            if (streak > 0) {
                StreakBadge(streak, primaryColor)
                Spacer(modifier = Modifier.height(12.dp))
            }

            when (viewMode) {
                "day" -> DayView(selectedDate, days, goalMins, primaryColor)
                "week" -> WeekView(selectedDate, days, goalMins, primaryColor)
                "month" -> MonthView(month, days, goalMins, primaryColor, selectedDate)
                "year" -> YearView(days, goalMins, primaryColor)
            }
        }
    }

    @Composable
    private fun ViewModeTabs(current: String, primaryColor: Color) {
        val modes = listOf("day" to "일", "week" to "주", "month" to "월", "year" to "년")

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
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
                        .padding(horizontal = 4.dp)
                        .clip(RoundedCornerShape(10.dp))
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
                        color = if (isSelected) Color.White else Color(0xFF9CA3AF),
                    )
                }
            }
        }
    }

    @Composable
    private fun StreakBadge(streak: Int, primaryColor: Color) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(
                imageVector = Icons.Default.LocalFireDepartment,
                contentDescription = "streak",
                tint = Color(0xFFEF4444),
                modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "${streak}일 연속 달성",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF374151),
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
        val sessions = days[selectedDate] ?: emptyList()
        val totalMins = sessions.sumOf { it.durationMinutes }
        val hasHealthy = sessions.any { it.isHealthy }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // 나무 아이콘 (크게)
            Icon(
                imageVector = Icons.Default.Park,
                contentDescription = "tree",
                tint = if (hasHealthy) primaryColor else Color(0xFFD1D5DB),
                modifier = Modifier.size(64.dp),
            )
            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = if (totalMins > 0) "${totalMins / 60}시간 ${totalMins % 60}분" else "기록 없음",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = if (totalMins > 0) Color(0xFF1F2937) else Color(0xFF9CA3AF),
            )

            if (totalMins > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                val percent = (totalMins.toFloat() / goalMins * 100).toInt().coerceAtMost(100)
                Text(
                    text = "목표 대비 ${percent}%",
                    fontSize = 13.sp,
                    color = Color(0xFF6B7280),
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 세션 목록
            sessions.forEachIndexed { idx, session ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFF8FAFC))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Default.Nightlight,
                        contentDescription = "session",
                        tint = if (session.isHealthy) primaryColor else Color(0xFFD1D5DB),
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "세션 ${idx + 1}: ${session.durationMinutes}분",
                        fontSize = 14.sp,
                        color = Color(0xFF374151),
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = if (session.outcome == "completed") "완료" else "포기",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (session.outcome == "completed") primaryColor else Color(0xFFEF4444),
                    )
                }
                if (idx < sessions.size - 1) Spacer(modifier = Modifier.height(8.dp))
            }
        }
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
        val weekStart = date.with(WeekFields.of(DayOfWeek.MONDAY, 1).dayOfWeek(), 1)
        val dayLabels = listOf("월", "화", "수", "목", "금", "토", "일")

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            for (i in 0..6) {
                val d = weekStart.plusDays(i.toLong())
                val dateStr = d.toString()
                val sessions = days[dateStr] ?: emptyList()
                val hasHealthy = sessions.any { it.isHealthy }
                val hasSessions = sessions.isNotEmpty()
                val isSelected = dateStr == selectedDate

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (isSelected) primaryColor.copy(alpha = 0.1f) else Color.Transparent)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { onDateSelectCallback?.invoke(dateStr) }
                        .padding(vertical = 8.dp, horizontal = 2.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = dayLabels[i],
                        fontSize = 11.sp,
                        color = Color(0xFF9CA3AF),
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Icon(
                        imageVector = Icons.Default.Park,
                        contentDescription = "tree",
                        tint = when {
                            hasHealthy -> primaryColor
                            hasSessions -> Color(0xFFFBBF24)
                            else -> Color(0xFFE5E7EB)
                        },
                        modifier = Modifier.size(28.dp),
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${d.dayOfMonth}",
                        fontSize = 12.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) primaryColor else Color(0xFF6B7280),
                    )
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
        val dayLabels = listOf("월", "화", "수", "목", "금", "토", "일")
        val firstDay = month.atDay(1)
        val firstDayOfWeek = (firstDay.dayOfWeek.value - 1) // 0=Mon
        val daysInMonth = month.lengthOfMonth()

        Column(modifier = Modifier.fillMaxWidth()) {
            // 월 네비게이션
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
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
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 요일 헤더
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                dayLabels.forEach {
                    Text(
                        text = it,
                        fontSize = 11.sp,
                        color = Color(0xFF9CA3AF),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 월 그리드 (최대 6주 × 7일 = 42 셀)
            val totalCells = firstDayOfWeek + daysInMonth
            val rows = (totalCells + 6) / 7

            for (row in 0 until rows) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    for (col in 0..6) {
                        val cellIndex = row * 7 + col
                        val dayNum = cellIndex - firstDayOfWeek + 1
                        if (dayNum in 1..daysInMonth) {
                            val d = month.atDay(dayNum)
                            val dateStr = d.toString()
                            val sessions = days[dateStr] ?: emptyList()
                            val hasHealthy = sessions.any { it.isHealthy }
                            val hasSessions = sessions.isNotEmpty()
                            val isSelected = dateStr == selectedDate

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .padding(2.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        if (isSelected) primaryColor.copy(alpha = 0.1f)
                                        else Color.Transparent
                                    )
                                    .clickable(
                                        interactionSource = remember { MutableInteractionSource() },
                                        indication = null,
                                    ) { onDateSelectCallback?.invoke(dateStr) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        imageVector = Icons.Default.Park,
                                        contentDescription = null,
                                        tint = when {
                                            hasHealthy -> primaryColor
                                            hasSessions -> Color(0xFFFBBF24)
                                            else -> Color(0xFFF3F4F6)
                                        },
                                        modifier = Modifier.size(16.dp),
                                    )
                                    Text(
                                        text = "$dayNum",
                                        fontSize = 10.sp,
                                        color = if (isSelected) primaryColor else Color(0xFF9CA3AF),
                                    )
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

    // ─── Year View (12 months mini) ───

    @Composable
    private fun YearView(
        days: Map<String, List<SleepSession>>,
        goalMins: Int,
        primaryColor: Color,
    ) {
        val year = LocalDate.now().year

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
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
                        var healthyCount = 0
                        for (d in 1..daysInMonth) {
                            val dateStr = ym.atDay(d).toString()
                            val sessions = days[dateStr] ?: emptyList()
                            if (sessions.any { it.isHealthy }) healthyCount++
                        }
                        val ratio = if (daysInMonth > 0) healthyCount.toFloat() / daysInMonth else 0f

                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .padding(4.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFFF8FAFC))
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null,
                                ) {
                                    displayMonth.value = ym
                                    onViewModeChangeCallback?.invoke("month")
                                    onMonthChangeCallback?.invoke(ym.year, ym.monthValue)
                                }
                                .padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                text = "${m}월",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF374151),
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Icon(
                                imageVector = Icons.Default.Park,
                                contentDescription = null,
                                tint = when {
                                    ratio > 0.6f -> primaryColor
                                    ratio > 0.3f -> Color(0xFFFBBF24)
                                    ratio > 0f -> Color(0xFFFDE68A)
                                    else -> Color(0xFFE5E7EB)
                                },
                                modifier = Modifier.size(24.dp),
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "${healthyCount}일",
                                fontSize = 11.sp,
                                color = Color(0xFF9CA3AF),
                            )
                        }
                    }
                }
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
