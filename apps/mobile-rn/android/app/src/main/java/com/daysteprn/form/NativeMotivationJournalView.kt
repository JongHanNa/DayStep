/**
 * NativeMotivationJournalView — 원동력 새기기/편집 시트 (Jetpack Compose Material 3)
 *
 * iOS SwiftUI 구현 (NativeMotivationJournal.swift) 의 Android 대응.
 * UI 컨셉: Apple Journal 스타일 (큰 날짜 + 프롬프트 + 본문 + 연결할일 swipe).
 *
 * 시트 표현: Material 3 ModalBottomSheet (드래그-아래로 닫기 + scrim 자동).
 * Host FrameLayout 은 0-size, ComposeView 가 윈도 레벨로 시트 띄움.
 */
package com.daysteprn.form

import android.content.Context
import android.graphics.Color as AndroidColor
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LinkOff
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.PushPin
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
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

// ── Data classes ──

data class JournalNote(
    val id: String? = null,
    val title: String = "",
    val content: String = "",
    val isPinned: Boolean = false,
    val createdAt: Date = Date(),
)

data class JournalLinkedTodo(
    val id: String,
    val title: String,
)

class NativeMotivationJournalView(context: Context) : FrameLayout(context) {

    // Callbacks
    var onSaveCallback: ((title: String, content: String, isPinned: Boolean) -> Unit)? = null
    var onPinToggleCallback: ((Boolean) -> Unit)? = null
    var onDeleteCallback: (() -> Unit)? = null
    var onUnlinkTodoCallback: ((String) -> Unit)? = null
    var onLinkTodoRequestCallback: (() -> Unit)? = null
    var onCloseCallback: (() -> Unit)? = null

    // State
    private val modeState = mutableStateOf("edit")
    private val primaryColorState = mutableStateOf("#D97706")
    private val promptState = mutableStateOf("🌱 오늘 당신을 움직인 것은 무엇인가요?")
    private val noteState = mutableStateOf(JournalNote())
    private val linkedTodosState = mutableStateOf<List<JournalLinkedTodo>>(emptyList())
    private val isOpenState = mutableStateOf(false)

