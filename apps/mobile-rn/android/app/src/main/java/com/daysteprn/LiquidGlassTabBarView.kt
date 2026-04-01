/**
 * LiquidGlassTabBar — Android Native (Jetpack Compose)
 * iOS 26+ LiquidGlassTabBar의 Android 동등 구현
 *
 * 디자인:
 *   - Material 3 frosted surface (Android 12+: 반투명 레이어, 12 미만: 불투명 카드)
 *   - Compose spring 애니메이션으로 탭 전환 pill + 패널 확장
 *   - SF Symbol → Material Icon 매핑 (material-icons-extended)
 *   - Timer 탭: Canvas로 원형 진행 링 직접 드로잉
 */
package com.daysteprn

import android.content.Context
import android.graphics.Color as AndroidColor
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.widget.FrameLayout
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Assignment
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.ChatBubble
import androidx.compose.material.icons.rounded.Circle
import androidx.compose.material.icons.rounded.CleaningServices
import androidx.compose.material.icons.rounded.DateRange
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Group
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material.icons.rounded.Whatshot
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ─── 데이터 클래스 ───────────────────────────────────────────────────────────

data class TabItemData(val name: String, val sfSymbol: String)

data class MenuItemData(
    val label: String,
    val sfSymbol: String,
    val screenName: String,
    val isActive: Boolean,
)

// ─── 아이콘 매핑 (SF Symbol → Material Icon) ─────────────────────────────────

internal fun sfSymbolToIcon(sfSymbol: String): ImageVector = when (sfSymbol) {
    "house"                -> Icons.Rounded.Home
    "calendar"             -> Icons.Rounded.DateRange
    "timer"                -> Icons.Rounded.Timer
    "flame"                -> Icons.Rounded.Whatshot
    "ellipsis"             -> Icons.Rounded.MoreHoriz
    "gearshape"            -> Icons.Rounded.Settings
    "list.clipboard"       -> Icons.AutoMirrored.Rounded.Assignment
    "sparkles"             -> Icons.Rounded.AutoAwesome
    "message"              -> Icons.Rounded.ChatBubble
    "trash"                -> Icons.Rounded.Delete
    "person.2"             -> Icons.Rounded.Group
    "moon.zzz"             -> Icons.Rounded.Bedtime
    "brain.head.profile"   -> Icons.Rounded.Psychology
    "bubbles.and.sparkles" -> Icons.Rounded.CleaningServices
    else                   -> Icons.Rounded.Circle
}

internal fun parseColor(hex: String): Color = try {
    Color(AndroidColor.parseColor(hex))
} catch (_: Exception) {
    Color(0xFFF97316.toInt())
}

// ─── 뷰 클래스 ───────────────────────────────────────────────────────────────

class LiquidGlassTabBarView(context: Context) : FrameLayout(context) {

    // Compose 상태 — prop 변경 시 자동 recompose
    private val _tabs          = mutableStateOf<List<TabItemData>>(emptyList())
    private val _menuItems     = mutableStateOf<List<MenuItemData>>(emptyList())
    private val _selectedIndex = mutableStateOf(0)
    private val _primaryColor  = mutableStateOf(Color(0xFFF97316.toInt()))
    private val _isExpanded    = mutableStateOf(false)
    private val _timerProgress = mutableStateOf(-1f)
    private val _showLabels    = mutableStateOf(true)

    // RN 이벤트 콜백
    var onTabPressCallback:      ((Int)    -> Unit)? = null
    var onMenuItemPressCallback: ((String) -> Unit)? = null
    var onHeightChangeCallback:  ((Float)  -> Unit)? = null

    init {
        background = ColorDrawable(AndroidColor.TRANSPARENT)
        val composeView = ComposeView(context).apply {
            setViewCompositionStrategy(
                ViewCompositionStrategy.DisposeOnDetachedFromWindowOrReleasedFromPool
            )
            setContent {
                MaterialTheme {
                    LiquidGlassTabBarCompose(
                        tabs          = _tabs.value,
                        menuItems     = _menuItems.value,
                        selectedIndex = _selectedIndex.value,
                        primaryColor  = _primaryColor.value,
                        isExpanded    = _isExpanded.value,
                        timerProgress = _timerProgress.value,
                        showLabels    = _showLabels.value,
                        onTabPress        = { idx  -> onTabPressCallback?.invoke(idx) },
                        onMenuItemPress   = { name -> onMenuItemPressCallback?.invoke(name) },
                        onHeightChange    = { h    -> onHeightChangeCallback?.invoke(h) },
                    )
                }
            }
        }
        addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }

