// Todo Icons Library - Retro pixel art style SVG icons for todo categories
import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Cleaning & Household Icons
export const CleaningIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="2" y="2" width="2" height="2"/>
    <rect x="4" y="2" width="2" height="2"/>
    <rect x="6" y="2" width="2" height="2"/>
    <rect x="8" y="2" width="2" height="2"/>
    <rect x="10" y="2" width="2" height="2"/>
    <rect x="12" y="2" width="2" height="2"/>
    <rect x="14" y="2" width="2" height="2"/>
    <rect x="16" y="2" width="2" height="2"/>
    <rect x="8" y="4" width="2" height="2"/>
    <rect x="10" y="4" width="2" height="2"/>
    <rect x="8" y="6" width="2" height="2"/>
    <rect x="10" y="6" width="2" height="2"/>
    <rect x="8" y="8" width="2" height="2"/>
    <rect x="10" y="8" width="2" height="2"/>
    <rect x="8" y="10" width="2" height="2"/>
    <rect x="10" y="10" width="2" height="2"/>
    <rect x="8" y="12" width="2" height="2"/>
    <rect x="10" y="12" width="2" height="2"/>
    <rect x="8" y="14" width="2" height="2"/>
    <rect x="10" y="14" width="2" height="2"/>
    <rect x="8" y="16" width="2" height="2"/>
    <rect x="10" y="16" width="2" height="2"/>
    <rect x="8" y="18" width="2" height="2"/>
    <rect x="10" y="18" width="2" height="2"/>
    <rect x="8" y="20" width="2" height="2"/>
    <rect x="10" y="20" width="2" height="2"/>
  </svg>
);

// Exercise & Fitness Icons
export const ExerciseIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="2" y="10" width="2" height="4"/>
    <rect x="4" y="8" width="2" height="8"/>
    <rect x="6" y="10" width="12" height="4"/>
    <rect x="18" y="8" width="2" height="8"/>
    <rect x="20" y="10" width="2" height="4"/>
    <rect x="8" y="8" width="2" height="2"/>
    <rect x="10" y="8" width="2" height="2"/>
    <rect x="12" y="8" width="2" height="2"/>
    <rect x="14" y="8" width="2" height="2"/>
    <rect x="8" y="14" width="2" height="2"/>
    <rect x="10" y="14" width="2" height="2"/>
    <rect x="12" y="14" width="2" height="2"/>
    <rect x="14" y="14" width="2" height="2"/>
  </svg>
);

// Study & Education Icons
export const StudyIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="4" y="4" width="16" height="2"/>
    <rect x="4" y="6" width="2" height="12"/>
    <rect x="18" y="6" width="2" height="12"/>
    <rect x="4" y="18" width="16" height="2"/>
    <rect x="6" y="8" width="12" height="2"/>
    <rect x="6" y="12" width="8" height="2"/>
    <rect x="6" y="16" width="10" height="2"/>
  </svg>
);

// Cooking & Food Icons
export const CookingIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6" y="6" width="2" height="2"/>
    <rect x="8" y="4" width="2" height="2"/>
    <rect x="10" y="2" width="2" height="2"/>
    <rect x="12" y="4" width="2" height="2"/>
    <rect x="14" y="6" width="2" height="2"/>
    <rect x="4" y="8" width="16" height="2"/>
    <rect x="4" y="10" width="2" height="8"/>
    <rect x="18" y="10" width="2" height="8"/>
    <rect x="4" y="18" width="16" height="2"/>
    <rect x="6" y="20" width="12" height="2"/>
  </svg>
);

// Shopping Icons
export const ShoppingIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6" y="4" width="2" height="2"/>
    <rect x="8" y="6" width="8" height="2"/>
    <rect x="8" y="8" width="2" height="10"/>
    <rect x="14" y="8" width="2" height="10"/>
    <rect x="8" y="18" width="8" height="2"/>
    <rect x="16" y="4" width="2" height="2"/>
    <rect x="10" y="12" width="4" height="2"/>
  </svg>
);

// Work & Business Icons
export const WorkIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="8" y="2" width="8" height="2"/>
    <rect x="8" y="4" width="2" height="2"/>
    <rect x="14" y="4" width="2" height="2"/>
    <rect x="6" y="6" width="12" height="2"/>
    <rect x="6" y="8" width="2" height="8"/>
    <rect x="16" y="8" width="2" height="8"/>
    <rect x="6" y="16" width="12" height="2"/>
    <rect x="10" y="10" width="4" height="2"/>
  </svg>
);

