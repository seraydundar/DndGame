import React, { createContext, useState, useEffect } from "react";

export const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children, userId }) => {
  const [friendRequests, setFriendRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [wsFriend, setWsFriend] = useState(null);
  const [wsNotification, setWsNotification] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const friendSocket = new WebSocket(`ws://localhost:8000/ws/friend/${userId}/`);
    setWsFriend(friendSocket);

    friendSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "friend_request") {
        setFriendRequests((prev) => [...prev, data]);
      }
    };

    const notificationSocket = new WebSocket(`ws://localhost:8000/ws/notification/${userId}/`);
    setWsNotification(notificationSocket);

    notificationSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setNotifications((prev) => [...prev, data]);
    };

    return () => {
      friendSocket.close();
      notificationSocket.close();
    };
  }, [userId]);

  return (
    <WebSocketContext.Provider value={{ friendRequests, notifications, wsFriend, wsNotification }}>
      {children}
    </WebSocketContext.Provider>
  );
};
