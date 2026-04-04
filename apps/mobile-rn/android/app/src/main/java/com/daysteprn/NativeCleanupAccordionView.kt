/**
 * NativeCleanupAccordionView — Android Native (Jetpack Compose)
 * iOS NativeCleanupAccordion의 Android 동등 구현
 *
 * 디자인:
 *   - 그룹별 아코디언 (할일, 습관, 프로젝트, 원동력, 관심기록)
 *   - 각 그룹 내 카테고리 카드 + 카운트 배지
 *   - 그룹별 명도 차이로 시각 구분
 *   - spring 애니메이션 확장/축소
 */
package com.daysteprn

import android.view.View
import android.widget.FrameLayout
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FolderSpecial
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.facebook.react.uimanager.ThemedReactContext
import org.json.JSONArray

// ─── 데이터 모델 ────────────────────────────────

data class AccordionCategory(
    val key: String,
    val title: String,
    val count: Int,
)

data class AccordionGroup(
    val groupTitle: String,
    val shade: Float,
    val categories: List<AccordionCategory>,
)

// ─── View ────────────────────────────────────────

class NativeCleanupAccordionView(context: ThemedReactContext) : FrameLayout(context) {

    private val composeView = ComposeView(context)

    // Props
    private var accordionDataState = mutableStateOf<List<AccordionGroup>>(emptyList())
    private var primaryColorHex = mutableStateOf("#6366F1")
    private var expandedGroupsState = mutableStateOf<Set<Int>>(setOf(0))

    // Callbacks
    var onCategoryPressCallback: ((String) -> Unit)? = null
    var onGroupToggleCallback: ((Int) -> Unit)? = null
    var onHeightChangeCallback: ((Double) -> Unit)? = null

