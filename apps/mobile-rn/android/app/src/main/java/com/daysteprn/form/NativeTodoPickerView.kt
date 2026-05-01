/**
 * NativeTodoPickerView — Android Native (Jetpack Compose)
 * 할일 연결 피커: 검색 + 그룹 리스트 (연결됨/반복/일반)
 */
package com.daysteprn.form

import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONArray

// Data class
data class PickerTodo(
    val id: String,
    val title: String,
    val recurrencePattern: String,
    val scheduleType: String,
)

class NativeTodoPickerView(context: android.content.Context) : FrameLayout(context) {

    var onTodoToggleCallback: ((String, String, Boolean) -> Unit)? = null
    var onCloseCallback: (() -> Unit)? = null
    var onHeightChangeCallback: ((Double) -> Unit)? = null

    private val todosState = mutableStateOf<List<PickerTodo>>(emptyList())
    private val linkedIdsState = mutableStateOf<Set<String>>(emptySet())
    private val primaryColorState = mutableStateOf("#D97706")
    private var composeView: ComposeView? = null

    init {
        setupCompose()
    }

    fun setTodosData(json: String) {
        try {
            val arr = JSONArray(json)
            val list = mutableListOf<PickerTodo>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                list.add(
                    PickerTodo(
                        id = obj.getString("id"),
                        title = obj.getString("title"),
                        recurrencePattern = obj.optString("recurrence_pattern", "none"),
                        scheduleType = obj.optString("schedule_type", "anytime"),
                    )
                )
            }
            todosState.value = list
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun setLinkedTodoIds(ids: List<String>) {
        linkedIdsState.value = ids.toSet()
    }

    fun setPrimaryColor(hex: String) {
        primaryColorState.value = hex
    }

    private fun setupCompose() {
        val cv = ComposeView(context).apply {
            setContent {
                TodoPickerScreen(
                    todos = todosState.value,
                    linkedIds = linkedIdsState.value,
                    primaryColorHex = primaryColorState.value,
                    onTodoToggle = { id, title, isLinked ->
                        onTodoToggleCallback?.invoke(id, title, isLinked)
                    },
                    onClose = { onCloseCallback?.invoke() },
                    onHeightChange = { onHeightChangeCallback?.invoke(it) },
                )
            }
        }
        composeView = cv
        addView(cv, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }
}

// ── Compose UI ──

private fun todoPickerParseColor(hex: String): Color {
    return try {
        val colorInt = android.graphics.Color.parseColor(hex)
        Color(
            red = android.graphics.Color.red(colorInt) / 255f,
            green = android.graphics.Color.green(colorInt) / 255f,
            blue = android.graphics.Color.blue(colorInt) / 255f,
            alpha = android.graphics.Color.alpha(colorInt) / 255f,
        )
    } catch (_: Exception) {
        Color(red = 0.85f, green = 0.47f, blue = 0.02f)
    }
}

@Composable
private fun TodoPickerScreen(
    todos: List<PickerTodo>,
    linkedIds: Set<String>,
    primaryColorHex: String,
    onTodoToggle: (String, String, Boolean) -> Unit,
    onClose: () -> Unit,
    onHeightChange: (Double) -> Unit,
) {
    val primary = todoPickerParseColor(primaryColorHex)
    var searchText by remember { mutableStateOf("") }
    val density = LocalDensity.current

    val filtered = remember(todos, searchText) {
        val q = searchText.trim().lowercase()
        if (q.isEmpty()) todos else todos.filter { it.title.lowercase().contains(q) }
    }

    val linked = remember(filtered, linkedIds) { filtered.filter { linkedIds.contains(it.id) } }
    val recurring = remember(filtered, linkedIds) {
        filtered.filter { !linkedIds.contains(it.id) && it.recurrencePattern != "none" && it.recurrencePattern.isNotEmpty() }
    }
    val normal = remember(filtered, linkedIds) {
        filtered.filter { !linkedIds.contains(it.id) && (it.recurrencePattern == "none" || it.recurrencePattern.isEmpty()) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF2F2F7))
            .onGloballyPositioned { coords ->
                val h = with(density) { coords.size.height.toDp().value.toDouble() }
                onHeightChange(h)
            }
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("할일 연결", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1F2937))
            TextButton(onClick = onClose) {
                Text("완료", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = primary)
            }
        }

