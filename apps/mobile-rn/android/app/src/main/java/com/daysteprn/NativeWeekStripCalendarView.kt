/**
 * NativeWeekStripCalendarView — Android Native (Jetpack Compose)
 *
 * 제스처:
 *   - 수직 드래그: pointerInput + awaitEachGesture → 확장/축소
 *   - 축소 상태 수평 fling: → 주 이동 (±7일)
 *   - 확장 상태 수평 스와이프: HorizontalPager → 월 이동
 *   - 날짜 탭: Compose clickable
 *   - expandProgress → onExpandProgressChange 이벤트로 RN에 전달
 */
package com.daysteprn

import android.widget.FrameLayout
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animate
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.facebook.react.uimanager.ThemedReactContext
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import kotlin.math.abs

data class MonthGridCell(
    val date: LocalDate,
    val dayOfMonth: Int,
    val isCurrentMonth: Boolean,
)

class NativeWeekStripCalendarView(context: ThemedReactContext) : FrameLayout(context) {

    private var composeView = ComposeView(context)
    private var contentSet = false
    private var isLayoutRequested = false

    init {
        // 확장 시 FrameLayout bounds 밖의 콘텐츠도 보이도록 클리핑 비활성화
        clipChildren = false
        clipToPadding = false
    }

    private var selectedDateStr = mutableStateOf(LocalDate.now().toString())
    private var primaryColorHex = mutableStateOf("#6366F1")

    var onDateSelectCallback: ((String) -> Unit)? = null
    var onHeightChangeCallback: ((Double) -> Unit)? = null
    var onExpandChangeCallback: ((Boolean) -> Unit)? = null
    var onExpandProgressChangeCallback: ((Float) -> Unit)? = null

    private var isExpandedState = mutableStateOf(false)
    private var expandProgressState = mutableStateOf(0f)

