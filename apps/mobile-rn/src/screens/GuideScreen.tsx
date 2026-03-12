/**
 * Guide Screen — Claude Desktop MCP 연결 가이드
 * 정적 콘텐츠 (3단계 아코디언)
 */
import React, {useState, useCallback} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {ScreenContainer, AnimatedCard} from '@/components/core';
import {
  ChevronDown,
  ChevronUp,
  Key,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Laptop,
  Rocket,
} from 'lucide-react-native';
import Config from 'react-native-config';
import {useTheme} from '@/theme';

const SUPABASE_URL = Config.SUPABASE_URL ?? '';
const MCP_AUTH_URL = `${SUPABASE_URL}/functions/v1/mcp-server/auth/init`;
const MCP_SERVER_URL = `${SUPABASE_URL}/functions/v1/mcp-server`;

const CONFIG_JSON = `{
  "mcpServers": {
    "daystep": {
      "url": "${MCP_SERVER_URL}/sse",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}`;

interface StepProps {
  stepNumber: number;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function StepAccordion({stepNumber, title, icon, expanded, onToggle, children}: StepProps) {
  const {primaryColor} = useTheme();
  return (
    <AnimatedCard enterDelay={stepNumber * 100}>
      <TouchableOpacity
        onPress={onToggle}
        className="flex-row items-center justify-between"
        activeOpacity={0.7}>
        <View className="flex-row items-center flex-1">
          <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{backgroundColor: primaryColor + '20'}}>
            <Text className="font-bold text-sm" style={{color: primaryColor}}>{stepNumber}</Text>
          </View>
          <View className="flex-row items-center flex-1">
            {icon}
            <Text className="text-base font-semibold text-gray-800 ml-2 flex-1">
              {title}
            </Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={20} color="#9CA3AF" />
        ) : (
          <ChevronDown size={20} color="#9CA3AF" />
        )}
      </TouchableOpacity>
      {expanded && <View className="mt-4 pt-4 border-t border-gray-100">{children}</View>}
    </AnimatedCard>
  );
}

export default function GuideScreen() {
  const {primaryColor} = useTheme();
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [copiedConfig, setCopiedConfig] = useState(false);

  const toggleStep = useCallback(
    (step: number) => {
      setExpandedStep(expandedStep === step ? null : step);
    },
    [expandedStep],
  );

  const handleOpenAuth = useCallback(() => {
    Linking.openURL(MCP_AUTH_URL).catch(() =>
      Alert.alert('오류', '브라우저를 열 수 없습니다'),
    );
  }, []);

  const handleCopyConfig = useCallback(() => {
    Clipboard.setString(CONFIG_JSON);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  }, []);

  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        {/* 안내 */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          className="px-4 mb-4">
          <View className="rounded-2xl p-4" style={{backgroundColor: primaryColor + '10'}}>
            <View className="flex-row items-center mb-2">
              <Sparkles size={20} color={primaryColor} />
              <Text className="text-sm font-semibold ml-2" style={{color: primaryColor}}>
                DayStep + Claude Desktop
              </Text>
            </View>
            <Text className="text-sm leading-5" style={{color: primaryColor}}>
              Claude Desktop에서 DayStep의 할일, 프로젝트, 메모를 직접 관리할 수
              있습니다. MCP(Model Context Protocol)를 통해 연결합니다.
            </Text>
          </View>
        </Animated.View>

        {/* Step 1: 토큰 발급 */}
        <View className="px-4 mb-3">
          <StepAccordion
            stepNumber={1}
            title="MCP 토큰 발급"
            icon={<Key size={18} color={primaryColor} />}
            expanded={expandedStep === 1}
            onToggle={() => toggleStep(1)}>
            <Text className="text-sm text-gray-600 mb-4 leading-5">
              아래 버튼을 눌러 브라우저에서 토큰을 발급받으세요.{'\n'}
              발급된 토큰은 다음 단계에서 설정 파일에 입력합니다.
            </Text>
            <TouchableOpacity
              onPress={handleOpenAuth}
              style={{backgroundColor: primaryColor}}
              className="rounded-xl py-3 px-4 flex-row items-center justify-center">
              <ExternalLink size={16} color="#FFFFFF" />
              <Text className="text-white font-semibold ml-2">
                토큰 발급 페이지 열기
              </Text>
            </TouchableOpacity>
          </StepAccordion>
        </View>

        {/* Step 2: 설정 파일 */}
        <View className="px-4 mb-3">
          <StepAccordion
            stepNumber={2}
            title="Claude Desktop 설정"
            icon={<Laptop size={18} color={primaryColor} />}
            expanded={expandedStep === 2}
            onToggle={() => toggleStep(2)}>
            <Text className="text-sm text-gray-600 mb-2 leading-5">
              Claude Desktop의 설정 파일에 아래 내용을 추가하세요.
            </Text>
            <Text className="text-xs text-gray-400 mb-3">
              macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
            </Text>
            <View className="bg-gray-900 rounded-xl p-4 mb-3">
              <Text className="text-xs text-green-400 font-mono leading-4">
                {CONFIG_JSON}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCopyConfig}
              className={`rounded-xl py-3 px-4 flex-row items-center justify-center ${
                copiedConfig ? 'bg-green-500' : 'bg-gray-700'
              }`}>
              {copiedConfig ? (
                <>
                  <Check size={16} color="#FFFFFF" />
                  <Text className="text-white font-semibold ml-2">
                    복사 완료!
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={16} color="#FFFFFF" />
                  <Text className="text-white font-semibold ml-2">
                    설정 JSON 복사
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text className="text-xs text-gray-400 mt-3 leading-4">
              YOUR_TOKEN_HERE 부분을 1단계에서 발급받은 토큰으로 교체하세요.
            </Text>
          </StepAccordion>
        </View>

        {/* Step 3: 연결 확인 */}
        <View className="px-4 mb-3">
          <StepAccordion
            stepNumber={3}
            title="연결 테스트"
            icon={<Rocket size={18} color={primaryColor} />}
            expanded={expandedStep === 3}
            onToggle={() => toggleStep(3)}>
            <Text className="text-sm text-gray-600 mb-4 leading-5">
              Claude Desktop을 재시작한 후, 아래 메시지를 입력해 연결을
              확인하세요.
            </Text>
            <View className="bg-gray-50 rounded-xl p-4 space-y-3">
              {[
                '내 오늘 할일 목록을 보여줘',
                '내 프로젝트 진행 상황을 알려줘',
                '오늘 해야 할 중요한 일을 정리해줘',
              ].map((prompt, i) => (
                <View key={i} className="flex-row items-start mb-2">
                  <Text className="mr-2 mt-0.5" style={{color: primaryColor}}>💬</Text>
                  <Text className="text-sm text-gray-700 flex-1 italic">
                    "{prompt}"
                  </Text>
                </View>
              ))}
            </View>
          </StepAccordion>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
