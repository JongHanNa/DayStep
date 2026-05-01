/**
 * NativeAddPersonView — 사람 추가/편집 시트 (Jetpack Compose Material 3)
 *
 * iOS SwiftUI 구현 (NativeAddPerson.swift) 의 Android 대응.
 * UI 컨셉:
 * - create: 짧은 시트 (이름만)
 * - edit:   긴 시트 (이름·별명·관계·역할·부서 chips + 카테고리 sub-sheet)
 * chip long-press → context menu (rename/recolor/delete)
 */
package com.daysteprn.form

import android.content.Context
import android.widget.FrameLayout
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
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
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

// ── Data ──

data class AddPersonData(
    val id: String? = null,
    val name: String = "",
    val nickname: String = "",
)

data class AddPersonCategory(
    val id: String,
    val name: String,
    val color: String,
)

enum class CategoryKind { Relationship, Role, Department;
    fun key() = name.lowercase()
    companion object {
        fun fromKey(s: String) = when (s) {
            "relationship" -> Relationship
            "role" -> Role
            "department" -> Department
            else -> Relationship
        }
    }
}

sealed class CategorySheetMode {
    data class Add(val kind: CategoryKind) : CategorySheetMode()
    data class Rename(val kind: CategoryKind, val item: AddPersonCategory) : CategorySheetMode()
    data class Recolor(val kind: CategoryKind, val item: AddPersonCategory) : CategorySheetMode()
}

class NativeAddPersonView(context: Context) : FrameLayout(context) {

    var onSaveCallback: ((name: String, nickname: String, rel: List<String>, role: List<String>, dept: List<String>) -> Unit)? = null
    var onDeleteCallback: (() -> Unit)? = null
    var onCloseCallback: (() -> Unit)? = null
    var onCategoryAddCallback: ((kind: String, name: String, color: String) -> Unit)? = null
    var onCategoryRenameCallback: ((kind: String, id: String, name: String) -> Unit)? = null
    var onCategoryRecolorCallback: ((kind: String, id: String, color: String) -> Unit)? = null
    var onCategoryDeleteCallback: ((kind: String, id: String) -> Unit)? = null

    private val modeState = mutableStateOf("create")
    private val primaryColorState = mutableStateOf("#3B82F6")
    private val personState = mutableStateOf(AddPersonData())
    private val relationshipsState = mutableStateOf<List<AddPersonCategory>>(emptyList())
    private val rolesState = mutableStateOf<List<AddPersonCategory>>(emptyList())
    private val departmentsState = mutableStateOf<List<AddPersonCategory>>(emptyList())
    private val selectedRelState = mutableStateListOf<String>()
    private val selectedRoleState = mutableStateListOf<String>()
    private val selectedDeptState = mutableStateListOf<String>()
    private val defaultColorByKindState = mutableStateOf<Map<String, String>>(emptyMap())
    private val paletteState = mutableStateOf<List<String>>(emptyList())
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

