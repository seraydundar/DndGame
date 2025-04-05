import React, { createContext, useState } from 'react';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  const removeNotification = (notificationId) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId)
    );
  };

  const respondToFriendRequest = (notificationId, friendRequestId, newStatus) => {
    // Simülasyon: Bildirimdeki arkadaşlık isteğinin yanıtlanması
    // İlk olarak, güncellenmiş bildirim bilgilerini kaldırıyoruz:
    removeNotification(notificationId);
    // İsteğe bağlı: FriendContext üzerinden arkadaş durumunu güncelleyebilirsiniz.
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, respondToFriendRequest }}>
      {children}
    </NotificationContext.Provider>
  );
};
