/**
 * Record Screen — 관계 기록하기 (통합 리디자인)
 * 3단계 플로우: select-person → write-news → completed
 * Step 1: 사람 중심 카드 + 인라인 소식/감사 프리뷰
 */
import React, {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import {useRoute} from '@react-navigation/native';
import {
  Text,
  View,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {ScreenContainer, AnimatedCard, AnimatedPressable, GlassBackground} from '@/components/core';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Heart,
  Check,
  Users,
  Clock,
  MoreHorizontal,
  MessageCircle,
} from 'lucide-react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {RelationshipStatsModal} from '@/components/record/RelationshipStatsModal';
import type {RelationshipStatsModalRef} from '@/components/record/RelationshipStatsModal';
import {NotesTimelineModal} from '@/components/record/NotesTimelineModal';
import type {NotesTimelineModalRef} from '@/components/record/NotesTimelineModal';
import {AddPersonBottomSheet} from '@/components/record/AddPersonBottomSheet';
import type {AddPersonBottomSheetRef} from '@/components/record/AddPersonBottomSheet';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import type {CherishedPerson} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {useLimitCheck} from '@/hooks/useLimitCheck';
import {LimitReachedModal} from '@/components/subscription/LimitReachedModal';
import {
  INTERACTION_TYPE_LABELS,
  type InteractionType,
  type CareInteractionInput,
  type NoteWithPerson,
} from '@/types/cherished-people';
import {resolveTodoIcon} from '@/lib/iconMap';
import {hexWithOpacity} from '@/lib/todoUtils';
import {LiquidGlassMenu} from '@/components/native/LiquidGlassMenu';
import {useTheme} from '@/theme';
import {springs} from '@/theme/animations';
import {format, differenceInDays} from 'date-fns';

type Step = 'select-person' | 'write-news' | 'completed';

const INTERACTION_TYPES = Object.entries(INTERACTION_TYPE_LABELS) as [
  InteractionType,
  {label: string; icon: string},
][];

function InteractionTypeGrid({
  selected,
  onSelect,
  primaryColor,
}: {
  selected: InteractionType;
  onSelect: (type: InteractionType) => void;
  primaryColor: string;
}) {
  return (
    <View className="flex-row flex-wrap">
      {INTERACTION_TYPES.map(([type, {label, icon}]) => {
        const isSelected = type === selected;
        const IconComp = resolveTodoIcon(icon);
        return (
          <AnimatedPressable
            key={type}
            onPress={() => onSelect(type)}
            hapticType="light"
            scaleValue={0.97}
            className={`w-[33%] p-1`}>
            <View
              className="items-center py-3 rounded-xl"
              style={{
                backgroundColor: isSelected
                  ? hexWithOpacity(primaryColor, 0.1)
                  : '#F9FAFB',
                borderWidth: isSelected ? 1 : 0,
                borderColor: isSelected
                  ? hexWithOpacity(primaryColor, 0.3)
                  : 'transparent',
              }}>
              {IconComp && (
                <IconComp size={20} color={isSelected ? primaryColor : '#9CA3AF'} />
              )}
              <Text
                className="text-xs mt-1"
                style={{
                  color: isSelected ? primaryColor : '#6B7280',
                  fontWeight: isSelected ? '500' : '400',
                }}>
                {label}
              </Text>
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

/** 인라인 노트 프리뷰 (소식/감사 1줄씩) */
function NotePreview({notes}: {notes: NoteWithPerson[]}) {
  if (notes.length === 0) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.springify().damping(25).stiffness(247).mass(1)}
      className="mt-2 pl-11">
      {notes.map(note => {
        const isNews = !!note.recent_news;
        const content = note.recent_news || note.gratitude_note || '';
        return (
          <View key={note.id} className="flex-row items-center mb-1">
            {isNews ? (
              <MessageCircle size={12} color="#3B82F6" />
            ) : (
              <Heart size={12} color="#22C55E" />
            )}
            <Text className={`text-xs ml-1.5 ${isNews ? 'text-blue-600' : 'text-green-600'}`}>
              {isNews ? '소식' : '감사'}
            </Text>
            <Text className="text-xs text-gray-500 ml-2 flex-1" numberOfLines={1}>
              {content}
            </Text>
          </View>
        );
      })}
    </Animated.View>
  );
}

/** 접힌 필드 그룹 (부탁·메모) */
function CollapsibleFields({
  requestFromThem,
  setRequestFromThem,
  requestToThem,
  setRequestToThem,
  meetingNote,
  setMeetingNote,
  primaryColor,
}: {
  requestFromThem: string;
  setRequestFromThem: (v: string) => void;
  requestToThem: string;
  setRequestToThem: (v: string) => void;
  meetingNote: string;
  setMeetingNote: (v: string) => void;
  primaryColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentHeight = useRef(0);
  const animHeight = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    height: animHeight.value,
    overflow: 'hidden',
  }));

  const toggleExpanded = useCallback(() => {
    if (expanded) {
      animHeight.value = withSpring(0, springs.nativeGlass);
    } else {
      animHeight.value = withSpring(contentHeight.current, springs.nativeGlass);
    }
    setExpanded(!expanded);
  }, [expanded, animHeight]);

  return (
    <>
      <View className="px-4 mb-2">
        <AnimatedPressable
          onPress={toggleExpanded}
          hapticType="light"
          scaleValue={0.98}
          className="flex-row items-center py-2">
          <Plus size={14} color={primaryColor} style={expanded ? {transform: [{rotate: '45deg'}]} : undefined} />
          <Text className="text-sm ml-1.5" style={{color: primaryColor}}>
            {expanded ? '접기' : '부탁·메모 추가'}
          </Text>
        </AnimatedPressable>
      </View>

      <Animated.View style={animStyle}>
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0) {
              contentHeight.current = h;
              if (expanded) {
                animHeight.value = withSpring(h, springs.nativeGlass);
              }
            }
          }}>
          {/* 받은 부탁 */}
          <View className="px-4 mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              받은 부탁
            </Text>
            <TextInput
              value={requestFromThem}
              onChangeText={setRequestFromThem}
              placeholder="부탁받은 것이 있으면 적어주세요"
              placeholderTextColor="#9CA3AF"
              multiline
              className="bg-white rounded-xl p-4 text-sm text-gray-800 min-h-[60px]"
              textAlignVertical="top"
            />
          </View>

          {/* 한 부탁 */}
          <View className="px-4 mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              한 부탁
            </Text>
            <TextInput
              value={requestToThem}
              onChangeText={setRequestToThem}
              placeholder="부탁한 것이 있으면 적어주세요"
              placeholderTextColor="#9CA3AF"
              multiline
              className="bg-white rounded-xl p-4 text-sm text-gray-800 min-h-[60px]"
              textAlignVertical="top"
            />
          </View>

          {/* 회의 내용 */}
          <View className="px-4 mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              회의/대화 메모
            </Text>
            <TextInput
              value={meetingNote}
              onChangeText={setMeetingNote}
              placeholder="기억하고 싶은 대화 내용"
              placeholderTextColor="#9CA3AF"
              multiline
              className="bg-white rounded-xl p-4 text-sm text-gray-800 min-h-[60px]"
              textAlignVertical="top"
            />
          </View>
        </View>
      </Animated.View>
    </>
  );
}

