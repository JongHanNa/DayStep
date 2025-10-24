'use client';

import React from 'react';
// 필요한 아이콘만 개별 import - 번들 사이즈 최적화
import {
  Home, Bath, Utensils, Trash2, Briefcase, FileText, Calendar, Clock, Mail, Phone,
  Heart, Activity, Pill, Thermometer, Stethoscope, Cross, Users, UserPlus, MessageCircle,
  Coffee, Gift, Baby, Dumbbell, Bike, Mountain, Waves, TreePine, Apple, Cookie, ChefHat,
  IceCream, Wine, Pizza, Car, Train, Plane, MapPin, Camera, Luggage, Laptop, Smartphone,
  Headphones, Gamepad2, Tv, Wifi, Sun, Moon, Star, Flower, Leaf, Snowflake, Hammer,
  Wrench, Scissors, Key, Lock, Settings, Shield, Target, Flag, Repeat, Smile, Zap, TrendingUp,
  Sparkles, Book, Palette, Film, Music
} from 'lucide-react';

// 필요한 Phosphor 아이콘만 import
import {
  House, Broom, Toilet, CalendarBlank, FirstAid, ChatCircle, Barbell
} from '@phosphor-icons/react';

// 필요한 Hero 아이콘만 import
import {
  HomeIcon, TrashIcon, BriefcaseIcon, ClockIcon
} from '@heroicons/react/24/outline';

// 아이콘 스타일 타입
export type IconStyle = 'lucide' | 'phosphor-outline' | 'phosphor-filled' | 'heroicons-outline' | 'heroicons-solid';

// 아이콘 카테고리 타입
export type IconCategory = 
  | '집안일' | '업무' | '건강' | '관계' | '운동' | '음식' | '여행' | '기술' | '자연' | '도구';

// 통합 아이콘 데이터 타입
export interface UnifiedIconData {
  style: IconStyle;
  component: React.ComponentType<any>;
  label: string;
  category: IconCategory;
  color: string;
  keywords: string[];
}

// Lucide 아이콘 키 타입 (주요 아이콘들만)
export type LucideIconKey =
  // 집안일
  | 'Home' | 'Bath' | 'Utensils' | 'ShirtIcon' | 'Trash2' | 'WashingMachine'
  // 업무
  | 'Briefcase' | 'FileText' | 'Calendar' | 'Clock' | 'Mail' | 'Phone' | 'Book'
  // 건강
  | 'Heart' | 'Activity' | 'Pill' | 'Thermometer' | 'Stethoscope' | 'Cross'
  // 관계
  | 'Users' | 'UserPlus' | 'MessageCircle' | 'Coffee' | 'Gift' | 'Baby' | 'Sparkles'
  // 운동
  | 'Dumbbell' | 'Bike' | 'Mountain' | 'Waves' | 'TreePine'
  // 음식
  | 'Apple' | 'Cookie' | 'ChefHat' | 'IceCream' | 'Wine' | 'Pizza'
  // 여행
  | 'Car' | 'Train' | 'Plane' | 'MapPin' | 'Camera' | 'Luggage'
  // 기술
  | 'Laptop' | 'Smartphone' | 'Headphones' | 'Gamepad2' | 'Tv' | 'Wifi' | 'Film' | 'Music'
  // 자연
  | 'Sun' | 'Moon' | 'Star' | 'Flower' | 'Leaf' | 'Snowflake' | 'Palette'
  // 도구
  | 'Hammer' | 'Wrench' | 'Scissors' | 'Key' | 'Lock' | 'Settings'
  // 동기부여
  | 'Shield' | 'Target' | 'Flag' | 'Repeat' | 'Smile' | 'Zap' | 'TrendingUp';

// 통합 아이콘 키 타입
export type UnifiedIconKey = `lucide-${LucideIconKey}`;

