import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface SkeletonProps {
  width?: number;
  height?: number;
  variant?: 'rectangular' | 'circular';
  style?: ViewStyle;
  className?: string;
  fullWidth?: boolean;
}

export function Skeleton({
  width,
  height = 20,
  variant = 'rectangular',
  style,
  className = '',
  fullWidth = false,
}: SkeletonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
      default:
        return 'rounded-md';
    }
  };

  return (
    <View
      className={`${getVariantClasses()} ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'} ${fullWidth ? 'flex-1' : ''} ${className}`}
      style={[width && !fullWidth ? { width } : undefined, { height }, style]}
    />
  );
}

export function CardSkeleton() {
  return (
    <View className="p-4 mb-4 rounded-xl bg-neutral-100 dark:bg-neutral-900">
      <Skeleton fullWidth height={24} className="mb-3" />
      <Skeleton fullWidth height={16} className="mb-2" />
      <Skeleton fullWidth height={16} />
    </View>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="flex-row items-center p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900">
          <Skeleton width={48} height={48} variant="circular" className="mr-3" />
          <View className="flex-1">
            <Skeleton fullWidth height={18} className="mb-2" />
            <Skeleton width={100} height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}