    init {
        addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
        composeView.setContent {
            CleanupAccordionContent()
        }

        // ComposeView 레이아웃 변경 시 RN에 크기 전파
        composeView.viewTreeObserver.addOnGlobalLayoutListener {
            post { requestLayout() }
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        requestLayout()
    }

    /**
     * React Native Fabric에서 Compose 뷰 높이를 올바르게 측정하도록 강제
     * FrameLayout의 기본 측정이 ComposeView WRAP_CONTENT를 무시하는 경우 대응
     */
    override fun requestLayout() {
        super.requestLayout()
        // Fabric이 레이아웃을 올바르게 반영하도록 post로 measure/layout 강제 실행
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

    fun setAccordionData(jsonStr: String) {
        try {
            val arr = JSONArray(jsonStr)
            val groups = mutableListOf<AccordionGroup>()
            for (i in 0 until arr.length()) {
                val groupObj = arr.getJSONObject(i)
                val categoriesArr = groupObj.getJSONArray("categories")
                val categories = mutableListOf<AccordionCategory>()
                for (j in 0 until categoriesArr.length()) {
                    val catObj = categoriesArr.getJSONObject(j)
                    categories.add(
                        AccordionCategory(
                            key = catObj.getString("key"),
                            title = catObj.getString("title"),
                            count = catObj.optInt("count", 0),
                        )
                    )
                }
                groups.add(
                    AccordionGroup(
                        groupTitle = groupObj.getString("groupTitle"),
                        shade = groupObj.optDouble("shade", 1.0).toFloat(),
                        categories = categories,
                    )
                )
            }
            accordionDataState.value = groups
        } catch (e: Exception) {
            // JSON 파싱 실패 시 빈 리스트 유지
        }
    }

    fun setPrimaryColor(color: String) {
        primaryColorHex.value = color
    }

    fun setExpandedGroups(indices: List<Int>) {
        expandedGroupsState.value = indices.toSet()
    }

    // ─── Compose UI ───

    @Composable
    private fun CleanupAccordionContent() {
        val groups = accordionDataState.value
        val primaryColor = parseColor(primaryColorHex.value)
        val expandedGroups = expandedGroupsState.value
        val density = LocalDensity.current

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .onGloballyPositioned { coords ->
                    val heightPx = coords.size.height
                    val heightDp = with(density) { heightPx.toDp().value.toDouble() }
                    onHeightChangeCallback?.invoke(heightDp)
                },
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            groups.forEachIndexed { groupIndex, group ->
                val isExpanded = expandedGroups.contains(groupIndex)
                val groupColor = primaryColor.copy(alpha = group.shade)

                AccordionGroupCard(
                    group = group,
                    groupIndex = groupIndex,
                    isExpanded = isExpanded,
                    groupColor = groupColor,
                    primaryColor = primaryColor,
                    onToggle = { onGroupToggleCallback?.invoke(groupIndex) },
                    onCategoryPress = { key -> onCategoryPressCallback?.invoke(key) },
                )
            }
        }
    }

    @Composable
    private fun AccordionGroupCard(
        group: AccordionGroup,
        groupIndex: Int,
        isExpanded: Boolean,
        groupColor: Color,
        primaryColor: Color,
        onToggle: () -> Unit,
        onCategoryPress: (String) -> Unit,
    ) {
        val totalCount = group.categories.sumOf { it.count }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Color.White)
        ) {
            // 그룹 헤더
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { onToggle() }
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // 컬러 인디케이터
                Box(
                    modifier = Modifier
                        .size(4.dp, 20.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(groupColor)
                )

                Spacer(modifier = Modifier.width(12.dp))

                // 그룹 타이틀
                Text(
                    text = group.groupTitle,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1F2937),
                    modifier = Modifier.weight(1f),
                )

                // 카운트 배지
                if (totalCount > 0) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(groupColor.copy(alpha = 0.15f))
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "$totalCount",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = primaryColor,
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))
                }

                // 확장/축소 아이콘
                Icon(
                    imageVector = if (isExpanded)
                        Icons.Default.KeyboardArrowUp
                    else
                        Icons.Default.KeyboardArrowDown,
                    contentDescription = if (isExpanded) "접기" else "펼치기",
                    tint = Color(0xFF9CA3AF),
                    modifier = Modifier.size(24.dp),
                )
            }

            // 카테고리 목록 (애니메이션)
            AnimatedVisibility(
                visible = isExpanded,
                enter = expandVertically(
                    animationSpec = spring(
                        dampingRatio = 0.85f,
                        stiffness = Spring.StiffnessLow,
                    )
                ),
                exit = shrinkVertically(
                    animationSpec = spring(
                        dampingRatio = 0.85f,
                        stiffness = Spring.StiffnessLow,
                    )
                ),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 16.dp, end = 16.dp, bottom = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    group.categories.forEach { category ->
                        CategoryRow(
                            category = category,
                            primaryColor = primaryColor,
                            groupColor = groupColor,
                            onPress = { onCategoryPress(category.key) },
                        )
                    }
                }
            }
        }
    }

    @Composable
    private fun CategoryRow(
        category: AccordionCategory,
        primaryColor: Color,
        groupColor: Color,
        onPress: () -> Unit,
    ) {
        val icon = getCategoryIcon(category.key)

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFFF8FAFC))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                ) { onPress() }
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // 아이콘
            Icon(
                imageVector = icon,
                contentDescription = category.title,
                tint = primaryColor,
                modifier = Modifier.size(18.dp),
            )

            Spacer(modifier = Modifier.width(10.dp))

            // 타이틀
            Text(
                text = category.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF374151),
                modifier = Modifier.weight(1f),
            )

            // 카운트
            if (category.count > 0) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .background(groupColor.copy(alpha = 0.2f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "${category.count}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = primaryColor,
                    )
                }
            } else {
                Text(
                    text = "—",
                    fontSize = 13.sp,
                    color = Color(0xFFCBD5E1),
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

    private fun getCategoryIcon(key: String): ImageVector {
        return when (key) {
            "pastDue" -> Icons.Default.AccessTime
            "completed" -> Icons.Default.CheckCircle
            "pastRecurring" -> Icons.Default.Repeat
            "completedProjects" -> Icons.Default.FolderSpecial
            "onHoldProjects" -> Icons.Default.Pause
            "allNotes" -> Icons.Default.Lightbulb
            "oldInteractions" -> Icons.Default.CalendarMonth
            else -> Icons.Default.CheckCircle
        }
    }
}
