import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'bordered' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  className?: string;
  onPress?: () => void;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  className = '',
  onPress,
}: CardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getVariantClasses = () => {
    // Ensure both light and dark backgrounds are explicitly defined for every variant
    if (isDark) {
      switch (variant) {
        case 'bordered':
          return 'border-2 border-neutral-800 bg-neutral-900';
        case 'elevated':
          return 'shadow-xl bg-neutral-900 shadow-black/30';
        case 'outlined':
          return 'border border-neutral-700 bg-neutral-900/50';
        case 'default':
        default:
          return 'bg-neutral-900';
      }
    } else {
      switch (variant) {
        case 'bordered':
          return 'border-2 border-neutral-200 bg-white';
        case 'elevated':
          return 'shadow-xl bg-white shadow-neutral-200/50';
        case 'outlined':
          return 'border border-neutral-300 bg-white';
        case 'default':
        default:
          return 'bg-white';
      }
    }
  };

  const getPaddingClasses = () => {
    switch (padding) {
      case 'none':
        return '';
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-6';
      case 'md':
      default:
        return 'p-4';
    }
  };

  const CardComponent = (
    <View
      className={`rounded-2xl ${getVariantClasses()} ${getPaddingClasses()} ${className}`}
      style={style}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <View
        className="active:scale-95 transition-transform duration-150"
        onStartShouldSetResponder={() => true}
        onResponderRelease={onPress}
      >
        {CardComponent}
      </View>
    );
  }

  return CardComponent;
}
