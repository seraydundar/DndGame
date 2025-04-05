import React, { useState, useEffect, useContext } from "react";
import api from "../services/api";
import socket from "../services/socket";
import { AuthContext } from "../contexts/AuthContext";

const NotificationSidebar = () => {
  const { userId } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    try {
      const response = await api.get("accounts/notifications/");
      console.log("[Bildirimler] Gelen bildirimler:", response.data);
      setNotifications(response.data);
    } catch (err) {
      console.error("Bildirimleri çekerken hata oluştu:", err);
      setError("Bildirimler alınırken hata oluştu.");
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const notificationHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Notification WS event data:", data);
        if (data.notification) {
          setNotifications((prev) => [...prev, data.notification]);
          console.log("Yeni bildirim alındı:", data.notification);
        }
      } catch (e) {
        console.error("Bildirim mesajı ayrıştırma hatası:", e);
      }
    };

    socket.addEventListener("message", notificationHandler);
    return () => {
      socket.removeEventListener("message", notificationHandler);
    };
  }, [userId]);

  const respondToFriendRequest = async (notificationId, status) => {
    try {
      await api.patch(`accounts/friends/respond/${notificationId}/`, { status });
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch (err) {
      console.error("Arkadaşlık isteğine yanıt verirken hata:", err);
    }
  };

  const respondToLobbyInvite = async (notificationId, status) => {
    try {
      await api.patch(`accounts/lobby_invite/respond/${notificationId}/`, { status });
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch (err) {
      console.error("Lobi davetine yanıt verirken hata:", err);
    }
  };

  return (
    <div style={styles.sidebar}>
      <h3>Bildirimler</h3>
      {error && <p style={styles.error}>{error}</p>}
      <ul style={styles.notificationList}>
        {notifications.length === 0 ? (
          <li>Henüz bildirim yok.</li>
        ) : (
          notifications.map((notif) => (
            <li key={notif.id} style={styles.notificationItem}>
              <strong>{notif.notification_type}</strong>: {notif.message}
              <br />
              <small>{new Date(notif.created_at).toLocaleString()}</small>
              {notif.notification_type === "friend_request" && (
                <div style={styles.buttons}>
                  <button
                    style={styles.accept}
                    onClick={() => respondToFriendRequest(notif.id, "accepted")}
                  >
                    Kabul Et
                  </button>
                  <button
                    style={styles.reject}
                    onClick={() => respondToFriendRequest(notif.id, "rejected")}
                  >
                    Reddet
                  </button>
                </div>
              )}
              {notif.notification_type === "lobby_invite" && (
                <div style={styles.buttons}>
                  <button
                    style={styles.accept}
                    onClick={() => respondToLobbyInvite(notif.id, "accepted")}
                  >
                    Kabul Et
                  </button>
                  <button
                    style={styles.reject}
                    onClick={() => respondToLobbyInvite(notif.id, "rejected")}
                  >
                    Reddet
                  </button>
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

const styles = {
  sidebar: {
    marginTop: "20px",
    backgroundColor: "#fff",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  error: {
    color: "red",
    fontSize: "0.9em",
  },
  notificationList: {
    listStyleType: "none",
    padding: 0,
    margin: 0,
  },
  notificationItem: {
    marginBottom: "10px",
    padding: "5px",
    borderBottom: "1px solid #eee",
  },
  buttons: {
    marginTop: "5px",
  },
  accept: {
    marginRight: "5px",
    padding: "5px 10px",
    backgroundColor: "#4caf50",
    color: "#fff",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
  },
  reject: {
    padding: "5px 10px",
    backgroundColor: "#f44336",
    color: "#fff",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
  },
};

export default NotificationSidebar;
