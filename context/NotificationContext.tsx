"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Notification {
  id: string;
  type: 'supply' | 'target' | 'stoploss';
  stockName: string;
  message: string;
  time: string;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'time' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', type: 'supply', stockName: 'SK하이닉스', message: '외국인 대량 순매수 포착 (5만주)', time: '1시간 전', isRead: false },
    { id: '2', type: 'target', stockName: '삼성전자', message: '목표가 75,000원 도달!', time: '3시간 전', isRead: true },
  ]);

  const addNotification = (n: Omit<Notification, 'id' | 'time' | 'isRead'>) => {
    const newNotif: Notification = {
      ...n,
      id: Math.random().toString(36).substr(2, 9),
      time: '방금 전',
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
