import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TodoListScreen from '../screens/TodoListScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#4F46E5',
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{title: '홈'}}
      />
      <Tab.Screen
        name="TodoList"
        component={TodoListScreen}
        options={{title: '할일'}}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: '설정'}}
      />
    </Tab.Navigator>
  );
}
