/**
 * Main Tab Navigator
 * 5탭: 홈 / 플래너 / 실행(중앙) / 노트 / 더 보기
 * Home 탭은 HomeStack (메인 + 하위 화면)
 * More 탭은 MoreStack (설정 + 부가 화면)
 * Execute 탭은 ExecutionScreen 직접 사용 (인플레이스 타이머)
 */
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {CustomTabBar} from '@/components/navigation/CustomTabBar';
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

// Home Stack (메인 + 하위 화면 — 기존 HomeScreen 내비게이션 호환)
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

// More Stack (설정 랜딩 + 모든 부가 화면)
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

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Planner" component={TodoListScreen} />
      <Tab.Screen name="Execute" component={ExecutionScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="More" component={MoreStackNavigator} />
    </Tab.Navigator>
  );
}
