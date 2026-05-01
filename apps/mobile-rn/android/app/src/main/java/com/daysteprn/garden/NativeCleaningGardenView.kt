/**
 * NativeCleaningGardenView — Android Native (Jetpack Compose)
 * iOS NativeCleaningGarden의 Android 동등 구현
 *
 * 4가지 뷰 모드: day(아이소메트릭 5×5), week, month, year
 * 청소 정원 시각화 (나무 아이콘 + 탭별 색상)
 *
 * 패턴: NativeSleepGardenView와 동일 (FrameLayout + ComposeView)
 */
package com.daysteprn.garden

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
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
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
import java.util.Locale
import kotlin.math.ceil

// ─── 데이터 모델 ────────────────────────────────

data class CleaningTree(
    val taskId: String,
    val durationSeconds: Int,
    val outcome: String,    // "completed" | "abandoned" | "skipped"
    val tab: String,        // "space" | "digital" | "belongings"
)

// ─── View ────────────────────────────────────────

class NativeCleaningGardenView(context: ThemedReactContext) : FrameLayout(context) {

    private var composeView = ComposeView(context)

    // Props
    private var viewModeState = mutableStateOf("day")
    private var selectedDateState = mutableStateOf(LocalDate.now().toString())
    private var primaryColorHex = mutableStateOf("#D97706")
    private var gardenDays = mutableStateOf<Map<String, List<CleaningTree>>>(emptyMap())

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
                CleaningGardenContent()
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

    // ─── Setters ───

    fun setViewMode(mode: String) { viewModeState.value = mode }
    fun setSelectedDate(date: String) { selectedDateState.value = date }
    fun setPrimaryColor(color: String) { primaryColorHex.value = color }

    fun setGardenData(json: String) {
        try {
            val obj = JSONObject(json)
            val daysArr = obj.getJSONArray("days")
            val map = mutableMapOf<String, List<CleaningTree>>()
            for (i in 0 until daysArr.length()) {
                val dayObj = daysArr.getJSONObject(i)
                val date = dayObj.getString("date")
                val treesArr = dayObj.getJSONArray("trees")
                val trees = mutableListOf<CleaningTree>()
                for (j in 0 until treesArr.length()) {
                    val t = treesArr.getJSONObject(j)
                    trees.add(CleaningTree(
                        taskId = t.optString("taskId", ""),
                        durationSeconds = t.optInt("durationSeconds", 0),
                        outcome = t.optString("outcome", "completed"),
                        tab = t.optString("tab", "space"),
                    ))
                }
                map[date] = trees
            }
            gardenDays.value = map
        } catch (_: Exception) { }
    }

    // ─── 헬퍼 ───

    /** 여러 날짜의 트리를 집계, 25개 초과 시 duration 내림차순 상위 25개 */
    private fun aggregatedTrees(dates: List<String>, days: Map<String, List<CleaningTree>>): List<CleaningTree> {
        val all = dates.flatMap { days[it] ?: emptyList() }
        return if (all.size <= 25) all
        else all.sortedByDescending { it.durationSeconds }.take(25)
    }

    /** 성장 단계: 0=씨앗(<2분), 1=새싹(2-5분), 2=작은나무(5-10분), 3=큰나무(10분+) */
    private fun growthLevel(durationSeconds: Int): Int {
        val minutes = durationSeconds / 60.0
        return when {
            minutes >= 10 -> 3
            minutes >= 5 -> 2
            minutes >= 2 -> 1
            else -> 0
        }
    }

    /** 탭별 크라운(수관) 색상 */
    private fun crownColor(tab: String, level: Int, isAbandoned: Boolean): Color {
        if (isAbandoned) return Color(0xFF9CA3AF)
        return when (tab) {
            "digital" -> when (level) {
                3 -> Color(0xFF3B82F6)
                2 -> Color(0xFF2563EB)
                1 -> Color(0xFF60A5FA)
                else -> Color(0xFF93C5FD)
            }
            "belongings" -> when (level) {
                3 -> Color(0xFF8B5CF6)
                2 -> Color(0xFF7C3AED)
                1 -> Color(0xFFA78BFA)
                else -> Color(0xFFC4B5FD)
            }
            else -> when (level) { // space
                3 -> Color(0xFF22C55E)
                2 -> Color(0xFF16A34A)
                1 -> Color(0xFF84CC16)
                else -> Color(0xFFFCD34D)
            }
        }
    }

    /** 줄기 색상 */
    private fun trunkColor(level: Int, isAbandoned: Boolean): Color {
        if (isAbandoned) return Color(0xFF9CA3AF)
        return when (level) {
            3, 2 -> Color(0xFF92400E)
            1 -> Color(0xFFA16207)
            else -> Color(0xFFD97706)
        }
    }

