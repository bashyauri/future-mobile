import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type ButtonVariant = 'primary' | 'danger' | 'outline' | 'filled' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-10 px-4';
      case 'lg':
        return 'h-14 px-6';
      default:
        return 'h-12 px-5';
    }
  };

  const getVariantClasses = () => {
    const baseClasses = 'rounded-lg items-center justify-center';
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-primary-600`;
      case 'danger':
        return `${baseClasses} bg-red-500`;
      case 'outline':
        return `${baseClasses} border-2 ${isDark ? 'border-neutral-600' : 'border-neutral-300'}`;
      case 'filled':
        return `${baseClasses} ${isDark ? 'bg-neutral-800' : 'bg-neutral-900'}`;
      case 'ghost':
        return `${baseClasses}`;
      default:
        return `${baseClasses} bg-primary-600`;
    }
  };

  const getTextClasses = () => {
    const baseClasses = 'font-semibold';
    
    switch (size) {
      case 'sm':
        return `${baseClasses} text-sm`;
      case 'lg':
        return `${baseClasses} text-lg`;
      default:
        return `${baseClasses} text-base`;
    }
  };

  const getTextColor = () => {
    if (disabled || loading) return 'text-neutral-400';
    
    switch (variant) {
      case 'outline':
      case 'ghost':
        return isDark ? 'text-neutral-50' : 'text-neutral-900';
      default:
        return 'text-white';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${getVariantClasses()} ${getSizeClasses()} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50' : ''}`}
      style={style}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? (isDark ? '#fafafa' : '#171717') : '#ffffff'} />
      ) : (
        <View className="flex-row items-center justify-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={`${getTextClasses()} ${getTextColor()}`} style={textStyle}>
            {children}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}
