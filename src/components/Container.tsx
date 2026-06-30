// src/components/Container.tsx
import React from 'react';
import { SafeAreaView, View, ViewProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type ContainerProps = {
  children: React.ReactNode;
  style?: ViewProps['style'];
};

export default function Container({ children, style }: ContainerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <SafeAreaView className={isDark ? 'bg-neutral-950' : 'bg-white'}>
      <View className={`flex-1 px-4 py-3 ${isDark ? 'bg-neutral-950' : 'bg-white'}`} style={style}>
        {children}
      </View>
    </SafeAreaView>
  );
}