// Lucide 아이콘 컬렉션 데이터
const lucideIconsData: Record<LucideIconKey, Omit<UnifiedIconData, 'style' | 'component'>> = {
  // 집안일
  Home: { label: '집', category: '집안일', color: 'text-blue-500', keywords: ['집', '홈', '거주', '주택'] },
  Bath: { label: '목욕', category: '집안일', color: 'text-cyan-500', keywords: ['목욕', '샤워', '씻기', '청결'] },
  Utensils: { label: '식기', category: '집안일', color: 'text-gray-500', keywords: ['식기', '요리', '주방', '음식'] },
  ShirtIcon: { label: '옷', category: '집안일', color: 'text-purple-500', keywords: ['옷', '의류', '빨래', '세탁'] },
  Trash2: { label: '쓰레기', category: '집안일', color: 'text-gray-600', keywords: ['쓰레기', '청소', '정리', '버리기'] },
  WashingMachine: { label: '세탁기', category: '집안일', color: 'text-blue-400', keywords: ['세탁기', '빨래', '세탁', '청소'] },

  // 업무
  Briefcase: { label: '가방', category: '업무', color: 'text-gray-700', keywords: ['가방', '업무', '직장', '회사'] },
  FileText: { label: '문서', category: '업무', color: 'text-blue-600', keywords: ['문서', '파일', '작성', '보고서'] },
  Calendar: { label: '달력', category: '업무', color: 'text-red-500', keywords: ['달력', '일정', '약속', '계획'] },
  Clock: { label: '시계', category: '업무', color: 'text-gray-800', keywords: ['시계', '시간', '약속', '스케줄'] },
  Mail: { label: '메일', category: '업무', color: 'text-blue-500', keywords: ['메일', '이메일', '소통', '연락'] },
  Phone: { label: '전화', category: '업무', color: 'text-green-500', keywords: ['전화', '통화', '연락', '소통'] },
  Book: { label: '책', category: '업무', color: 'text-indigo-600', keywords: ['책', '학습', '공부', '자기개발', '성장', '독서'] },

  // 건강
  Heart: { label: '하트', category: '건강', color: 'text-red-500', keywords: ['하트', '심장', '건강', '사랑'] },
  Activity: { label: '활동', category: '건강', color: 'text-orange-500', keywords: ['활동', '운동', '건강', '맥박'] },
  Pill: { label: '약', category: '건강', color: 'text-pink-500', keywords: ['약', '의약품', '치료', '건강'] },
  Thermometer: { label: '체온계', category: '건강', color: 'text-red-400', keywords: ['체온계', '온도', '열', '건강'] },
  Stethoscope: { label: '청진기', category: '건강', color: 'text-blue-600', keywords: ['청진기', '의사', '검진', '건강'] },
  Cross: { label: '십자가', category: '건강', color: 'text-red-600', keywords: ['십자가', '의료', '병원', '응급'] },

  // 관계
  Users: { label: '사람들', category: '관계', color: 'text-indigo-500', keywords: ['사람들', '친구', '가족', '관계'] },
  UserPlus: { label: '친구추가', category: '관계', color: 'text-green-500', keywords: ['친구추가', '만남', '새로운', '관계'] },
  MessageCircle: { label: '메시지', category: '관계', color: 'text-blue-500', keywords: ['메시지', '대화', '소통', '채팅'] },
  Coffee: { label: '커피', category: '관계', color: 'text-amber-700', keywords: ['커피', '만남', '대화', '휴식'] },
  Gift: { label: '선물', category: '관계', color: 'text-red-500', keywords: ['선물', '기념일', '축하', '사랑'] },
  Baby: { label: '아기', category: '관계', color: 'text-pink-400', keywords: ['아기', '육아', '가족', '돌봄'] },
  Sparkles: { label: '반짝임', category: '관계', color: 'text-purple-400', keywords: ['반짝임', '나', '자기발견', '성찰', '개인'] },

  // 운동
  Dumbbell: { label: '덤벨', category: '운동', color: 'text-gray-700', keywords: ['덤벨', '운동', '헬스', '근력'] },
  Bike: { label: '자전거', category: '운동', color: 'text-blue-500', keywords: ['자전거', '운동', '사이클', '라이딩'] },
  Mountain: { label: '산', category: '운동', color: 'text-green-600', keywords: ['산', '등산', '하이킹', '자연'] },
  Waves: { label: '파도', category: '운동', color: 'text-blue-400', keywords: ['파도', '수영', '바다', '물'] },
  TreePine: { label: '소나무', category: '운동', color: 'text-green-700', keywords: ['소나무', '자연', '산책', '트레킹'] },

  // 음식
  Apple: { label: '사과', category: '음식', color: 'text-red-500', keywords: ['사과', '과일', '건강', '간식'] },
  Cookie: { label: '쿠키', category: '음식', color: 'text-amber-600', keywords: ['쿠키', '과자', '디저트', '간식'] },
  ChefHat: { label: '요리사모자', category: '음식', color: 'text-gray-600', keywords: ['요리사모자', '요리', '음식', '주방'] },
  IceCream: { label: '아이스크림', category: '음식', color: 'text-pink-400', keywords: ['아이스크림', '디저트', '차가운', '간식'] },
  Wine: { label: '와인', category: '음식', color: 'text-purple-600', keywords: ['와인', '술', '음료', '여가'] },
  Pizza: { label: '피자', category: '음식', color: 'text-orange-500', keywords: ['피자', '음식', '식사', '배달'] },

  // 여행
  Car: { label: '자동차', category: '여행', color: 'text-blue-600', keywords: ['자동차', '운전', '여행', '이동'] },
  Train: { label: '기차', category: '여행', color: 'text-gray-600', keywords: ['기차', '여행', '교통', '이동'] },
  Plane: { label: '비행기', category: '여행', color: 'text-sky-500', keywords: ['비행기', '여행', '해외', '하늘'] },
  MapPin: { label: '위치', category: '여행', color: 'text-red-500', keywords: ['위치', '지도', '장소', '목적지'] },
  Camera: { label: '카메라', category: '여행', color: 'text-gray-700', keywords: ['카메라', '사진', '추억', '여행'] },
  Luggage: { label: '여행가방', category: '여행', color: 'text-amber-600', keywords: ['여행가방', '짐', '출장', '여행'] },

  // 기술
  Laptop: { label: '노트북', category: '기술', color: 'text-gray-600', keywords: ['노트북', '컴퓨터', '업무', '기술'] },
  Smartphone: { label: '스마트폰', category: '기술', color: 'text-slate-700', keywords: ['스마트폰', '핸드폰', '통신', '기술'] },
  Headphones: { label: '헤드폰', category: '기술', color: 'text-purple-500', keywords: ['헤드폰', '음악', '소리', '오디오'] },
  Gamepad2: { label: '게임패드', category: '기술', color: 'text-indigo-500', keywords: ['게임패드', '게임', '오락', '취미'] },
  Tv: { label: 'TV', category: '기술', color: 'text-gray-800', keywords: ['TV', '텔레비전', '방송', '오락'] },
  Wifi: { label: 'WiFi', category: '기술', color: 'text-blue-500', keywords: ['WiFi', '인터넷', '연결', '통신'] },
  Film: { label: '영화', category: '기술', color: 'text-purple-600', keywords: ['영화', '영상', '시청', '엔터테인먼트', '취미'] },
  Music: { label: '음악', category: '기술', color: 'text-pink-500', keywords: ['음악', '노래', '감상', '취미', '플레이리스트'] },

  // 자연
  Sun: { label: '태양', category: '자연', color: 'text-yellow-500', keywords: ['태양', '햇빛', '날씨', '밝음'] },
  Moon: { label: '달', category: '자연', color: 'text-gray-400', keywords: ['달', '밤', '어둠', '평화'] },
  Star: { label: '별', category: '자연', color: 'text-yellow-400', keywords: ['별', '밤하늘', '소원', '꿈'] },
  Flower: { label: '꽃', category: '자연', color: 'text-pink-500', keywords: ['꽃', '자연', '아름다움', '봄'] },
  Leaf: { label: '잎', category: '자연', color: 'text-green-500', keywords: ['잎', '자연', '식물', '성장'] },
  Snowflake: { label: '눈꽃', category: '자연', color: 'text-blue-300', keywords: ['눈꽃', '겨울', '차가움', '아름다움'] },
  Palette: { label: '팔레트', category: '자연', color: 'text-purple-500', keywords: ['팔레트', '취미', '예술', '창의성', '여가', '그림'] },

  // 도구
  Hammer: { label: '망치', category: '도구', color: 'text-amber-600', keywords: ['망치', '도구', '수리', '작업'] },
  Wrench: { label: '렌치', category: '도구', color: 'text-gray-600', keywords: ['렌치', '도구', '수리', '정비'] },
  Scissors: { label: '가위', category: '도구', color: 'text-red-500', keywords: ['가위', '자르기', '도구', '수공예'] },
  Key: { label: '열쇠', category: '도구', color: 'text-amber-500', keywords: ['열쇠', '보안', '접근', '잠금'] },
  Lock: { label: '자물쇠', category: '도구', color: 'text-gray-700', keywords: ['자물쇠', '보안', '안전', '잠금'] },
  Settings: { label: '설정', category: '도구', color: 'text-gray-600', keywords: ['설정', '구성', '관리', '옵션'] },

  // 동기부여 관련
  Shield: { label: '방패', category: '도구', color: 'rgb(71, 85, 105)', keywords: ['방패', '보호', '안전', '유혹이겨내기'] },
  Target: { label: '타겟', category: '도구', color: 'rgb(100, 116, 139)', keywords: ['타겟', '목표', '집중', '포커스'] },
  Flag: { label: '깃발', category: '도구', color: 'rgb(148, 163, 184)', keywords: ['깃발', '목표', '도달', '성취'] },
  Repeat: { label: '반복', category: '도구', color: 'rgb(107, 114, 128)', keywords: ['반복', '습관', '루틴', '연습'] },
  Smile: { label: '웃음', category: '건강', color: 'rgb(75, 85, 99)', keywords: ['웃음', '행복', '스트레스완화', '긍정'] },
  Zap: { label: '번개', category: '도구', color: 'rgb(55, 65, 81)', keywords: ['번개', '에너지', '생산성', '활력'] },
  TrendingUp: { label: '상승', category: '도구', color: 'rgb(31, 41, 55)', keywords: ['상승', '성장', '발전', '개선'] },
};