    /**
     * RN Fabric이 뷰를 윈도우에 attach하기 전에 measure를 호출할 수 있음.
     * ComposeView가 아직 attach되지 않았으면 measure를 스킵해서 크래시 방지.
     */
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        if (!isAttachedToWindow) {
            setMeasuredDimension(
                MeasureSpec.getSize(widthMeasureSpec),
                MeasureSpec.getSize(heightMeasureSpec)
            )
            return
        }
        super.onMeasure(widthMeasureSpec, heightMeasureSpec)
    }

    // Prop setters (RN ViewManager → 여기서 state 갱신)
    fun setTabs(tabs: List<TabItemData>)       { _tabs.value          = tabs }
    fun setMenuItems(items: List<MenuItemData>){ _menuItems.value     = items }
    fun setSelectedIndex(index: Int)           { _selectedIndex.value = index }
    fun setPrimaryColorHex(hex: String)        { _primaryColor.value  = parseColor(hex) }
    fun setIsExpanded(expanded: Boolean)       { _isExpanded.value    = expanded }
    fun setTimerProgress(progress: Float)      { _timerProgress.value = progress }
    fun setShowLabels(show: Boolean)           { _showLabels.value    = show }
}

// ─── 최상위 Compose UI ────────────────────────────────────────────────────────

@Composable
private fun LiquidGlassTabBarCompose(
    tabs:          List<TabItemData>,
    menuItems:     List<MenuItemData>,
    selectedIndex: Int,
    primaryColor:  Color,
    isExpanded:    Boolean,
    timerProgress: Float,
    showLabels:    Boolean,
    onTabPress:       (Int)    -> Unit,
    onMenuItemPress:  (String) -> Unit,
    onHeightChange:   (Float)  -> Unit,
) {
    val density = LocalDensity.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .onSizeChanged { size ->
                with(density) { onHeightChange(size.height.toDp().value) }
            }
    ) {
        // 글래스 배경 레이어
        GlassSurface(modifier = Modifier.matchParentSize())

        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Bottom,
        ) {
            // 확장 패널 (AnimatedVisibility로 부드럽게 열고 닫기)
            AnimatedVisibility(
                visible = isExpanded,
                enter = fadeIn(tween(150)) + expandVertically(
                    animationSpec = spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow),
                    expandFrom = Alignment.Bottom,
                ),
                exit = fadeOut(tween(120)) + shrinkVertically(
                    animationSpec = tween(200),
                    shrinkTowards = Alignment.Bottom,
                ),
            ) {
                MoreMenuPanel(
                    menuItems      = menuItems,
                    primaryColor   = primaryColor,
                    showLabels     = showLabels,
                    onMenuItemPress = onMenuItemPress,
                )
            }

            // 탭 아이콘 행 (항상 표시)
            TabIconRow(
                tabs          = tabs,
                selectedIndex = selectedIndex,
                primaryColor  = primaryColor,
                timerProgress = timerProgress,
                isExpanded    = isExpanded,
                onTabPress    = onTabPress,
            )
        }
    }
}

// ─── 글래스 배경 ──────────────────────────────────────────────────────────────

@Composable
private fun GlassSurface(modifier: Modifier = Modifier) {
    // Android 12+: 더 투명하게 → 배경이 살짝 비치는 효과
    // Android 11-: 더 불투명하게 → 완전한 카드 느낌
    val bgAlpha = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) 0.82f else 0.94f
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(32.dp))
            .background(Color.White.copy(alpha = bgAlpha))
    )
}

// ─── 확장 패널 그리드 ──────────────────────────────────────────────────────────

@Composable
private fun MoreMenuPanel(
    menuItems:      List<MenuItemData>,
    primaryColor:   Color,
    showLabels:     Boolean,
    onMenuItemPress: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
    ) {
        // 헤더
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text       = "더 보기",
                fontSize   = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color      = Color(0xFF1F2937),
            )
        }

        // 5열 그리드
        val columns = 5
        menuItems.chunked(columns).forEach { rowItems ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                rowItems.forEach { item ->
                    MenuGridItem(
                        item         = item,
                        primaryColor = primaryColor,
                        showLabels   = showLabels,
                        modifier     = Modifier.weight(1f),
                        onPress      = { onMenuItemPress(item.screenName) },
                    )
                }
                // 빈 셀 채우기
                repeat(columns - rowItems.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
        // 패널과 탭 행 사이 시각적 간격 (Column 레이아웃이므로 겹침 없음)
    }
}