// Health & Medical Icons
export const HealthIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="10" y="6" width="4" height="2"/>
    <rect x="10" y="8" width="4" height="2"/>
    <rect x="8" y="10" width="8" height="2"/>
    <rect x="8" y="12" width="8" height="2"/>
    <rect x="10" y="14" width="4" height="2"/>
    <rect x="10" y="16" width="4" height="2"/>
  </svg>
);

// Entertainment & Hobby Icons
export const HobbyIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="8" y="4" width="2" height="2"/>
    <rect x="10" y="6" width="2" height="2"/>
    <rect x="12" y="8" width="2" height="2"/>
    <rect x="14" y="6" width="2" height="2"/>
    <rect x="16" y="4" width="2" height="2"/>
    <rect x="6" y="8" width="2" height="2"/>
    <rect x="4" y="10" width="2" height="2"/>
    <rect x="6" y="12" width="2" height="2"/>
    <rect x="8" y="14" width="2" height="2"/>
    <rect x="10" y="16" width="2" height="2"/>
    <rect x="12" y="18" width="2" height="2"/>
    <rect x="14" y="16" width="2" height="2"/>
    <rect x="16" y="14" width="2" height="2"/>
    <rect x="18" y="12" width="2" height="2"/>
    <rect x="20" y="10" width="2" height="2"/>
    <rect x="18" y="8" width="2" height="2"/>
  </svg>
);

// Travel & Transportation Icons
export const TravelIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="4" y="8" width="16" height="8"/>
    <rect x="6" y="6" width="12" height="2"/>
    <rect x="8" y="4" width="8" height="2"/>
    <rect x="2" y="16" width="4" height="4"/>
    <rect x="18" y="16" width="4" height="4"/>
    <rect x="10" y="10" width="4" height="2"/>
  </svg>
);

// Default/General Icon
export const DefaultIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="8" y="8" width="2" height="2"/>
    <rect x="10" y="8" width="2" height="2"/>
    <rect x="12" y="8" width="2" height="2"/>
    <rect x="14" y="8" width="2" height="2"/>
    <rect x="8" y="10" width="2" height="2"/>
    <rect x="14" y="10" width="2" height="2"/>
    <rect x="8" y="12" width="2" height="2"/>
    <rect x="14" y="12" width="2" height="2"/>
    <rect x="8" y="14" width="2" height="2"/>
    <rect x="10" y="14" width="2" height="2"/>
    <rect x="12" y="14" width="2" height="2"/>
    <rect x="14" y="14" width="2" height="2"/>
  </svg>
);

// Icon category mappings
export const todoIcons = {
  default: { icon: DefaultIcon, label: '기본', color: 'text-gray-500' },
  cleaning: { icon: CleaningIcon, label: '청소', color: 'text-blue-500' },
  exercise: { icon: ExerciseIcon, label: '운동', color: 'text-green-500' },
  study: { icon: StudyIcon, label: '공부', color: 'text-purple-500' },
  cooking: { icon: CookingIcon, label: '요리', color: 'text-orange-500' },
  shopping: { icon: ShoppingIcon, label: '쇼핑', color: 'text-pink-500' },
  work: { icon: WorkIcon, label: '업무', color: 'text-gray-700' },
  health: { icon: HealthIcon, label: '건강', color: 'text-red-500' },
  hobby: { icon: HobbyIcon, label: '취미', color: 'text-yellow-500' },
  travel: { icon: TravelIcon, label: '여행', color: 'text-cyan-500' }
} as const;

export type TodoIconType = keyof typeof todoIcons;

// Helper function to get icon component by key
export const getTodoIcon = (iconKey: TodoIconType = 'default') => {
  return todoIcons[iconKey] || todoIcons.default;
};

// Icon selector component for modals
export const TodoIconSelector: React.FC<{
  selectedIcon: TodoIconType;
  onIconSelect: (iconKey: TodoIconType) => void;
  className?: string;
}> = ({ selectedIcon, onIconSelect, className = "" }) => {
  return (
    <div className={`grid grid-cols-5 gap-3 p-4 ${className}`}>
      {Object.entries(todoIcons).map(([key, { icon: IconComponent, label, color }]) => {
        const isSelected = selectedIcon === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onIconSelect(key as TodoIconType)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-lg border-2 
              transition-all duration-200 hover:scale-105
              ${isSelected 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
            title={label}
          >
            <IconComponent className={`mb-1 ${color}`} size={20} />
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};