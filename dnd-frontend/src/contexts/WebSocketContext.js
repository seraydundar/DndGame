
  import React, { createContext, useState } from 'react';
  import usePersistentWebSocket from '../hooks/usePersistentWebSocket';

  const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
  export const WebSocketContext = createContext(null);

  export function WebSocketProvider({ userId, children }) {
   /* ⇣ WebSocket’ten gelen verileri saklayacağımız state’ler */
   const [friendRequests, setFriendRequests] = useState([]);
   const [notifications, setNotifications]   = useState([]);

    /* ―― mesaj yakalayıcılar ――――――――――――――――――――――――― */
    function handleFriend(data) {
     if (data.event === 'friendRequest') {
       setFriendRequests(data.requests || []);
     }
    }
    function handleNotif(data) {
    
        // Sunucu ping'e cevap verince {type:"pong"} geliyor ‑ ekleme.
        if (data.type === 'pong') return;
      
        // Asıl uygulama bildirimleri {event:"notification", ...} şeklinde gelsin
        if (data.event === 'notification') {
          setNotifications((prev) => [...prev, data]);
        }
      }

    const friendWS = usePersistentWebSocket(
      userId ? `${WS_BASE}/ws/friend/${userId}/` : null,
      { onMessage: handleFriend }
    );
    const notifWS  = usePersistentWebSocket(
      userId ? `${WS_BASE}/ws/notification/${userId}/` : null,
      { onMessage: handleNotif }
    );

   const value = { friendWS, notifWS, friendRequests, notifications };

    return (
      <WebSocketContext.Provider value={value}>
        {children}
      </WebSocketContext.Provider>
    );
  }
