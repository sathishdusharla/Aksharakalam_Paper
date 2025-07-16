import React, { createContext, useState, ReactNode } from 'react';

interface NotificationContextType {
  showNotification: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  showNotification: () => {}
});

interface NotificationProviderProps {
  children: ReactNode;
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) => {
    const id = Date.now().toString();
    const notification: Notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove notification
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Notification Container */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`notification ${notification.type} show`}
            onClick={() => removeNotification(notification.id)}
            style={{
              cursor: 'pointer',
              animation: 'slideIn 0.3s ease'
            }}
          >
            {notification.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};