// Lucide 아이콘 컬렉션 생성 - 개별 import된 아이콘 사용
const createLucideIconsCollection = (): Record<string, UnifiedIconData> => {
  const collection: Record<string, UnifiedIconData> = {};

  // 직접 참조로 번들 사이즈 최적화
  const lucideComponents = {
    Home, Bath, Utensils, Trash2, Briefcase, FileText, Calendar, Clock, Mail, Phone,
    Heart, Activity, Pill, Thermometer, Stethoscope, Cross, Users, UserPlus, MessageCircle,
    Coffee, Gift, Baby, Dumbbell, Bike, Mountain, Waves, TreePine, Apple, Cookie, ChefHat,
    IceCream, Wine, Pizza, Car, Train, Plane, MapPin, Camera, Luggage, Laptop, Smartphone,
    Headphones, Gamepad2, Tv, Wifi, Sun, Moon, Star, Flower, Leaf, Snowflake, Hammer,
    Wrench, Scissors, Key, Lock, Settings, Shield, Target, Flag, Repeat, Smile, Zap, TrendingUp,
    Sparkles, Book, Palette, Film, Music
  };

  Object.entries(lucideIconsData).forEach(([iconKey, data]) => {
    const LucideComponent = (lucideComponents as any)[iconKey];
    if (LucideComponent) {
      collection[`lucide-${iconKey}`] = {
        style: 'lucide',
        component: LucideComponent,
        ...data
      };
    }
  });

  return collection;
};


