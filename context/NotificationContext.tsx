import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppNotification, notificationService } from '../services/api/notification.service';
import { pingPongService } from '../services/api/pingpong.service';
import { useAuthContext } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  runApiHealthCheck: () => Promise<void>;
  isCheckingHealth: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((data) => {
      setNotifications(data);
    });
    return unsubscribe;
  }, []);

  // Global Auto Heartbeat Ping-Pong Service (pings every 30 seconds)
  useEffect(() => {
    pingPongService.startAutoPingPong(token, 30000);

    return () => {
      pingPongService.stopAutoPingPong();
    };
  }, [token]);

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const deleteNotification = (id: string) => {
    notificationService.deleteNotification(id);
  };

  const clearAll = () => {
    notificationService.clearAll();
  };

  const runApiHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      await pingPongService.pingAll(token);
    } catch (e) {
      if (__DEV__) console.log('[NotificationContext] Health check error:', e);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        runApiHealthCheck,
        isCheckingHealth,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
