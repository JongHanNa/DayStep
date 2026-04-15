/**
 * NativeTimePicker — Android Jetpack Compose 인라인 휠 타임 피커
 * iOS UIDatePicker spinner 스타일과 유사한 3-컬럼 (오전/오후, 시, 분) 휠 피커
 */
package com.daysteprn

import android.content.Context
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import kotlin.math.abs

class NativeTimePickerView(context: Context) : FrameLayout(context) {

    var onTimeChangeCallback: ((Int, Int) -> Unit)? = null

    private var composeView = ComposeView(context)
    private var contentSet = false

    private var hour24State = mutableIntStateOf(7)
    private var minuteState = mutableIntStateOf(30)
    private var heightDpState = mutableIntStateOf(150)
    private var minuteIntervalState = mutableIntStateOf(1)

    init {}

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!contentSet) {
            contentSet = true
            addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
            composeView.setContent {
                TimePickerContent()
            }
        }
    }

    fun setHour(h: Int) {
        hour24State.intValue = h.coerceIn(0, 23)
    }

    fun setMinute(m: Int) {
        minuteState.intValue = m.coerceIn(0, 59)
    }

    fun setHeightDp(h: Int) {
        heightDpState.intValue = h.coerceIn(80, 400)
    }

    fun setMinuteInterval(interval: Int) {
        minuteIntervalState.intValue = interval.coerceIn(1, 30)
    }

    @Composable
    private fun TimePickerContent() {
        val hour24 by remember { hour24State }
        val minute by remember { minuteState }
        val heightDp by remember { heightDpState }
        val minuteInterval by remember { minuteIntervalState }

        val isAm = hour24 < 12
        val displayHour = if (hour24 == 0) 12 else if (hour24 > 12) hour24 - 12 else hour24

        val amPmItems = listOf("오전", "오후")
        val hourItems = (1..12).toList()

        val minuteItems = (0..59).filter { it % minuteInterval == 0 }

        val itemHeightDp = 40.dp
        val visibleItems = (heightDp / 40).coerceAtLeast(3)
        val centerIndex = visibleItems / 2

        val coroutineScope = rememberCoroutineScope()

        // Initialize scroll states
        val amPmInitial = if (isAm) 0 else 1
        val hourInitial = hourItems.indexOf(displayHour).coerceAtLeast(0)
        val minuteInitial = minuteItems.indexOf(minute).let { if (it < 0) 0 else it }

        // Repeat count for infinite scroll illusion
        val repeatCount = 200
        val amPmListState = rememberLazyListState(
            initialFirstVisibleItemIndex = repeatCount / 2 * amPmItems.size + amPmInitial - centerIndex
        )
        val hourListState = rememberLazyListState(
            initialFirstVisibleItemIndex = repeatCount / 2 * hourItems.size + hourInitial - centerIndex
        )
        val minuteListState = rememberLazyListState(
            initialFirstVisibleItemIndex = repeatCount / 2 * minuteItems.size + minuteInitial - centerIndex
        )

        // Track settled scroll positions and emit changes
        LaunchedEffect(Unit) {
            snapshotFlow {
                Triple(
                    getSelectedIndex(amPmListState, centerIndex) % amPmItems.size,
                    getSelectedIndex(hourListState, centerIndex) % hourItems.size,
                    getSelectedIndex(minuteListState, centerIndex) % minuteItems.size
                )
            }.collect { (amPmIdx, hourIdx, minuteIdx) ->
                val selectedAmPm = amPmItems[amPmIdx.coerceIn(0, amPmItems.lastIndex)]
                val selectedHour = hourItems[hourIdx.coerceIn(0, hourItems.lastIndex)]
                val selectedMinute = minuteItems[minuteIdx.coerceIn(0, minuteItems.lastIndex)]

                val newHour24 = if (selectedAmPm == "오전") {
                    if (selectedHour == 12) 0 else selectedHour
                } else {
                    if (selectedHour == 12) 12 else selectedHour + 12
                }

                onTimeChangeCallback?.invoke(newHour24, selectedMinute)
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(heightDp.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // AM/PM column
                WheelColumn(
                    items = amPmItems,
                    listState = amPmListState,
                    repeatCount = repeatCount,
                    itemHeight = itemHeightDp,
                    totalHeight = heightDp.dp,
                    centerIndex = centerIndex,
                    modifier = Modifier.weight(1f)
                )

                // Hour column
                WheelColumn(
                    items = hourItems.map { it.toString() },
                    listState = hourListState,
                    repeatCount = repeatCount,
                    itemHeight = itemHeightDp,
                    totalHeight = heightDp.dp,
                    centerIndex = centerIndex,
                    modifier = Modifier.weight(1f)
                )

                // Colon separator
                Text(
                    text = ":",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1A1A2E),
                    modifier = Modifier.padding(horizontal = 2.dp)
                )

                // Minute column
                WheelColumn(
                    items = minuteItems.map { it.toString().padStart(2, '0') },
                    listState = minuteListState,
                    repeatCount = repeatCount,
                    itemHeight = itemHeightDp,
                    totalHeight = heightDp.dp,
                    centerIndex = centerIndex,
                    modifier = Modifier.weight(1f)
                )
            }

            // Center highlight bar
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.85f)
                    .height(itemHeightDp)
                    .align(Alignment.Center)
                    .background(
                        Color(0xFF6366F1).copy(alpha = 0.1f),
                        RoundedCornerShape(10.dp)
                    )
            )

            // Top fade overlay
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(heightDp.dp * 0.35f)
                    .align(Alignment.TopCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.White,
                                Color.White.copy(alpha = 0f)
                            )
                        )
                    )
            )

            // Bottom fade overlay
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(heightDp.dp * 0.35f)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0f),
                                Color.White
                            )
                        )
                    )
            )
        }
    }

    @Composable
    private fun WheelColumn(
        items: List<String>,
        listState: LazyListState,
        repeatCount: Int,
        itemHeight: Dp,
        totalHeight: Dp,
        centerIndex: Int,
        modifier: Modifier = Modifier
    ) {
        val totalItems = items.size * repeatCount

        LazyColumn(
            state = listState,
            modifier = modifier.height(totalHeight),
            horizontalAlignment = Alignment.CenterHorizontally,
            flingBehavior = rememberSnapFlingBehavior(listState, itemHeight)
        ) {
            items(totalItems) { index ->
                val actualIndex = index % items.size
                val centerItemIndex = getSelectedIndex(listState, centerIndex)
                val distanceFromCenter = abs(index - centerItemIndex)

                val alpha = when {
                    distanceFromCenter == 0 -> 1f
                    distanceFromCenter == 1 -> 0.5f
                    else -> 0.25f
                }

                val fontSize = when {
                    distanceFromCenter == 0 -> 20.sp
                    distanceFromCenter == 1 -> 16.sp
                    else -> 14.sp
                }

                val fontWeight = if (distanceFromCenter == 0) FontWeight.Bold else FontWeight.Normal

                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(itemHeight)
                ) {
                    Text(
                        text = items[actualIndex],
                        fontSize = fontSize,
                        fontWeight = fontWeight,
                        color = Color(0xFF1A1A2E).copy(alpha = alpha),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }

    private fun getSelectedIndex(listState: LazyListState, centerIndex: Int): Int {
        return listState.firstVisibleItemIndex + centerIndex
    }

    @Composable
    private fun rememberSnapFlingBehavior(
        listState: LazyListState,
        itemHeight: Dp
    ): androidx.compose.foundation.gestures.FlingBehavior {
        val density = androidx.compose.ui.platform.LocalDensity.current
        val itemHeightPx = with(density) { itemHeight.toPx() }
        val coroutineScope = rememberCoroutineScope()

        return remember(listState, itemHeightPx) {
            object : androidx.compose.foundation.gestures.FlingBehavior {
                override suspend fun androidx.compose.foundation.gestures.ScrollScope.performFling(
                    initialVelocity: Float
                ): Float {
                    val firstVisible = listState.firstVisibleItemIndex
                    val offset = listState.firstVisibleItemScrollOffset

                    val targetIndex = if (initialVelocity > 500f) {
                        firstVisible + 1
                    } else if (initialVelocity < -500f) {
                        firstVisible
                    } else {
                        if (offset > itemHeightPx / 2) firstVisible + 1 else firstVisible
                    }

                    coroutineScope.launch {
                        listState.animateScrollToItem(targetIndex)
                    }
                    return 0f
                }
            }
        }
    }
}
