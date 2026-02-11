/**
 * Main Tab Navigator
 * 5탭: 홈 / 플래너 / 실행(중앙) / 노트 / 설정
 */
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {CustomTabBar} from '@/components/navigation/CustomTabBar';
import HomeScreen from '../screens/HomeScreen';
import TodoListScreen from '../screens/TodoListScreen';
import ExecutionScreen from '../screens/ExecutionScreen';
import NotesScreen from '../screens/NotesScreen';
import SettingsScreen from '../screens/SettingsScreen';

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
      <Tab.Screen name="Execute" component={ExecutionScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
