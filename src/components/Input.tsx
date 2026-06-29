import React from 'react';
import { TextInput, View, Text, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getBorderColor = () => {
    if (error) return 'border-red-500';
    if (props.focusable !== false) return isDark ? 'border-neutral-600' : 'border-neutral-300';
    return isDark ? 'border-neutral-800' : 'border-neutral-200';
  };

  const getBgColor = () => {
    return isDark ? 'bg-neutral-900' : 'bg-neutral-50';
  };

  const getTextColor = () => {
    return isDark ? 'text-neutral-50' : 'text-neutral-900';
  };

  return (
    <View style={containerStyle} className="mb-4">
      {label && (
        <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
          {label}
        </Text>
      )}
      
      <View className="relative">
        {leftIcon && (
          <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            {leftIcon}
          </View>
        )}
        
        <TextInput
          className={`h-12 px-4 border rounded-lg ${getBorderColor()} ${getBgColor()} ${getTextColor()} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''}`}
          placeholderTextColor="#a1a1aa"
          style={inputStyle}
          {...props}
        />
        
        {rightIcon && (
          <View className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            {rightIcon}
          </View>
        )}
      </View>
      
      {error && (
        <Text className="text-red-500 text-sm mt-1">{error}</Text>
      )}
      
      {helperText && !error && (
        <Text className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
          {helperText}
        </Text>
      )}
    </View>
  );
}
