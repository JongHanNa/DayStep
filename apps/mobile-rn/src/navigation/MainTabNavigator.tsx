/**
 * Main Tab Navigator
 * 5탭: 홈 / 플래너 / 실행(중앙) / 노트 / 설정
 * Execute 탭은 스택 네비게이터로 실행모드 + 포모도로 지원
 */
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {CustomTabBar} from '@/components/navigation/CustomTabBar';
import HomeScreen from '../screens/HomeScreen';
import TodoListScreen from '../screens/TodoListScreen';
import ExecutionScreen from '../screens/ExecutionScreen';
import PomodoroScreen from '../screens/PomodoroScreen';
import NotesScreen from '../screens/NotesScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Execute Stack (실행 모드 + 포모도로)
const ExecuteStack = createNativeStackNavigator();

function ExecuteStackNavigator() {
  return (
    <ExecuteStack.Navigator screenOptions={{headerShown: false}}>
      <ExecuteStack.Screen name="ExecutionMain" component={ExecutionScreen} />
      <ExecuteStack.Screen
        name="Pomodoro"
        component={PomodoroScreen}
        options={{presentation: 'modal', animation: 'slide_from_bottom'}}
      />
    </ExecuteStack.Navigator>
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Planner" component={TodoListScreen} />
      <Tab.Screen name="Execute" component={ExecuteStackNavigator} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
