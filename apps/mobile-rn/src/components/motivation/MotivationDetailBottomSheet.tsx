/**
 * MotivationDetailBottomSheet — 노트 상세/수정 시트 (iOS pageSheet Modal 기반)
 * 수정, 핀 토글, 삭제, 연결된 할일 표시
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Keyboard,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import type {Note} from '@/stores/motivationStore';
import {useAuthStore} from '@/stores/authStore';
import {supabase} from '@/lib/supabase';
import {NativeTodoPickerNative} from '@/components/native';
import {Pin, Trash2, Link2, Link2Off, Plus} from 'lucide-react-native';

export interface MotivationDetailBottomSheetRef {
  open: (note: Note, startEditing?: boolean) => void;
  close: () => void;
}

interface MotivationDetailBottomSheetProps {
  onUpdate: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'emotion_tag'>>) => void;
  onPin: (noteId: string, isPinned: boolean) => void;
  onDelete: (noteId: string) => void;
  onUnlinkTodo: (motivationId: string, todoId: string) => void;
  onLinkTodo: (motivationId: string, todoId: string, todoTitle: string) => void;
}

// ─── TodoPickerModal ─────────────────────────────
interface PickerTodo {
  id: string;
  title: string;
  recurrence_pattern: string;
  schedule_type: string;
}

interface TodoPickerModalProps {
  visible: boolean;
  motivationId: string;
  linkedTodoIds: Set<string>;
  onToggle: (todoId: string, todoTitle: string, isLinked: boolean) => void;
  onClose: () => void;
}

function TodoPickerModal({visible, motivationId, linkedTodoIds, onToggle, onClose}: TodoPickerModalProps) {
  const {primaryColor} = useTheme();
  const user = useAuthStore(s => s.user);
  const [todos, setTodos] = useState<PickerTodo[]>([]);

  useEffect(() => {
    if (!visible || !user?.id) return;
    (async () => {
      try {
        const {data} = await supabase
          .from('todos')
          .select('id, title, recurrence_pattern, schedule_type')
          .eq('user_id', user.id)
          .is('parent_recurring_todo_id', null)
          .order('created_at', {ascending: false})
          .limit(200);
        setTodos((data as PickerTodo[]) ?? []);
      } catch (err) {
        console.error('[TodoPicker] fetch error:', err);
      }
    })();
  }, [visible, user?.id]);

  const todosDataJSON = useMemo(() => JSON.stringify(todos), [todos]);
  const linkedIdsArray = useMemo(() => Array.from(linkedTodoIds), [linkedTodoIds]);

  const handleTodoToggle = useCallback(
    (e: {nativeEvent: {todoId: string; todoTitle: string; isLinked: boolean}}) => {
      const {todoId, todoTitle, isLinked} = e.nativeEvent;
      onToggle(todoId, todoTitle, isLinked);
    },
    [onToggle],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      {NativeTodoPickerNative ? (
        <NativeTodoPickerNative
          todosData={todosDataJSON}
          linkedTodoIds={linkedIdsArray}
          primaryColor={primaryColor}
          onTodoToggle={handleTodoToggle}
          onClose={handleClose}
          onHeightChange={() => {}}
          style={{flex: 1}}
        />
      ) : (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{color: '#9CA3AF'}}>네이티브 모듈 미등록</Text>
        </View>
      )}
    </Modal>
  );
}

export const MotivationDetailBottomSheet = forwardRef<MotivationDetailBottomSheetRef, MotivationDetailBottomSheetProps>(
  ({onUpdate, onPin, onDelete, onUnlinkTodo, onLinkTodo}, ref) => {
    const {primaryColor, colors} = useTheme();
    const haptic = useHaptic();

    const [visible, setVisible] = useState(false);
    const [note, setNote] = useState<Note | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showTodoPicker, setShowTodoPicker] = useState(false);

    const closeSelf = useCallback(() => {
      Keyboard.dismiss();
      setVisible(false);
    }, []);

    useImperativeHandle(ref, () => ({
      open: (n: Note, startEditing = false) => {
        setNote(n);
        setTitle(n.title ?? '');
        setContent(n.content);
        setIsEditing(startEditing);
        setVisible(true);
      },
      close: closeSelf,
    }));

    const handleSave = useCallback(() => {
      if (!note) return;
      haptic.medium();
      onUpdate(note.id, {
        title: title.trim() || undefined,
        content: content.trim(),
      });
      setIsEditing(false);
      closeSelf();
    }, [note, title, content, onUpdate, haptic, closeSelf]);

    const handlePin = useCallback(() => {
      if (!note) return;
      haptic.light();
      onPin(note.id, !note.is_banner_pinned);
      closeSelf();
    }, [note, onPin, haptic, closeSelf]);

    const handleDelete = useCallback(() => {
      if (!note) return;
      Alert.alert('삭제 확인', '이 원동력을 삭제할까요?', [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            onDelete(note.id);
            closeSelf();
          },
        },
      ]);
    }, [note, onDelete, closeSelf]);

    const handleUnlinkTodo = useCallback(
      (todoId: string) => {
        if (!note) return;
        haptic.light();
        onUnlinkTodo(note.id, todoId);
        setNote(prev => (prev ? {...prev, todos: prev.todos?.filter(t => t.id !== todoId)} : prev));
      },
      [note, onUnlinkTodo, haptic],
    );

    const linkedTodoIds = useMemo(
      () => new Set(note?.todos?.map(t => t.id) ?? []),
      [note?.todos],
    );

    const handlePickerToggle = useCallback(
      (todoId: string, todoTitle: string, isLinked: boolean) => {
        if (!note) return;
        haptic.light();
        if (isLinked) {
          onUnlinkTodo(note.id, todoId);
          setNote(prev => (prev ? {...prev, todos: prev.todos?.filter(t => t.id !== todoId)} : prev));
        } else {
          onLinkTodo(note.id, todoId, todoTitle);
          setNote(prev => (prev ? {...prev, todos: [...(prev.todos ?? []), {id: todoId, title: todoTitle}]} : prev));
        }
      },
      [note, onUnlinkTodo, onLinkTodo, haptic],
    );

    const todoCount = note?.todos?.length ?? 0;

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSelf}>
        <KeyboardAvoidingView
          style={styles.sheetRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {note && (
            <View style={styles.flex1}>
              {/* ─── 고정 상단: 좌(삭제) / 우(핀 + 저장·수정) + 제목 ─── */}
              <View style={styles.topSection}>
                <View style={styles.headerRow}>
                  <AnimatedPressable onPress={handleDelete} hapticType="light" scaleValue={0.9}>
                    <Trash2 size={22} color={colors.error} strokeWidth={2} />
                  </AnimatedPressable>

                  <View style={styles.actions}>
                    <AnimatedPressable onPress={handlePin} hapticType="light" scaleValue={0.9}>
                      <Pin
                        size={22}
                        color={note.is_banner_pinned ? primaryColor : '#9CA3AF'}
                        strokeWidth={2}
                        fill={note.is_banner_pinned ? primaryColor : 'none'}
                      />
                    </AnimatedPressable>

                    {isEditing ? (
                      <AnimatedPressable
                        onPress={handleSave}
                        haptic={false}
                        scaleValue={0.95}
                        style={[styles.primaryActionBtn, {backgroundColor: primaryColor}]}>
                        <Text style={styles.primaryActionBtnText}>저장</Text>
                      </AnimatedPressable>
                    ) : (
                      <AnimatedPressable
                        onPress={() => setIsEditing(true)}
                        hapticType="light"
                        scaleValue={0.95}
                        style={styles.secondaryActionBtn}>
                        <Text style={[styles.secondaryActionBtnText, {color: primaryColor}]}>
                          수정
                        </Text>
                      </AnimatedPressable>
                    )}
                  </View>
                </View>

                {isEditing ? (
                  <TextInput
                    style={styles.titleInput}
                    placeholder="제목 (선택)"
                    placeholderTextColor="#9CA3AF"
                    value={title}
                    onChangeText={setTitle}
                  />
                ) : (
                  note.title && <Text style={styles.noteTitle}>{note.title}</Text>
                )}
              </View>

              {/* ─── flex:1 중간: 내용만 내부 스크롤 ─── */}
              <View style={styles.contentSection}>
                {isEditing ? (
                  <TextInput
                    style={styles.contentInput}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    scrollEnabled
                    textAlignVertical="top"
                  />
                ) : (
                  <ScrollView
                    style={styles.flex1}
                    contentContainerStyle={styles.viewContentContainer}
                    showsVerticalScrollIndicator={false}>
                    <Text style={styles.noteContent}>{note.content}</Text>
                  </ScrollView>
                )}
              </View>

              {/* ─── 고정 하단: 연결된 할일 ─── */}
              <View style={styles.bottomSection}>
                <View style={styles.todosSection}>
                  <View style={styles.todosSectionHeader}>
                    <Link2 size={14} color="#6B7280" strokeWidth={2} />
                    <Text style={styles.todosSectionTitle}>
                      연결된 할일{todoCount > 0 ? ` (${todoCount})` : ''}
                    </Text>
                    <View style={{flex: 1}} />
                    <AnimatedPressable
                      onPress={() => setShowTodoPicker(true)}
                      hapticType="light"
                      scaleValue={0.85}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      <Plus size={16} color={primaryColor} strokeWidth={2.5} />
                    </AnimatedPressable>
                  </View>
                  {note.todos?.map(todo => (
                    <View key={todo.id} style={styles.todoItemRow}>
                      <Text style={styles.todoItem} numberOfLines={1}>
                        • {todo.title}
                      </Text>
                      <AnimatedPressable
                        onPress={() => handleUnlinkTodo(todo.id)}
                        haptic={false}
                        scaleValue={0.85}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                        style={styles.unlinkBtn}>
                        <Link2Off size={14} color="#9CA3AF" strokeWidth={2} />
                      </AnimatedPressable>
                    </View>
                  ))}
                  {todoCount === 0 && (
                    <Text style={styles.emptyTodoText}>연결된 할일이 없습니다</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>

        {note && (
          <TodoPickerModal
            visible={showTodoPicker}
            motivationId={note.id}
            linkedTodoIds={linkedTodoIds}
            onToggle={handlePickerToggle}
            onClose={() => setShowTodoPicker(false)}
          />
        )}
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  flex1: {flex: 1},
  sheetRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  viewContentContainer: {
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  primaryActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  titleInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
    marginBottom: 12,
  },
  contentInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    paddingVertical: 0,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  todosSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  todosSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  todosSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  todoItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  todoItem: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 4,
    flex: 1,
  },
  unlinkBtn: {
    padding: 4,
  },
  emptyTodoText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 4,
  },
});
