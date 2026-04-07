/**
 * NativeWeekStripCalendarView — Android Native (Jetpack Compose)
 *
 * 제스처 처리:
 *   - 수직 드래그: Modifier.draggable(Vertical) → 확장/축소
 *   - 수평 스와이프 축소 상태: Modifier.draggable(Horizontal) → 주 이동 (±7일)
 *   - 수평 스와이프 확장 상태: HorizontalPager → 월 이동
 *   - 날짜 탭: Compose clickable
 *   - expandProgress 변경 시 onExpandProgressChange 이벤트로 RN에 전달
 */
package com.daysteprn

import android.widget.FrameLayout
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.wrapContentHeight
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
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.facebook.react.uimanager.ThemedReactContext
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth

// ─── 데이터 모델 ────────────────────────────────

data class MonthGridCell(
    val date: LocalDate,
    val dayOfMonth: Int,
    val isCurrentMonth: Boolean,
)

// ─── View ────────────────────────────────────────

class NativeWeekStripCalendarView(context: ThemedReactContext) : FrameLayout(context) {

    private var composeView = ComposeView(context)
    private var contentSet = false

    // Props from RN
    private var selectedDateStr = mutableStateOf(LocalDate.now().toString())
    private var primaryColorHex = mutableStateOf("#6366F1")

    // Callbacks
    var onDateSelectCallback: ((String) -> Unit)? = null
    var onHeightChangeCallback: ((Double) -> Unit)? = null
    var onExpandChangeCallback: ((Boolean) -> Unit)? = null
    var onExpandProgressChangeCallback: ((Float) -> Unit)? = null

    // 확장/축소 상태
    private var isExpandedState = mutableStateOf(false)
    private var expandProgressState = mutableStateOf(0f)

    fun setExpanded(expanded: Boolean) {
        isExpandedState.value = expanded
    }