    fun setExpanded(expanded: Boolean) { isExpandedState.value = expanded }
    fun setExpandProgress(progress: Float) { expandProgressState.value = progress.coerceIn(0f, 1f) }
    fun setSelectedDate(date: String) { selectedDateStr.value = date }
    fun setPrimaryColor(color: String) { primaryColorHex.value = color }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!contentSet) {
            contentSet = true
            composeView = ComposeView(context)
            addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
            composeView.setContent { WeekStripCalendarContent() }
        }
        requestLayout()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        if (contentSet) { removeAllViews(); contentSet = false }
    }

    override fun requestLayout() {
        super.requestLayout()
        // 중복 호출 방지하되, 레이아웃이 완료된 후 다시 요청될 수 있도록 함
        if (isLayoutRequested) return
        isLayoutRequested = true
        post {
            isLayoutRequested = false
            if (!isAttachedToWindow) return@post
            // width가 0이면 다음 프레임에 재시도
            if (width <= 0) {
                post { requestLayout() }
                return@post
            }
            measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED),
            )
            layout(left, top, right, top + measuredHeight)
        }
    }

    companion object {
        private val CELL_HEIGHT = 44.dp
        private val CELL_SPACING = 2.dp
        private val DRAG_THRESHOLD_DP = 200f
        private val VELOCITY_THRESHOLD = 500f
        private const val TOTAL_MONTHS = 25
        private const val CENTER_MONTH_INDEX = 12
    }

    private fun buildMonthGrid(yearMonth: YearMonth): List<List<MonthGridCell>> {
        val firstOfMonth = yearMonth.atDay(1)
        val firstDayOfWeekOffset = firstOfMonth.dayOfWeek.value % 7
        val startDate = firstOfMonth.minusDays(firstDayOfWeekOffset.toLong())
        // 어느 달이든 항상 6행(42일) 고정 — 달마다 높이 변동 방지
        val rows = 6
        return (0 until rows).map { row ->
            (0 until 7).map { col ->
                val date = startDate.plusDays((row * 7 + col).toLong())
                MonthGridCell(date, date.dayOfMonth, YearMonth.from(date) == yearMonth)
            }
        }
    }

    private fun findSelectedRowIndex(rows: List<List<MonthGridCell>>, selectedDate: LocalDate): Int {
        return rows.indexOfFirst { row -> row.any { it.date == selectedDate } }.coerceAtLeast(0)
    }

    private fun parseColor(hex: String): Color {
        return try { Color(android.graphics.Color.parseColor(if (hex.startsWith("#")) hex else "#$hex")) }
        catch (_: Exception) { Color(0xFF6366F1) }
    }

    @Composable
    private fun WeekStripCalendarContent() {
        val selectedDate = try { LocalDate.parse(selectedDateStr.value) } catch (_: Exception) { LocalDate.now() }
        val primaryColor = parseColor(primaryColorHex.value)
        val today = LocalDate.now()
        val density = LocalDensity.current
        val coroutineScope = rememberCoroutineScope()
        val viewConfiguration = LocalViewConfiguration.current

        val effectiveProgress = expandProgressState.value
        val isCollapsed = effectiveProgress < 0.1f

        val baseYearMonth = remember(selectedDate) { YearMonth.from(selectedDate) }
        val pagerState = rememberPagerState(initialPage = CENTER_MONTH_INDEX) { TOTAL_MONTHS }

        LaunchedEffect(selectedDate) {
            val targetYM = YearMonth.from(selectedDate)
            val offset = (targetYM.year - baseYearMonth.year) * 12 + (targetYM.monthValue - baseYearMonth.monthValue)
            val targetPage = CENTER_MONTH_INDEX + offset
            if (targetPage in 0 until TOTAL_MONTHS && targetPage != pagerState.currentPage) {
                pagerState.scrollToPage(targetPage)
            }
        }

        LaunchedEffect(pagerState) {
            snapshotFlow { pagerState.settledPage }.collect { page ->
                val ym = baseYearMonth.plusMonths((page - CENTER_MONTH_INDEX).toLong())
                if (YearMonth.from(today) == ym) onDateSelectCallback?.invoke(today.toString())
            }
        }

        var displayMonthLabel by remember { mutableStateOf("${selectedDate.monthValue}월") }
        LaunchedEffect(pagerState) {
            snapshotFlow { pagerState.currentPage }.collect { page ->
                val ym = baseYearMonth.plusMonths((page - CENTER_MONTH_INDEX).toLong())
                displayMonthLabel = "${ym.monthValue}월"
            }
        }

        val currentYearMonth = baseYearMonth.plusMonths((pagerState.currentPage - CENTER_MONTH_INDEX).toLong())
        val currentGrid = remember(currentYearMonth) { buildMonthGrid(currentYearMonth) }
        val rowCount = currentGrid.size
        val oneRowHeight = CELL_HEIGHT + CELL_SPACING
        val monthFullHeight = CELL_HEIGHT * rowCount + CELL_SPACING * (rowCount - 1)
        val gridHeight: Dp = oneRowHeight + (monthFullHeight - oneRowHeight) * effectiveProgress

        fun animateToTarget(shouldExpand: Boolean) {
            val target = if (shouldExpand) 1f else 0f
            coroutineScope.launch {
                animate(expandProgressState.value, target, animationSpec = tween(250)) { value, _ ->
                    expandProgressState.value = value
                    onExpandProgressChangeCallback?.invoke(value)
                }
            }
            isExpandedState.value = shouldExpand
            onExpandChangeCallback?.invoke(shouldExpand)
        }

        val dragThresholdPx = with(density) { DRAG_THRESHOLD_DP.dp.toPx() }
        val touchSlop = viewConfiguration.touchSlop

        // 축소 상태 수평 드래그 오프셋 (손 따라감 효과)
        val weekDragOffset = remember { Animatable(0f) }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .onGloballyPositioned { coords ->
                    val heightDp = with(density) { coords.size.height.toDp().value.toDouble() }
                    onHeightChangeCallback?.invoke(heightDp)
                }
        ) {
            // 헤더
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(displayMonthLabel, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1F2937))
                Text(
                    "오늘", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = primaryColor,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable(remember { MutableInteractionSource() }, null) {
                            onDateSelectCallback?.invoke(today.toString())
                        }
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }

            // 요일 헤더
            Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                listOf("일", "월", "화", "수", "목", "금", "토").forEachIndexed { i, label ->
                    Text(
                        label, fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.weight(1f),
                        color = when (i) { 0 -> Color(0xFFEF4444); 6 -> Color(0xFF3B82F6); else -> Color(0xFF9CA3AF) },
                    )
                }
            }

            Spacer(Modifier.height(4.dp))

            // 그리드
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(gridHeight)
                    .clipToBounds()
                    .pointerInput(Unit) {
                        awaitEachGesture {
                            val down = awaitFirstDown(requireUnconsumed = false)
                            var verticalDragStarted = false
                            var horizontalDragStarted = false
                            var prevY = down.position.y
                            val startX = down.position.x
                            val startY = down.position.y
                            val startTime = down.uptimeMillis
                            val viewWidth = size.width.toFloat()

                            while (true) {
                                val event = awaitPointerEvent()
                                val change = event.changes.firstOrNull() ?: break
                                if (!change.pressed) {
                                    if (verticalDragStarted) {
                                        val elapsed = change.uptimeMillis - startTime
                                        val totalDy = change.position.y - startY
                                        val velocityY = if (elapsed > 0) totalDy / elapsed * 1000f else 0f
                                        val current = expandProgressState.value
                                        val shouldExpand = if (abs(velocityY) > VELOCITY_THRESHOLD) velocityY > 0 else current > 0.5f
                                        animateToTarget(shouldExpand)
                                    } else if (horizontalDragStarted && expandProgressState.value < 0.1f) {
                                        // 축소 상태 수평 드래그 종료 → threshold 기반 주 이동 또는 원위치
                                        val totalDx = change.position.x - startX
                                        val elapsed = change.uptimeMillis - startTime
                                        val velocityX = if (elapsed > 0) totalDx / elapsed * 1000f else 0f
                                        val shouldMoveWeek = abs(velocityX) > VELOCITY_THRESHOLD || abs(totalDx) > viewWidth * 0.25f
                                        coroutineScope.launch {
                                            if (shouldMoveWeek) {
                                                val targetOffset = if (totalDx > 0) viewWidth else -viewWidth
                                                weekDragOffset.animateTo(targetOffset, tween(180))
                                                // 런타임에 selectedDateStr.value 재파싱 (stale closure 방지)
                                                val currentSelected = try { LocalDate.parse(selectedDateStr.value) } catch (_: Exception) { LocalDate.now() }
                                                val newDate = if (totalDx > 0) currentSelected.minusWeeks(1) else currentSelected.plusWeeks(1)
                                                onDateSelectCallback?.invoke(newDate.toString())
                                                weekDragOffset.snapTo(0f)
                                            } else {
                                                weekDragOffset.animateTo(0f, tween(180))
                                            }
                                        }
                                    }
                                    break
                                }

                                val dy = change.position.y - startY
                                val dx = change.position.x - down.position.x

                                // 수평 드래그를 먼저 판별 (확장/축소 상태 모두). 수평 드래그 시작 후에는 수직 판별 금지
                                if (!verticalDragStarted && !horizontalDragStarted &&
                                    abs(dx) > touchSlop && abs(dx) > abs(dy) * 1.5f) {
                                    horizontalDragStarted = true
                                }
                                if (!verticalDragStarted && !horizontalDragStarted &&
                                    abs(dy) > touchSlop && abs(dy) > abs(dx) * 1.5f) {
                                    verticalDragStarted = true
                                }

                                if (verticalDragStarted) {
                                    change.consume()
                                    val deltaY = change.position.y - prevY
                                    val newProgress = (expandProgressState.value + deltaY / dragThresholdPx).coerceIn(0f, 1f)
                                    expandProgressState.value = newProgress
                                    onExpandProgressChangeCallback?.invoke(newProgress)
                                } else if (horizontalDragStarted && expandProgressState.value < 0.1f) {
                                    // 축소 상태: 손 따라가는 오프셋 (확장 상태는 HorizontalPager가 처리)
                                    change.consume()
                                    coroutineScope.launch { weekDragOffset.snapTo(change.position.x - startX) }
                                }
                                prevY = change.position.y
                            }
                        }
                    }
            ) {
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            if (isCollapsed) translationX = weekDragOffset.value
                        },
                    userScrollEnabled = !isCollapsed,
                ) { page ->
                    val yearMonth = baseYearMonth.plusMonths((page - CENTER_MONTH_INDEX).toLong())
                    val rows = remember(yearMonth) { buildMonthGrid(yearMonth) }
                    val selectedRowIndex = findSelectedRowIndex(rows, selectedDate)
                    val visibleRows = if (effectiveProgress < 0.01f) listOf(rows.getOrElse(selectedRowIndex) { rows.first() }) else rows
                    val visibleOffset = if (effectiveProgress >= 0.01f) {
                        with(density) { (CELL_HEIGHT + CELL_SPACING).toPx() } * -selectedRowIndex * (1f - effectiveProgress)
                    } else 0f

                    MonthGridView(visibleRows, selectedDate, today, primaryColor, visibleOffset) { date ->
                        onDateSelectCallback?.invoke(date.toString())
                        if (isExpandedState.value) animateToTarget(false)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }

    @Composable
    private fun MonthGridView(
        rows: List<List<MonthGridCell>>, selectedDate: LocalDate, today: LocalDate,
        primaryColor: Color, offsetY: Float, onDateTap: (LocalDate) -> Unit,
    ) {
        Column(Modifier.fillMaxWidth().wrapContentHeight(unbounded = true).graphicsLayer { translationY = offsetY }) {
            rows.forEachIndexed { i, row ->
                if (i > 0) Spacer(Modifier.height(CELL_SPACING))
                Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    row.forEach { cell ->
                        DayCell(cell.date, cell.date == selectedDate, cell.date == today, cell.isCurrentMonth, primaryColor, { onDateTap(cell.date) }, Modifier.weight(1f))
                    }
                }
            }
        }
    }

    @Composable
    private fun DayCell(
        day: LocalDate, isSelected: Boolean, isToday: Boolean, isCurrentMonth: Boolean,
        primaryColor: Color, onTap: () -> Unit, modifier: Modifier,
    ) {
        val bgColor by animateColorAsState(if (isSelected) primaryColor else Color.Transparent, tween(200), "dayBg")
        val isSunday = day.dayOfWeek.value == 7
        val isSaturday = day.dayOfWeek.value == 6
        val textColor = when {
            isSelected -> Color.White; !isCurrentMonth -> Color(0xFFD1D5DB); isToday -> primaryColor
            isSunday -> Color(0xFFEF4444); isSaturday -> Color(0xFF3B82F6); else -> Color(0xFF374151)
        }
        Box(
            modifier.clip(RoundedCornerShape(12.dp)).clickable(remember { MutableInteractionSource() }, null) { onTap() }.padding(horizontal = 2.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.size(40.dp, CELL_HEIGHT).clip(RoundedCornerShape(12.dp)).background(bgColor), verticalArrangement = Arrangement.Center) {
                Text(day.dayOfMonth.toString(), fontSize = 15.sp, fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Medium, color = textColor, textAlign = TextAlign.Center)
            }
            if (isToday && !isSelected) {
                Box(Modifier.align(Alignment.BottomCenter).padding(bottom = 2.dp).size(4.dp).background(primaryColor, CircleShape))
            }
        }
    }
}