    private fun dayStatus(dateStr: String, todayStr: String, days: Map<String, List<CleaningTree>>): String {
        val trees = days[dateStr] ?: emptyList()
        if (dateStr == todayStr) return "today"
        if (trees.isEmpty()) return "empty"
        if (trees.any { it.outcome == "completed" }) return "healthy"
        return "wilted"
    }

    private fun completedCount(dateStr: String, days: Map<String, List<CleaningTree>>): Int {
        return (days[dateStr] ?: emptyList()).count { it.outcome == "completed" }
    }

    private fun parseColor(hex: String): Color {
        return try {
            Color(android.graphics.Color.parseColor(hex))
        } catch (_: Exception) {
            Color(0xFFD97706)
        }
    }

    private val todayStr: String get() = LocalDate.now().toString()

    // ─── 기간별 날짜 계산 ───

    private fun datesForPeriod(viewMode: String, offset: Int): List<String> {
        val today = LocalDate.now()
        return when (viewMode) {
            "day" -> {
                listOf(today.plusDays(offset.toLong()).toString())
            }
            "week" -> {
                val weekStart = today.plusWeeks(offset.toLong())
                val sunday = weekStart.minusDays((weekStart.dayOfWeek.value % 7).toLong())
                (0..6).map { sunday.plusDays(it.toLong()).toString() }
            }
            "month" -> {
                val monthDate = today.plusMonths(offset.toLong())
                val ym = YearMonth.of(monthDate.year, monthDate.month)
                (1..ym.lengthOfMonth()).map {
                    LocalDate.of(ym.year, ym.month, it).toString()
                }
            }
            "year" -> {
                val yearDate = today.plusYears(offset.toLong())
                val year = yearDate.year
                val dates = mutableListOf<String>()
                for (m in 1..12) {
                    val ym = YearMonth.of(year, m)
                    for (d in 1..ym.lengthOfMonth()) {
                        dates.add(LocalDate.of(year, m, d).toString())
                    }
                }
                dates
            }
            else -> emptyList()
        }
    }