    fun setExpandProgress(progress: Float) {
        expandProgressState.value = progress.coerceIn(0f, 1f)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!contentSet) {
            contentSet = true
            composeView = ComposeView(context)
            addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
            composeView.setContent {
                WeekStripCalendarContent()
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
            measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED),
            )
            layout(left, top, right, top + measuredHeight)
        }
    }

    fun setSelectedDate(date: String) {
        selectedDateStr.value = date
    }

    fun setPrimaryColor(color: String) {
        primaryColorHex.value = color
    }

    // ─── Constants ───

    companion object {
        private val CELL_HEIGHT = 44.dp
        private val CELL_SPACING = 2.dp
        private val DRAG_THRESHOLD_DP = 200f
        private val VELOCITY_THRESHOLD = 500f
        private const val TOTAL_MONTHS = 25
        private const val CENTER_MONTH_INDEX = 12
    }

    // ─── Helpers ───

    private fun buildMonthGrid(yearMonth: YearMonth): List<List<MonthGridCell>> {
        val firstOfMonth = yearMonth.atDay(1)
        val firstDayOfWeekOffset = firstOfMonth.dayOfWeek.value % 7
        val startDate = firstOfMonth.minusDays(firstDayOfWeekOffset.toLong())
        val lastOfMonth = yearMonth.atEndOfMonth()
        val lastDayOfWeekOffset = (6 - lastOfMonth.dayOfWeek.value % 7)
        val endDate = lastOfMonth.plusDays(lastDayOfWeekOffset.toLong())
        val totalDays = (endDate.toEpochDay() - startDate.toEpochDay() + 1).toInt()
        val rows = totalDays / 7

        return (0 until rows).map { row ->
            (0 until 7).map { col ->
                val date = startDate.plusDays((row * 7 + col).toLong())
                MonthGridCell(
                    date = date,
                    dayOfMonth = date.dayOfMonth,
                    isCurrentMonth = YearMonth.from(date) == yearMonth,
                )
            }
        }
    }

    private fun findSelectedRowIndex(rows: List<List<MonthGridCell>>, selectedDate: LocalDate): Int {
        return rows.indexOfFirst { row -> row.any { it.date == selectedDate } }.coerceAtLeast(0)
    }

    private fun parseColor(hex: String): Color {
        return try {
            val clean = hex.removePrefix("#")
            Color(android.graphics.Color.parseColor("#$clean"))
        } catch (_: Exception) {
            Color(0xFF6366F1)
        }
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
        val coroutineScope = rememberCoroutineScope()

        val effectiveProgress = expandProgressState.value

        // 월 페이저
        val baseYearMonth = remember(selectedDate) { YearMonth.from(selectedDate) }
        val pagerState = rememberPagerState(initialPage = CENTER_MONTH_INDEX) { TOTAL_MONTHS }

        // 선택 날짜 변경 시 해당 월로 페이저 이동
        LaunchedEffect(selectedDate) {
            val targetYearMonth = YearMonth.from(selectedDate)
            val monthOffset = ((targetYearMonth.year - baseYearMonth.year) * 12
                    + (targetYearMonth.monthValue - baseYearMonth.monthValue))
            val targetPage = CENTER_MONTH_INDEX + monthOffset
            if (targetPage in 0 until TOTAL_MONTHS && targetPage != pagerState.currentPage) {
                pagerState.scrollToPage(targetPage)
            }
        }

        // 페이저 정착 시 → 현재 월로 돌아오면 오늘 날짜 선택
        LaunchedEffect(pagerState) {
            snapshotFlow { pagerState.settledPage }.collect { page ->
                val offset = page - CENTER_MONTH_INDEX
                val ym = baseYearMonth.plusMonths(offset.toLong())
                if (YearMonth.from(today) == ym) {
                    onDateSelectCallback?.invoke(today.toString())
                }
            }
        }

        // 현재 표시 월 라벨
        var displayMonthLabel by remember { mutableStateOf("${selectedDate.monthValue}월") }
        LaunchedEffect(pagerState) {
            snapshotFlow { pagerState.currentPage }.collect { page ->
                val offset = page - CENTER_MONTH_INDEX
                val ym = baseYearMonth.plusMonths(offset.toLong())
                displayMonthLabel = "${ym.monthValue}월"
            }
        }

        // 높이 계산
        val currentYearMonth = baseYearMonth.plusMonths(
            (pagerState.currentPage - CENTER_MONTH_INDEX).toLong()
        )
        val currentGrid = remember(currentYearMonth) { buildMonthGrid(currentYearMonth) }
        val rowCount = currentGrid.size

        val oneRowHeight = CELL_HEIGHT + CELL_SPACING
        val monthFullHeight = CELL_HEIGHT * rowCount + CELL_SPACING * (rowCount - 1)
        val gridHeight: Dp = oneRowHeight + (monthFullHeight - oneRowHeight) * effectiveProgress

        // ─── 수직 드래그: Modifier.draggable(Vertical) ───
        // HorizontalPager(Horizontal)와 자연스럽게 공존
        val dragThresholdPx = with(density) { DRAG_THRESHOLD_DP.dp.toPx() }
        val verticalDragState = rememberDraggableState { delta ->
            val dragDelta = delta / dragThresholdPx
            val newProgress = (expandProgressState.value + dragDelta).coerceIn(0f, 1f)
            expandProgressState.value = newProgress
            onExpandProgressChangeCallback?.invoke(newProgress)
        }

        // ─── 수평 드래그 (축소 상태): 주 이동 ───
        val horizontalDragState = rememberDraggableState { /* 드래그 중은 무시 */ }

        // snap 애니메이션 Job — 새 드래그 시작 시 취소
        var snapJob by remember { mutableStateOf<kotlinx.coroutines.Job?>(null) }

        // snap 애니메이션 함수
        fun snapToTarget(shouldExpand: Boolean) {
            snapJob?.cancel()
            snapJob = coroutineScope.launch {
                val animatable = Animatable(expandProgressState.value)
                animatable.animateTo(
                    targetValue = if (shouldExpand) 1f else 0f,
                    animationSpec = tween(250)
                ) {
                    expandProgressState.value = value
                    onExpandProgressChangeCallback?.invoke(value)
                }
            }
            isExpandedState.value = shouldExpand
            onExpandChangeCallback?.invoke(shouldExpand)
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .onGloballyPositioned { coords ->
                    val heightDp = with(density) { coords.size.height.toDp().value.toDouble() }
                    onHeightChangeCallback?.invoke(heightDp)
                }
        ) {
            // ─── 헤더: 월 + 오늘 ───
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = displayMonthLabel,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1F2937),
                )
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

            // ─── 요일 헤더 ───
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                val dayLabels = listOf("일", "월", "화", "수", "목", "금", "토")
                val sundayColor = Color(0xFFEF4444)
                val saturdayColor = Color(0xFF3B82F6)
                dayLabels.forEachIndexed { index, label ->
                    Text(
                        text = label,
                        fontSize = 11.sp,
                        color = when (index) {
                            0 -> sundayColor
                            6 -> saturdayColor
                            else -> Color(0xFF9CA3AF)
                        },
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // ─── 클리핑 그리드 컨테이너 ───
            // 축소 상태: 수평 draggable → 주 이동
            // 확장 상태: HorizontalPager → 월 이동
            val isCollapsed = effectiveProgress < 0.1f

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(gridHeight)
                    .clipToBounds()
                    .draggable(
                        state = verticalDragState,
                        orientation = Orientation.Vertical,
                        onDragStarted = {
                            snapJob?.cancel()
                            snapJob = null
                        },
                        onDragStopped = { velocity ->
                            val current = expandProgressState.value
                            val shouldExpand = if (kotlin.math.abs(velocity) > VELOCITY_THRESHOLD) {
                                velocity > 0
                            } else {
                                current > 0.5f
                            }
                            snapToTarget(shouldExpand)
                        },
                    )
                    .then(
                        if (isCollapsed) {
                            Modifier.draggable(
                                state = horizontalDragState,
                                orientation = Orientation.Horizontal,
                                onDragStopped = { velocity ->
                                    if (velocity > 500f) {
                                        val newDate = selectedDate.minusWeeks(1)
                                        onDateSelectCallback?.invoke(newDate.toString())
                                    } else if (velocity < -500f) {
                                        val newDate = selectedDate.plusWeeks(1)
                                        onDateSelectCallback?.invoke(newDate.toString())
                                    }
                                },
                            )
                        } else {
                            Modifier
                        }
                    )
            ) {
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier.fillMaxSize(),
                    // 확장 상태에서만 페이저 스크롤 활성화 (월 이동)
                    userScrollEnabled = !isCollapsed,
                ) { page ->
                    val offset = page - CENTER_MONTH_INDEX
                    val yearMonth = baseYearMonth.plusMonths(offset.toLong())
                    val rows = remember(yearMonth) { buildMonthGrid(yearMonth) }
                    val selectedRowIndex = findSelectedRowIndex(rows, selectedDate)

                    val visibleRows = if (effectiveProgress < 0.01f) {
                        listOf(rows.getOrElse(selectedRowIndex) { rows.first() })
                    } else {
                        rows
                    }
                    val visibleOffset = if (effectiveProgress >= 0.01f) {
                        val rowHeightPx = with(density) { (CELL_HEIGHT + CELL_SPACING).toPx() }
                        -selectedRowIndex * rowHeightPx * (1f - effectiveProgress)
                    } else 0f

                    MonthGridView(
                        rows = visibleRows,
                        selectedDate = selectedDate,
                        today = today,
                        primaryColor = primaryColor,
                        offsetY = visibleOffset,
                        onDateTap = { date ->
                            onDateSelectCallback?.invoke(date.toString())
                            if (isExpandedState.value) {
                                snapToTarget(false)
                            }
                        },
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }

    @Composable
    private fun MonthGridView(
        rows: List<List<MonthGridCell>>,
        selectedDate: LocalDate,
        today: LocalDate,
        primaryColor: Color,
        offsetY: Float,
        onDateTap: (LocalDate) -> Unit,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight(unbounded = true)
                .graphicsLayer { translationY = offsetY },
        ) {
            rows.forEachIndexed { rowIndex, row ->
                if (rowIndex > 0) Spacer(modifier = Modifier.height(CELL_SPACING))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    row.forEach { cell ->
                        DayCell(
                            day = cell.date,
                            isSelected = cell.date == selectedDate,
                            isToday = cell.date == today,
                            isCurrentMonth = cell.isCurrentMonth,
                            primaryColor = primaryColor,
                            onTap = { onDateTap(cell.date) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }
    }

    @Composable
    private fun DayCell(
        day: LocalDate,
        isSelected: Boolean,
        isToday: Boolean,
        isCurrentMonth: Boolean = true,
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

        val isSunday = day.dayOfWeek.value == 7
        val isSaturday = day.dayOfWeek.value == 6

        val textColor = when {
            isSelected -> Color.White
            !isCurrentMonth -> Color(0xFFD1D5DB)
            isToday -> primaryColor
            isSunday -> Color(0xFFEF4444)
            isSaturday -> Color(0xFF3B82F6)
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
                    .size(width = 40.dp, height = CELL_HEIGHT)
                    .clip(RoundedCornerShape(12.dp))
                    .background(bgColor),
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    text = day.dayOfMonth.toString(),
                    fontSize = 15.sp,
                    fontWeight = fontWeight,
                    color = textColor,
                    textAlign = TextAlign.Center,
                )
            }

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
}
