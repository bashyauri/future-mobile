import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  duration?: number;
  onHide: () => void;
}

export function Toast({
  message,
  type = 'info',
  visible,
  duration = 3000,
  onHide,
}: ToastProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: isDark ? 'bg-green-900/90' : 'bg-green-500',
          border: isDark ? 'border-green-700' : 'border-green-400',
          icon: '✓',
        };
      case 'error':
        return {
          bg: isDark ? 'bg-red-900/90' : 'bg-red-500',
          border: isDark ? 'border-red-700' : 'border-red-400',
          icon: '✕',
        };
      case 'warning':
        return {
          bg: isDark ? 'bg-yellow-900/90' : 'bg-yellow-500',
          border: isDark ? 'border-yellow-700' : 'border-yellow-400',
          icon: '⚠',
        };
      case 'info':
      default:
        return {
          bg: isDark ? 'bg-blue-900/90' : 'bg-blue-500',
          border: isDark ? 'border-blue-700' : 'border-blue-400',
          icon: 'ℹ',
        };
    }
  };

  const typeStyles = getTypeStyles();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        className={`flex-row items-center px-4 py-3 rounded-lg border-2 shadow-lg ${typeStyles.bg} ${typeStyles.border}`}
      >
        <Text className="text-white text-lg font-bold mr-2">{typeStyles.icon}</Text>
        <Text className="text-white text-base font-medium flex-1">{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
});

// Toast context for easy usage
import { createContext, useContext, ReactNode } from 'react';

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, visible: true });
  };

  const handleHide = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={handleHide}
      />
    </ToastContext.Provider>
  );
}
