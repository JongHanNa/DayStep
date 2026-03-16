/**
 * Main Tab Navigator — CustomTabBar 기반
 * CustomTabBar가 iOS 26+ Liquid Glass 모프 + iOS 25- JS 폴백 모두 처리
 * More 패널도 CustomTabBar 내부에서 탭바와 하나의 글래스로 통합 처리
 *
 * 5탭: 홈 / 플래너 / 실행(중앙) / 노트 / 더 보기
 */
import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import {CustomTabBar} from '@/components/navigation/CustomTabBar';
import {useSettingsStore} from '@/stores/settingsStore';

// Screens
import HomeScreen from '../screens/HomeScreen';
import PlannerScreen from '../screens/PlannerScreen';
import ExecutionScreen from '../screens/ExecutionScreen';
import NotesScreen from '../screens/NotesScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Home Stack / More Stack 공유 화면
import AIPlanScreen from '../screens/AIPlanScreen';
import AIChatScreen from '../screens/AIChatScreen';
import GuideScreen from '../screens/GuideScreen';
import RecordScreen from '../screens/RecordScreen';
import CleanupScreen from '../screens/CleanupScreen';
import SleepRecordScreen from '../screens/SleepRecordScreen';
import ADHDUnderstandingScreen from '../screens/ADHDUnderstandingScreen';
import CleaningScreen from '../screens/CleaningScreen';

/** MonthlyPlanner 리다이렉트: Planner 탭으로 이동 + viewMode='monthlyPlanner' */
function MonthlyPlannerRedirect() {
  const navigation = useNavigation<any>();
  const setPlannerViewMode = useSettingsStore(s => s.setPlannerViewMode);

  useEffect(() => {
    setPlannerViewMode('monthlyPlanner');
    navigation.navigate('Planner');
  }, [navigation, setPlannerViewMode]);

  return null;
}

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
      <HomeStack.Screen name="MonthlyPlanner" component={MonthlyPlannerRedirect} />
      <HomeStack.Screen name="AIPlan" component={AIPlanScreen} />
      <HomeStack.Screen name="AIChat" component={AIChatScreen} />
      <HomeStack.Screen name="Guide" component={GuideScreen} />
      <HomeStack.Screen name="Record" component={RecordScreen} />
      <HomeStack.Screen name="Cleanup" component={CleanupScreen} />
      <HomeStack.Screen name="SleepRecord" component={SleepRecordScreen} />
      <HomeStack.Screen name="ADHDUnderstanding" component={ADHDUnderstandingScreen} />
      <HomeStack.Screen name="Cleaning" component={CleaningScreen} />
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
      <MoreStack.Screen name="MonthlyPlanner" component={MonthlyPlannerRedirect} />
      <MoreStack.Screen name="AIPlan" component={AIPlanScreen} />
      <MoreStack.Screen name="AIChat" component={AIChatScreen} />
      <MoreStack.Screen name="Guide" component={GuideScreen} />
      <MoreStack.Screen name="Record" component={RecordScreen} />
      <MoreStack.Screen name="Cleanup" component={CleanupScreen} />
      <MoreStack.Screen name="SleepRecord" component={SleepRecordScreen} />
      <MoreStack.Screen name="ADHDUnderstanding" component={ADHDUnderstandingScreen} />
      <MoreStack.Screen name="Cleaning" component={CleaningScreen} />
    </MoreStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <View style={styles.root}>
      <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{headerShown: false}}>
        <Tab.Screen name="Home" component={HomeStackNavigator} />
        <Tab.Screen name="Planner" component={PlannerScreen} />
        <Tab.Screen name="Execute" component={ExecutionScreen} />
        <Tab.Screen name="Notes" component={NotesScreen} />
        <Tab.Screen name="More" component={MoreStackNavigator} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
