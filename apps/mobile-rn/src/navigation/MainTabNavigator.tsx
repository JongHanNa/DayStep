/**
 * Main Tab Navigator
 * 5탭: 홈 / 플래너 / 실행(중앙) / 노트 / 설정
 * Home 탭은 HomeStack (메인 + 9개 전용 화면)
 * Execute 탭은 스택 네비게이터로 실행 랜딩 + 풀스크린 타이머
 */
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {CustomTabBar} from '@/components/navigation/CustomTabBar';
import HomeScreen from '../screens/HomeScreen';
import TodoListScreen from '../screens/TodoListScreen';
import ExecutionScreen from '../screens/ExecutionScreen';
import FocusTimerScreen from '../screens/FocusTimerScreen';
import NotesScreen from '../screens/NotesScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Home Stack 전용 화면
import MonthlyPlannerScreen from '../screens/MonthlyPlannerScreen';
import TimelineScreen from '../screens/TimelineScreen';
import AIPlanScreen from '../screens/AIPlanScreen';
import AIChatScreen from '../screens/AIChatScreen';
import GuideScreen from '../screens/GuideScreen';
import RecordScreen from '../screens/RecordScreen';
import NewsScreen from '../screens/NewsScreen';
import ContactScreen from '../screens/ContactScreen';
import GratitudeScreen from '../screens/GratitudeScreen';
import ActivityScreen from '../screens/ActivityScreen';

// Execute Stack (실행 모드 + 포모도로)
const ExecuteStack = createNativeStackNavigator();

function ExecuteStackNavigator() {
  return (
    <ExecuteStack.Navigator screenOptions={{headerShown: false}}>
      <ExecuteStack.Screen name="ExecutionMain" component={ExecutionScreen} />
      <ExecuteStack.Screen
        name="FocusTimer"
        component={FocusTimerScreen}
        options={{presentation: 'fullScreenModal', animation: 'fade'}}
      />
    </ExecuteStack.Navigator>
  );
}

// Home Stack (메인 + 9개 전용 화면)
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="MonthlyPlanner" component={MonthlyPlannerScreen} />
      <HomeStack.Screen name="Timeline" component={TimelineScreen} />
      <HomeStack.Screen name="AIPlan" component={AIPlanScreen} />
      <HomeStack.Screen name="AIChat" component={AIChatScreen} />
      <HomeStack.Screen name="Guide" component={GuideScreen} />
      <HomeStack.Screen name="Record" component={RecordScreen} />
      <HomeStack.Screen name="News" component={NewsScreen} />
      <HomeStack.Screen name="Contact" component={ContactScreen} />
      <HomeStack.Screen name="Gratitude" component={GratitudeScreen} />
      <HomeStack.Screen name="Activity" component={ActivityScreen} />
    </HomeStack.Navigator>
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
      <Tab.Screen name="Execute" component={ExecuteStackNavigator} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
