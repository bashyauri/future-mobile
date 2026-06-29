import React, { useEffect } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Button } from './Button';
import { Heading, BodyText } from './Typography';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showActions?: boolean;
  variant?: 'default' | 'danger';
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function Modal({
  visible,
  onClose,
  title,
  description,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  showActions = true,
  variant = 'default',
}: ModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (visible) {
      // Prevent background scroll when modal is open
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirm?.();
    if (!children) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            className={`mx-4 rounded-2xl p-6 max-w-sm w-full ${isDark ? 'bg-neutral-900' : 'bg-white'}`}
            style={styles.modalContent}
          >
            {title && (
              <Heading size="lg" className="mb-2">
                {title}
              </Heading>
            )}

            {description && (
              <BodyText variant="subtle" className="mb-4">
                {description}
              </BodyText>
            )}

            {children && <View className="mb-4">{children}</View>}

            {showActions && (
              <View className="space-y-3">
                <Button
                  variant={variant === 'danger' ? 'danger' : 'primary'}
                  fullWidth
                  onPress={handleConfirm}
                >
                  {confirmText}
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onPress={onClose}
                >
                  {cancelText}
                </Button>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
});
