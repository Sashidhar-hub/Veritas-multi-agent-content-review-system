import React, { createContext, useContext, useState, useCallback } from 'react';
import { NotificationItem, UserProfile } from '../types/veritas';
import { veritasApi } from '../services/api';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}

interface AppContextValue {
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile>(() => veritasApi.getUser());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    veritasApi.getNotifications()
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');

  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    const next = veritasApi.updateUser(updates);
    setUser(next);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(veritasApi.markNotificationRead(id));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(veritasApi.markAllNotificationsRead());
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        user,
        updateUser,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        toasts,
        addToast,
        dismissToast,
        globalSearch,
        setGlobalSearch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