export default function RecordScreen() {
  const route = useRoute<any>();
  const personNameParam = route.params?.personName as string | undefined;
  const user = useAuthStore(s => s.user);
  const {primaryColor} = useTheme();
  const {
    people,
    recommendations,
    loadPeople,
    loadRecommendations,
    addPerson,
    addInteraction,
    addInteractionWithTodo,
    getRecentNotesPerPerson,
    getRelationshipStats,
  } = useCherishedPeopleStore();
  const {checkLimit, isLimitReached, limitedEntity, currentCount, maxCount, closeLimitModal} = useLimitCheck();

  // Bottom sheet refs
  const addPersonSheetRef = useRef<AddPersonBottomSheetRef>(null);
  const statsSheetRef = useRef<RelationshipStatsModalRef>(null);
  const timelineSheetRef = useRef<NotesTimelineModalRef>(null);

  const [step, setStep] = useState<Step>('select-person');
  const [selectedPerson, setSelectedPerson] = useState<CherishedPerson | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);

  // 사람별 최근 기록
  const [notesPerPerson, setNotesPerPerson] = useState<Map<string, NoteWithPerson[]>>(new Map());
  // 퀵 스탯
  const [stats, setStats] = useState({totalPeople: 0, thisMonthCount: 0, needsAttention: 0});

  // Form state
  const [interactionType, setInteractionType] = useState<InteractionType>('message');
  const [recentNews, setRecentNews] = useState('');
  const [gratitudeNote, setGratitudeNote] = useState('');
  const [requestFromThem, setRequestFromThem] = useState('');
  const [requestToThem, setRequestToThem] = useState('');
  const [meetingNote, setMeetingNote] = useState('');
  const [todoTitle, setTodoTitle] = useState('');
  const [wantToCreateTodo, setWantToCreateTodo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadPeople(user.id);
      loadRecommendations(user.id);
      getRecentNotesPerPerson(user.id).then(setNotesPerPerson);
      getRelationshipStats(user.id).then(s => {
        setStats({
          totalPeople: s.totalPeople,
          thisMonthCount: s.totalInteractions,
          needsAttention: s.needsAttention,
        });
      });
    }
  }, [user?.id]);

  // 안부 버튼에서 넘어온 경우 자동 선택
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (personNameParam && people.length > 0 && !autoSelectedRef.current) {
      const match = people.find(p => p.name === personNameParam);
      if (match) {
        autoSelectedRef.current = true;
        setSelectedPerson(match);
        setStep('write-news');
      }
    }
  }, [personNameParam, people]);

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 관심 필요 사람 (recommendations에서)
  const attentionPeople = useMemo(() => recommendations.slice(0, 5), [recommendations]);

  // 최근 활동 사람 (recommendations에 없는 나머지, 마지막 연락 기준 정렬)
  const recentActivityPeople = useMemo(() => {
    const attentionIds = new Set(attentionPeople.map(r => r.person.id));
    return [...people]
      .filter(p => !attentionIds.has(p.id))
      .sort((a, b) => {
        const aDate = a.last_interaction_at ? new Date(a.last_interaction_at).getTime() : 0;
        const bDate = b.last_interaction_at ? new Date(b.last_interaction_at).getTime() : 0;
        return bDate - aDate;
      });
  }, [people, attentionPeople]);

  const handleSelectPerson = useCallback((person: CherishedPerson) => {
    setSelectedPerson(person);
    setStep('write-news');
  }, []);

  const handlePersonAdded = useCallback((person: CherishedPerson) => {
    setSelectedPerson(person);
    setStep('write-news');
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id || !selectedPerson) return;

    const allowed = await checkLimit('care_interaction');
    if (!allowed) return;

    setSaving(true);

    const input: CareInteractionInput = {
      person_id: selectedPerson.id,
      interaction_type: interactionType,
      interaction_date: format(new Date(), 'yyyy-MM-dd'),
      recent_news: recentNews.trim() || undefined,
      gratitude_note: gratitudeNote.trim() || undefined,
      request_from_them: requestFromThem.trim() || undefined,
      request_to_them: requestToThem.trim() || undefined,
      meeting_note: meetingNote.trim() || undefined,
    };

    let success = false;
    if (wantToCreateTodo && todoTitle.trim()) {
      const result = await addInteractionWithTodo(user.id, input, todoTitle.trim());
      success = !!result;
    } else {
      const result = await addInteraction(user.id, input);
      success = !!result;
    }

    setSaving(false);
    if (success) {
      setStep('completed');
    } else {
      Alert.alert('오류', '저장에 실패했습니다');
    }
  }, [
    user?.id,
    selectedPerson,
    interactionType,
    recentNews,
    gratitudeNote,
    requestFromThem,
    requestToThem,
    meetingNote,
    wantToCreateTodo,
    todoTitle,
    checkLimit,
  ]);

  const handleRecordAgain = useCallback(() => {
    setStep('select-person');
    setSelectedPerson(null);
    setSearchQuery('');
    setInteractionType('message');
    setRecentNews('');
    setGratitudeNote('');
    setRequestFromThem('');
    setRequestToThem('');
    setMeetingNote('');
    setTodoTitle('');
    setWantToCreateTodo(false);
  }, []);

  /** 사람 카드에 표시할 마지막 연락 메타 정보 */
  const getPersonMeta = useCallback((person: CherishedPerson) => {
    if (!person.last_interaction_at) return '아직 기록 없음';
    const days = differenceInDays(new Date(), new Date(person.last_interaction_at));
    if (days === 0) return '오늘';
    return `${days}일 전`;
  }, []);

  /** 사람에게 소식/감사 dot 표시 여부 */
  const getNoteDots = useCallback((personId: string) => {
    const notes = notesPerPerson.get(personId) ?? [];
    const hasNews = notes.some(n => !!n.recent_news);
    const hasGratitude = notes.some(n => !!n.gratitude_note);
    return {hasNews, hasGratitude};
  }, [notesPerPerson]);

  // ── Step 3: 완료 ──
  if (step === 'completed') {
    return (
      <ScreenContainer gradient="warmBackground">
        <View className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeIn.delay(100).duration(600)}>
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
              style={{backgroundColor: hexWithOpacity(primaryColor, 0.1)}}>
              <Heart size={48} color={primaryColor} />
            </View>
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.delay(300).duration(400)}
            className="text-2xl font-bold text-gray-800 mb-2 text-center">
            기록 완료!
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(400).duration(400)}
            className="text-sm text-gray-500 text-center mb-8 leading-5">
            {selectedPerson?.name}님과의 소중한 기록이 저장되었어요.
          </Animated.Text>
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <AnimatedPressable
              onPress={handleRecordAgain}
              hapticType="light"
              scaleValue={0.97}
              style={{backgroundColor: primaryColor}}
              className="rounded-xl py-3 px-8 mb-4">
              <Text className="text-white font-semibold">또 기록하기</Text>
            </AnimatedPressable>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // ── Step 2: 소식 입력 ──
  if (step === 'write-news') {
    return (
      <ScreenContainer gradient="warmBackground">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1">
          <ScrollView
            contentContainerStyle={{paddingBottom: 100}}
            showsVerticalScrollIndicator={false}>
            {/* 헤더 */}
            <Animated.View
              entering={FadeInDown.duration(400)}
              className="px-4 pt-2 pb-4 flex-row items-center">
              <AnimatedPressable
                onPress={() => setStep('select-person')}
                hapticType="light"
                scaleValue={0.97}
                className="flex-row items-center"
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                <ChevronLeft size={24} color="#374151" />
                <Text className="text-lg font-bold text-gray-800 ml-1">
                  {selectedPerson?.name}님 기록
                </Text>
              </AnimatedPressable>
            </Animated.View>

            {/* 관심 표현 방식 */}
            <View className="px-4 mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                어떤 관심을 표현하셨나요?
              </Text>
              <InteractionTypeGrid
                selected={interactionType}
                onSelect={setInteractionType}
                primaryColor={primaryColor}
              />
            </View>

            {/* 들은 소식 (기본 노출) */}
            <View className="px-4 mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                들은 소식
              </Text>
              <TextInput
                value={recentNews}
                onChangeText={setRecentNews}
                placeholder="들은 소식이 있으면 적어주세요"
                placeholderTextColor="#9CA3AF"
                multiline
                className="bg-white rounded-xl p-4 text-sm text-gray-800 min-h-[80px]"
                textAlignVertical="top"
              />
            </View>

            {/* 감사했던 점 (기본 노출) */}
            <View className="px-4 mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                감사했던 점
              </Text>
              <TextInput
                value={gratitudeNote}
                onChangeText={setGratitudeNote}
                placeholder="감사한 마음을 적어보세요"
                placeholderTextColor="#9CA3AF"
                multiline
                className="bg-white rounded-xl p-4 text-sm text-gray-800 min-h-[80px]"
                textAlignVertical="top"
              />
            </View>

            {/* 접힌 그룹: 받은 부탁 + 한 부탁 + 회의 메모 */}
            <CollapsibleFields
              requestFromThem={requestFromThem}
              setRequestFromThem={setRequestFromThem}
              requestToThem={requestToThem}
              setRequestToThem={setRequestToThem}
              meetingNote={meetingNote}
              setMeetingNote={setMeetingNote}
              primaryColor={primaryColor}
            />

            {/* 할일 연동 */}
            <View className="px-4 mb-6">
              <AnimatedPressable
                onPress={() => setWantToCreateTodo(!wantToCreateTodo)}
                hapticType="light"
                scaleValue={0.98}
                className="flex-row items-center">
                <View
                  style={wantToCreateTodo ? {backgroundColor: primaryColor, borderColor: primaryColor} : undefined}
                  className={`w-5 h-5 rounded border mr-2 items-center justify-center ${
                    wantToCreateTodo ? '' : 'border-gray-300'
                  }`}>
                  {wantToCreateTodo && <Check size={14} color="#FFFFFF" />}
                </View>
                <Text className="text-sm text-gray-700">
                  해드리고 싶은 것을 할일로 추가
                </Text>
              </AnimatedPressable>
              {wantToCreateTodo && (
                <Animated.View entering={FadeInDown.duration(300)}>
                  <TextInput
                    value={todoTitle}
                    onChangeText={setTodoTitle}
                    placeholder="할일 제목"
                    placeholderTextColor="#9CA3AF"
                    className="bg-white rounded-xl p-4 text-sm text-gray-800 mt-2"
                  />
                </Animated.View>
              )}
            </View>

            {/* 저장 버튼 */}
            <View className="px-4">
              <AnimatedPressable
                onPress={handleSave}
                disabled={saving}
                hapticType="medium"
                scaleValue={0.97}
                style={saving ? undefined : {backgroundColor: primaryColor}}
                className={`rounded-xl py-4 items-center ${
                  saving ? 'bg-gray-300' : ''
                }`}>
                <Text className="text-white font-bold text-base">
                  {saving ? '저장 중...' : '기록 저장하기'}
                </Text>
              </AnimatedPressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  // ── Step 1: 사람 중심 카드 UI ──
  return (
    <ScreenContainer gradient="warmBackground">
      {/* 상단 헤더: 통계 버튼 + 타이틀 + 더보기 */}
      <Animated.View entering={FadeIn.duration(300)} style={recordStyles.headerRow}>
        <AnimatedPressable
          onPress={() => statsSheetRef.current?.present()}
          hapticType="light"
          scaleValue={0.9}
          style={recordStyles.glassStatsBtn}>
          <GlassBackground
            blurAmount={16}
            overlayColor="rgba(255,255,255,0.55)"
            style={recordStyles.glassStatsBtnInner}>
            <View style={recordStyles.glassStatsBtnContent}>
              <Clock size={20} color="#6B7280" />
            </View>
          </GlassBackground>
        </AnimatedPressable>

        <View className="flex-1 items-center">
          <Text className="text-lg font-bold text-gray-800">
            관계 기록
          </Text>
          <Text className="text-xs text-gray-400">
            {stats.totalPeople}명의 소중한 분
          </Text>
        </View>

        <LiquidGlassMenu
          systemIconName="ellipsis"
          iconColor="#6B7280"
          size={40}
          menuItems={[
            {title: '소식 타임라인', key: 'news'},
            {title: '감사 타임라인', key: 'gratitude'},
          ]}
          onSelect={(key) => {
            timelineSheetRef.current?.present(key as 'news' | 'gratitude');
          }}
          fallbackIcon={<MoreHorizontal size={20} color="#6B7280" />}
        />
      </Animated.View>

      <ScrollView
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>

        {/* 검색 */}
        <View className="px-4 mb-4 mt-2">
          <View className="flex-row items-center bg-white rounded-xl px-4 py-3">
            <Search size={18} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="이름으로 검색"
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-sm text-gray-800"
            />
          </View>
        </View>

        {/* 검색 중일 때: 필터링된 결과 */}
        {searchQuery ? (
          <View className="px-4 mb-4">
            <AnimatedCard enterDelay={100}>
              <Text className="text-sm font-semibold text-gray-700 mb-3">
                검색 결과 ({filteredPeople.length})
              </Text>
              {filteredPeople.map(person => (
                <AnimatedPressable
                  key={person.id}
                  onPress={() => handleSelectPerson(person)}
                  hapticType="light"
                  scaleValue={0.97}
                  className="flex-row items-center py-3 border-b border-gray-50">
                  <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3">
                    <Text className="text-gray-600 font-bold text-sm">
                      {person.name.charAt(0)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-800">{person.name}</Text>
                    {person.nickname && (
                      <Text className="text-xs text-gray-400">{person.nickname}</Text>
                    )}
                  </View>
                  <Text className="text-xs text-gray-400 mr-2">{getPersonMeta(person)}</Text>
                  <ChevronLeft
                    size={16}
                    color="#9CA3AF"
                    style={{transform: [{rotate: '180deg'}]}}
                  />
                </AnimatedPressable>
              ))}
              {/* 항상 "새로 추가" 행 표시 */}
              {searchQuery.trim().length > 0 && (
                <AnimatedPressable
                  onPress={() => addPersonSheetRef.current?.open(searchQuery)}
                  hapticType="light"
                  scaleValue={0.97}
                  className="flex-row items-center py-3">
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                    style={{backgroundColor: hexWithOpacity(primaryColor, 0.1)}}>
                    <Plus size={16} color={primaryColor} />
                  </View>
                  <Text className="text-sm" style={{color: primaryColor}}>
                    "{searchQuery}" 님 새로 추가
                  </Text>
                </AnimatedPressable>
              )}
            </AnimatedCard>
          </View>
        ) : (
          <>
            {/* "관심이 필요해요" 섹션 */}
            {attentionPeople.length > 0 && (
              <View className="px-4 mb-4">
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                  <Text className="text-sm font-semibold text-gray-700 mb-3">
                    관심이 필요해요
                  </Text>
                  {attentionPeople.map(rec => {
                    const person = rec.person;
                    const personNotes = notesPerPerson.get(person.id) ?? [];
                    return (
                      <AnimatedPressable
                        key={person.id}
                        onPress={() => handleSelectPerson(person)}
                        hapticType="light"
                        scaleValue={0.97}
                        style={[
                          recordStyles.activityCard,
                          {backgroundColor: hexWithOpacity(primaryColor, 0.06)},
                        ]}>
                        <View className="flex-row items-center">
                          <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mr-3">
                            <Text className="text-amber-600 font-bold text-sm">
                              {person.name.charAt(0)}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-800">
                              {person.name}
                            </Text>
                            <Text className="text-xs text-gray-400 mt-0.5">
                              {rec.daysSinceContact >= 999
                                ? '아직 기록 없음'
                                : `${rec.daysSinceContact}일째 연락 없음`}
                            </Text>
                          </View>
                          <ChevronLeft
                            size={16}
                            color="#9CA3AF"
                            style={{transform: [{rotate: '180deg'}]}}
                          />
                        </View>
                        {/* 인라인 소식/감사 프리뷰 */}
                        <NotePreview notes={personNotes} />
                      </AnimatedPressable>
                    );
                  })}
                </Animated.View>
              </View>
            )}

            {/* "최근 활동" 섹션 */}
            <View className="px-4 mb-4">
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <Text className="text-sm font-semibold text-gray-700 mb-3">
                  최근 활동
                </Text>
                {recentActivityPeople.length === 0 && people.length === 0 && (
                  <AnimatedCard enterDelay={200}>
                    <View className="items-center py-8">
                      <Users size={36} color="#D1D5DB" />
                      <Text className="text-gray-400 text-sm mt-2 text-center">
                        아직 등록된 사람이 없어요
                      </Text>
                    </View>
                  </AnimatedCard>
                )}
                {recentActivityPeople.map(person => {
                  const {hasNews, hasGratitude} = getNoteDots(person.id);
                  const isExpanded = expandedPersonId === person.id;
                  const personNotes = notesPerPerson.get(person.id) ?? [];

                  return (
                    <View key={person.id} style={recordStyles.activityCard}>
                      <AnimatedPressable
                        onPress={() => handleSelectPerson(person)}
                        hapticType="light"
                        scaleValue={0.97}
                        className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                          <Text className="text-gray-600 font-bold text-sm">
                            {person.name.charAt(0)}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-sm font-medium text-gray-800">
                              {person.name}
                            </Text>
                            {/* 소식/감사 dot */}
                            {hasNews && (
                              <View className="w-2 h-2 rounded-full bg-blue-500 ml-1.5" />
                            )}
                            {hasGratitude && (
                              <View className="w-2 h-2 rounded-full bg-green-500 ml-1" />
                            )}
                          </View>
                          <Text className="text-xs text-gray-400 mt-0.5">
                            {getPersonMeta(person)}
                          </Text>
                        </View>
                        <ChevronLeft
                          size={16}
                          color="#9CA3AF"
                          style={{transform: [{rotate: '180deg'}]}}
                        />
                      </AnimatedPressable>

                      {/* 확장 토글 (기록이 있을 때만) */}
                      {personNotes.length > 0 && (
                        <AnimatedPressable
                          onPress={() => setExpandedPersonId(isExpanded ? null : person.id)}
                          hapticType="light"
                          scaleValue={0.98}
                          className="flex-row items-center justify-center mt-1 py-1">
                          <Text className="text-[10px] text-gray-400 mr-1">
                            {isExpanded ? '접기' : `최근 기록 ${personNotes.length}건`}
                          </Text>
                          {isExpanded ? (
                            <ChevronUp size={12} color="#9CA3AF" />
                          ) : (
                            <ChevronDown size={12} color="#9CA3AF" />
                          )}
                        </AnimatedPressable>
                      )}

                      {/* 확장된 인라인 프리뷰 */}
                      {isExpanded && <NotePreview notes={personNotes} />}
                    </View>
                  );
                })}
              </Animated.View>
            </View>
          </>
        )}
      </ScrollView>

      {/* FAB: 새 사람 추가 */}
      <AnimatedPressable
        onPress={() => addPersonSheetRef.current?.open()}
        hapticType="light"
        scaleValue={0.9}
        style={[recordStyles.fab, {backgroundColor: primaryColor, shadowColor: primaryColor}]}>
        <Plus size={24} color="#FFFFFF" />
      </AnimatedPressable>

      <LimitReachedModal
        visible={isLimitReached}
        onClose={closeLimitModal}
        entityType={limitedEntity}
        currentCount={currentCount}
        maxCount={maxCount}
      />
      <AddPersonBottomSheet
        ref={addPersonSheetRef}
        onPersonAdded={handlePersonAdded}
        addPerson={addPerson}
        userId={user?.id}
      />
      <RelationshipStatsModal ref={statsSheetRef} />
      <NotesTimelineModal ref={timelineSheetRef} />
    </ScreenContainer>
  );
}

const recordStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  glassStatsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  glassStatsBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  glassStatsBtnContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
