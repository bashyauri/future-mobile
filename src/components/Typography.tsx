import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type HeadingSize = '2xl' | 'xl' | 'lg' | 'md' | 'sm';
type TextVariant = 'default' | 'subtle' | 'muted';

interface HeadingProps extends TextProps {
  children: React.ReactNode;
  size?: HeadingSize;
  className?: string;
  style?: TextStyle;
}

export function Heading({ children, size = 'md', className = '', style, ...props }: HeadingProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getSizeClasses = () => {
    switch (size) {
      case '2xl':
        return 'text-4xl font-bold';
      case 'xl':
        return 'text-3xl font-bold';
      case 'lg':
        return 'text-2xl font-bold';
      case 'sm':
        return 'text-lg font-bold';
      case 'md':
      default:
        return 'text-xl font-bold';
    }
  };

  const getColorClass = isDark ? 'text-neutral-50' : 'text-neutral-900';

  return (
    <Text className={`${getSizeClasses()} ${getColorClass} ${className}`} style={style} {...props}>
      {children}
    </Text>
  );
}

interface SubheadingProps extends TextProps {
  children: React.ReactNode;
  size?: 'xl' | 'lg' | 'md' | 'sm';
  className?: string;
  style?: TextStyle;
}

export function Subheading({ children, size = 'md', className = '', style, ...props }: SubheadingProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getSizeClasses = () => {
    switch (size) {
      case 'xl':
        return 'text-xl font-medium';
      case 'lg':
        return 'text-lg font-medium';
      case 'sm':
        return 'text-sm font-medium';
      case 'md':
      default:
        return 'text-base font-medium';
    }
  };

  const getColorClass = isDark ? 'text-neutral-300' : 'text-neutral-600';

  return (
    <Text className={`${getSizeClasses()} ${getColorClass} ${className}`} style={style} {...props}>
      {children}
    </Text>
  );
}

interface BodyTextProps extends TextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg' | string;
  className?: string;
  style?: TextStyle;
}

export function BodyText({ children, variant = 'default', size, className = '', style, ...props }: BodyTextProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getVariantClasses = () => {
    switch (variant) {
      case 'subtle':
        return isDark ? 'text-neutral-400' : 'text-neutral-500';
      case 'muted':
        return isDark ? 'text-neutral-500' : 'text-neutral-400';
      case 'default':
      default:
        return isDark ? 'text-neutral-100' : 'text-neutral-700';
    }
  };

  return (
    <Text className={`text-base ${getVariantClasses()} ${className}`} style={style} {...props}>
      {children}
    </Text>
  );
}

interface CaptionProps {
  children: React.ReactNode;
  className?: string;
  style?: TextStyle;
}

export function Caption({ children, className = '', style }: CaptionProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Text className={`text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-900'} ${className}`} style={style}>
      {children}
    </Text>
  );
}
