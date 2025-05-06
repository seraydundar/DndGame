import React, { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import { WebSocketContext } from "../contexts/WebSocketContext";
import api from "../services/api";
import "../pages/Dashboard.css";

const FriendSidebar = () => {
  const location = useLocation();
  const { friendRequests = [] } = useContext(WebSocketContext) || {};
  const [friendUsername, setFriendUsername] = useState("");
  const [message, setMessage] = useState("");
  const [friends, setFriends] = useState([]);

  const hidePaths = ["/login", "/register"];
  const currentUsername = localStorage.getItem("username") || "Kullanıcı";

  useEffect(() => {
    if (hidePaths.includes(location.pathname)) return;
    api.get("accounts/friends/sent-requests/").catch((err) =>
      console.error("Error fetching sent friend requests:", err)
    );
    api
      .get("accounts/friends/list/")
      .then((res) => setFriends(res.data))
      .catch((err) => console.error("Error fetching friends:", err));
  }, [location.pathname]);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("accounts/friends/add/", {
        friend_username: friendUsername,
      });
      setMessage(res.data.message);
      setFriendUsername("");
    } catch (err) {
      console.error("Error adding friend:", err.response?.data || err);
      setMessage(err.response?.data?.error || "Arkadaş eklenemedi.");
    }
  };

  if (hidePaths.includes(location.pathname)) return null;

  return (
    <div className="friend-sidebar">
      <h3>Welcome {currentUsername}!</h3>
      <h3>Add Friend</h3>
      <form onSubmit={handleAddFriend} className="friend-form">
        <input
          type="text"
          className="friend-input"
          placeholder="Username"
          value={friendUsername}
          onChange={(e) => setFriendUsername(e.target.value)}
          required
        />
        <button type="submit" className="friend-btn">Add</button>
      </form>
      {message && <p className="friend-message">{message}</p>}

      <h3>Sended Invites</h3>
      <ul className="friend-list">
        {friendRequests.length === 0 ? (
          <li className="friend-item"></li>
        ) : (
          friendRequests
            .filter((req) => req.friend_user?.username)
            .map((req) => (
              <li key={req.id} className="friend-item">
                {req.friend_user.username} – Bekleniyor...
              </li>
            ))
        )}
      </ul>

      <h3>Friends</h3>
      <ul className="friend-list">
        {friends.length === 0 ? (
          <li className="friend-item">Friend list is empty.</li>
        ) : (
          friends.map((f) => (
            <li key={f.id} className="friend-item">
              {f.friend_user?.username || "Bilinmiyor"}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default FriendSidebar;