@Composable
private fun MenuGridItem(
    item:        MenuItemData,
    primaryColor: Color,
    showLabels:  Boolean,
    modifier:    Modifier = Modifier,
    onPress:     () -> Unit,
) {
    val iconColor = if (item.isActive) primaryColor else Color(0xFF1A1A2E)
    Column(
        modifier = modifier
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication        = null,
                onClick           = onPress,
            )
            .padding(vertical = if (showLabels) 8.dp else 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector        = sfSymbolToIcon(item.sfSymbol),
            contentDescription = item.label,
            tint               = iconColor,
            modifier           = Modifier.size(24.dp),
        )
        if (showLabels) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text     = item.label,
                fontSize = 10.sp,
                color    = iconColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

// ─── 탭 아이콘 행 ──────────────────────────────────────────────────────────────

@Composable
private fun TabIconRow(
    tabs:          List<TabItemData>,
    selectedIndex: Int,
    primaryColor:  Color,
    timerProgress: Float,
    isExpanded:    Boolean,
    onTabPress:    (Int) -> Unit,
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp),
    ) {
        val count    = tabs.size.coerceAtLeast(1)
        val tabWidth: Dp = maxWidth / count

        // 선택 pill (확장 중에는 숨김)
        if (!isExpanded && tabs.isNotEmpty()) {
            val pillOffsetX by animateDpAsState(
                targetValue    = tabWidth * selectedIndex + 4.dp,
                animationSpec  = spring(dampingRatio = 0.75f, stiffness = 300f),
                label          = "pillOffset",
            )
            Box(
                modifier = Modifier
                    .offset(x = pillOffsetX)
                    .width(tabWidth - 8.dp)
                    .fillMaxHeight()
                    .padding(vertical = 6.dp)
                    .clip(RoundedCornerShape(22.dp))
                    .background(Color.White.copy(alpha = 0.65f)),
            )
        }

        // 탭 버튼 행
        Row(
            modifier              = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment     = Alignment.CenterVertically,
        ) {
            tabs.forEachIndexed { index, tab ->
                val isFocused     = index == selectedIndex
                val iconColor     = if (isFocused) primaryColor else Color(0xFF1A1A2E)
                val showTimerRing = index == 2 && timerProgress >= 0f

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication        = null,
                            onClick           = { onTabPress(index) },
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    if (showTimerRing) {
                        TimerRingCanvas(
                            progress = timerProgress,
                            color    = iconColor,
                            size     = 24.dp,
                        )
                    } else {
                        Icon(
                            imageVector        = sfSymbolToIcon(tab.sfSymbol),
                            contentDescription = tab.name,
                            tint               = iconColor,
                            modifier           = Modifier.size(22.dp),
                        )
                    }
                }
            }
        }
    }
}

// ─── 타이머 링 캔버스 ──────────────────────────────────────────────────────────

@Composable
private fun TimerRingCanvas(progress: Float, color: Color, size: Dp) {
    val sweepAngle by animateFloatAsState(
        targetValue   = 360f * progress.coerceIn(0f, 1f),
        animationSpec = spring(dampingRatio = 0.8f, stiffness = Spring.StiffnessLow),
        label         = "timerSweep",
    )
    Canvas(modifier = Modifier.size(size)) {
        val strokeWidth = 3.dp.toPx()
        val inset       = strokeWidth / 2f
        val oval        = Size(this.size.width - strokeWidth, this.size.height - strokeWidth)
        val topLeft     = Offset(inset, inset)

        // 배경 링
        drawArc(
            color      = Color(0xFFE5E7EB),
            startAngle = 0f,
            sweepAngle = 360f,
            useCenter  = false,
            topLeft    = topLeft,
            size       = oval,
            style      = Stroke(width = strokeWidth, cap = StrokeCap.Round),
        )
        // 진행 호
        if (sweepAngle > 0f) {
            drawArc(
                color      = color,
                startAngle = -90f,
                sweepAngle = sweepAngle,
                useCenter  = false,
                topLeft    = topLeft,
                size       = oval,
                style      = Stroke(width = strokeWidth, cap = StrokeCap.Round),
            )
        }
    }
}