    private var composeView: ComposeView? = null

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        ensureComposeViewAttached()
        bindComposeContent()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        // 다시 attach될 때 fresh composition 보장
        composeView?.disposeComposition()
    }

    private fun rebuildComposeView() {
        composeView?.let {
            it.disposeComposition()
            removeView(it)
        }
        composeView = null
        ensureComposeViewAttached()
        bindComposeContent()
    }

    // ── Prop setters (Manager 가 호출) ──

    fun setMode(value: String) {
        modeState.value = value
    }

    fun setPrimaryColor(value: String) {
        primaryColorState.value = value
    }

    fun setPrompt(value: String) {
        promptState.value = value
    }

    fun setNoteData(json: String) {
        try {
            val obj = JSONObject(json)
            val createdAt = obj.optString("created_at").let { iso ->
                if (iso.isEmpty()) Date()
                else parseIso8601(iso) ?: Date()
            }
            noteState.value = JournalNote(
                id = obj.optString("id").takeIf { it.isNotEmpty() },
                title = obj.optString("title", ""),
                content = obj.optString("content", ""),
                isPinned = obj.optBoolean("is_banner_pinned", false),
                createdAt = createdAt,
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun setLinkedTodosData(json: String) {
        try {
            val arr = JSONArray(json)
            val list = mutableListOf<JournalLinkedTodo>()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                list.add(JournalLinkedTodo(o.getString("id"), o.getString("title")))
            }
            linkedTodosState.value = list
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun setIsOpen(open: Boolean) {
        // false → true 전환 시: stale composition / dialog 제거 위해 rebuild
        if (open && !isOpenState.value && isAttachedToWindow) {
            isOpenState.value = open
            rebuildComposeView()
        } else {
            isOpenState.value = open
        }
    }

    private fun ensureComposeViewAttached() {
        if (composeView == null) {
            val cv = ComposeView(context)
            composeView = cv
            addView(cv, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        }
    }

    private fun bindComposeContent() {
        composeView?.setContent {
            MotivationJournalSheet(
                isOpen = isOpenState.value,
                mode = modeState.value,
                primaryColorHex = primaryColorState.value,
                prompt = promptState.value,
                note = noteState.value,
                linkedTodos = linkedTodosState.value,
                onSave = { title, content, isPinned ->
                    onSaveCallback?.invoke(title, content, isPinned)
                },
                onPinToggle = { onPinToggleCallback?.invoke(it) },
                onDelete = { onDeleteCallback?.invoke() },
                onUnlinkTodo = { onUnlinkTodoCallback?.invoke(it) },
                onLinkTodoRequest = { onLinkTodoRequestCallback?.invoke() },
                onClose = { onCloseCallback?.invoke() },
            )
        }
    }
}

// ── Helpers ──

internal fun parseHexColor(hex: String): Color {
    return try {
        Color(AndroidColor.parseColor(hex))
    } catch (_: Exception) {
        Color(0xFFD97706)
    }
}

private fun parseIso8601(iso: String): Date? {
    val formats = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
    )
    for (pattern in formats) {
        try {
            val sdf = SimpleDateFormat(pattern, Locale.US)
            sdf.timeZone = TimeZone.getTimeZone("UTC")
            return sdf.parse(iso)
        } catch (_: Exception) {
            // try next pattern
        }
    }
    return null
}

// ── Compose UI ──

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MotivationJournalSheet(
    isOpen: Boolean,
    mode: String,
    primaryColorHex: String,
    prompt: String,
    note: JournalNote,
    linkedTodos: List<JournalLinkedTodo>,
    onSave: (String, String, Boolean) -> Unit,
    onPinToggle: (Boolean) -> Unit,
    onDelete: () -> Unit,
    onUnlinkTodo: (String) -> Unit,
    onLinkTodoRequest: () -> Unit,
    onClose: () -> Unit,
) {
    if (!isOpen) return

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    val primary = parseHexColor(primaryColorHex)
    val isCreate = mode == "create"

    var title by remember(note.id, isOpen) { mutableStateOf(note.title) }
    var content by remember(note.id, isOpen) { mutableStateOf(note.content) }
    var isPinned by remember(note.id, isOpen) { mutableStateOf(note.isPinned) }
    var menuExpanded by remember { mutableStateOf(false) }

    val canSave = content.trim().isNotEmpty()

    fun closeSheet() {
        scope.launch {
            sheetState.hide()
            onClose()
        }
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
            // ── Toolbar ──
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
                    if (isCreate) "원동력 새기기" else "원동력",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1F2937),
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (!isCreate) {
                        Box {
                            IconButton(onClick = { menuExpanded = true }) {
                                Icon(
                                    Icons.Default.MoreVert,
                                    contentDescription = "메뉴",
                                    tint = Color(0xFF6B7280),
                                )
                            }
                            DropdownMenu(
                                expanded = menuExpanded,
                                onDismissRequest = { menuExpanded = false },
                            ) {
                                DropdownMenuItem(
                                    text = { Text(if (isPinned) "고정 해제" else "배너에 고정") },
                                    leadingIcon = {
                                        Icon(Icons.Outlined.PushPin, contentDescription = null)
                                    },
                                    onClick = {
                                        menuExpanded = false
                                        val next = !isPinned
                                        isPinned = next
                                        onPinToggle(next)
                                    },
                                )
                                DropdownMenuItem(
                                    text = { Text("삭제", color = Color(0xFFDC2626)) },
                                    leadingIcon = {
                                        Icon(
                                            Icons.Outlined.Delete,
                                            contentDescription = null,
                                            tint = Color(0xFFDC2626),
                                        )
                                    },
                                    onClick = {
                                        menuExpanded = false
                                        onDelete()
                                    },
                                )
                            }
                        }
                    }
                    TextButton(
                        onClick = {
                            val t = title.trim()
                            val c = content.trim()
                            val p = isPinned
                            scope.launch {
                                sheetState.hide()
                                onSave(t, c, p)
                            }
                        },
                        enabled = canSave,
                    ) {
                        Text(
                            "저장",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (canSave) primary else Color(0xFF9CA3AF),
                        )
                    }
                }
            }

            // ── Date header ──
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
            ) {
                Text(
                    formatKoreanDate(note.createdAt),
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF111827),
                )
                Spacer(Modifier.size(2.dp))
                Text(
                    formatKoreanWeekdayTime(note.createdAt),
                    fontSize = 13.sp,
                    color = Color(0xFF6B7280),
                )
            }

            // ── Prompt ──
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = primary.copy(alpha = 0.08f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 4.dp),
            ) {
                Text(
                    prompt,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = primary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                )
            }

            // ── Title + Content ──
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
            ) {
                Column(modifier = Modifier.padding(8.dp)) {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        placeholder = { Text("제목 (선택)", color = Color(0xFF9CA3AF)) },
                        singleLine = true,
                        textStyle = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Color.Transparent,
                            focusedBorderColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            focusedContainerColor = Color.Transparent,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = content,
                        onValueChange = { content = it },
                        placeholder = { Text("떠오르는 것을 적어보세요…", color = Color(0xFF9CA3AF)) },
                        minLines = 6,
                        maxLines = 12,
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Color.Transparent,
                            focusedBorderColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            focusedContainerColor = Color.Transparent,
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 180.dp),
                    )
                }
            }

            // ── Linked todos (edit only) ──
            if (!isCreate) {
                Text(
                    "연결된 할일",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF6B7280),
                    modifier = Modifier.padding(start = 32.dp, top = 16.dp, bottom = 6.dp),
                )
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                ) {
                    Column {
                        if (linkedTodos.isEmpty()) {
                            Text(
                                "연결된 할일이 없습니다",
                                fontSize = 13.sp,
                                color = Color(0xFF9CA3AF),
                                modifier = Modifier.padding(16.dp),
                            )
                        } else {
                            linkedTodos.forEach { todo ->
                                LinkedTodoRow(
                                    title = todo.title,
                                    primary = primary,
                                    onUnlink = { onUnlinkTodo(todo.id) },
                                )
                            }
                        }
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onLinkTodoRequest() }
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("+ 할일 연결", fontSize = 14.sp, color = primary)
                        }
                    }
                }
                Spacer(Modifier.size(20.dp))
            } else {
                Spacer(Modifier.size(40.dp))
            }
        }
    }

    // 외부 isOpen=false 변경 시 sheet animation
    LaunchedEffect(isOpen) {
        if (!isOpen && sheetState.isVisible) {
            sheetState.hide()
        }
    }
}

@Composable
private fun LinkedTodoRow(title: String, primary: Color, onUnlink: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            title,
            fontSize = 15.sp,
            color = Color(0xFF1F2937),
            modifier = Modifier.weight(1f),
        )
        Surface(
            color = Color.Transparent,
            modifier = Modifier
                .clickable { onUnlink() }
                .padding(8.dp),
        ) {
            Icon(
                Icons.Default.LinkOff,
                contentDescription = "해제",
                tint = Color(0xFFDC2626),
                modifier = Modifier.size(18.dp),
            )
        }
    }
}

private fun formatKoreanDate(date: Date): String {
    val sdf = SimpleDateFormat("yyyy년 M월 d일", Locale("ko", "KR"))
    return sdf.format(date)
}

private fun formatKoreanWeekdayTime(date: Date): String {
    val sdf = SimpleDateFormat("EEEE · a h:mm", Locale("ko", "KR"))
    return sdf.format(date)
}