        // Search bar
        OutlinedTextField(
            value = searchText,
            onValueChange = { searchText = it },
            placeholder = { Text("할일 검색", color = Color(0xFF8E8E93)) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color(0xFF8E8E93), modifier = Modifier.size(18.dp)) },
            singleLine = true,
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedContainerColor = Color(0xFFE5E5EA),
                focusedContainerColor = Color(0xFFE5E5EA),
                unfocusedBorderColor = Color.Transparent,
                focusedBorderColor = primary,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(44.dp),
        )

        Spacer(modifier = Modifier.height(8.dp))

        // List
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
        ) {
            if (linked.isNotEmpty()) {
                item { SectionHeader("연결됨 (${linked.size})") }
                item {
                    GroupCard {
                        linked.forEachIndexed { index, todo ->
                            TodoItemRow(todo, isLinked = true, primary = primary, showDivider = index < linked.size - 1) {
                                onTodoToggle(todo.id, todo.title, true)
                            }
                        }
                    }
                }
            }

            if (recurring.isNotEmpty()) {
                item { SectionHeader("반복 할일") }
                item {
                    GroupCard {
                        recurring.forEachIndexed { index, todo ->
                            TodoItemRow(todo, isLinked = false, primary = primary, showDivider = index < recurring.size - 1) {
                                onTodoToggle(todo.id, todo.title, false)
                            }
                        }
                    }
                }
            }

            if (normal.isNotEmpty()) {
                item { SectionHeader("일반 할일") }
                item {
                    GroupCard {
                        normal.forEachIndexed { index, todo ->
                            TodoItemRow(todo, isLinked = false, primary = primary, showDivider = index < normal.size - 1) {
                                onTodoToggle(todo.id, todo.title, false)
                            }
                        }
                    }
                }
            }

            if (linked.isEmpty() && recurring.isEmpty() && normal.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 60.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (searchText.isEmpty()) "할일이 없습니다" else "검색 결과가 없습니다",
                            color = Color(0xFF9CA3AF),
                            fontSize = 15.sp,
                        )
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(20.dp)) }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = Color(0xFF8E8E93),
        modifier = Modifier.padding(start = 32.dp, top = 16.dp, bottom = 6.dp),
    )
}

@Composable
private fun GroupCard(content: @Composable () -> Unit) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
    ) {
        Column { content() }
    }
}

@Composable
private fun TodoItemRow(
    todo: PickerTodo,
    isLinked: Boolean,
    primary: Color,
    showDivider: Boolean,
    onClick: () -> Unit,
) {
    val isRecurring = todo.recurrencePattern != "none" && todo.recurrencePattern.isNotEmpty()

    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onClick() }
                .padding(horizontal = 14.dp, vertical = 11.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Type icon
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (isRecurring) Color(0xFFEDE9FE) else Color(0xFFFEF3C7)),
                contentAlignment = Alignment.Center,
            ) {
                if (isRecurring) {
                    Icon(Icons.Default.Repeat, contentDescription = null, tint = Color(0xFF7C3AED), modifier = Modifier.size(14.dp))
                } else {
                    Icon(Icons.Outlined.Circle, contentDescription = null, tint = primary, modifier = Modifier.size(14.dp))
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Text
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = todo.title,
                    fontSize = 15.sp,
                    color = Color(0xFF1F2937),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (isRecurring) {
                    Text(
                        text = when (todo.recurrencePattern) {
                            "daily" -> "매일 반복"
                            "weekly" -> "매주 반복"
                            else -> "반복"
                        },
                        fontSize = 11.sp,
                        color = Color(0xFF9CA3AF),
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Check circle
            Box(
                modifier = Modifier
                    .size(22.dp)
                    .clip(CircleShape)
                    .background(if (isLinked) primary else Color.Transparent)
                    .then(
                        if (!isLinked) Modifier.background(Color.Transparent)
                        else Modifier
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (isLinked) {
                    Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                } else {
                    Box(
                        modifier = Modifier
                            .size(22.dp)
                            .clip(CircleShape)
                            .background(Color.Transparent)
                            .then(
                                Modifier.background(Color.Transparent) // border via draw
                            ),
                    ) {
                        androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
                            drawCircle(
                                color = Color(0xFFD1D5DB),
                                radius = size.minDimension / 2 - 1.dp.toPx(),
                                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.dp.toPx()),
                            )
                        }
                    }
                }
            }
        }

        if (showDivider) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 54.dp, end = 14.dp)
                    .height(0.5.dp)
                    .background(Color(0xFFF0F0F0))
            )
        }
    }
}