// Phosphor Icons 컬렉션 생성 - 개별 import된 아이콘 사용
const createPhosphorIconsCollection = (): Record<string, UnifiedIconData> => {
  const collection: Record<string, UnifiedIconData> = {};

  // 직접 참조로 번들 사이즈 최적화
  const phosphorComponents = {
    House, Broom, Toilet, CalendarBlank, FirstAid, ChatCircle, Barbell
  };

  // 주요 Phosphor 아이콘들 매핑
  const phosphorIconsData = {
    // 집안일
    House: { label: '집', category: '집안일' as IconCategory, color: 'text-blue-600', keywords: ['집', '가정', '홈', '주택'] },
    Broom: { label: '빗자루', category: '집안일' as IconCategory, color: 'text-brown-600', keywords: ['청소', '빗자루', '정리'] },
    Toilet: { label: '화장실', category: '집안일' as IconCategory, color: 'text-blue-500', keywords: ['화장실', '청소'] },

    // 업무
    CalendarBlank: { label: '달력', category: '업무' as IconCategory, color: 'text-green-600', keywords: ['달력', '일정', '스케줄'] },

    // 건강
    FirstAid: { label: '응급처치', category: '건강' as IconCategory, color: 'text-red-600', keywords: ['응급처치', '의료', '건강'] },

    // 관계
    ChatCircle: { label: '채팅', category: '관계' as IconCategory, color: 'text-green-500', keywords: ['채팅', '대화', '소통'] },

    // 운동
    Barbell: { label: '바벨', category: '운동' as IconCategory, color: 'text-orange-600', keywords: ['바벨', '헬스', '운동'] },
    Bicycle: { label: '자전거', category: '운동' as IconCategory, color: 'text-green-600', keywords: ['자전거', '사이클링', '운동'] },
    SwimmingPool: { label: '수영', category: '운동' as IconCategory, color: 'text-blue-500', keywords: ['수영', '물', '운동'] },
    
    // 음식
    Apple: { label: '사과', category: '음식' as IconCategory, color: 'text-red-500', keywords: ['사과', '과일', '음식'] },
    Coffee: { label: '커피', category: '음식' as IconCategory, color: 'text-amber-700', keywords: ['커피', '음료', '카페'] },
    Pizza: { label: '피자', category: '음식' as IconCategory, color: 'text-orange-500', keywords: ['피자', '음식', '배달'] },
    
    // 여행
    Car: { label: '자동차', category: '여행' as IconCategory, color: 'text-blue-600', keywords: ['자동차', '이동', '여행'] },
    Airplane: { label: '비행기', category: '여행' as IconCategory, color: 'text-sky-500', keywords: ['비행기', '여행', '항공'] },
    MapPin: { label: '위치', category: '여행' as IconCategory, color: 'text-red-500', keywords: ['위치', '지도', '장소'] },
    
    // 기술
    Desktop: { label: '데스크탑', category: '기술' as IconCategory, color: 'text-blue-500', keywords: ['컴퓨터', '데스크탑'] },
    DeviceMobile: { label: '모바일', category: '기술' as IconCategory, color: 'text-gray-700', keywords: ['모바일', '스마트폰', '기기'] },
    Headphones: { label: '헤드폰', category: '기술' as IconCategory, color: 'text-purple-600', keywords: ['헤드폰', '음악', '오디오'] },
    
    // 자연
    Sun: { label: '태양', category: '자연' as IconCategory, color: 'text-yellow-500', keywords: ['태양', '날씨', '자연'] },
    Moon: { label: '달', category: '자연' as IconCategory, color: 'text-blue-400', keywords: ['달', '밤', '자연'] },
    Tree: { label: '나무', category: '자연' as IconCategory, color: 'text-green-600', keywords: ['나무', '자연', '환경'] },
    
    // 도구
    Hammer: { label: '망치', category: '도구' as IconCategory, color: 'text-amber-600', keywords: ['망치', '도구', '수리'] },
    Wrench: { label: '렌치', category: '도구' as IconCategory, color: 'text-gray-600', keywords: ['렌치', '도구', '정비'] },
    Scissors: { label: '가위', category: '도구' as IconCategory, color: 'text-red-500', keywords: ['가위', '자르기', '도구'] },
  };

  Object.entries(phosphorIconsData).forEach(([iconKey, data]) => {
    const PhosphorComponent = (phosphorComponents as any)[iconKey];
    if (PhosphorComponent) {
      // Outline 버전
      collection[`phosphor-outline-${iconKey}`] = {
        style: 'phosphor-outline',
        component: (props: any) => <PhosphorComponent {...props} weight="light" />,
        ...data
      };

      // Filled 버전
      collection[`phosphor-filled-${iconKey}`] = {
        style: 'phosphor-filled',
        component: (props: any) => <PhosphorComponent {...props} weight="fill" />,
        ...data
      };
    }
  });
  
  return collection;
};

