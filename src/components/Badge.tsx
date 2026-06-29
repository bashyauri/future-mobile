import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type BadgeColor = 'green' | 'red' | 'blue' | 'yellow' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  children,
  color = 'gray',
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700';
      case 'red':
        return isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700';
      case 'blue':
        return isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700';
      case 'yellow':
        return isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700';
      case 'gray':
      default:
        return isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'md':
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  return (
    <View
      className={`rounded-full ${getColorClasses()} ${getSizeClasses()}`}
      style={style}
    >
      <Text className={`font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`} style={textStyle}>
        {children}
      </Text>
    </View>
  );
}
