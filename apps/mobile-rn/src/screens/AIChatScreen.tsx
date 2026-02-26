/**
 * AIChat Screen — AI로 계획하기
 * 채팅 인터페이스 + 프로바이더 선택 + 스트리밍
 */
import React, {useEffect, useRef, useCallback, useState} from 'react';
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {ScreenContainer} from '@/components/core';
import {
  Send,
  Sparkles,
  Trash2,
  ChevronDown,
} from 'lucide-react-native';
import {
  useAIPlanningStore,
  type ChatMessage,
  type AIProvider,
} from '@/stores/aiPlanningStore';
import {useAuthStore} from '@/stores/authStore';
import {useSubscriptionStore} from '@/stores/subscriptionStore';

const PROVIDER_LABELS: Record<AIProvider, {label: string; color: string}> = {
  claude: {label: 'Claude', color: '#D97706'},
  openai: {label: 'GPT', color: '#10A37F'},
  groq: {label: 'Groq', color: '#F55036'},
  gemini: {label: 'Gemini', color: '#4285F4'},
};

function ChatBubble({message}: {message: ChatMessage}) {
  const isUser = message.role === 'user';

  return (
    <View className={`px-4 mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-500 rounded-br-sm'
            : 'bg-white rounded-bl-sm'
        }`}
        style={!isUser ? {shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: {width: 0, height: 2}} : undefined}>
        <Text
          className={`text-sm leading-5 ${
            isUser ? 'text-white' : 'text-gray-800'
          }`}>
          {message.content}
          {message.isStreaming && '▍'}
        </Text>
      </View>
    </View>
  );
}

function ProviderSelector({
  selected,
  available,
  onSelect,
  visible,
  onToggle,
}: {
  selected: AIProvider;
  available: AIProvider[];
  onSelect: (provider: AIProvider) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  const info = PROVIDER_LABELS[selected];

  return (
    <View>
      <TouchableOpacity
        onPress={onToggle}
        className="flex-row items-center bg-gray-100 rounded-full px-3 py-1.5">
        <View
          className="w-2 h-2 rounded-full mr-1.5"
          style={{backgroundColor: info.color}}
        />
        <Text className="text-xs font-medium text-gray-600">{info.label}</Text>
        <ChevronDown size={12} color="#9CA3AF" style={{marginLeft: 2}} />
      </TouchableOpacity>

      {visible && (
        <Animated.View
          entering={FadeIn.duration(150)}
          className="absolute top-10 left-0 bg-white rounded-xl shadow-md z-10 py-1"
          style={{minWidth: 120}}>
          {available.map(provider => (
            <TouchableOpacity
              key={provider}
              onPress={() => {
                onSelect(provider);
                onToggle();
              }}
              className={`flex-row items-center px-4 py-2 ${
                provider === selected ? 'bg-gray-50' : ''
              }`}>
              <View
                className="w-2 h-2 rounded-full mr-2"
                style={{backgroundColor: PROVIDER_LABELS[provider].color}}
              />
              <Text className="text-sm text-gray-700">
                {PROVIDER_LABELS[provider].label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

export default function AIChatScreen() {
  const user = useAuthStore(s => s.user);
  const {hasActiveSubscription} = useSubscriptionStore();
  const {
    messages,
    isLoading,
    isStreaming,
    provider,
    availableProviders,
    usage,
    error,
    sendMessage,
    setProvider,
    setIsPro,
    fetchUsage,
    clearMessages,
  } = useAIPlanningStore();

  const [inputText, setInputText] = useState('');
  const [showProviders, setShowProviders] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setIsPro(hasActiveSubscription);
    if (user?.id) {
      fetchUsage(user.id);
    }
  }, [user?.id, hasActiveSubscription]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !user?.id || isLoading) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(user.id, text);
  }, [inputText, user?.id, isLoading, sendMessage]);

  const handleClear = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  // 새 메시지 추가 시 스크롤
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100);
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  return (
    <ScreenContainer gradient="warmBackground">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={0}>
        {/* 헤더 */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="px-4 pt-2 pb-3 flex-row items-center justify-end border-b border-gray-100">
          <View className="flex-row items-center">
            <ProviderSelector
              selected={provider}
              available={availableProviders}
              onSelect={setProvider}
              visible={showProviders}
              onToggle={() => setShowProviders(!showProviders)}
            />
            {messages.length > 0 && (
              <TouchableOpacity
                onPress={handleClear}
                className="ml-3"
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Trash2 size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* 사용량 표시 */}
        {usage && (
          <View className="px-4 py-1.5 bg-gray-50">
            <Text className="text-xs text-gray-400">
              오늘 {usage.currentCount}/{usage.dailyLimit}회 사용
              {usage.isLimitExceeded && ' (한도 초과)'}
            </Text>
          </View>
        )}

        {/* 메시지 목록 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({item}) => <ChatBubble message={item} />}
          contentContainerStyle={{paddingTop: 16, paddingBottom: 16, flexGrow: 1}}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <Sparkles size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4 text-center text-sm leading-5">
                AI에게 오늘의 할일 계획을 요청해보세요.{'\n'}
                일정 정리, 우선순위 설정, 시간 배분 등을{'\n'}
                도와줄 수 있어요.
              </Text>
              <View className="mt-6">
                {[
                  '오늘 할일 계획을 세워줘',
                  '이번 주 우선순위를 정리해줘',
                  '30분씩 나눠서 시간표를 만들어줘',
                ].map((prompt, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      setInputText(prompt);
                    }}
                    className="bg-white rounded-xl px-4 py-3 mb-2"
                    style={{shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: {width: 0, height: 2}}}>
                    <Text className="text-sm text-blue-600">💬 {prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />

        {/* 에러 */}
        {error && (
          <View className="px-4 py-2 bg-red-50">
            <Text className="text-xs text-red-500">{error}</Text>
          </View>
        )}

        {/* 입력 바 */}
        <View className="px-4 py-3 bg-white border-t border-gray-100">
          <View className="flex-row items-end">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="메시지를 입력하세요..."
              placeholderTextColor="#9CA3AF"
              multiline
              className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-sm text-gray-800 max-h-24"
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${
                inputText.trim() && !isLoading ? 'bg-blue-500' : 'bg-gray-200'
              }`}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
              ) : (
                <Send
                  size={18}
                  color={inputText.trim() ? '#FFFFFF' : '#9CA3AF'}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
