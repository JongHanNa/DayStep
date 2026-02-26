/**
 * Record Screen — 관계 기록하기
 * 3단계 플로우: select-person → write-news → completed
 */
import React, {useState, useCallback, useEffect} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {ScreenContainer, AnimatedCard, AnimatedPressable} from '@/components/core';
import {
  ChevronLeft,
  Search,
  Plus,
  Heart,
  Check,
  Users,
} from 'lucide-react-native';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import type {CherishedPerson} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {
  INTERACTION_TYPE_LABELS,
  type InteractionType,
  type CareInteractionInput,
} from '@/types/cherished-people';
import {resolveTodoIcon} from '@/lib/iconMap';
import {format} from 'date-fns';

type Step = 'select-person' | 'write-news' | 'completed';

const INTERACTION_TYPES = Object.entries(INTERACTION_TYPE_LABELS) as [
  InteractionType,
  {label: string; icon: string},
][];

function InteractionTypeGrid({
  selected,
  onSelect,
}: {
  selected: InteractionType;
  onSelect: (type: InteractionType) => void;
}) {
  return (
    <View className="flex-row flex-wrap">
      {INTERACTION_TYPES.map(([type, {label, icon}]) => {
        const isSelected = type === selected;
        const IconComp = resolveTodoIcon(icon);
        return (
          <TouchableOpacity
            key={type}
            onPress={() => onSelect(type)}
            className={`w-[33%] p-1`}>
            <View
              className={`items-center py-3 rounded-xl ${
                isSelected ? 'bg-violet-100 border border-violet-400' : 'bg-gray-50'
              }`}>
              {IconComp && (
                <IconComp size={20} color={isSelected ? '#8B5CF6' : '#9CA3AF'} />
              )}
              <Text
                className={`text-xs mt-1 ${
                  isSelected ? 'text-violet-700 font-medium' : 'text-gray-500'
                }`}>
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function RecordScreen() {
  const user = useAuthStore(s => s.user);
  const {
    people,
    recommendations,
    loadPeople,
    loadRecommendations,
    addPerson,
    addInteraction,
    addInteractionWithTodo,
  } = useCherishedPeopleStore();

  const [step, setStep] = useState<Step>('select-person');
  const [selectedPerson, setSelectedPerson] = useState<CherishedPerson | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    }
  }, [user?.id]);

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const recommendedPeople = recommendations
    .slice(0, 5)
    .map(r => r.person);

  const handleSelectPerson = useCallback((person: CherishedPerson) => {
    setSelectedPerson(person);
    setStep('write-news');
  }, []);

  const handleAddNewPerson = useCallback(async () => {
    if (!user?.id || !searchQuery.trim()) return;

    Alert.prompt
      ? Alert.prompt(
          '새 사람 추가',
          '이름을 입력하세요',
          async (name: string) => {
            if (name.trim()) {
              const person = await addPerson(user.id, {name: name.trim()});
              if (person) {
                setSelectedPerson(person);
                setStep('write-news');
              }
            }
          },
          'plain-text',
          searchQuery,
        )
      : Alert.alert('새 사람 추가', `"${searchQuery}" 님을 추가할까요?`, [
          {text: '취소', style: 'cancel'},
          {
            text: '추가',
            onPress: async () => {
              const person = await addPerson(user.id, {
                name: searchQuery.trim(),
              });
              if (person) {
                setSelectedPerson(person);
                setStep('write-news');
              }
            },
          },
        ]);
  }, [user?.id, searchQuery, addPerson]);

  const handleSave = useCallback(async () => {
    if (!user?.id || !selectedPerson) return;
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

  // ── Step 3: 완료 ──
  if (step === 'completed') {
    return (
      <ScreenContainer gradient="warmBackground">
        <View className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeIn.delay(100).duration(600)}>
            <View className="w-24 h-24 rounded-full bg-violet-100 items-center justify-center mb-6">
              <Heart size={48} color="#8B5CF6" />
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
            <TouchableOpacity
              onPress={handleRecordAgain}
              className="bg-violet-500 rounded-xl py-3 px-8 mb-4">
              <Text className="text-white font-semibold">또 기록하기</Text>
            </TouchableOpacity>
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
              <TouchableOpacity
                onPress={() => setStep('select-person')}
                className="flex-row items-center"
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                <ChevronLeft size={24} color="#374151" />
                <Text className="text-lg font-bold text-gray-800 ml-1">
                  {selectedPerson?.name}님 기록
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* 관심 표현 방식 */}
            <View className="px-4 mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                어떤 관심을 표현하셨나요?
              </Text>
              <InteractionTypeGrid
                selected={interactionType}
                onSelect={setInteractionType}
              />
            </View>

            {/* 들은 소식 */}
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

            {/* 감사했던 점 */}
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

            {/* 할일 연동 */}
            <View className="px-4 mb-6">
              <TouchableOpacity
                onPress={() => setWantToCreateTodo(!wantToCreateTodo)}
                className="flex-row items-center">
                <View
                  className={`w-5 h-5 rounded border mr-2 items-center justify-center ${
                    wantToCreateTodo
                      ? 'bg-violet-500 border-violet-500'
                      : 'border-gray-300'
                  }`}>
                  {wantToCreateTodo && <Check size={14} color="#FFFFFF" />}
                </View>
                <Text className="text-sm text-gray-700">
                  해드리고 싶은 것을 할일로 추가
                </Text>
              </TouchableOpacity>
              {wantToCreateTodo && (
                <TextInput
                  value={todoTitle}
                  onChangeText={setTodoTitle}
                  placeholder="할일 제목"
                  placeholderTextColor="#9CA3AF"
                  className="bg-white rounded-xl p-4 text-sm text-gray-800 mt-2"
                />
              )}
            </View>

            {/* 저장 버튼 */}
            <View className="px-4">
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className={`rounded-xl py-4 items-center ${
                  saving ? 'bg-gray-300' : 'bg-violet-500'
                }`}>
                <Text className="text-white font-bold text-base">
                  {saving ? '저장 중...' : '기록 저장하기'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  // ── Step 1: 사람 선택 ──
  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        {/* 검색 */}
        <View className="px-4 mb-4">
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

        {/* 추천 섹션 */}
        {recommendedPeople.length > 0 && !searchQuery && (
          <View className="px-4 mb-4">
            <AnimatedCard enterDelay={100}>
              <Text className="text-sm font-semibold text-gray-700 mb-3">
                오래 연락 안 한 분들
              </Text>
              {recommendedPeople.map(person => (
                <TouchableOpacity
                  key={person.id}
                  onPress={() => handleSelectPerson(person)}
                  className="flex-row items-center py-2 border-b border-gray-50">
                  <View className="w-8 h-8 rounded-full bg-violet-100 items-center justify-center mr-3">
                    <Text className="text-violet-600 font-bold text-sm">
                      {person.name.charAt(0)}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-800 flex-1">{person.name}</Text>
                  <ChevronLeft
                    size={16}
                    color="#9CA3AF"
                    style={{transform: [{rotate: '180deg'}]}}
                  />
                </TouchableOpacity>
              ))}
            </AnimatedCard>
          </View>
        )}

        {/* 전체 목록 */}
        <View className="px-4 mb-4">
          <AnimatedCard enterDelay={200}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-gray-700">
                전체 ({filteredPeople.length})
              </Text>
              {searchQuery.trim() && filteredPeople.length === 0 && (
                <TouchableOpacity
                  onPress={handleAddNewPerson}
                  className="flex-row items-center">
                  <Plus size={16} color="#8B5CF6" />
                  <Text className="text-sm text-violet-600 ml-1">새로 추가</Text>
                </TouchableOpacity>
              )}
            </View>
            {filteredPeople.map(person => (
              <TouchableOpacity
                key={person.id}
                onPress={() => handleSelectPerson(person)}
                className="flex-row items-center py-2 border-b border-gray-50">
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
                <ChevronLeft
                  size={16}
                  color="#9CA3AF"
                  style={{transform: [{rotate: '180deg'}]}}
                />
              </TouchableOpacity>
            ))}
            {filteredPeople.length === 0 && !searchQuery && (
              <View className="items-center py-8">
                <Users size={36} color="#D1D5DB" />
                <Text className="text-gray-400 text-sm mt-2 text-center">
                  아직 등록된 사람이 없어요
                </Text>
              </View>
            )}
          </AnimatedCard>
        </View>

        {/* 새 사람 추가 */}
        <View className="px-4">
          <TouchableOpacity
            onPress={() => {
              Alert.prompt
                ? Alert.prompt('새 사람 추가', '이름을 입력하세요', async (name: string) => {
                    if (name.trim() && user?.id) {
                      const person = await addPerson(user.id, {name: name.trim()});
                      if (person) handleSelectPerson(person);
                    }
                  })
                : Alert.alert('새 사람 추가', '이 기능은 iOS에서만 지원됩니다');
            }}
            className="bg-violet-50 rounded-xl py-3 flex-row items-center justify-center">
            <Plus size={18} color="#8B5CF6" />
            <Text className="text-violet-600 font-medium ml-2">새 사람 추가</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
