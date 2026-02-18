/**
 * FuelDetailBottomSheet — 노트 상세/수정 바텀시트
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
import {View, Text, TextInput, Alert, StyleSheet, Keyboard} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {EMOTION_CONFIG, EMOTION_TAGS} from '@/lib/motivationUtils';
import type {Note, EmotionTag} from '@/stores/noteStore';
import {Pin, Trash2, Link2} from 'lucide-react-native';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';

export interface FuelDetailBottomSheetRef {
  open: (note: Note) => void;
  close: () => void;
}

interface FuelDetailBottomSheetProps {
  onUpdate: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'emotion_tag'>>) => void;
  onPin: (noteId: string, isPinned: boolean) => void;
  onDelete: (noteId: string) => void;
}

export const FuelDetailBottomSheet = forwardRef<FuelDetailBottomSheetRef, FuelDetailBottomSheetProps>(
  ({onUpdate, onPin, onDelete}, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['60%', '85%'], []);
    const {primaryColor} = useTheme();
    const haptic = useHaptic();

    const [note, setNote] = useState<Note | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [emotionTag, setEmotionTag] = useState<EmotionTag | undefined>(undefined);
    const [isEditing, setIsEditing] = useState(false);

    useImperativeHandle(ref, () => ({
      open: (n: Note) => {
        setNote(n);
        setTitle(n.title ?? '');
        setContent(n.content);
        setEmotionTag(n.emotion_tag ?? undefined);
        setIsEditing(false);
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
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />
      ),
      [],
    );

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
                      color={note.is_banner_pinned ? '#F59E0B' : '#9CA3AF'}
                      strokeWidth={2}
                      fill={note.is_banner_pinned ? '#F59E0B' : 'none'}
                    />
                  </AnimatedPressable>
                  <AnimatedPressable onPress={handleDelete} hapticType="light" scaleValue={0.9}>
                    <Trash2 size={20} color="#EF4444" strokeWidth={2} />
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
                          <Text>{config.emoji}</Text>
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
                  <AnimatedPressable
                    onPress={handleSave}
                    haptic={false}
                    scaleValue={0.95}
                    style={[styles.saveBtn, {backgroundColor: primaryColor}]}>
                    <Text style={styles.saveBtnText}>저장</Text>
                  </AnimatedPressable>
                </>
              ) : (
                <>
                  {/* 감정 뱃지 */}
                  {emotionConfig && (
                    <View style={[styles.emotionBadge, {backgroundColor: emotionConfig.bgColor}]}>
                      <Text>{emotionConfig.emoji}</Text>
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

                  {/* 연결된 할일 */}
                  {todoCount > 0 && (
                    <View style={styles.todosSection}>
                      <View style={styles.todosSectionHeader}>
                        <Link2 size={14} color="#6B7280" strokeWidth={2} />
                        <Text style={styles.todosSectionTitle}>
                          연결된 할일 ({todoCount})
                        </Text>
                      </View>
                      {note.todos?.map(todo => (
                        <Text key={todo.id} style={styles.todoItem}>
                          • {todo.title}
                        </Text>
                      ))}
                    </View>
                  )}

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
            </>
          )}
        </BottomSheetScrollView>
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
  todoItem: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 4,
    marginBottom: 4,
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
