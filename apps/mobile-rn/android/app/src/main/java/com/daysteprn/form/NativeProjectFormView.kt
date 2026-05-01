/**
 * NativeProjectFormView — 프로젝트 추가/수정 시트 (Jetpack Compose Material 3)
 *
 * iOS SwiftUI 구현 (NativeProjectForm.swift) 의 Android 대응.
 * UI 컨셉: 미리보기 카드 + 제목/설명 + 외관 picker(.sheet) + 상태 메뉴 + 연결할일.
 */
package com.daysteprn.form

import android.content.Context
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.EnergySavingsLeaf
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.filled.LinkOff
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Rocket
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.SyncAlt
import androidx.compose.material.icons.filled.Work
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

// ── Data classes ──

data class ProjectFormProject(
    val id: String? = null,
    val title: String = "",
    val description: String = "",
    val color: String = "#A8DADC",
    val icon: String = "briefcase",
    val status: String? = null,
)

data class ProjectFormLinkedTodo(
    val id: String,
    val title: String,
    val completed: Boolean,
    val dateLabel: String,
)

data class ProjectFormStatusMenuItem(
    val title: String,
    val key: String,
)

class NativeProjectFormView(context: Context) : FrameLayout(context) {

    var onSaveCallback: ((title: String, description: String, color: String, icon: String) -> Unit)? = null
    var onStatusChangeCallback: ((String) -> Unit)? = null
    var onUnlinkTodoCallback: ((String) -> Unit)? = null
    var onCloseCallback: (() -> Unit)? = null