    private fun headerLabel(viewMode: String, offset: Int): String {
        val today = LocalDate.now()
        return when (viewMode) {
            "day" -> {
                val date = today.plusDays(offset.toLong())
                val label = "${date.year}년 ${date.monthValue}월 ${date.dayOfMonth}일"
                if (offset == 0) "$label (오늘)" else label
            }
            "week" -> {
                val weekDate = today.plusWeeks(offset.toLong())
                val sunday = weekDate.minusDays((weekDate.dayOfWeek.value % 7).toLong())
                val saturday = sunday.plusDays(6)
                "${sunday.monthValue}/${sunday.dayOfMonth} - ${saturday.monthValue}/${saturday.dayOfMonth}"
            }
            "month" -> {
                val monthDate = today.plusMonths(offset.toLong())
                "${monthDate.year}년 ${monthDate.monthValue}월"
            }
            "year" -> {
                val yearDate = today.plusYears(offset.toLong())
                "${yearDate.year}년"
            }
            else -> ""
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Compose UI
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    @Composable
    private fun CleaningGardenContent() {
        val primaryColor = parseColor(primaryColorHex.value)
        val density = LocalDensity.current
        val viewMode = viewModeState.value
        val days = gardenDays.value

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
            // 뷰 모드 탭
            ViewModeTabs(viewMode, primaryColor)

            Spacer(modifier = Modifier.height(12.dp))

            when (viewMode) {
                "day" -> IsometricDayView(days, primaryColor)
                "week" -> WeekView(days, primaryColor)
                "month" -> MonthView(days, primaryColor)
                "year" -> YearView(days, primaryColor)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 레전드
            LegendView()

            Spacer(modifier = Modifier.height(8.dp))
        }
    }

    // ─── 뷰 모드 탭 ───

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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Day View — 아이소메트릭 5×5 정원
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    @Composable
    private fun IsometricDayView(
        days: Map<String, List<CleaningTree>>,
        primaryColor: Color,
    ) {
        val dayOffset = remember { mutableIntStateOf(0) }
        val dates = datesForPeriod("day", dayOffset.intValue)
        val trees = aggregatedTrees(dates, days)

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            // 날짜 헤더
            DateHeader(
                label = headerLabel("day", dayOffset.intValue),
                canGoForward = dayOffset.intValue < 0,
                onBack = {
                    dayOffset.intValue -= 1
                    notifyMonthChange("day", dayOffset.intValue)
                },
                onForward = {
                    dayOffset.intValue += 1
                    notifyMonthChange("day", dayOffset.intValue)
                },
            )

            Spacer(modifier = Modifier.height(8.dp))

            // 아이소메트릭 정원 캔버스
            IsometricGardenCanvas(trees)

            Spacer(modifier = Modifier.height(8.dp))

            // 완료 텍스트
            CompletedText(trees, "day", dayOffset.intValue, primaryColor)
        }
    }

    @Composable
    private fun IsometricGardenCanvas(trees: List<CleaningTree>) {
        val gridSize = 5
        val tileW = 52f  // dp
        val tileH = 26f  // dp
        val gardenW = tileW * gridSize
        val grassDepth = 5f
        val soilDepth = 18f
        val totalDepth = grassDepth + soilDepth
        val totalH = tileH * gridSize + totalDepth + 60f // 나무 높이 여유

        val density = LocalDensity.current

        Canvas(
            modifier = Modifier
                .size(
                    width = (gardenW + 20).dp,
                    height = totalH.dp,
                )
        ) {
            val pxPerDp = density.density
            val tw = tileW * pxPerDp
            val th = tileH * pxPerDp
            val gd = grassDepth * pxPerDp
            val sd = soilDepth * pxPerDp
            val td = gd + sd
            val gw = tw * gridSize
            val gh = th * gridSize
            val offsetX = 10f * pxPerDp // 좌측 여유

            // ── 상면: 타일별 체크보드 잔디 ──
            val grassLight = Color(0xC086EFAC)  // 75% opacity
            val grassDark = Color(0xC76EE7A0)   // 78% opacity

            for (row in 0 until gridSize) {
                for (col in 0 until gridSize) {
                    val isEven = (row + col) % 2 == 0
                    val cx = offsetX + gw / 2 + (col - row) * tw / 2
                    val cy = 30f * pxPerDp + gh / 2 + (col + row) * th / 2 - gh / 2

                    val tilePath = Path().apply {
                        moveTo(cx, cy)
                        lineTo(cx + tw / 2, cy + th / 2)
                        lineTo(cx, cy + th)
                        lineTo(cx - tw / 2, cy + th / 2)
                        close()
                    }
                    drawPath(tilePath, if (isEven) grassLight else grassDark)
                }
            }

            // ── 잔디 위 풀잎 장식 ──
            val bladeColor = Color(0xCC3DBE7B) // 80% opacity
            val bw = maxOf(0.7f * pxPerDp, tw * 0.018f)
            val bh = th * 0.22f
            val sp = tw * 0.035f

            for (row in 0 until gridSize) {
                for (col in 0 until gridSize) {
                    val tcx = offsetX + gw / 2 + (col - row) * tw / 2
                    val tcy = 30f * pxPerDp + gh / 2 + (col + row) * th / 2 - gh / 2 + th / 2

                    // 우측 변: 풀잎 3개
                    val rex = tcx + tw / 4
                    val rey = tcy + th / 4
                    drawBlade(rex - sp, rey, -sp * 1.5f, bh, bladeColor, bw)
                    drawBlade(rex, rey, sp * 0.2f, bh, bladeColor, bw)
                    drawBlade(rex + sp, rey, sp * 1.5f, bh, bladeColor, bw)

                    // 좌측 변: 풀잎 2개
                    val lex = tcx - tw / 4
                    val ley = tcy + th / 4
                    drawBlade(lex - sp * 0.5f, ley, -sp * 1.2f, bh, bladeColor, bw)
                    drawBlade(lex + sp * 0.5f, ley, sp * 1.2f, bh, bladeColor, bw)
                }
            }

            // ── 좌측면: 잔디층 + 흙층 ──
            val groundBaseY = 30f * pxPerDp + gh
            drawPath(Path().apply {
                moveTo(offsetX, groundBaseY - gh / 2)
                lineTo(offsetX + gw / 2, groundBaseY)
                lineTo(offsetX + gw / 2, groundBaseY + gd)
                lineTo(offsetX, groundBaseY - gh / 2 + gd)
                close()
            }, Color(0xFF4ADE80))
            drawPath(Path().apply {
                moveTo(offsetX, groundBaseY - gh / 2 + gd)
                lineTo(offsetX + gw / 2, groundBaseY + gd)
                lineTo(offsetX + gw / 2, groundBaseY + td)
                lineTo(offsetX, groundBaseY - gh / 2 + td)
                close()
            }, Color(0xB392400E)) // 70% opacity
            drawPath(Path().apply {
                moveTo(offsetX, groundBaseY - gh / 2 + gd + sd * 0.6f)
                lineTo(offsetX + gw / 2, groundBaseY + gd + sd * 0.6f)
                lineTo(offsetX + gw / 2, groundBaseY + td)
                lineTo(offsetX, groundBaseY - gh / 2 + td)
                close()
            }, Color(0x8078350F)) // 50% opacity

            // ── 우측면: 잔디층 + 흙층 ──
            drawPath(Path().apply {
                moveTo(offsetX + gw, groundBaseY - gh / 2)
                lineTo(offsetX + gw / 2, groundBaseY)
                lineTo(offsetX + gw / 2, groundBaseY + gd)
                lineTo(offsetX + gw, groundBaseY - gh / 2 + gd)
                close()
            }, Color(0xFF22C55E))
            drawPath(Path().apply {
                moveTo(offsetX + gw, groundBaseY - gh / 2 + gd)
                lineTo(offsetX + gw / 2, groundBaseY + gd)
                lineTo(offsetX + gw / 2, groundBaseY + td)
                lineTo(offsetX + gw, groundBaseY - gh / 2 + td)
                close()
            }, Color(0x99A16207)) // 60% opacity
            drawPath(Path().apply {
                moveTo(offsetX + gw, groundBaseY - gh / 2 + gd + sd * 0.6f)
                lineTo(offsetX + gw / 2, groundBaseY + gd + sd * 0.6f)
                lineTo(offsetX + gw / 2, groundBaseY + td)
                lineTo(offsetX + gw, groundBaseY - gh / 2 + td)
                close()
            }, Color(0x6678350F)) // 40% opacity

            // ── 나무 배치 ──
            for (row in 0 until gridSize) {
                for (col in 0 until gridSize) {
                    val index = row * gridSize + col
                    if (index < trees.size) {
                        val tree = trees[index]
                        val cx = offsetX + gw / 2 + (col - row) * tw / 2
                        val cy = 30f * pxPerDp + gh / 2 + (col + row) * th / 2 - gh / 2 + th / 2
                        val treeY = cy - th * 0.45f
                        val treeSize = tw * 0.65f

                        drawCleaningTree(
                            cx = cx,
                            cy = treeY,
                            size = treeSize,
                            tree = tree,
                        )
                    }
                }
            }
        }
    }

    /** 곡선 풀잎 하나 그리기 */
    private fun DrawScope.drawBlade(x: Float, y: Float, lean: Float, height: Float, color: Color, width: Float) {
        val path = Path().apply {
            moveTo(x, y)
            quadraticTo(
                x + lean * 0.6f, y - height * 0.55f,
                x + lean, y - height,
            )
        }
        drawPath(path, color, style = Stroke(width = width, cap = StrokeCap.Round))
    }

    /** 청소 나무 하나 그리기 */
    private fun DrawScope.drawCleaningTree(cx: Float, cy: Float, size: Float, tree: CleaningTree) {
        val isAbandoned = tree.outcome == "abandoned"
        val level = growthLevel(tree.durationSeconds)
        val crown = crownColor(tree.tab, level, isAbandoned)
        val trunk = trunkColor(level, isAbandoned)

        val w = size
        val h = size
        val groundY = cy + h * 0.38f

        // 땅 타원
        val groundColor = if (isAbandoned) Color(0xFFD1D5DB) else Color(0x4D92400E)
        drawOval(groundColor, Offset(cx - w * 0.3f, groundY), Size(w * 0.6f, h * 0.1f))

        when {
            isAbandoned -> drawWiltedTree(cx, w, h, groundY, crown, trunk)
            level == 0 -> drawSeed(cx, w, h, groundY, crown, trunk)
            level == 1 -> drawSprout(cx, w, h, groundY, crown, trunk)
            level == 2 -> drawSmallTree(cx, w, h, groundY, crown, trunk)
            else -> drawBigTree(cx, w, h, groundY, crown, trunk)
        }
    }

    private fun DrawScope.drawSeed(cx: Float, w: Float, h: Float, groundY: Float, crown: Color, trunk: Color) {
        val seedSize = w * 0.18f
        drawOval(trunk, Offset(cx - seedSize / 2, groundY - seedSize * 0.6f), Size(seedSize, seedSize))
        val tipY = groundY - seedSize * 0.6f - w * 0.08f
        drawLine(crown, Offset(cx, groundY - seedSize * 0.6f), Offset(cx, tipY), strokeWidth = maxOf(1f, w * 0.04f))
    }

    private fun DrawScope.drawSprout(cx: Float, w: Float, h: Float, groundY: Float, crown: Color, trunk: Color) {
        val stemH = h * 0.35f
        val stemTop = groundY - stemH
        val stemW = maxOf(1.5f, w * 0.06f)
        drawLine(trunk, Offset(cx, groundY), Offset(cx, stemTop), strokeWidth = stemW)

        val leafW = w * 0.22f
        val leafH = w * 0.12f
        val leafY = stemTop + stemH * 0.3f
        drawOval(crown, Offset(cx - leafW - stemW / 2, leafY - leafH / 2), Size(leafW, leafH))
        drawOval(crown, Offset(cx + stemW / 2, leafY - leafH * 0.8f), Size(leafW, leafH))

        val topLeafW = w * 0.16f
        val topLeafH = w * 0.20f
        drawOval(crown, Offset(cx - topLeafW / 2, stemTop - topLeafH * 0.7f), Size(topLeafW, topLeafH))
    }

    private fun DrawScope.drawSmallTree(cx: Float, w: Float, h: Float, groundY: Float, crown: Color, trunk: Color) {
        val trunkH = h * 0.32f
        val trunkW = w * 0.10f
        val trunkTop = groundY - trunkH
        val trunkPath = Path().apply {
            moveTo(cx - trunkW * 0.7f, groundY)
            lineTo(cx - trunkW * 0.4f, trunkTop)
            lineTo(cx + trunkW * 0.4f, trunkTop)
            lineTo(cx + trunkW * 0.7f, groundY)
            close()
        }
        drawPath(trunkPath, trunk)

        val crownR = w * 0.28f
        drawOval(crown, Offset(cx - crownR, trunkTop - crownR * 1.3f), Size(crownR * 2, crownR * 1.8f))
        val hlR = crownR * 0.5f
        drawOval(crown.copy(alpha = 0.4f), Offset(cx - hlR * 0.6f, trunkTop - crownR * 1.1f), Size(hlR, hlR * 0.8f))
    }

    private fun DrawScope.drawBigTree(cx: Float, w: Float, h: Float, groundY: Float, crown: Color, trunk: Color) {
        val trunkH = h * 0.42f
        val trunkW = w * 0.12f
        val trunkTop = groundY - trunkH
        val trunkPath = Path().apply {
            moveTo(cx - trunkW * 0.8f, groundY)
            lineTo(cx - trunkW * 0.4f, trunkTop)
            lineTo(cx + trunkW * 0.4f, trunkTop)
            lineTo(cx + trunkW * 0.8f, groundY)
            close()
        }
        drawPath(trunkPath, trunk)

        // 가지
        val branchY = trunkTop + trunkH * 0.3f
        val leftBranch = Path().apply {
            moveTo(cx - trunkW * 0.3f, branchY)
            quadraticTo(cx - w * 0.22f, branchY + h * 0.02f, cx - w * 0.28f, branchY - h * 0.12f)
        }
        drawPath(leftBranch, trunk, style = Stroke(width = maxOf(1.5f, w * 0.04f), cap = StrokeCap.Round))

        val rightBranch = Path().apply {
            moveTo(cx + trunkW * 0.3f, branchY - h * 0.05f)
            quadraticTo(cx + w * 0.2f, branchY - h * 0.02f, cx + w * 0.26f, branchY - h * 0.16f)
        }
        drawPath(rightBranch, trunk, style = Stroke(width = maxOf(1.5f, w * 0.04f), cap = StrokeCap.Round))

        // 수관
        val crownR = w * 0.38f
        drawOval(crown, Offset(cx - crownR, trunkTop - crownR * 1.2f), Size(crownR * 2, crownR * 1.7f))
        val subR = crownR * 0.55f
        drawOval(crown, Offset(cx - crownR * 1.05f, trunkTop - crownR * 0.6f), Size(subR * 1.6f, subR * 1.3f))
        drawOval(crown, Offset(cx + crownR * 0.25f, trunkTop - crownR * 0.7f), Size(subR * 1.5f, subR * 1.2f))
        val hlR = crownR * 0.35f
        drawOval(Color.White.copy(alpha = 0.15f), Offset(cx - hlR * 0.5f, trunkTop - crownR * 1.0f), Size(hlR, hlR * 0.7f))
    }

    private fun DrawScope.drawWiltedTree(cx: Float, w: Float, h: Float, groundY: Float, crown: Color, trunk: Color) {
        val trunkH = h * 0.35f
        val trunkW = w * 0.10f
        val tilt = w * 0.06f
        val trunkTop = groundY - trunkH
        val trunkPath = Path().apply {
            moveTo(cx - trunkW * 0.6f, groundY)
            lineTo(cx - trunkW * 0.3f + tilt, trunkTop)
            lineTo(cx + trunkW * 0.3f + tilt, trunkTop)
            lineTo(cx + trunkW * 0.6f, groundY)
            close()
        }
        drawPath(trunkPath, Color(0xFF9CA3AF))

        val crownR = w * 0.26f
        drawOval(Color(0xFF9CA3AF).copy(alpha = 0.6f), Offset(cx - crownR + tilt, trunkTop - crownR * 0.5f), Size(crownR * 2, crownR * 1.2f))
        drawOval(Color(0xFFD1D5DB), Offset(cx + w * 0.15f, groundY - h * 0.08f), Size(w * 0.08f, w * 0.05f))
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Week View
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    @Composable
    private fun WeekView(
        days: Map<String, List<CleaningTree>>,
        primaryColor: Color,
    ) {
        val weekOffset = remember { mutableIntStateOf(0) }
        val today = LocalDate.now()
        val weekDate = today.plusWeeks(weekOffset.intValue.toLong())
        val sunday = weekDate.minusDays((weekDate.dayOfWeek.value % 7).toLong())
        val weekDates = (0..6).map { sunday.plusDays(it.toLong()) }
        val dayLabels = listOf("일", "월", "화", "수", "목", "금", "토")

        Column {
            // 헤더
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
            ) {
                Icon(
                    Icons.Filled.ChevronLeft, contentDescription = "이전",
                    modifier = Modifier.size(20.dp).clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) {
                        weekOffset.intValue -= 1
                        notifyMonthChange("week", weekOffset.intValue)
                    },
                    tint = Color(0xFF6B7280),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "${weekDates.first().monthValue}/${weekDates.first().dayOfMonth} - ${weekDates.last().monthValue}/${weekDates.last().dayOfMonth}",
                    fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1F2937),
                )
                Spacer(Modifier.width(8.dp))
                Icon(
                    Icons.Filled.ChevronRight, contentDescription = "다음",
                    modifier = Modifier.size(20.dp).clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) {
                        weekOffset.intValue += 1
                        notifyMonthChange("week", weekOffset.intValue)
                    },
                    tint = Color(0xFF6B7280),
                )
                if (weekOffset.intValue != 0) {
                    Spacer(Modifier.width(8.dp))
                    Text("오늘", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = primaryColor,
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { weekOffset.intValue = 0 })
                }
            }