    fun setPersonData(json: String) {
        try {
            val o = JSONObject(json)
            personState.value = AddPersonData(
                id = o.optString("id").takeIf { it.isNotEmpty() },
                name = o.optString("name", ""),
                nickname = o.optString("nickname", ""),
            )
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun setRelationships(json: String) { relationshipsState.value = decodeCategories(json) }
    fun setRoles(json: String) { rolesState.value = decodeCategories(json) }
    fun setDepartments(json: String) { departmentsState.value = decodeCategories(json) }

    private fun decodeCategories(json: String): List<AddPersonCategory> {
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map {
                val o = arr.getJSONObject(it)
                AddPersonCategory(o.getString("id"), o.getString("name"), o.getString("color"))
            }
        } catch (e: Exception) { emptyList() }
    }

    fun setSelectedRelationshipIds(json: String) { replaceFromJson(json, selectedRelState) }
    fun setSelectedRoleIds(json: String) { replaceFromJson(json, selectedRoleState) }
    fun setSelectedDepartmentIds(json: String) { replaceFromJson(json, selectedDeptState) }

    private fun replaceFromJson(json: String, target: SnapshotStateList<String>) {
        try {
            val arr = JSONArray(json)
            val list = (0 until arr.length()).map { arr.getString(it) }
            target.clear()
            target.addAll(list)
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun setDefaultColorByKind(json: String) {
        try {
            val o = JSONObject(json)
            val map = mutableMapOf<String, String>()
            o.keys().forEach { key -> map[key] = o.getString(key) }
            defaultColorByKindState.value = map
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun setPaletteColors(json: String) {
        try {
            val arr = JSONArray(json)
            paletteState.value = (0 until arr.length()).map { arr.getString(it) }
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun setIsOpen(value: Boolean) { isOpenState.value = value }

    private fun setupCompose() {
        val cv = ComposeView(context).apply {
            setContent {
                AddPersonSheet(
                    isOpen = isOpenState.value,
                    mode = modeState.value,
                    primaryColorHex = primaryColorState.value,
                    person = personState.value,
                    relationships = relationshipsState.value,
                    roles = rolesState.value,
                    departments = departmentsState.value,
                    selectedRel = selectedRelState,
                    selectedRole = selectedRoleState,
                    selectedDept = selectedDeptState,
                    defaultColors = defaultColorByKindState.value,
                    palette = paletteState.value,
                    onSave = { n, nn, r, ro, d -> onSaveCallback?.invoke(n, nn, r, ro, d) },
                    onDelete = { onDeleteCallback?.invoke() },
                    onClose = { onCloseCallback?.invoke() },
                    onCategoryAdd = { k, n, c -> onCategoryAddCallback?.invoke(k.key(), n, c) },
                    onCategoryRename = { k, id, n -> onCategoryRenameCallback?.invoke(k.key(), id, n) },
                    onCategoryRecolor = { k, id, c -> onCategoryRecolorCallback?.invoke(k.key(), id, c) },
                    onCategoryDelete = { k, id -> onCategoryDeleteCallback?.invoke(k.key(), id) },
                )
            }
        }
        addView(cv, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }
}

// ── Compose UI ──

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
private fun AddPersonSheet(
    isOpen: Boolean,
    mode: String,
    primaryColorHex: String,
    person: AddPersonData,
    relationships: List<AddPersonCategory>,
    roles: List<AddPersonCategory>,
    departments: List<AddPersonCategory>,
    selectedRel: SnapshotStateList<String>,
    selectedRole: SnapshotStateList<String>,
    selectedDept: SnapshotStateList<String>,
    defaultColors: Map<String, String>,
    palette: List<String>,
    onSave: (String, String, List<String>, List<String>, List<String>) -> Unit,
    onDelete: () -> Unit,
    onClose: () -> Unit,
    onCategoryAdd: (CategoryKind, String, String) -> Unit,
    onCategoryRename: (CategoryKind, String, String) -> Unit,
    onCategoryRecolor: (CategoryKind, String, String) -> Unit,
    onCategoryDelete: (CategoryKind, String) -> Unit,
) {
    if (!isOpen) return

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    val primary = parseHexColor(primaryColorHex)
    val isCreate = mode == "create"

    var name by remember(person.id, isOpen) { mutableStateOf(person.name) }
    var nickname by remember(person.id, isOpen) { mutableStateOf(person.nickname) }
    var categorySheet by remember { mutableStateOf<CategorySheetMode?>(null) }

    val canSave = name.trim().isNotEmpty()

    fun closeSheet() {
        scope.launch { sheetState.hide() }
        onClose()
    }

    fun toggleSelection(kind: CategoryKind, id: String) {
        val list = when (kind) {
            CategoryKind.Relationship -> selectedRel
            CategoryKind.Role -> selectedRole
            CategoryKind.Department -> selectedDept
        }
        if (list.contains(id)) list.remove(id) else list.add(id)
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
                    if (isCreate) "새 사람 추가" else "정보 수정",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1F2937),
                )
                if (!isCreate) {
                    TextButton(onClick = { onDelete() }) {
                        Text("삭제", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFDC2626))
                    }
                } else {
                    Spacer(Modifier.width(60.dp))
                }
            }

            if (isCreate) {
                // ── Create body ──
                AddPersonSectionLabel("이름")
                AddPersonFieldCard {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        placeholder = { Text("이름", color = Color(0xFF9CA3AF)) },
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyLarge,
                        colors = transparentColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Text(
                    "소중한 분의 이름을 입력하세요",
                    fontSize = 12.sp,
                    color = Color(0xFF9CA3AF),
                    modifier = Modifier.padding(start = 28.dp, top = 4.dp),
                )
                Spacer(Modifier.size(20.dp))
                Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                    PrimaryButton(
                        text = "추가",
                        primary = primary,
                        enabled = canSave,
                        onClick = { onSave(name.trim(), "", emptyList(), emptyList(), emptyList()) },
                    )
                }
                Spacer(Modifier.size(20.dp))
            } else {
                // ── Edit body ──
                AddPersonSectionLabel("이름")
                AddPersonFieldCard {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        placeholder = { Text("이름", color = Color(0xFF9CA3AF)) },
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyLarge,
                        colors = transparentColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                AddPersonSectionLabel("별명 (선택)")
                AddPersonFieldCard {
                    OutlinedTextField(
                        value = nickname,
                        onValueChange = { nickname = it },
                        placeholder = { Text("나만의 별명", color = Color(0xFF9CA3AF)) },
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyLarge,
                        colors = transparentColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                CategoryChipSection(
                    label = "관계",
                    kind = CategoryKind.Relationship,
                    items = relationships,
                    selectedIds = selectedRel,
                    onToggle = { id -> toggleSelection(CategoryKind.Relationship, id) },
                    onAddRequest = { categorySheet = CategorySheetMode.Add(CategoryKind.Relationship) },
                    onRename = { categorySheet = CategorySheetMode.Rename(CategoryKind.Relationship, it) },
                    onRecolor = { categorySheet = CategorySheetMode.Recolor(CategoryKind.Relationship, it) },
                    onDelete = { onCategoryDelete(CategoryKind.Relationship, it.id) },
                    primary = primary,
                )

                CategoryChipSection(
                    label = "역할/직분",
                    kind = CategoryKind.Role,
                    items = roles,
                    selectedIds = selectedRole,
                    onToggle = { id -> toggleSelection(CategoryKind.Role, id) },
                    onAddRequest = { categorySheet = CategorySheetMode.Add(CategoryKind.Role) },
                    onRename = { categorySheet = CategorySheetMode.Rename(CategoryKind.Role, it) },
                    onRecolor = { categorySheet = CategorySheetMode.Recolor(CategoryKind.Role, it) },
                    onDelete = { onCategoryDelete(CategoryKind.Role, it.id) },
                    primary = primary,
                )

                CategoryChipSection(
                    label = "부서/소속",
                    kind = CategoryKind.Department,
                    items = departments,
                    selectedIds = selectedDept,
                    onToggle = { id -> toggleSelection(CategoryKind.Department, id) },
                    onAddRequest = { categorySheet = CategorySheetMode.Add(CategoryKind.Department) },
                    onRename = { categorySheet = CategorySheetMode.Rename(CategoryKind.Department, it) },
                    onRecolor = { categorySheet = CategorySheetMode.Recolor(CategoryKind.Department, it) },
                    onDelete = { onCategoryDelete(CategoryKind.Department, it.id) },
                    primary = primary,
                )

                Spacer(Modifier.size(20.dp))
                Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                    PrimaryButton(
                        text = "저장",
                        primary = primary,
                        enabled = canSave,
                        onClick = {
                            onSave(
                                name.trim(),
                                nickname.trim(),
                                selectedRel.toList(),
                                selectedRole.toList(),
                                selectedDept.toList(),
                            )
                        },
                    )
                }
                Spacer(Modifier.size(20.dp))
            }
        }
    }

    // Category sub-sheet
    categorySheet?.let { mode ->
        CategoryEditSheet(
            mode = mode,
            primary = primary,
            palette = palette,
            defaultColors = defaultColors,
            onAdd = { k, n, c -> onCategoryAdd(k, n, c); categorySheet = null },
            onRename = { k, id, n -> onCategoryRename(k, id, n); categorySheet = null },
            onRecolor = { k, id, c -> onCategoryRecolor(k, id, c); categorySheet = null },
            onDismiss = { categorySheet = null },
        )
    }

    LaunchedEffect(isOpen) {
        if (!isOpen && sheetState.isVisible) sheetState.hide()
    }
}

@OptIn(ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)
@Composable
private fun CategoryChipSection(
    label: String,
    kind: CategoryKind,
    items: List<AddPersonCategory>,
    selectedIds: SnapshotStateList<String>,
    onToggle: (String) -> Unit,
    onAddRequest: () -> Unit,
    onRename: (AddPersonCategory) -> Unit,
    onRecolor: (AddPersonCategory) -> Unit,
    onDelete: (AddPersonCategory) -> Unit,
    primary: Color,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 28.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF8E8E93))
        TextButton(onClick = onAddRequest) {
            Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(14.dp), tint = primary)
            Spacer(Modifier.width(4.dp))
            Text("추가", fontSize = 13.sp, color = primary)
        }
    }
    AddPersonFieldCard {
        if (items.isEmpty()) {
            Text(
                "아직 추가된 항목이 없습니다",
                fontSize = 12.sp,
                color = Color(0xFF9CA3AF),
                modifier = Modifier.padding(8.dp),
            )
        } else {
            FlowRow(
                modifier = Modifier.padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items.forEach { item ->
                    val isSelected = selectedIds.contains(item.id)
                    var menuOpen by remember(item.id) { mutableStateOf(false) }
                    Box {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(
                                    if (isSelected) parseHexColor(item.color)
                                    else parseHexColor(item.color).copy(alpha = 0.15f)
                                )
                                .combinedClickable(
                                    onClick = { onToggle(item.id) },
                                    onLongClick = { menuOpen = true },
                                )
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                        ) {
                            Text(
                                item.name,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isSelected) Color.White else parseHexColor(item.color),
                            )
                        }
                        DropdownMenu(
                            expanded = menuOpen,
                            onDismissRequest = { menuOpen = false },
                        ) {
                            DropdownMenuItem(
                                text = { Text("이름 수정") },
                                leadingIcon = { Icon(Icons.Outlined.Edit, contentDescription = null) },
                                onClick = { menuOpen = false; onRename(item) },
                            )
                            DropdownMenuItem(
                                text = { Text("색상 변경") },
                                leadingIcon = { Icon(Icons.Outlined.Palette, contentDescription = null) },
                                onClick = { menuOpen = false; onRecolor(item) },
                            )
                            DropdownMenuItem(
                                text = { Text("삭제", color = Color(0xFFDC2626)) },
                                leadingIcon = { Icon(Icons.Outlined.Delete, contentDescription = null, tint = Color(0xFFDC2626)) },
                                onClick = { menuOpen = false; onDelete(item) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryEditSheet(
    mode: CategorySheetMode,
    primary: Color,
    palette: List<String>,
    defaultColors: Map<String, String>,
    onAdd: (CategoryKind, String, String) -> Unit,
    onRename: (CategoryKind, String, String) -> Unit,
    onRecolor: (CategoryKind, String, String) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    val title = when (mode) {
        is CategorySheetMode.Add -> "추가"
        is CategorySheetMode.Rename -> "이름 수정"
        is CategorySheetMode.Recolor -> "색상 변경"
    }

    val initialName = when (mode) {
        is CategorySheetMode.Add -> ""
        is CategorySheetMode.Rename -> mode.item.name
        is CategorySheetMode.Recolor -> mode.item.name
    }

    val initialColor = when (mode) {
        is CategorySheetMode.Add -> defaultColors[mode.kind.key()] ?: palette.firstOrNull() ?: "#3B82F6"
        is CategorySheetMode.Rename -> mode.item.color
        is CategorySheetMode.Recolor -> mode.item.color
    }

    var draftName by remember(mode) { mutableStateOf(initialName) }
    var draftColor by remember(mode) { mutableStateOf(initialColor) }

    val canSave = when (mode) {
        is CategorySheetMode.Recolor -> true
        else -> draftName.trim().isNotEmpty()
    }

    fun close() { scope.launch { sheetState.hide(); onDismiss() } }

    fun commit() {
        val trimmed = draftName.trim()
        when (mode) {
            is CategorySheetMode.Add -> if (trimmed.isNotEmpty()) onAdd(mode.kind, trimmed, draftColor)
            is CategorySheetMode.Rename -> if (trimmed.isNotEmpty()) onRename(mode.kind, mode.item.id, trimmed)
            is CategorySheetMode.Recolor -> onRecolor(mode.kind, mode.item.id, draftColor)
        }
    }

    ModalBottomSheet(
        onDismissRequest = { onDismiss() },
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
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = { close() }) {
                    Text("취소", fontSize = 15.sp, color = Color(0xFF1F2937))
                }
                Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1F2937))
                TextButton(onClick = { commit() }, enabled = canSave) {
                    Text("저장", fontSize = 15.sp, fontWeight = FontWeight.SemiBold,
                        color = if (canSave) primary else Color(0xFF9CA3AF))
                }
            }

            if (mode !is CategorySheetMode.Recolor) {
                AddPersonSectionLabel("이름")
                AddPersonFieldCard {
                    OutlinedTextField(
                        value = draftName,
                        onValueChange = { draftName = it },
                        placeholder = { Text("이름", color = Color(0xFF9CA3AF)) },
                        singleLine = true,
                        colors = transparentColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            if (mode !is CategorySheetMode.Rename) {
                AddPersonSectionLabel("색상")
                AddPersonFieldCard {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(5),
                        modifier = Modifier.heightIn(max = 200.dp),
                    ) {
                        items(palette) { hex ->
                            val isSelected = hex.equals(draftColor, ignoreCase = true)
                            Box(
                                modifier = Modifier
                                    .padding(6.dp)
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(parseHexColor(hex))
                                    .clickable { draftColor = hex }
                                    .then(
                                        if (isSelected)
                                            Modifier.border(2.5.dp, Color(0xFF1F2937), CircleShape)
                                        else Modifier
                                    ),
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.size(20.dp))
        }
    }
}

@Composable
private fun AddPersonSectionLabel(label: String) {
    Text(
        label,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = Color(0xFF8E8E93),
        modifier = Modifier.padding(start = 28.dp, top = 12.dp, bottom = 4.dp),
    )
}

@Composable
private fun AddPersonFieldCard(content: @Composable () -> Unit) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
    ) {
        Box(modifier = Modifier.padding(8.dp)) {
            content()
        }
    }
}

@Composable
private fun PrimaryButton(text: String, primary: Color, enabled: Boolean, onClick: () -> Unit) {
    val bg = if (enabled) primary else Color(0xFFD1D5DB)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(bg)
            .clickable(enabled = enabled) { onClick() }
            .padding(vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun transparentColors() = OutlinedTextFieldDefaults.colors(
    unfocusedBorderColor = Color.Transparent,
    focusedBorderColor = Color.Transparent,
    unfocusedContainerColor = Color.Transparent,
    focusedContainerColor = Color.Transparent,
)
