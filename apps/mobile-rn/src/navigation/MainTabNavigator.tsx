/**
 * Main Tab Navigator — 하이브리드 네이티브 탭바
 * react-native-bottom-tabs (네이티브 SwiftUI TabView) → Liquid Glass 자동
 * More 패널: GlassBackground 오버레이 (전 iOS 버전 통합)
 *   iOS 26+: LiquidGlassBackgroundNative (UIGlassEffect) → 네이티브 글래스
 *   iOS 25-: BlurView → 유사 글래스
 *
 * 5탭: 홈 / 플래너 / 실행(중앙) / 노트 / 더 보기
 */
import React, {useState, useCallback, useRef} from 'react';
import {View, Pressable, StyleSheet} from 'react-native';
import {createNativeBottomTabNavigator} from '@bottom-tabs/react-navigation';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@/theme';
import {MorePanelContent} from '@/components/navigation/MorePanel';
import {GlassBackground} from '@/components/core';

// Screens
import HomeScreen from '../screens/HomeScreen';
import TodoListScreen from '../screens/TodoListScreen';
import ExecutionScreen from '../screens/ExecutionScreen';
import NotesScreen from '../screens/NotesScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Home Stack / More Stack 공유 화면
import MonthlyPlannerScreen from '../screens/MonthlyPlannerScreen';
import AIPlanScreen from '../screens/AIPlanScreen';
import AIChatScreen from '../screens/AIChatScreen';
import GuideScreen from '../screens/GuideScreen';
import RecordScreen from '../screens/RecordScreen';
import NewsScreen from '../screens/NewsScreen';
import ContactScreen from '../screens/ContactScreen';
import GratitudeScreen from '../screens/GratitudeScreen';
import ActivityScreen from '../screens/ActivityScreen';
import CleanupScreen from '../screens/CleanupScreen';

// Home Stack (메인 + 하위 화면)
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="MonthlyPlanner" component={MonthlyPlannerScreen} />
      <HomeStack.Screen name="AIPlan" component={AIPlanScreen} />
      <HomeStack.Screen name="AIChat" component={AIChatScreen} />
      <HomeStack.Screen name="Guide" component={GuideScreen} />
      <HomeStack.Screen name="Record" component={RecordScreen} />
      <HomeStack.Screen name="News" component={NewsScreen} />
      <HomeStack.Screen name="Contact" component={ContactScreen} />
      <HomeStack.Screen name="Gratitude" component={GratitudeScreen} />
      <HomeStack.Screen name="Activity" component={ActivityScreen} />
      <HomeStack.Screen name="Cleanup" component={CleanupScreen} />
    </HomeStack.Navigator>
  );
}

// More Stack (설정 랜딩 + 부가 화면)
const MoreStack = createNativeStackNavigator();

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}>
      <MoreStack.Screen name="MoreLanding" component={SettingsScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
      <MoreStack.Screen name="MonthlyPlanner" component={MonthlyPlannerScreen} />
      <MoreStack.Screen name="AIPlan" component={AIPlanScreen} />
      <MoreStack.Screen name="AIChat" component={AIChatScreen} />
      <MoreStack.Screen name="Guide" component={GuideScreen} />
      <MoreStack.Screen name="Record" component={RecordScreen} />
      <MoreStack.Screen name="News" component={NewsScreen} />
      <MoreStack.Screen name="Contact" component={ContactScreen} />
      <MoreStack.Screen name="Gratitude" component={GratitudeScreen} />
      <MoreStack.Screen name="Activity" component={ActivityScreen} />
      <MoreStack.Screen name="Cleanup" component={CleanupScreen} />
    </MoreStack.Navigator>
  );
}

const Tab = createNativeBottomTabNavigator();

export default function MainTabNavigator() {
  const {primaryColor} = useTheme();
  const [morePanelVisible, setMorePanelVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // 탭 내비게이션 참조 (패널에서 More 스택 내비게이션용)
  const tabNavigationRef = useRef<any>(null);

  // More 스택 현재 화면 추적
  const [activeMoreScreen, setActiveMoreScreen] = useState<string | undefined>();

  // 패널 닫기
  const handleDismissPanel = useCallback(() => {
    setMorePanelVisible(false);
  }, []);

  // 패널에서 화면 선택 시
  const handleSelectScreen = useCallback(
    (screenName: string) => {
      tabNavigationRef.current?.navigate('More', {screen: screenName});
      setMorePanelVisible(false);
    },
    [],
  );

  const panelBottom = Math.max(insets.bottom, 8);

  return (
    <View style={styles.root}>
      <Tab.Navigator
        labeled={false}
        translucent
        hapticFeedbackEnabled
        tabBarActiveTintColor={primaryColor}
        screenOptions={{}}
        screenListeners={({route, navigation}) => ({
          focus: () => {
            // 탭 내비게이션 참조 캡처
            tabNavigationRef.current = navigation;
            // More 탭의 현재 화면 추적
            if (route.name === 'More') {
              const moreState = navigation.getState?.();
              const moreRoutes = moreState?.routes?.find?.((r: any) => r.name === 'More');
              const nestedState = moreRoutes?.state;
              if (nestedState) {
                setActiveMoreScreen(
                  nestedState.routes[nestedState.index ?? 0]?.name,
                );
              }
            }
          },
          tabPress: (e) => {
            if (route.name === 'More') {
              e.preventDefault(); // RN navigate dispatch 차단
              setMorePanelVisible(prev => !prev);
              // morePanelVisible 상태변경 → re-render → selectedPage prop이 현재 탭으로 유지
              // → SwiftUI TabView(selection: $props.selectedPage) 바인딩이 원래 탭으로 복원
            } else {
              setMorePanelVisible(false);
            }
          },
          tabLongPress: () => {
            if (route.name === 'More') {
              setMorePanelVisible(prev => !prev);
            }
          },
        })}>
        <Tab.Screen
          name="Home"
          component={HomeStackNavigator}
          options={{
            tabBarIcon: () => ({sfSymbol: 'house'}),
          }}
        />
        <Tab.Screen
          name="Planner"
          component={TodoListScreen}
          options={{
            tabBarIcon: () => ({sfSymbol: 'calendar'}),
          }}
        />
        <Tab.Screen
          name="Execute"
          component={ExecutionScreen}
          options={{
            tabBarIcon: () => ({sfSymbol: 'timer'}),
          }}
        />
        <Tab.Screen
          name="Notes"
          component={NotesScreen}
          options={{
            tabBarIcon: () => ({sfSymbol: 'flame'}),
          }}
        />
        <Tab.Screen
          name="More"
          component={MoreStackNavigator}
          options={{
            tabBarIcon: () => ({sfSymbol: 'ellipsis'}),
            preventsDefault: true,
          }}
        />
      </Tab.Navigator>

      {/* GlassBackground 오버레이 — 전 iOS 버전 통합 */}
      {morePanelVisible && (
        <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleDismissPanel}
          />
          <View style={[styles.panelContainer, {bottom: panelBottom + 56}]}>
            <GlassBackground
              blurType="chromeMaterialLight"
              blurAmount={32}
              overlayColor="rgba(255, 255, 255, 0.55)"
              style={styles.jsPanel}>
              <MorePanelContent
                onSelectScreen={handleSelectScreen}
                onClose={handleDismissPanel}
                primaryColor={primaryColor}
                activeScreenName={activeMoreScreen}
              />
            </GlassBackground>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  panelContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  jsPanel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
});
