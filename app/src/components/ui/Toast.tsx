import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const TOAST_CONFIG: Record<ToastType, { icon: string; backgroundColor: string; iconColor: string }> = {
  success: { icon: 'checkmark-circle', backgroundColor: Colors.success, iconColor: '#FFFFFF' },
  error: { icon: 'close-circle', backgroundColor: Colors.error, iconColor: '#FFFFFF' },
  info: { icon: 'information-circle', backgroundColor: Colors.primary, iconColor: '#FFFFFF' },
  warning: { icon: 'warning', backgroundColor: Colors.warning, iconColor: '#FFFFFF' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const config = TOAST_CONFIG[toast.type];

  useEffect(() => {
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
      ]).start(() => onDismiss());
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: config.backgroundColor },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons name={config.icon as any} size={22} color={config.iconColor} />
      <Text style={styles.toastText}>{toast.message}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error', 4000), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);
  const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    maxWidth: '90%',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    gap: Spacing.sm,
  },
  toastText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  dismissBtn: {
    padding: Spacing.xs,
  },
});
