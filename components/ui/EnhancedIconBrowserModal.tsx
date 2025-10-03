'use client';

import React, { useState, useMemo } from 'react';
import { Sheet } from 'react-modal-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ColorPicker from '@/components/ui/ColorPicker';
import { cn } from '@/lib/utils';
import { createModalConfig } from '@/lib/modal-config';
import {
  Search, X, Filter, Grid3X3,
  Clock, Home, Briefcase, Utensils, Car, Gamepad2,
  Heart, Music, ShoppingCart, Palette, Camera, Book,
  Wrench, Globe, Shield, Zap, Users, Settings,
  MapPin, Dumbbell, Leaf, Sparkles, Trophy, GraduationCap,
  HelpCircle, Cpu
} from 'lucide-react';
import {
  unifiedIconsCollection,
  searchUnifiedIcons,
  getStyleCategories,
  iconStyles,
  unifiedIconCategories,
  styleDisplayNames,
  type IconStyle,
  type IconCategory,
  type UnifiedIconKey
} from '@/lib/icon-collection';

interface EnhancedIconBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onIconSelect: (iconKey: UnifiedIconKey) => void;
  selectedIcon?: string;
  selectedColor?: string;
  onColorSelect?: (colorId: string) => void;
}

// 카테고리별 대표 아이콘 매핑
const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, any> = {
    '최근 사용': Clock,
    '집': Home,
    '업무': Briefcase,
    '음식': Utensils,
    '교통': Car,
    '게임': Gamepad2,
    '건강': Heart,
    '음악': Music,
    '쇼핑': ShoppingCart,
    '디자인': Palette,
    '사진': Camera,
    '교육': Book,
    '도구': Wrench,
    '웹': Globe,
    '보안': Shield,
    '전자기기': Zap,
    '사람': Users,
    '설정': Settings,
    // 추가된 카테고리들
    '관계': Users,
    '기술': Cpu,
    '기타': HelpCircle,
    '생활': Home,
    '여행': MapPin,
    '운동': Dumbbell,
    '자연': Leaf,
    '집안일': Sparkles,
    '취미': Trophy,
    '학습': GraduationCap,
    // 기본값
    'default': Grid3X3
  };
  
  return iconMap[category] || iconMap['default'];
};