    private val modeState = mutableStateOf("create")
    private val primaryColorState = mutableStateOf("#3B82F6")
    private val projectState = mutableStateOf(ProjectFormProject())
    private val linkedTodosState = mutableStateOf<List<ProjectFormLinkedTodo>>(emptyList())
    private val paletteColorsState = mutableStateOf<List<String>>(emptyList())
    private val paletteIconsState = mutableStateOf<List<String>>(emptyList())
    private val statusMenuItemsState = mutableStateOf<List<ProjectFormStatusMenuItem>>(emptyList())
    private val statusLabelState = mutableStateOf("")
    private val statusBadgeColorState = mutableStateOf("#6B7280")
    private val statusBadgeBgState = mutableStateOf("#F3F4F6")
    private val loadingTodosState = mutableStateOf(false)
    private val isOpenState = mutableStateOf(false)
    private var composeAttached = false

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!composeAttached) {
            composeAttached = true
            setupCompose()
        }
    }

    fun setMode(value: String) { modeState.value = value }
    fun setPrimaryColor(value: String) { primaryColorState.value = value }

    fun setProjectData(json: String) {
        try {
            val o = JSONObject(json)
            projectState.value = ProjectFormProject(
                id = o.optString("id").takeIf { it.isNotEmpty() },
                title = o.optString("title", ""),
                description = o.optString("description", ""),
                color = o.optString("color", "#A8DADC"),
                icon = o.optString("icon", "briefcase"),
                status = o.optString("status").takeIf { it.isNotEmpty() && it != "null" },
            )
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun setLinkedTodosData(json: String) {
        try {
            val arr = JSONArray(json)
            val list = mutableListOf<ProjectFormLinkedTodo>()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                list.add(
                    ProjectFormLinkedTodo(
                        id = o.getString("id"),
                        title = o.getString("title"),
                        completed = o.optBoolean("completed", false),
                        dateLabel = o.optString("dateLabel", ""),
                    )
                )
            }
            linkedTodosState.value = list
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun setPaletteColors(json: String) {
        try {
            val arr = JSONArray(json)
            paletteColorsState.value = (0 until arr.length()).map { arr.getString(it) }
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun setPaletteIcons(json: String) {
        try {
            val arr = JSONArray(json)
            paletteIconsState.value = (0 until arr.length()).map { arr.getString(it) }
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun setStatusMenuItemsData(json: String) {
        try {
            val arr = JSONArray(json)
            val list = mutableListOf<ProjectFormStatusMenuItem>()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                list.add(ProjectFormStatusMenuItem(o.getString("title"), o.getString("key")))
            }
            statusMenuItemsState.value = list
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun setStatusLabel(value: String) { statusLabelState.value = value }
    fun setStatusBadgeColor(value: String) { statusBadgeColorState.value = value }
    fun setStatusBadgeBg(value: String) { statusBadgeBgState.value = value }
    fun setLoadingTodos(value: Boolean) { loadingTodosState.value = value }
    fun setIsOpen(value: Boolean) { isOpenState.value = value }

    private fun setupCompose() {
        val cv = ComposeView(context).apply {
            setContent {
                ProjectFormSheet(
                    isOpen = isOpenState.value,
                    mode = modeState.value,
                    primaryColorHex = primaryColorState.value,
                    project = projectState.value,
                    linkedTodos = linkedTodosState.value,
                    paletteColors = paletteColorsState.value,
                    paletteIcons = paletteIconsState.value,
                    statusMenuItems = statusMenuItemsState.value,
                    statusLabel = statusLabelState.value,
                    statusBadgeColor = statusBadgeColorState.value,
                    statusBadgeBg = statusBadgeBgState.value,
                    loadingTodos = loadingTodosState.value,
                    onSave = { t, d, c, i -> onSaveCallback?.invoke(t, d, c, i) },
                    onStatusChange = { onStatusChangeCallback?.invoke(it) },
                    onUnlinkTodo = { onUnlinkTodoCallback?.invoke(it) },
                    onClose = { onCloseCallback?.invoke() },
                )
            }
        }
        addView(cv, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }
}

// ── Lucide → Material Icon mapping ──

internal fun lucideToMaterialIcon(key: String): ImageVector = when (key) {
    "briefcase" -> Icons.Filled.Work
    "target" -> Icons.Filled.GpsFixed
    "lightbulb" -> Icons.Outlined.Lightbulb
    "rocket" -> Icons.Filled.Rocket
    "book" -> Icons.Filled.Book
    "code" -> Icons.Filled.Code
    "camera" -> Icons.Filled.PhotoCamera
    "heart" -> Icons.Filled.Favorite
    "star" -> Icons.Filled.Star
    "leaf" -> Icons.Filled.EnergySavingsLeaf
    "flame" -> Icons.Filled.LocalFireDepartment
    "zap" -> Icons.Filled.Bolt
    "flag" -> Icons.Filled.Flag
    "music" -> Icons.Filled.MusicNote
    "home" -> Icons.Filled.Home
    "globe" -> Icons.Filled.Public
    else -> Icons.Outlined.Circle
}

// ── Compose UI ──

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProjectFormSheet(
    isOpen: Boolean,
    mode: String,
    primaryColorHex: String,
    project: ProjectFormProject,
    linkedTodos: List<ProjectFormLinkedTodo>,
    paletteColors: List<String>,
    paletteIcons: List<String>,
    statusMenuItems: List<ProjectFormStatusMenuItem>,
    statusLabel: String,
    statusBadgeColor: String,
    statusBadgeBg: String,
    loadingTodos: Boolean,
    onSave: (String, String, String, String) -> Unit,
    onStatusChange: (String) -> Unit,
    onUnlinkTodo: (String) -> Unit,
    onClose: () -> Unit,
) {
    if (!isOpen) return

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    val primary = parseHexColor(primaryColorHex)
    val isCreate = mode == "create"

    var title by remember(project.id, isOpen) { mutableStateOf(project.title) }
    var description by remember(project.id, isOpen) { mutableStateOf(project.description) }
    var color by remember(project.id, isOpen) { mutableStateOf(project.color) }
    var icon by remember(project.id, isOpen) { mutableStateOf(project.icon) }
    var showAppearance by remember { mutableStateOf(false) }
    var statusMenuExpanded by remember { mutableStateOf(false) }

    val canSave = title.trim().isNotEmpty()

    fun closeSheet() {
        scope.launch { sheetState.hide() }
        onClose()
    }

    ModalBottomSheet(
        onDismissRequest = { closeSheet() },
        sheetState = sheetState,
        containerColor = Color(0xFFF2F2F7),
        dragHandle = null,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .imePadding()
                .navigationBarsPadding(),
        ) {
            // Toolbar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = { closeSheet() }) {
                    Text("닫기", fontSize = 15.sp, color = Color(0xFF1F2937))
                }
                Text(
                    if (isCreate) "새 프로젝트" else "프로젝트 수정",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1F2937),
                )
                TextButton(
                    onClick = { onSave(title.trim(), description.trim(), color, icon) },
                    enabled = canSave,
                ) {
                    Text(
                        if (isCreate) "만들기" else "수정하기",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (canSave) primary else Color(0xFF9CA3AF),
                    )
                }
            }

            // Preview card
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = parseHexColor(color).copy(alpha = 0.15f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(parseHexColor(color))
                    )
                    Spacer(Modifier.width(12.dp))
                    Icon(
                        lucideToMaterialIcon(icon),
                        contentDescription = null,
                        tint = Color(0xFF1F2937),
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            title.ifEmpty { "프로젝트 제목" },
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (title.isEmpty()) Color(0xFF9CA3AF) else Color(0xFF1F2937),
                            maxLines = 1,
                        )
                        if (description.isNotEmpty()) {
                            Text(
                                description,
                                fontSize = 13.sp,
                                color = Color(0xFF6B7280),
                                maxLines = 1,
                            )
                        }
                    }
                }
            }

            // Title field
            SectionHeader("제목")
            FieldCard {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    placeholder = { Text("프로젝트 제목", color = Color(0xFF9CA3AF)) },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge,
                    colors = transparentTextFieldColors(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            // Description field
            SectionHeader("설명")
            FieldCard {
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    placeholder = { Text("프로젝트 설명 (선택)", color = Color(0xFF9CA3AF)) },
                    minLines = 3,
                    maxLines = 6,
                    colors = transparentTextFieldColors(),
                    modifier = Modifier.fillMaxWidth().heightIn(min = 80.dp),
                )
            }

            // Appearance row
            FieldCard(verticalPadding = 0.dp) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showAppearance = true }
                        .padding(horizontal = 14.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.Palette, contentDescription = null, tint = Color(0xFF6B7280), modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(12.dp))
                    Text("외관", fontSize = 15.sp, fontWeight = FontWeight.Medium, color = Color(0xFF1F2937), modifier = Modifier.weight(1f))
                    Icon(lucideToMaterialIcon(icon), contentDescription = null, tint = Color(0xFF6B7280), modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .clip(CircleShape)
                            .background(parseHexColor(color))
                    )
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color(0xFF9CA3AF), modifier = Modifier.size(18.dp))
                }
            }

            // Status row (edit only)
            if (!isCreate && statusMenuItems.isNotEmpty()) {
                FieldCard(verticalPadding = 0.dp) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.SyncAlt, contentDescription = null, tint = Color(0xFF6B7280), modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(12.dp))
                        Text("상태", fontSize = 15.sp, fontWeight = FontWeight.Medium, color = Color(0xFF1F2937), modifier = Modifier.weight(1f))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(parseHexColor(statusBadgeBg))
                                .padding(horizontal = 8.dp, vertical = 2.dp),
                        ) {
                            Text(statusLabel, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = parseHexColor(statusBadgeColor))
                        }
                        Spacer(Modifier.width(4.dp))
                        Box {
                            IconButton(onClick = { statusMenuExpanded = true }) {
                                Icon(Icons.Filled.SyncAlt, contentDescription = "상태 변경", tint = Color(0xFF9CA3AF))
                            }
                            DropdownMenu(
                                expanded = statusMenuExpanded,
                                onDismissRequest = { statusMenuExpanded = false },
                            ) {
                                statusMenuItems.forEach { item ->
                                    DropdownMenuItem(
                                        text = { Text(item.title) },
                                        onClick = {
                                            statusMenuExpanded = false
                                            onStatusChange(item.key)
                                        },
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Linked todos (edit only)
            if (!isCreate) {
                SectionHeader("연결된 할일")
                FieldCard {
                    Column {
                        if (loadingTodos) {
                            Text("불러오는 중…", fontSize = 13.sp, color = Color(0xFF9CA3AF), modifier = Modifier.padding(8.dp))
                        } else if (linkedTodos.isEmpty()) {
                            Text("연결된 할일이 없습니다", fontSize = 13.sp, color = Color(0xFF9CA3AF), modifier = Modifier.padding(8.dp))
                        } else {
                            linkedTodos.forEach { todo ->
                                ProjectFormTodoRow(
                                    todo = todo,
                                    primary = primary,
                                    onUnlink = { onUnlinkTodo(todo.id) },
                                )
                            }
                        }
                    }
                }
                Spacer(Modifier.size(20.dp))
            } else {
                Spacer(Modifier.size(40.dp))
            }
        }
    }

    // Appearance sub-sheet
    if (showAppearance) {
        AppearanceSheet(
            currentColor = color,
            currentIcon = icon,
            paletteColors = paletteColors,
            paletteIcons = paletteIcons,
            primary = primary,
            onColorSelect = { color = it },
            onIconSelect = { icon = it },
            onClose = { showAppearance = false },
        )
    }

    LaunchedEffect(isOpen) {
        if (!isOpen && sheetState.isVisible) sheetState.hide()
    }
}

@Composable
private fun ProjectFormTodoRow(
    todo: ProjectFormLinkedTodo,
    primary: Color,
    onUnlink: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            if (todo.completed) Icons.Filled.GpsFixed else Icons.Outlined.Circle,
            contentDescription = null,
            tint = if (todo.completed) Color(0xFF22C55E) else Color(0xFF9CA3AF),
            modifier = Modifier.size(16.dp),
        )
        Spacer(Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                todo.title,
                fontSize = 15.sp,
                color = Color(0xFF1F2937),
                maxLines = 1,
            )
            if (todo.dateLabel.isNotEmpty()) {
                Text(todo.dateLabel, fontSize = 12.sp, color = Color(0xFF9CA3AF))
            }
        }
        Box(
            modifier = Modifier
                .clickable { onUnlink() }
                .padding(8.dp),
        ) {
            Icon(Icons.Filled.LinkOff, contentDescription = "해제", tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppearanceSheet(
    currentColor: String,
    currentIcon: String,
    paletteColors: List<String>,
    paletteIcons: List<String>,
    primary: Color,
    onColorSelect: (String) -> Unit,
    onIconSelect: (String) -> Unit,
    onClose: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    ModalBottomSheet(
        onDismissRequest = { onClose() },
        sheetState = sheetState,
        containerColor = Color(0xFFF2F2F7),
        dragHandle = null,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding(),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Spacer(Modifier.width(60.dp))
                Text("외관", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1F2937))
                TextButton(onClick = { scope.launch { sheetState.hide(); onClose() } }) {
                    Text("완료", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = primary)
                }
            }

            SectionHeader("색상")
            FieldCard {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(5),
                    modifier = Modifier.heightIn(max = 200.dp),
                ) {
                    items(paletteColors) { hex ->
                        Box(
                            modifier = Modifier
                                .padding(6.dp)
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(parseHexColor(hex))
                                .clickable { onColorSelect(hex) }
                                .then(
                                    if (hex.equals(currentColor, ignoreCase = true))
                                        Modifier.border(2.5.dp, Color(0xFF1F2937), CircleShape)
                                    else Modifier
                                ),
                        )
                    }
                }
            }

            SectionHeader("아이콘")
            FieldCard {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(6),
                    modifier = Modifier.heightIn(max = 320.dp),
                ) {
                    items(paletteIcons) { key ->
                        val isSelected = key == currentIcon
                        Box(
                            modifier = Modifier
                                .padding(4.dp)
                                .size(44.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (isSelected) primary else Color(0xFFF3F4F6))
                                .clickable { onIconSelect(key) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                lucideToMaterialIcon(key),
                                contentDescription = null,
                                tint = if (isSelected) Color.White else Color(0xFF1F2937),
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.size(20.dp))
        }
    }
}

// ── Reusable bits ──

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = Color(0xFF8E8E93),
        modifier = Modifier.padding(start = 28.dp, top = 12.dp, bottom = 4.dp),
    )
}

@Composable
private fun FieldCard(verticalPadding: androidx.compose.ui.unit.Dp = 8.dp, content: @Composable () -> Unit) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
    ) {
        Box(modifier = Modifier.padding(vertical = verticalPadding)) {
            content()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun transparentTextFieldColors() = OutlinedTextFieldDefaults.colors(
    unfocusedBorderColor = Color.Transparent,
    focusedBorderColor = Color.Transparent,
    unfocusedContainerColor = Color.Transparent,
    focusedContainerColor = Color.Transparent,
)
