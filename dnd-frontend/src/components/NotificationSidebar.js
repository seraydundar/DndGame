import React, { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";
import { AuthContext } from "../contexts/AuthContext";
import "../pages/Dashboard.css";

const NotificationSidebar = () => {
  const location = useLocation();
  const { userId } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  const hidePaths = ["/login", "/register"];

  useEffect(() => {
    if (hidePaths.includes(location.pathname)) return;
    api
      .get("accounts/notifications/")
      .then((res) => setNotifications(res.data))
      .catch((err) => {
        console.error("Bildirimler alınırken hata:", err);
        setError("Bildirim alınamadı.");
      });
  }, [location.pathname]);

  useEffect(() => {
    if (!userId) return;
    const handler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.notification)
          setNotifications((prev) => [...prev, data.notification]);
      } catch (e) {
        console.error("WS bildirim ayrıştırma hatası:", e);
      }
    };
    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [userId]);

  const respondToFriend = async (id, status) => {
    try {
      await api.patch(`accounts/friends/respond/${id}/`, { status });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error("Arkadaş isteğine yanıt hatası:", e);
    }
  };

  const respondToLobby = async (id, status) => {
    try {
      await api.patch(`accounts/lobby_invite/respond/${id}/`, { status });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error("Lobi davet yanıt hatası:", e);
    }
  };

  if (hidePaths.includes(location.pathname)) return null;

  return (
    <div className="notification-sidebar">
      <h3>Bildirimler</h3>
      {error && <p className="error-msg">{error}</p>}
      <ul className="notification-list">
        {notifications.length === 0 ? (
          <li className="notification-item">Henüz bildirim yok.</li>
        ) : (
          notifications.map((n) => (
            <li key={n.id} className="notification-item">
              <strong>{n.notification_type}</strong>: {n.message}
              <br />
              <small>{new Date(n.created_at).toLocaleString()}</small>
              {(n.notification_type === "friend_request" ||
                n.notification_type === "lobby_invite") && (
                <div className="notification-buttons">
                  <button
                    className="accept-btn"
                    onClick={() =>
                      n.notification_type === "friend_request"
                        ? respondToFriend(n.id, "accepted")
                        : respondToLobby(n.id, "accepted")
                    }
                  >
                    Kabul
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() =>
                      n.notification_type === "friend_request"
                        ? respondToFriend(n.id, "rejected")
                        : respondToLobby(n.id, "rejected")
                    }
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

export default NotificationSidebar;
