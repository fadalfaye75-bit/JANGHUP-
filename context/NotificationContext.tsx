
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppNotification } from '../types';
import { useAuth } from './AuthContext';
import { API } from '../services/api';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (payload: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'alert' }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const allNotifs = await API.notifications.list();
      setNotifications(allNotifs || []);
    } catch (e) {
      console.warn("[Notifications] Sync issue.");
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    fetchNotifications();

    const subscription = API.notifications.subscribe(() => {
      fetchNotifications();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchNotifications]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const markAsRead = async (id: string) => {
    try {
      await API.notifications.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error("Mark read error");
    }
  };

  const markAllAsRead = async () => {
    try {
      await API.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error("Mark all as read error");
    }
  };

  const clearNotifications = async () => {
    if (!window.confirm("Voulez-vous supprimer définitivement votre historique d'alertes ?")) return;
    
    // Feedback immédiat sur l'UI
    const backup = [...notifications];
    setNotifications([]);
    
    try {
      await API.notifications.clear();
    } catch (e) {
      console.error("Clear notifications error", e);
      // Restauration en cas d'échec
      setNotifications(backup);
    }
  };

  const addNotification = useCallback((payload: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'alert' }) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substring(2, 9),
      title: payload.title,
      message: payload.message,
      type: payload.type,
      timestamp: new Date().toISOString(),
      is_read: false,
      target_user_id: user?.id || 'system'
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, permission, requestPermission,
      markAsRead, markAllAsRead, clearNotifications, addNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};