// Heroicons 컬렉션 생성
const createHeroiconsCollection = (): Record<string, UnifiedIconData> => {
  const collection: Record<string, UnifiedIconData> = {};
  
  // 주요 Heroicons 매핑
  const heroiconsData = {
    // 집안일  
    HomeIcon: { label: '집', category: '집안일' as IconCategory, color: 'text-blue-600', keywords: ['집', '가정', '홈'] },
    SparklesIcon: { label: '반짝임', category: '집안일' as IconCategory, color: 'text-yellow-500', keywords: ['청소', '깨끗', '반짝'] },
    
    // 업무
    BriefcaseIcon: { label: '서류가방', category: '업무' as IconCategory, color: 'text-gray-700', keywords: ['업무', '사무'] },
    DocumentTextIcon: { label: '문서', category: '업무' as IconCategory, color: 'text-blue-600', keywords: ['문서', '텍스트', '업무'] },
    CalendarDaysIcon: { label: '달력', category: '업무' as IconCategory, color: 'text-green-600', keywords: ['달력', '일정', '날짜'] },
    ClockIcon: { label: '시계', category: '업무' as IconCategory, color: 'text-blue-500', keywords: ['시계', '시간'] },
    
    // 건강
    HeartIcon: { label: '하트', category: '건강' as IconCategory, color: 'text-red-500', keywords: ['하트', '건강', '사랑'] },
    
    // 관계
    UsersIcon: { label: '사용자들', category: '관계' as IconCategory, color: 'text-blue-600', keywords: ['사용자', '사람', '그룹'] },
    ChatBubbleLeftIcon: { label: '채팅', category: '관계' as IconCategory, color: 'text-green-500', keywords: ['채팅', '메시지', '대화'] },
    GiftIcon: { label: '선물', category: '관계' as IconCategory, color: 'text-pink-500', keywords: ['선물', '기념일'] },
    
    // 운동
    // 업무 카테고리로 분류 (Heroicons에 운동 관련 아이콘이 제한적)
    FireIcon: { label: '불', category: '건강' as IconCategory, color: 'text-orange-500', keywords: ['활동', '에너지', '운동'] },
    
    // 음식
    // 음식 관련 아이콘이 제한적이므로 일반 카테고리 사용
    
    // 여행
    MapPinIcon: { label: '위치핀', category: '여행' as IconCategory, color: 'text-red-500', keywords: ['위치', '지도', '장소'] },
    
    // 기술
    ComputerDesktopIcon: { label: '데스크탑', category: '기술' as IconCategory, color: 'text-blue-500', keywords: ['컴퓨터', '데스크탑'] },
    DevicePhoneMobileIcon: { label: '모바일폰', category: '기술' as IconCategory, color: 'text-gray-700', keywords: ['모바일', '스마트폰'] },
    
    // 자연
    SunIcon: { label: '태양', category: '자연' as IconCategory, color: 'text-yellow-500', keywords: ['태양', '날씨'] },
    MoonIcon: { label: '달', category: '자연' as IconCategory, color: 'text-blue-400', keywords: ['달', '밤'] },
    
    // 도구
    WrenchScrewdriverIcon: { label: '도구', category: '도구' as IconCategory, color: 'text-gray-600', keywords: ['도구', '수리', '렌치'] },
    CogIcon: { label: '설정', category: '도구' as IconCategory, color: 'text-gray-600', keywords: ['설정', '구성', '톱니바퀴'] },
  };

  // 직접 참조로 번들 사이즈 최적화
  const heroComponents = {
    HomeIcon, TrashIcon, BriefcaseIcon, ClockIcon
  };

  Object.entries(heroiconsData).forEach(([iconKey, data]) => {
    const OutlineComponent = (heroComponents as any)[iconKey];
    const SolidComponent = (heroComponents as any)[iconKey]; // Hero solid는 별도 import 필요
    
    if (OutlineComponent) {
      collection[`heroicons-outline-${iconKey}`] = {
        style: 'heroicons-outline',
        component: OutlineComponent,
        ...data
      };
    }
    
    if (SolidComponent) {
      collection[`heroicons-solid-${iconKey}`] = {
        style: 'heroicons-solid',
        component: SolidComponent,
        ...data
      };
    }
  });
  
  return collection;
};

