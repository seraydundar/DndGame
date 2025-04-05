import React, { useState, useEffect, useContext } from "react";
import { WebSocketContext } from "../contexts/WebSocketContext";
import api from "../services/api";

const FriendSidebar = () => {
  const { friendRequests = [] } = useContext(WebSocketContext) || {};
  const [friendUsername, setFriendUsername] = useState("");
  const [message, setMessage] = useState("");
  const [friends, setFriends] = useState([]);

  const currentUsername = localStorage.getItem("username") || "Kullanıcı";

  const fetchSentRequests = async () => {
    try {
      await api.get("accounts/friends/sent-requests/");
    } catch (error) {
      console.error("Error fetching sent friend requests:", error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await api.get("accounts/friends/list/");
      setFriends(response.data);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  useEffect(() => {
    fetchSentRequests();
    fetchFriends();
  }, []);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("accounts/friends/add/", { friend_username: friendUsername });
      setMessage(response.data.message);
      setFriendUsername("");
    } catch (error) {
      console.error("Error adding friend:", error.response?.data || error);
      setMessage(error.response?.data.error || "Arkadaş eklenemedi.");
    }
  };

  return (
    <div style={styles.sidebar}>
      <h3>Hoş geldiniz, {currentUsername}!</h3>
      <h3>Arkadaş Ekle</h3>
      <form onSubmit={handleAddFriend} style={styles.form}>
        <input
          type="text"
          placeholder="Kullanıcı adı"
          value={friendUsername}
          onChange={(e) => setFriendUsername(e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button}>Ekle</button>
      </form>
      {message && <p style={styles.message}>{message}</p>}

      <h3>Gönderilen İstekler (Gerçek Zamanlı)</h3>
      <ul style={styles.friendList}>
        {friendRequests.length === 0 ? (
          <li>Henüz gönderilen isteğiniz yok.</li>
        ) : (
          friendRequests
            .filter(req => req.friend_user && req.friend_user.username)
            .map((req) => (
              <li key={req.id} style={styles.friendItem}>
                {req.friend_user.username} - Bekleniyor...
              </li>
            ))
        )}
      </ul>

      <h3>Arkadaşlar</h3>
      <ul>
        {friends.length === 0 ? (
          <li>Henüz arkadaşınız yok.</li>
        ) : (
          friends.map((friend) => (
            <li key={friend.id}>{friend.friend_user?.username || "Bilinmiyor"}</li>
          ))
        )}
      </ul>
    </div>
  );
};

const styles = {
  sidebar: {
    backgroundColor: "#fff",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  form: {
    display: "flex",
    marginBottom: "10px",
  },
  input: {
    flex: 1,
    padding: "5px",
    marginRight: "5px",
  },
  button: {
    padding: "5px 10px",
  },
  message: {
    color: "green",
    fontSize: "0.9em",
  },
  friendList: {
    listStyleType: "none",
    padding: 0,
    margin: 0,
  },
  friendItem: {
    marginBottom: "10px",
    padding: "5px",
    backgroundColor: "#f5f5f5",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
};

export default FriendSidebar;
