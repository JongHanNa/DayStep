/**
 * Main Tab Navigator — 하이브리드 네이티브 탭바
 * react-native-bottom-tabs (네이티브 SwiftUI TabView) → Liquid Glass 자동
 * More 패널: iOS 26+ renderBottomAccessoryView (네이티브 탭바 글래스 자체 확장)
 *           iOS 25-: 기존 GlassBackground 오버레이
 *
 * 5탭: 홈 / 플래너 / 실행(중앙) / 노트 / 더 보기
 */
import React, {useState, useCallback, useRef} from 'react';
import {View, Pressable, StyleSheet, Dimensions} from 'react-native';
import {createNativeBottomTabNavigator} from '@bottom-tabs/react-navigation';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@/theme';
import {useSettingsStore} from '@/stores/settingsStore';
import {isIOS26Plus, type NativeMenuItemData} from '@/components/native';
import {MorePanelContent, getMorePanelHeight} from '@/components/navigation/MorePanel';
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
  const showLabels = useSettingsStore(s => s.morePanelShowLabels);
  const setShowLabels = useSettingsStore(s => s.setMorePanelShowLabels);
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
        // iOS 26+: 네이티브 탭바 글래스 자체가 확장되어 MorePanel 표시
        renderBottomAccessoryView={
          isIOS26Plus
            ? ({placement}) => {
                if (!morePanelVisible) return null;
                return (
                  <View style={{
                    width: Dimensions.get('window').width,
                    height: getMorePanelHeight(showLabels),
                  }}>
                    <MorePanelContent
                      onSelectScreen={handleSelectScreen}
                      onClose={handleDismissPanel}
                      primaryColor={primaryColor}
                      activeScreenName={activeMoreScreen}
                    />
                  </View>
                );
              }
            : undefined
        }
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
          tabPress: () => {
            if (route.name === 'More' && navigation.isFocused()) {
              // More 탭이 이미 포커스 → 패널 토글
              setMorePanelVisible(prev => !prev);
            } else {
              // 다른 탭 전환 → 패널 닫기
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
          }}
        />
      </Tab.Navigator>

      {/* iOS 25-: renderBottomAccessoryView 미지원 → 기존 GlassBackground 오버레이 */}
      {!isIOS26Plus && morePanelVisible && (
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