// 통합 아이콘 컬렉션
export const unifiedIconsCollection: Record<string, UnifiedIconData> = {
  ...createLucideIconsCollection(),
  ...createPhosphorIconsCollection(),
  ...createHeroiconsCollection()
};

// 스타일별 아이콘 가져오기
export const getIconsByStyle = (style: IconStyle) => {
  return Object.fromEntries(
    Object.entries(unifiedIconsCollection).filter(([_, data]) => data.style === style)
  );
};

// 카테고리별 아이콘 가져오기
export const getIconsByCategory = (category: IconCategory, style?: IconStyle) => {
  let filtered = Object.entries(unifiedIconsCollection).filter(([_, data]) => data.category === category);
  
  if (style) {
    filtered = filtered.filter(([_, data]) => data.style === style);
  }
  
  return Object.fromEntries(filtered);
};

// 아이콘 검색
export const searchUnifiedIcons = (query: string, style?: IconStyle, category?: IconCategory) => {
  const lowerQuery = query.toLowerCase();
  let filtered = Object.entries(unifiedIconsCollection);
  
  // 텍스트 검색
  filtered = filtered.filter(([key, data]) => 
    key.toLowerCase().includes(lowerQuery) || 
    data.label.toLowerCase().includes(lowerQuery) || 
    data.category.toLowerCase().includes(lowerQuery) ||
    data.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
  );
  
  // 스타일 필터
  if (style) {
    filtered = filtered.filter(([_, data]) => data.style === style);
  }
  
  // 카테고리 필터
  if (category) {
    filtered = filtered.filter(([_, data]) => data.category === category);
  }
  
  return Object.fromEntries(filtered);
};

