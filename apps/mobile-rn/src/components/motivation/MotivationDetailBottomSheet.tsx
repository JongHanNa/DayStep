/**
 * MotivationDetailBottomSheet — 노트 상세/수정 바텀시트
 * 수정, 핀 토글, 삭제, 연결된 할일 표시
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {View, Text, TextInput, Alert, StyleSheet, Keyboard, Modal, Pressable, ScrollView} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {EMOTION_CONFIG, EMOTION_TAGS} from '@/lib/motivationUtils';
import type {Note, EmotionTag} from '@/stores/motivationStore';
import {useAuthStore} from '@/stores/authStore';
import {supabase} from '@/lib/supabase';
import {Pin, Trash2, Link2, Link2Off, Plus, Check} from 'lucide-react-native';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

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
interface TodoPickerModalProps {
  visible: boolean;
  motivationId: string;
  linkedTodoIds: Set<string>;
  onToggle: (todoId: string, todoTitle: string, isLinked: boolean) => void;
  onClose: () => void;
}

function TodoPickerModal({visible, motivationId, linkedTodoIds, onToggle, onClose}: TodoPickerModalProps) {
  const insets = useSafeAreaInsets();
  const {primaryColor} = useTheme();
  const user = useAuthStore(s => s.user);
  const [todos, setTodos] = useState<{id: string; title: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !user?.id) return;
    setLoading(true);
    (async () => {
      try {
        const {data} = await supabase
          .from('todos')
          .select('id, title')
          .eq('user_id', user.id)
          .is('parent_recurring_todo_id', null)
          .order('created_at', {ascending: false})
          .limit(100);
        setTodos(data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, user?.id]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[pickerStyles.container, {paddingTop: 8}]}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.headerTitle}>할일 연결</Text>
          <Pressable onPress={onClose} hitSlop={8} style={pickerStyles.closeBtn}>
            <Text style={[pickerStyles.closeBtnText, {color: primaryColor}]}>완료</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={pickerStyles.emptyContainer}>
            <Text style={pickerStyles.emptyText}>불러오는 중...</Text>
          </View>
        ) : todos.length === 0 ? (
          <View style={pickerStyles.emptyContainer}>
            <Text style={pickerStyles.emptyText}>할일이 없습니다</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[pickerStyles.listContent, {paddingBottom: insets.bottom + 20}]}
            showsVerticalScrollIndicator={false}>
            {todos.map(todo => {
              const isLinked = linkedTodoIds.has(todo.id);
              return (
                <Pressable
                  key={todo.id}
                  onPress={() => onToggle(todo.id, todo.title, isLinked)}
                  style={({pressed}) => [
                    pickerStyles.todoItem,
                    isLinked && {backgroundColor: `${primaryColor}08`, borderColor: primaryColor},
                    pressed && {opacity: 0.7},
                  ]}>
                  <Text style={pickerStyles.todoTitle} numberOfLines={2}>{todo.title}</Text>
                  <View style={[
                    pickerStyles.checkCircle,
                    isLinked && {backgroundColor: primaryColor, borderColor: primaryColor},
                  ]}>
                    {isLinked && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

export const MotivationDetailBottomSheet = forwardRef<MotivationDetailBottomSheetRef, MotivationDetailBottomSheetProps>(
  ({onUpdate, onPin, onDelete, onUnlinkTodo, onLinkTodo}, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['60%', '85%'], []);
    const {primaryColor, colors} = useTheme();
    const haptic = useHaptic();

    const [note, setNote] = useState<Note | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [emotionTag, setEmotionTag] = useState<EmotionTag | undefined>(undefined);
    const [isEditing, setIsEditing] = useState(false);
    const [showTodoPicker, setShowTodoPicker] = useState(false);

    useImperativeHandle(ref, () => ({
      open: (n: Note, startEditing = false) => {
        setNote(n);
        setTitle(n.title ?? '');
        setContent(n.content);
        setEmotionTag(n.emotion_tag ?? undefined);
        setIsEditing(startEditing);
        sheetRef.current?.snapToIndex(0);
      },
      close: () => {
        Keyboard.dismiss();
        sheetRef.current?.close();
      },
    }));

    const handleSave = useCallback(() => {
      if (!note) return;
      haptic.medium();
      onUpdate(note.id, {
        title: title.trim() || undefined,
        content: content.trim(),
        emotion_tag: emotionTag ?? null,
      });
      setIsEditing(false);
      sheetRef.current?.close();
    }, [note, title, content, emotionTag, onUpdate, haptic]);

    const handlePin = useCallback(() => {
      if (!note) return;
      haptic.light();
      onPin(note.id, !note.is_banner_pinned);
      sheetRef.current?.close();
    }, [note, onPin, haptic]);

    const handleDelete = useCallback(() => {
      if (!note) return;
      Alert.alert('삭제 확인', '이 원동력을 삭제할까요?', [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            onDelete(note.id);
            sheetRef.current?.close();
          },
        },
      ]);
    }, [note, onDelete]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0} />
      ),
      [],
    );

    const handleUnlinkTodo = useCallback((todoId: string) => {
      if (!note) return;
      haptic.light();
      onUnlinkTodo(note.id, todoId);
      setNote(prev => prev ? {...prev, todos: prev.todos?.filter(t => t.id !== todoId)} : prev);
    }, [note, onUnlinkTodo, haptic]);

    const linkedTodoIds = useMemo(
      () => new Set(note?.todos?.map(t => t.id) ?? []),
      [note?.todos],
    );

    const handlePickerToggle = useCallback((todoId: string, todoTitle: string, isLinked: boolean) => {
      if (!note) return;
      haptic.light();
      if (isLinked) {
        onUnlinkTodo(note.id, todoId);
        setNote(prev => prev ? {...prev, todos: prev.todos?.filter(t => t.id !== todoId)} : prev);
      } else {
        onLinkTodo(note.id, todoId, todoTitle);
        setNote(prev => prev ? {...prev, todos: [...(prev.todos ?? []), {id: todoId, title: todoTitle}]} : prev);
      }
    }, [note, onUnlinkTodo, onLinkTodo, haptic]);

    const emotionConfig = note?.emotion_tag ? EMOTION_CONFIG[note.emotion_tag] : null;
    const todoCount = note?.todos?.length ?? 0;

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{backgroundColor: '#D1D5DB'}}>
        <BottomSheetScrollView contentContainerStyle={styles.container}>
          {note && (
            <>
              {/* 헤더: 날짜 + 액션 */}
              <View style={styles.headerRow}>
                <Text style={styles.dateText}>
                  {format(new Date(note.created_at), 'yyyy년 M월 d일 (EEE)', {locale: ko})}
                </Text>
                <View style={styles.actions}>
                  <AnimatedPressable onPress={handlePin} hapticType="light" scaleValue={0.9}>
                    <Pin
                      size={20}
                      color={note.is_banner_pinned ? primaryColor : '#9CA3AF'}
                      strokeWidth={2}
                      fill={note.is_banner_pinned ? primaryColor : 'none'}
                    />
                  </AnimatedPressable>
                  <AnimatedPressable onPress={handleDelete} hapticType="light" scaleValue={0.9}>
                    <Trash2 size={20} color={colors.error} strokeWidth={2} />
                  </AnimatedPressable>
                </View>
              </View>

              {isEditing ? (
                <>
                  {/* 감정 태그 편집 */}
                  <View style={styles.emotionRow}>
                    {EMOTION_TAGS.map(tag => {
                      const config = EMOTION_CONFIG[tag];
                      const isSelected = emotionTag === tag;
                      return (
                        <AnimatedPressable
                          key={tag}
                          onPress={() => setEmotionTag(isSelected ? undefined : tag)}
                          scaleValue={0.9}
                          hapticType="selection"
                          style={[
                            styles.emotionChip,
                            isSelected && {
                              backgroundColor: config.bgColor,
                              borderColor: config.borderColor,
                            },
                          ]}>
                          <config.icon size={16} color={isSelected ? config.color : '#6B7280'} strokeWidth={2} />
                          {isSelected && (
                            <Text style={[styles.emotionLabel, {color: config.color}]}>
                              {config.label}
                            </Text>
                          )}
                        </AnimatedPressable>
                      );
                    })}
                  </View>

                  <TextInput
                    style={styles.titleInput}
                    placeholder="제목 (선택)"
                    placeholderTextColor="#9CA3AF"
                    value={title}
                    onChangeText={setTitle}
                  />
                  <TextInput
                    style={styles.contentInput}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              ) : (
                <>
                  {/* 감정 뱃지 */}
                  {emotionConfig && (
                    <View style={[styles.emotionBadge, {backgroundColor: emotionConfig.bgColor}]}>
                      <emotionConfig.icon size={14} color={emotionConfig.color} strokeWidth={2} />
                      <Text style={[styles.emotionLabel, {color: emotionConfig.color}]}>
                        {emotionConfig.label}
                      </Text>
                    </View>
                  )}

                  {/* 제목 */}
                  {note.title && (
                    <Text style={styles.noteTitle}>{note.title}</Text>
                  )}

                  {/* 내용 */}
                  <Text style={styles.noteContent}>{note.content}</Text>

                  {/* 수정 버튼 */}
                  <AnimatedPressable
                    onPress={() => setIsEditing(true)}
                    hapticType="light"
                    scaleValue={0.95}
                    style={styles.editBtn}>
                    <Text style={[styles.editBtnText, {color: primaryColor}]}>수정하기</Text>
                  </AnimatedPressable>
                </>
              )}

              {/* 연결된 할일 — 편집/보기 모드 공통 */}
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

              {/* 저장 버튼 — 편집 모드에서만 최하단 */}
              {isEditing && (
                <AnimatedPressable
                  onPress={handleSave}
                  haptic={false}
                  scaleValue={0.95}
                  style={[styles.saveBtn, {backgroundColor: primaryColor}]}>
                  <Text style={styles.saveBtnText}>저장</Text>
                </AnimatedPressable>
              )}
            </>
          )}
        </BottomSheetScrollView>
        {note && (
          <TodoPickerModal
            visible={showTodoPicker}
            motivationId={note.id}
            linkedTodoIds={linkedTodoIds}
            onToggle={handlePickerToggle}
            onClose={() => setShowTodoPicker(false)}
          />
        )}
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  emotionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  emotionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
    marginBottom: 12,
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
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    minHeight: 120,
    paddingVertical: 0,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    marginBottom: 16,
  },
  todosSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 16,
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
  editBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

const pickerStyles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#1F2937'},
  closeBtn: {padding: 4},
  closeBtnText: {fontSize: 15, fontWeight: '600'},
  listContent: {paddingTop: 8, paddingHorizontal: 16},
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    gap: 12,
  },
  todoTitle: {flex: 1, fontSize: 14, color: '#1F2937', lineHeight: 20},
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8},
  emptyText: {fontSize: 15, color: '#9CA3AF', fontWeight: '500'},
});