export const EnhancedIconBrowserModal: React.FC<EnhancedIconBrowserModalProps> = ({
  open,
  onClose,
  onIconSelect,
  selectedIcon,
  selectedColor = 'yellow',
  onColorSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<IconStyle | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<IconCategory | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // 필터링된 아이콘 목록
  const filteredIcons = useMemo(() => {
    if (searchQuery.trim() || selectedStyle || selectedCategory) {
      return searchUnifiedIcons(
        searchQuery.trim(),
        selectedStyle || undefined,
        selectedCategory || undefined
      );
    }
    return unifiedIconsCollection;
  }, [searchQuery, selectedStyle, selectedCategory]);

  // 카테고리별로 그룹화된 아이콘 목록
  const groupedIcons = useMemo(() => {
    const entries = Object.entries(filteredIcons);
    const groups: Record<string, Array<[string, any]>> = {};
    
    entries.forEach(([key, iconData]) => {
      const category = iconData.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push([key, iconData]);
    });
    
    // 카테고리 정렬 (최근 사용이 있다면 맨 위, 나머지는 알파벳 순)
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      if (a === '최근 사용') return -1;
      if (b === '최근 사용') return 1;
      return a.localeCompare(b, 'ko');
    });
    
    const sortedGroups: Record<string, Array<[string, any]>> = {};
    sortedCategories.forEach(category => {
      sortedGroups[category] = groups[category];
    });
    
    return sortedGroups;
  }, [filteredIcons]);

  // 현재 스타일에 따른 카테고리 목록
  const availableCategories = useMemo(() => {
    if (selectedStyle) {
      return getStyleCategories(selectedStyle);
    }
    return unifiedIconCategories;
  }, [selectedStyle]);

  // 아이콘 선택 핸들러
  const handleIconSelect = (iconKey: UnifiedIconKey) => {
    onIconSelect(iconKey);
    onClose();
  };

  // 필터 초기화
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedStyle('');
    setSelectedCategory('');
    setShowFilters(false); // 필터 영역을 접음
  };

  // 스타일별 아이콘 통계
  const iconStats = useMemo(() => {
    const lucideCount = Object.values(unifiedIconsCollection).filter(icon => icon.style === 'lucide').length;
    const phosphorOutlineCount = Object.values(unifiedIconsCollection).filter(icon => icon.style === 'phosphor-outline').length;
    const phosphorFilledCount = Object.values(unifiedIconsCollection).filter(icon => icon.style === 'phosphor-filled').length;
    const heroOutlineCount = Object.values(unifiedIconsCollection).filter(icon => icon.style === 'heroicons-outline').length;
    const heroSolidCount = Object.values(unifiedIconsCollection).filter(icon => icon.style === 'heroicons-solid').length;
    const total = lucideCount + phosphorOutlineCount + phosphorFilledCount + heroOutlineCount + heroSolidCount;
    return { 
      lucide: lucideCount,
      'phosphor-outline': phosphorOutlineCount,
      'phosphor-filled': phosphorFilledCount,
      'heroicons-outline': heroOutlineCount,
      'heroicons-solid': heroSolidCount,
      total
    };
  }, []);

  const iconEntries = Object.values(groupedIcons).flat();
  const hasFilters = searchQuery.trim() || selectedStyle || selectedCategory;

  // 중앙 집중식 모달 설정 - 100% 높이 통일
  const modalConfig = createModalConfig('FULLSCREEN');

  return (
    <TooltipProvider>
      <Sheet
        isOpen={open}
        onClose={onClose}
        {...modalConfig}
      >
      <Sheet.Container>
        <Sheet.Header>
          {/* 드래그 핸들 영역과 X 버튼 */}
          <div className="w-full flex justify-between items-center py-2 px-4">
            <div className="flex-1 flex justify-center">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 검색 및 필터 토글 영역 - 고정 영역 */}
          <div className="px-3 pb-3 border-b bg-white dark:bg-gray-900">
            {/* 검색창과 필터 토글 버튼 */}
            <div className="flex gap-2 items-center mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* 필터 토글 버튼 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-1 transition-colors p-2",
                  showFilters && "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400"
                )}
              >
                <Filter className="w-4 h-4" />
                {(selectedStyle || selectedCategory) && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </Button>
            </div>

            {/* 접을 수 있는 필터 영역 */}
            {showFilters && (
              <div className="space-y-3 pt-1">
                {/* 스타일 필터 */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    스타일:
                  </span>
                  {iconStyles.map((style) => (
                    <Badge
                      key={style}
                      variant={selectedStyle === style ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-blue-100 dark:hover:bg-blue-900",
                        selectedStyle === style && "bg-blue-500 text-white hover:bg-blue-600"
                      )}
                      onClick={() => {
                        setSelectedStyle(selectedStyle === style ? '' : style);
                        setSelectedCategory(''); // 스타일 변경 시 카테고리 초기화
                      }}
                    >
                      {styleDisplayNames[style]}
                      <span className="ml-1 text-xs">
                        ({iconStats[style] || 0})
                      </span>
                    </Badge>
                  ))}
                </div>

                {/* 카테고리 필터 */}
                <div className="flex flex-wrap gap-2 items-start">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-1 mt-1">
                    <Grid3X3 className="w-3 h-3" />
                    카테고리:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((category) => (
                      <Badge
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-green-100 dark:hover:bg-green-900",
                          selectedCategory === category && "bg-green-500 text-white hover:bg-green-600"
                        )}
                        onClick={() => setSelectedCategory(selectedCategory === category ? '' : category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 필터 초기화 및 상태 */}
                {hasFilters && (
                  <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {iconEntries.length}개 아이콘
                      </span>
                      {searchQuery && (
                        <span className="text-blue-600">
                          &quot;{searchQuery}&quot; 검색 결과
                        </span>
                      )}
                      {selectedStyle && (
                        <Badge variant="secondary" className="text-xs">
                          {styleDisplayNames[selectedStyle]}
                        </Badge>
                      )}
                      {selectedCategory && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedCategory}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-6 px-2 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      초기화
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 색상 선택 영역 - 필터 바로 아래 */}
            {onColorSelect && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    할일 색상
                  </span>
                </div>
                <div className="px-2">
                  <ColorPicker
                    selectedColor={selectedColor}
                    onColorSelect={onColorSelect}
                    className="justify-start"
                  />
                </div>
              </div>
            )}
          </div>
        </Sheet.Header>

        {/* 스크롤 가능한 아이콘 그리드 영역 */}
        <div 
          className="flex-1 overflow-y-auto scrollbar-hide px-1"
          style={{
            height: '82vh',
            maxHeight: '82vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            touchAction: 'pan-y',
            background: 'var(--background)',
          }}
        >
          {/* 카테고리별 아이콘 그리드 */}
          <div className="py-4">
            {Object.keys(groupedIcons).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedIcons).map(([category, icons]) => (
                  <div key={category}>
                    {/* 카테고리 헤더 */}
                    <div className="flex items-center gap-2 mb-3 px-2">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {(() => {
                          const CategoryIcon = getCategoryIcon(category);
                          return <CategoryIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
                        })()}
                      </div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {category}
                      </h3>
                    </div>
                    
                    {/* 카테고리별 아이콘 그리드 */}
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-3 p-1">
                      {icons.map(([key, iconData]) => {
                        const isSelected = selectedIcon === key;
                        const IconComponent = iconData.component;
                        
                        return (
                          <Tooltip key={key} delayDuration={300}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleIconSelect(key as UnifiedIconKey)}
                                className={cn(
                                  "flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200",
                                  "hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                )}
                              >
                                <div className="flex items-center justify-center">
                                  <IconComponent 
                                    className="w-5 h-5 text-black dark:text-white" 
                                    size={20}
                                  />
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top"
                              className="px-3 py-2 text-sm font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg"
                            >
                              <div className="text-center">
                                <div className="font-semibold text-base">{iconData.label}</div>
                                <div className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                                  {key}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  아이콘을 찾을 수 없어요
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  다른 검색어, 스타일, 또는 카테고리를 시도해보세요
                </p>
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  <X className="w-3 h-3 mr-1" />
                  모든 필터 초기화
                </Button>
              </div>
            )}
          </div>
        </div>
      </Sheet.Container>
    </Sheet>
    </TooltipProvider>
  );
};

export default EnhancedIconBrowserModal;