            Spacer(Modifier.height(8.dp))

            // 7일 칼럼
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                weekDates.forEachIndexed { index, date ->
                    val dateStr = date.toString()
                    val isToday = dateStr == todayStr
                    val treesForDay = days[dateStr] ?: emptyList()
                    val completed = treesForDay.count { it.outcome == "completed" }

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isToday) primaryColor.copy(alpha = 0.06f) else Color.Transparent)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                            ) { onDateSelectCallback?.invoke(dateStr) }
                            .padding(vertical = 6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            dayLabels[index], fontSize = 10.sp, fontWeight = FontWeight.SemiBold,
                            color = when (index) {
                                0 -> Color(0xFFEF4444)
                                6 -> Color(0xFF3B82F6)
                                else -> Color(0xFF9CA3AF)
                            },
                        )

                        Spacer(Modifier.height(2.dp))

                        // 날짜 원
                        Box(
                            modifier = Modifier.size(24.dp)
                                .then(if (isToday) Modifier.clip(CircleShape).background(primaryColor) else Modifier),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                "${date.dayOfMonth}", fontSize = 12.sp,
                                fontWeight = if (isToday) FontWeight.Bold else FontWeight.Medium,
                                color = if (isToday) Color.White else Color(0xFF374151),
                            )
                        }

                        Spacer(Modifier.height(4.dp))

                        // 나무 아이콘 (최대 3개)
                        Column(
                            modifier = Modifier.height(40.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            treesForDay.take(3).forEach { tree ->
                                SmallTreeIcon(tree, 24.dp.value)
                                Spacer(Modifier.height(2.dp))
                            }
                            if (treesForDay.size > 3) {
                                Text("+${treesForDay.size - 3}", fontSize = 8.sp, color = Color(0xFF9CA3AF))
                            }
                        }

                        if (completed > 0) {
                            Text("${completed}개", fontSize = 9.sp, color = Color(0xFF6B7280))
                        } else {
                            Text("-", fontSize = 9.sp, color = Color(0xFFD1D5DB))
                        }
                    }
                }
            }
        }
    }

    /** 작은 나무 아이콘 (주간/월간 뷰 셀용) */
    @Composable
    private fun SmallTreeIcon(tree: CleaningTree, sizePx: Float) {
        val isAbandoned = tree.outcome == "abandoned"
        val level = growthLevel(tree.durationSeconds)
        val crown = crownColor(tree.tab, level, isAbandoned)

        Canvas(modifier = Modifier.size(sizePx.dp)) {
            val w = size.width
            val h = size.height
            val cx = w / 2
            val groundY = h * 0.85f

            when {
                isAbandoned -> {
                    drawOval(Color(0xFF9CA3AF).copy(alpha = 0.6f), Offset(cx - w * 0.2f, groundY - w * 0.2f), Size(w * 0.4f, w * 0.3f))
                }
                level == 0 -> {
                    drawOval(Color(0xFFD97706), Offset(cx - w * 0.1f, groundY - w * 0.15f), Size(w * 0.2f, w * 0.2f))
                }
                level == 1 -> {
                    drawLine(Color(0xFFA16207), Offset(cx, groundY), Offset(cx, groundY - h * 0.3f), strokeWidth = w * 0.06f)
                    drawOval(crown, Offset(cx - w * 0.12f, groundY - h * 0.45f), Size(w * 0.24f, w * 0.2f))
                }
                level == 2 -> {
                    drawLine(Color(0xFF92400E), Offset(cx, groundY), Offset(cx, groundY - h * 0.35f), strokeWidth = w * 0.07f)
                    drawOval(crown, Offset(cx - w * 0.2f, groundY - h * 0.6f), Size(w * 0.4f, w * 0.35f))
                }
                else -> {
                    drawLine(Color(0xFF92400E), Offset(cx, groundY), Offset(cx, groundY - h * 0.4f), strokeWidth = w * 0.08f)
                    drawOval(crown, Offset(cx - w * 0.3f, groundY - h * 0.75f), Size(w * 0.6f, w * 0.5f))
                }
            }
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Month View
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    @Composable
    private fun MonthView(
        days: Map<String, List<CleaningTree>>,
        primaryColor: Color,
    ) {
        val displayMonth = remember { mutableStateOf(YearMonth.now()) }
        val ym = displayMonth.value
        val dayLabels = listOf("일", "월", "화", "수", "목", "금", "토")

        Column {
            // 헤더
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Filled.ChevronLeft, contentDescription = "이전",
                    modifier = Modifier.size(20.dp).clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) {
                        displayMonth.value = ym.minusMonths(1)
                        onMonthChangeCallback?.invoke(displayMonth.value.year, displayMonth.value.monthValue)
                    },
                    tint = Color(0xFF6B7280),
                )
                Text(
                    "${ym.year}년 ${ym.monthValue}월",
                    fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1F2937),
                    modifier = Modifier.padding(horizontal = 8.dp),
                )
                Icon(
                    Icons.Filled.ChevronRight, contentDescription = "다음",
                    modifier = Modifier.size(20.dp).clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) {
                        displayMonth.value = ym.plusMonths(1)
                        onMonthChangeCallback?.invoke(displayMonth.value.year, displayMonth.value.monthValue)
                    },
                    tint = Color(0xFF6B7280),
                )
                Spacer(Modifier.weight(1f))
                Text("오늘", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = primaryColor,
                    modifier = Modifier.clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) {
                        displayMonth.value = YearMonth.now()
                        val now = LocalDate.now()
                        onMonthChangeCallback?.invoke(now.year, now.monthValue)
                    })
            }

            Spacer(Modifier.height(8.dp))

            // 요일 헤더
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                dayLabels.forEachIndexed { index, label ->
                    Text(
                        label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                        color = when (index) { 0 -> Color(0xFFEF4444); 6 -> Color(0xFF3B82F6); else -> Color(0xFF9CA3AF) },
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Spacer(Modifier.height(4.dp))

            // 달력 그리드
            val weeks = generateMonthWeeks(ym)
            weeks.forEach { week ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    week.forEach { date ->
                        val dateStr = date.toString()
                        val isCurrentMonth = date.monthValue == ym.monthValue && date.year == ym.year
                        val isToday = dateStr == todayStr
                        val treesForDay = days[dateStr] ?: emptyList()

                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null,
                                ) { onDateSelectCallback?.invoke(dateStr) }
                                .padding(vertical = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Box(
                                modifier = Modifier.size(24.dp)
                                    .then(if (isToday) Modifier.clip(CircleShape).background(primaryColor) else Modifier),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "${date.dayOfMonth}", fontSize = 12.sp,
                                    fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal,
                                    color = when {
                                        isToday -> Color.White
                                        !isCurrentMonth -> Color(0xFFD1D5DB)
                                        else -> Color(0xFF374151)
                                    },
                                )
                            }

                            if (treesForDay.isEmpty()) {
                                Canvas(modifier = Modifier.size(6.dp)) {
                                    drawOval(Color(0xFFF3F4F6), Offset.Zero, Size(size.width, size.height))
                                }
                            } else {
                                val hasCompleted = treesForDay.any { it.outcome == "completed" }
                                val bestTree = treesForDay.firstOrNull { it.outcome == "completed" } ?: treesForDay.first()
                                Box {
                                    SmallTreeIcon(
                                        CleaningTree(bestTree.taskId, bestTree.durationSeconds,
                                            if (hasCompleted) "completed" else "abandoned", bestTree.tab),
                                        14f,
                                    )
                                    if (treesForDay.size > 1) {
                                        Box(
                                            modifier = Modifier
                                                .size(12.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFF6B7280))
                                                .align(Alignment.TopEnd),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Text("${treesForDay.size}", fontSize = 7.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private fun generateMonthWeeks(ym: YearMonth): List<List<LocalDate>> {
        val first = ym.atDay(1)
        val last = ym.atEndOfMonth()
        val firstWeekday = first.dayOfWeek.value % 7 // Sunday = 0
        val startSunday = first.minusDays(firstWeekday.toLong())
        val lastWeekday = last.dayOfWeek.value % 7
        val endSaturday = last.plusDays((6 - lastWeekday).toLong())

        val weeks = mutableListOf<List<LocalDate>>()
        var current = startSunday
        while (!current.isAfter(endSaturday)) {
            weeks.add((0..6).map { current.plusDays(it.toLong()) })
            current = current.plusDays(7)
        }
        return weeks
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Year View
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    @Composable
    private fun YearView(
        days: Map<String, List<CleaningTree>>,
        primaryColor: Color,
    ) {
        val currentYear = LocalDate.now().year

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("${currentYear}년", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1F2937))
            Spacer(Modifier.height(8.dp))

            val rows = listOf(listOf(1,2,3,4), listOf(5,6,7,8), listOf(9,10,11,12))
            rows.forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    row.forEach { month ->
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFFF9FAFB))
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null,
                                ) {
                                    onMonthChangeCallback?.invoke(currentYear, month)
                                    onDateSelectCallback?.invoke(String.format("%04d-%02d-01", currentYear, month))
                                }
                                .padding(vertical = 8.dp, horizontal = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text("${month}월", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF374151))
                            Spacer(Modifier.height(4.dp))
                            MiniHeatmap(currentYear, month, days, primaryColor)
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }

    @Composable
    private fun MiniHeatmap(year: Int, month: Int, days: Map<String, List<CleaningTree>>, primaryColor: Color) {
        val ym = YearMonth.of(year, month)
        val lastDay = ym.lengthOfMonth()
        val cols = 7
        val rows = ceil(lastDay.toDouble() / cols).toInt()

        Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
            for (row in 0 until rows) {
                Row(horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                    for (col in 0 until cols) {
                        val day = row * cols + col + 1
                        if (day <= lastDay) {
                            val dateStr = String.format("%04d-%02d-%02d", year, month, day)
                            val status = dayStatus(dateStr, todayStr, days)
                            val color = when (status) {
                                "healthy" -> Color(0xFFD97706)
                                "wilted" -> Color(0xFFD1D5DB)
                                "today" -> primaryColor
                                else -> Color(0xFFF3F4F6)
                            }
                            Canvas(modifier = Modifier.size(6.dp)) {
                                drawRect(color, Offset.Zero, Size(size.width, size.height))
                            }
                        } else {
                            Spacer(Modifier.size(6.dp))
                        }
                    }
                }
            }
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 공통 UI 컴포넌트
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    @Composable
    private fun DateHeader(label: String, canGoForward: Boolean, onBack: () -> Unit, onForward: () -> Unit) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Filled.ChevronLeft, contentDescription = "이전",
                modifier = Modifier.size(20.dp).clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                ) { onBack() },
                tint = Color(0xFF6B7280),
            )
            Spacer(Modifier.width(8.dp))
            Text(label, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1F2937))
            Spacer(Modifier.width(8.dp))
            if (canGoForward) {
                Icon(
                    Icons.Filled.ChevronRight, contentDescription = "다음",
                    modifier = Modifier.size(20.dp).clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { onForward() },
                    tint = Color(0xFF6B7280),
                )
            } else {
                Spacer(Modifier.size(20.dp))
            }
        }
    }

    @Composable
    private fun CompletedText(trees: List<CleaningTree>, viewMode: String, offset: Int, primaryColor: Color) {
        val completedCount = trees.count { it.outcome == "completed" }
        if (completedCount > 0) {
            val prefix = if (offset == 0) when (viewMode) {
                "day" -> "오늘"
                "week" -> "이번 주"
                "month" -> "이번 달"
                "year" -> "올해"
                else -> ""
            } else ""
            val text = if (prefix.isEmpty()) "${completedCount}개 완료" else "$prefix ${completedCount}개 완료"
            Text(text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = primaryColor, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth())
        } else {
            Text("완료한 태스크가 없습니다", fontSize = 14.sp, color = Color(0xFF9CA3AF), textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth())
        }
    }

    @Composable
    private fun LegendView() {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // 크기별 범례
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                LegendItem(600, "completed", "space", "10m+")
                LegendItem(420, "completed", "space", "5-10m")
                LegendItem(180, "completed", "space", "2-5m")
                LegendItem(60, "completed", "space", "~2m")
                LegendItem(300, "abandoned", "space", "포기")
            }

            Spacer(Modifier.height(6.dp))

            // 탭별 범례
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TabLegendItem("space", "공간")
                TabLegendItem("digital", "디지털")
                TabLegendItem("belongings", "소지품")
            }
        }
    }

    @Composable
    private fun LegendItem(seconds: Int, outcome: String, tab: String, label: String) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            SmallTreeIcon(CleaningTree("", seconds, outcome, tab), 14f)
            Spacer(Modifier.width(4.dp))
            Text(label, fontSize = 11.sp, color = Color(0xFF9CA3AF))
        }
    }

    @Composable
    private fun TabLegendItem(tab: String, label: String) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            SmallTreeIcon(CleaningTree("", 600, "completed", tab), 12f)
            Spacer(Modifier.width(4.dp))
            Text(label, fontSize = 11.sp, color = Color(0xFF6B7280))
        }
    }

    // ─── 월 변경 알림 ───

    private fun notifyMonthChange(viewMode: String, offset: Int) {
        val today = LocalDate.now()
        val targetDate = when (viewMode) {
            "day" -> today.plusDays(offset.toLong())
            "week" -> today.plusWeeks(offset.toLong())
            "month" -> today.plusMonths(offset.toLong())
            "year" -> {
                onMonthChangeCallback?.invoke(today.plusYears(offset.toLong()).year, 0)
                return
            }
            else -> return
        }
        onMonthChangeCallback?.invoke(targetDate.year, targetDate.monthValue)
    }
}