// 아이콘 가져오기 헬퍼
export const getUnifiedIcon = (iconKey: UnifiedIconKey = 'lucide-Home') => {
  const iconData = unifiedIconsCollection[iconKey] || unifiedIconsCollection['lucide-Home'];
  return iconData.component;
};

// 사용 가능한 스타일 목록
export const iconStyles: IconStyle[] = ['lucide', 'phosphor-outline', 'phosphor-filled', 'heroicons-outline', 'heroicons-solid'];

// 사용 가능한 카테고리 목록
export const unifiedIconCategories: IconCategory[] = [
  '집안일', '업무', '건강', '관계', '운동', '음식', '여행', '기술', '자연', '도구'
];

// 스타일별 카테고리 목록
export const getStyleCategories = (style: IconStyle): IconCategory[] => {
  if (style === 'lucide') {
    return ['집안일', '업무', '건강', '관계', '운동', '음식', '여행', '기술', '자연', '도구'];
  } else if (style === 'phosphor-outline' || style === 'phosphor-filled') {
    return ['집안일', '업무', '건강', '관계', '운동', '음식', '여행', '기술', '자연', '도구'];
  } else if (style === 'heroicons-outline' || style === 'heroicons-solid') {
    return ['집안일', '업무', '건강', '관계', '운동', '음식', '여행', '기술', '자연', '도구'];
  }
  return unifiedIconCategories;
};

// 스타일 표시명
export const styleDisplayNames: Record<IconStyle, string> = {
  lucide: 'Lucide',
  'phosphor-outline': 'Phosphor 아웃라인',
  'phosphor-filled': 'Phosphor 채움',
  'heroicons-outline': 'Heroicons 아웃라인',
  'heroicons-solid': 'Heroicons 채움'
};