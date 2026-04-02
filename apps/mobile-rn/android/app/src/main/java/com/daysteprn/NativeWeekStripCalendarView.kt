/**
 * NativeWeekStripCalendarView — Android Native (Jetpack Compose)
 * iOS NativeWeekStripCalendar의 Android 동등 구현
 *
 * 디자인:
 *   - 주간 스트립: 월~일 7일 가로 배치, 선택 날짜 pill 표시
 *   - 월 레이블 + "오늘" 버튼 헤더
 *   - 좌우 스와이프로 주 이동
 *   - 한국어 요일 표시
 */
package com.daysteprn

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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
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
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoField
import java.time.temporal.WeekFields
import java.util.Locale

class NativeWeekStripCalendarView(context: ThemedReactContext) : FrameLayout(context) {

    private val composeView = ComposeView(context)

    // Props from RN
    private var selectedDateStr = mutableStateOf(LocalDate.now().toString())
    private var primaryColorHex = mutableStateOf("#6366F1")

    // Callbacks
    var onDateSelectCallback: ((String) -> Unit)? = null
    var onHeightChangeCallback: ((Double) -> Unit)? = null
    var onExpandChangeCallback: ((Boolean) -> Unit)? = null

    init {
        composeView.setContent {
            WeekStripCalendarContent()
        }
        addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        requestLayout()
    }

    fun setSelectedDate(date: String) {
        selectedDateStr.value = date
    }

    fun setPrimaryColor(color: String) {
        primaryColorHex.value = color
    }

    // ─── Compose UI ───

    @Composable
    private fun WeekStripCalendarContent() {
        val selectedDate = try {
            LocalDate.parse(selectedDateStr.value)
        } catch (_: Exception) {
            LocalDate.now()
        }
        val primaryColor = parseColor(primaryColorHex.value)
        val today = LocalDate.now()
        val density = LocalDensity.current

        // 53주 분량: 선택 날짜 기준 ±26주
        val totalWeeks = 53
        val centerIndex = 26
        val baseMonday = selectedDate.with(WeekFields.of(DayOfWeek.MONDAY, 1).dayOfWeek(), 1)

        val pagerState = rememberPagerState(initialPage = centerIndex) { totalWeeks }
        val coroutineScope = rememberCoroutineScope()

        // 현재 표시 중인 월 계산
        var displayMonth by remember { mutableStateOf(formatMonth(selectedDate)) }

        LaunchedEffect(pagerState) {
            snapshotFlow { pagerState.currentPage }.collect { page ->
                val offset = page - centerIndex
                val weekMonday = baseMonday.plusWeeks(offset.toLong())
                val mid = weekMonday.plusDays(3) // 주 중간일 기준 월 표시
                displayMonth = formatMonth(mid)
            }
        }

        // 외부에서 selectedDate 변경 시 페이지 이동
        LaunchedEffect(selectedDate) {
            val weeksBetween = ((selectedDate.toEpochDay() - baseMonday.toEpochDay()) / 7).toInt()
            val targetPage = centerIndex + weeksBetween
            if (targetPage in 0 until totalWeeks && targetPage != pagerState.currentPage) {
                pagerState.scrollToPage(targetPage)
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .onGloballyPositioned { coords ->
                    val heightPx = coords.size.height
                    val heightDp = with(density) { heightPx.toDp().value.toDouble() }
                    onHeightChangeCallback?.invoke(heightDp)
                }
        ) {
            // 헤더: 월 표시 + 오늘 버튼
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = displayMonth,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1F2937),
                )
                if (selectedDate != today) {
                    Text(
                        text = "오늘",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = primaryColor,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                            ) {
                                onDateSelectCallback?.invoke(today.toString())
                            }
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                }
            }

            // 요일 헤더
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                val dayLabels = listOf("월", "화", "수", "목", "금", "토", "일")
                dayLabels.forEach { label ->
                    Text(
                        text = label,
                        fontSize = 11.sp,
                        color = Color(0xFF9CA3AF),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 주간 페이저
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxWidth(),
            ) { page ->
                val offset = page - centerIndex
                val weekMonday = baseMonday.plusWeeks(offset.toLong())

                WeekRow(
                    weekMonday = weekMonday,
                    selectedDate = selectedDate,
                    today = today,
                    primaryColor = primaryColor,
                    onDateTap = { date ->
                        onDateSelectCallback?.invoke(date.toString())
                    },
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }

    @Composable
    private fun WeekRow(
        weekMonday: LocalDate,
        selectedDate: LocalDate,
        today: LocalDate,
        primaryColor: Color,
        onDateTap: (LocalDate) -> Unit,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            for (i in 0..6) {
                val day = weekMonday.plusDays(i.toLong())
                val isSelected = day == selectedDate
                val isToday = day == today

                DayCell(
                    day = day,
                    isSelected = isSelected,
                    isToday = isToday,
                    primaryColor = primaryColor,
                    onTap = { onDateTap(day) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }

    @Composable
    private fun DayCell(
        day: LocalDate,
        isSelected: Boolean,
        isToday: Boolean,
        primaryColor: Color,
        onTap: () -> Unit,
        modifier: Modifier = Modifier,
    ) {
        val bgColor by animateColorAsState(
            targetValue = when {
                isSelected -> primaryColor
                else -> Color.Transparent
            },
            animationSpec = tween(200),
            label = "dayBg",
        )

        val textColor = when {
            isSelected -> Color.White
            isToday -> primaryColor
            else -> Color(0xFF374151)
        }

        val fontWeight = when {
            isSelected || isToday -> FontWeight.Bold
            else -> FontWeight.Medium
        }

        Box(
            modifier = modifier
                .clip(RoundedCornerShape(12.dp))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                ) { onTap() }
                .padding(horizontal = 2.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .size(width = 40.dp, height = 48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(bgColor),
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    text = day.dayOfMonth.toString(),
                    fontSize = 16.sp,
                    fontWeight = fontWeight,
                    color = textColor,
                    textAlign = TextAlign.Center,
                )
            }

            // 오늘 표시 dot
            if (isToday && !isSelected) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 2.dp)
                        .size(4.dp)
                        .background(primaryColor, CircleShape),
                )
            }
        }
    }

    // ─── Helpers ───

    private fun parseColor(hex: String): Color {
        return try {
            val clean = hex.removePrefix("#")
            val colorInt = android.graphics.Color.parseColor("#$clean")
            Color(colorInt)
        } catch (_: Exception) {
            Color(0xFF6366F1)
        }
    }

    private fun formatMonth(date: LocalDate): String {
        return "${date.monthValue}월"
    }
}
